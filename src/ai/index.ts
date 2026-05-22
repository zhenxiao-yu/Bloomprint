/**
 * Provider factory — selects the AI adapter from env (docs/DECISIONS.md D2).
 * Default is the mock provider, so the app works fully with no key. If AI_PROVIDER=claude but no
 * key is present, we degrade to mock rather than failing.
 */
import type { AIProvider } from "@/ai/provider";
import { getProviderFromEnv } from "@/ai/router";

export type { AIProvider } from "@/ai/provider";
export { MockProvider } from "@/ai/mock";
export { ClaudeProvider } from "@/ai/claude";
export { PRESENTATION_ROUTES, getProviderFromEnv } from "@/ai/router";

export function getProvider(): AIProvider {
  return getProviderFromEnv();
}
