import { google } from "@ai-sdk/google";

/**
 * The single source of truth for Mochi's model. Both the Mochi chat copilot
 * (`/api/chat`) and the AI Strategy Analysis action call this, so they run on the
 * exact same Google model and draw down the exact same per-plan token budget
 * (see `src/lib/mochi-usage.ts`). Keeping it in one place means "AI Analysis uses
 * Mochi" is true by construction, not by convention.
 */
export const MOCHI_MODEL_ID = "gemini-2.5-flash";

export function mochiModel() {
  return google(MOCHI_MODEL_ID);
}

/**
 * Normalise the token-usage object the AI SDK returns from `streamText`/
 * `generateObject` into the shape `recordMochiUsage` expects. The SDK has used a
 * few different field names across versions (inputTokens/promptTokens,
 * outputTokens/completionTokens), so we accept either and let the recorder
 * derive the total when only the parts are present.
 */
export function normalizeTokenUsage(
  usage: unknown,
): { promptTokens: number; completionTokens: number; totalTokens?: number } {
  const u = (usage ?? {}) as Record<string, number | undefined>;
  return {
    promptTokens: u.inputTokens ?? u.promptTokens ?? 0,
    completionTokens: u.outputTokens ?? u.completionTokens ?? 0,
    totalTokens: u.totalTokens,
  };
}
