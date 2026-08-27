/**
 * Shared between the client panel and the server route.
 *
 * Its own module on purpose: `prompt.ts` imports the whole SEO content set, and
 * a client component importing a constant from there would drag every tool's
 * prose into the browser bundle.
 */
export const MAX_QUESTION_LENGTH = 500;
