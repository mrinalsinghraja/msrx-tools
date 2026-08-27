# Security — the assistant and its API key

Everything else on this site runs in the visitor's browser and has no secrets.
This document covers the one exception.

## Where the key lives

| Environment | Where | Notes |
|---|---|---|
| Local | `.env.local` | Gitignored, mode 600. Never committed. |
| Production | Vercel → Project → Settings → Environment Variables | Set `GROQ_API_KEY` there, or `vercel env add GROQ_API_KEY production`. |

`.gitignore` ignores `.env*` and re-includes `.env.example`, which carries no
value. Before every push: `git grep -n "gsk_"` should return nothing.

**The key is never written as a literal in this repository, and must not be.**
A key in git is in git history permanently — visible to every collaborator, every
CI job, every integration, and to the secret scanners that crawl both public and
private repositories.

## Why it cannot be "hardcoded in the frontend"

There is no such thing as a private value in client-side JavaScript. Everything
shipped to the browser is readable with View Source. Obfuscation — base64, XOR
folding, splitting the string across modules — does not change this, because the
key must be reassembled in memory to be used, and a devtools breakpoint or the
Network tab recovers it in under a minute.

`src/lib/ai/groq.ts` imports `server-only`, which makes importing it from a
client component a **build error** rather than a silent leak. That is the
structural guarantee; the rest is discipline.

## The request path

```
browser ──{ slug, question }──▶ /api/assistant ──▶ Groq
```

The browser sends exactly two fields. It cannot send a prompt, a model name, a
token budget, or the contents of the tool's input box.

1. **Origin check.** Cross-origin requests are refused in production. Weak alone
   (a header is forged trivially outside a browser) but it stops the endpoint
   being embedded in someone else's page and billed to this key.
2. **Rate limit.** 12 questions per caller per hour, refilling continuously.
   Best-effort: serverless instances come and go, so the bucket is per-instance.
   Swap `src/lib/ai/rate-limit.ts` for Upstash or Vercel KV if abuse becomes real.
3. **Validation.** The slug is checked against the tool registry — an allowlist,
   not a pattern. Any extra field in the body is discarded, so a caller cannot
   smuggle in a `system` message or a more expensive model.
4. **Length cap.** 500 characters per question.
5. **Injection screen.** `llama-prompt-guard-2-86m` classifies the question.
   It **fails open** on purpose: it is the second line of defence, not the first,
   and blocking every question when the classifier is down costs more than it
   protects.
6. **The prompt.** Built entirely from our own registry and page content. The
   visitor's text only ever arrives as a `user` message and is never interpolated
   into the system prompt, so a question cannot rewrite the instructions.
7. **Answer cap.** 500 tokens. This is the per-request cost ceiling.
8. **Errors.** The provider's error text is never forwarded to the browser — it
   can echo request details and has been known to include credential fragments.

## The privacy claim

The site's promise is "your files never leave your device". The assistant does
not break it, because **the tool's input is never sent** — only the question the
visitor typed into the assistant's own box. That distinction is stated in the
panel itself, not buried in a policy, and the system prompt tells the model to
say the same thing when asked.

If that boundary is ever loosened — for example to let the assistant see the
user's input — the panel copy and this document must change first.

## If the key is exposed

1. Revoke it at console.groq.com.
2. Issue a new one.
3. Put the new one straight into Vercel and `.env.local`. Never into a chat, an
   issue, a commit message or a screenshot.

A key that has been pasted into any transcript should be treated as exposed,
whether or not anyone else read it.
