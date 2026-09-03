/**
 * A best-effort token bucket, keyed by caller.
 *
 * Honest about what it is: serverless instances are created and destroyed at
 * will, so this state is per-instance and a determined caller can get more than
 * the stated allowance by hitting cold instances. It exists to stop one bored
 * visitor holding a key down, not to defeat an attacker. The real protections
 * are the short answer cap, the pinned model and the provider's own quota.
 *
 * If abuse ever becomes real, this is the seam to swap for Upstash or Vercel KV.
 */

interface Bucket {
  tokens: number;
  updatedAt: number;
}

const BUCKETS = new Map<string, Bucket>();

export const REQUESTS_PER_WINDOW = 12;
export const WINDOW_MS = 60 * 60 * 1000; // one hour

export interface Allowance {
  perWindow: number;
  windowMs: number;
}

/** Answering a question about a tool. Short answers, so a loose allowance. */
export const ASSISTANT_ALLOWANCE: Allowance = { perWindow: REQUESTS_PER_WINDOW, windowMs: WINDOW_MS };

/**
 * Running an AI tool. A generation can be twenty times the size of an
 * assistant answer, so this bucket is counted separately rather than sharing
 * one allowance — otherwise a few summaries of a long report would use up
 * somebody's ability to ask what a button does.
 */
export const GENERATE_ALLOWANCE: Allowance = { perWindow: 20, windowMs: WINDOW_MS };

/** Stops the map growing without bound on a long-lived instance. */
function evictStale(now: number) {
  if (BUCKETS.size < 5000) return;
  for (const [key, bucket] of BUCKETS) {
    if (now - bucket.updatedAt > WINDOW_MS) BUCKETS.delete(key);
  }
}

export interface RateVerdict {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function take(
  key: string,
  now = Date.now(),
  allowance: Allowance = ASSISTANT_ALLOWANCE,
): RateVerdict {
  evictStale(now);

  const { perWindow, windowMs } = allowance;

  const bucket = BUCKETS.get(key);
  if (!bucket) {
    BUCKETS.set(key, { tokens: perWindow - 1, updatedAt: now });
    return { allowed: true, remaining: perWindow - 1, retryAfterSeconds: 0 };
  }

  // Refill continuously rather than in steps, so the allowance recovers smoothly
  // instead of everyone being unblocked at the same instant.
  const refill = ((now - bucket.updatedAt) / windowMs) * perWindow;
  const tokens = Math.min(perWindow, bucket.tokens + refill);

  if (tokens < 1) {
    const secondsPerToken = windowMs / perWindow / 1000;
    bucket.updatedAt = now;
    bucket.tokens = tokens;
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((1 - tokens) * secondsPerToken),
    };
  }

  bucket.tokens = tokens - 1;
  bucket.updatedAt = now;
  return { allowed: true, remaining: Math.floor(bucket.tokens), retryAfterSeconds: 0 };
}

/** Test seam — the bucket map is module state that would otherwise leak between tests. */
export function resetRateLimits() {
  BUCKETS.clear();
}

/**
 * Identifies the caller. Behind Vercel the client IP is the first entry of
 * `x-forwarded-for`; everything after it is proxy hops and is attacker-supplied
 * on other hosts, which is why only the first entry is used.
 */
export function callerKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unknown";
}
