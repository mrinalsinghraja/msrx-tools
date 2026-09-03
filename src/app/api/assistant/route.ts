import { ANSWER_MODEL, getGroq, hasKey, looksLikeInjection, MissingKeyError } from "@/lib/ai/groq";
import { buildSystemPrompt, validateQuestion } from "@/lib/ai/prompt";
import { callerKey, take } from "@/lib/ai/rate-limit";

/**
 * The only server-side route on the site.
 *
 * It answers questions about one tool. It receives a tool slug and a question —
 * never a prompt, never a model name, never the visitor's file or tool input.
 * Everything the model is told about the tool is looked up here from our own
 * registry, so the request body cannot steer it.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Answers are meant to be short. This is also the cost ceiling per request. */
const MAX_ANSWER_TOKENS = 500;

function refuse(status: number, error: string, headers: HeadersInit = {}) {
  return Response.json({ error }, { status, headers });
}

/**
 * Rejects cross-origin callers. Weak on its own — a header is trivially forged
 * outside a browser — but it stops the endpoint being embedded in someone
 * else's page and billed to this key, which is the realistic abuse.
 *
 * Compared against the host the request actually arrived on, not a configured
 * domain: the same build is served from the custom domain, from *.vercel.app
 * and from every preview deployment, and pinning one of those would reject the
 * others. Same-origin is the property we want, and this tests exactly that.
 */
function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // same-origin fetches may omit the header entirely

  const host = request.headers.get("host") ?? new URL(request.url).host;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return refuse(403, "This endpoint only serves its own site.");

  if (!hasKey()) {
    return refuse(503, "The assistant isn't configured on this deployment.");
  }

  const verdict = take(callerKey(request.headers));
  if (!verdict.allowed) {
    return refuse(
      429,
      `That's a lot of questions. Try again in about ${Math.ceil(verdict.retryAfterSeconds / 60)} minutes.`,
      { "retry-after": String(verdict.retryAfterSeconds) },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return refuse(400, "Expected a JSON body.");
  }

  const checked = validateQuestion(body);
  if (!checked.ok) return refuse(checked.status, checked.error);

  const system = buildSystemPrompt(checked.slug);
  if (!system) return refuse(400, "That tool doesn't exist.");

  if (await looksLikeInjection(checked.question)) {
    return refuse(400, "That question looks like an attempt to change my instructions, so I've skipped it.");
  }

  try {
    const stream = await getGroq().chat.completions.create({
      model: ANSWER_MODEL,
      stream: true,
      temperature: 0.3,
      max_tokens: MAX_ANSWER_TOKENS,
      // The answer cap is deliberately small, and the model's reasoning is
      // billed against it. At the provider's default effort a complicated
      // question can spend the whole allowance thinking and return nothing.
      reasoning_effort: "low",
      messages: [
        { role: "system", content: system },
        { role: "user", content: checked.question },
      ],
    });

    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content;
            if (text) controller.enqueue(encoder.encode(text));
          }
        } catch {
          controller.enqueue(encoder.encode("\n\n(The answer was cut short — please try again.)"));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(body, {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
        "x-ratelimit-remaining": String(verdict.remaining),
      },
    });
  } catch (error) {
    // Never surface the provider's error text: it can echo request details and
    // has been known to include fragments of the configured credentials.
    if (error instanceof MissingKeyError) {
      return refuse(503, "The assistant isn't configured on this deployment.");
    }
    console.error("assistant route failed", error instanceof Error ? error.message : error);
    return refuse(502, "The assistant is unavailable right now. The tool itself still works.");
  }
}
