import "server-only";

import Groq from "groq-sdk";

/**
 * The only file that touches the API key.
 *
 * `server-only` makes importing this from a client component a build error, so
 * the key cannot be pulled into the browser bundle by accident. The key itself
 * is read from the environment and is never written as a literal anywhere in
 * this repository — see docs/security.md.
 */

/** Model names are configuration, not constants: providers retire them. */
export const ANSWER_MODEL = process.env.GROQ_ANSWER_MODEL ?? "openai/gpt-oss-120b";
export const GUARD_MODEL = process.env.GROQ_GUARD_MODEL ?? "meta-llama/llama-prompt-guard-2-86m";

let client: Groq | null = null;

export class MissingKeyError extends Error {
  constructor() {
    super("GROQ_API_KEY is not set on the server.");
    this.name = "MissingKeyError";
  }
}

export function getGroq(): Groq {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new MissingKeyError();
  if (!client) client = new Groq({ apiKey });
  return client;
}

export function hasKey(): boolean {
  return Boolean(process.env.GROQ_API_KEY);
}

/**
 * Screens a typed question with Groq's prompt-injection classifier.
 *
 * Fails open by design. The classifier is a second line of defence — the first
 * is that the system prompt is built entirely from our own registry and the
 * visitor's text only ever arrives as a user message. If the guard is down or
 * slow, blocking every question would cost more than it protects.
 */
export async function looksLikeInjection(question: string): Promise<boolean> {
  try {
    const response = await getGroq().chat.completions.create({
      model: GUARD_MODEL,
      messages: [{ role: "user", content: question }],
      max_tokens: 4,
      temperature: 0,
    });
    const verdict = response.choices[0]?.message?.content?.trim().toUpperCase() ?? "";
    return verdict.startsWith("JAILBREAK") || verdict.startsWith("INJECTION");
  } catch {
    return false;
  }
}
