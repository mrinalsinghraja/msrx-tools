import { ANSWER_MODEL, getGroq, hasKey, MissingKeyError } from "@/lib/ai/groq";
import { compose } from "@/lib/ai/compose";
import { callerKey, GENERATE_ALLOWANCE, take } from "@/lib/ai/rate-limit";

/**
 * Runs one AI tool.
 *
 * The second and last server-side route on the site. It receives a tool slug,
 * the text the visitor typed, and the values of that tool's own options. It
 * does not receive a prompt, a model name, a temperature or a token budget —
 * `compose` builds all of those from the registry and the recipe table, so the
 * request body can steer the answer only in the ways the tool itself offers.
 *
 * Why there is no prompt-injection classifier here, unlike /api/assistant:
 * this route has no tools, no retrieval and no access to anything belonging to
 * anyone else. The worst a crafted document can do is change the answer that
 * the same person who pasted it gets back, which is a thing they could achieve
 * more easily by typing something different. Screening the material would
 * instead mean refusing to proofread an article about prompt injection, and
 * refusing real work to prevent a harmless outcome is a bad trade. The fence in
 * `compose` is the defence that matters, and it is structural rather than
 * probabilistic.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function refuse(status: number, error: string, headers: HeadersInit = {}) {
  return Response.json({ error }, { status, headers });
}

/** Same reasoning as the assistant route: stop the endpoint being embedded elsewhere. */
function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

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
    return refuse(503, "The AI tools aren't configured on this deployment. Every other tool on the site still works.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return refuse(400, "Expected a JSON body.");
  }

  const built = compose(body);
  if (!built.ok) return refuse(built.status, built.error);

  // Rate limited after composing, so a malformed request does not spend an
  // allowance, and in its own namespace so tool runs and assistant questions
  // never eat into each other.
  const verdict = take(`gen:${callerKey(request.headers)}`, Date.now(), GENERATE_ALLOWANCE);
  if (!verdict.allowed) {
    const minutes = Math.ceil(verdict.retryAfterSeconds / 60);
    return refuse(
      429,
      `You've used this hour's allowance of AI runs. It comes back gradually — try again in about ${minutes} minute${minutes === 1 ? "" : "s"}. Everything else on the site is unlimited, because everything else runs on your own device.`,
      { "retry-after": String(verdict.retryAfterSeconds) },
    );
  }

  try {
    const stream = await getGroq().chat.completions.create({
      model: ANSWER_MODEL,
      stream: true,
      temperature: built.composed.temperature,
      max_tokens: built.composed.maxTokens,
      // Reasoning is billed against max_tokens, so this is a correctness
      // setting, not a tuning one — see the note on Recipe.reasoningEffort.
      reasoning_effort: built.composed.reasoningEffort,
      messages: [
        { role: "system", content: built.composed.system },
        { role: "user", content: built.composed.user },
      ],
    });

    const encoder = new TextEncoder();
    const out = new ReadableStream<Uint8Array>({
      async start(controller) {
        let wrote = false;
        let stopReason: string | null = null;

        try {
          for await (const chunk of stream) {
            const choice = chunk.choices[0];
            const text = choice?.delta?.content;
            if (choice?.finish_reason) stopReason = choice.finish_reason;
            if (text) {
              wrote = true;
              controller.enqueue(encoder.encode(text));
            }
          }
        } catch {
          // Half an answer is still useful, so the partial result stays on
          // screen and the break is marked in it rather than thrown away.
          controller.enqueue(encoder.encode("\n\n(The answer stopped early — run it again, or in smaller pieces.)"));
          wrote = true;
        }

        // A stream that carried no content at all closes silently, and the
        // workspace then shows an empty box with no error — the worst way for
        // this to fail, because it looks like the tool ran and had nothing to
        // say. It happens when the model spends the whole token budget
        // reasoning before it writes, which is a real thing this model does.
        // Say so rather than showing nothing.
        if (!wrote) {
          controller.enqueue(
            encoder.encode(
              stopReason === "length"
                ? "The model used its whole budget working out an answer and never got to writing one. This usually means the request needs to be smaller — try shorter input, or fewer options asking for extra sections."
                : "The model returned nothing at all. Run it again; if it keeps happening, try shortening the input.",
            ),
          );
        }

        controller.close();
      },
    });

    return new Response(out, {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
        "x-ratelimit-remaining": String(verdict.remaining),
      },
    });
  } catch (error) {
    if (error instanceof MissingKeyError) {
      return refuse(503, "The AI tools aren't configured on this deployment.");
    }
    // The provider's own limits are separate from ours and are reached first
    // when the whole site is busy, so this case gets its own sentence.
    const status = (error as { status?: number } | null)?.status;
    if (status === 429) {
      return refuse(
        503,
        "The AI provider is rate limiting us right now. Try again in a minute — this is a limit on the whole site, not on you.",
      );
    }
    // Never surface the provider's error text: it can echo request details.
    console.error("ai route failed", error instanceof Error ? error.message : error);
    return refuse(502, "The AI tools are unavailable right now. Every other tool on the site still works.");
  }
}
