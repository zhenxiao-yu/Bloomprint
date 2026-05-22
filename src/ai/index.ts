/**
 * Provider factory — selects the AI adapter from env (docs/DECISIONS.md D2).
 * Default is the mock provider, so the app works fully with no key. If AI_PROVIDER=claude but no
 * key is present, we degrade to mock rather than failing.
 */
import type { AIProvider } from "@/ai/provider";
import { MockProvider } from "@/ai/mock";
import { ClaudeProvider } from "@/ai/claude";

export type { AIProvider } from "@/ai/provider";
export { MockProvider } from "@/ai/mock";
export { ClaudeProvider } from "@/ai/claude";

export function getProvider(): AIProvider {
  const choice = (process.env.AI_PROVIDER ?? "mock").toLowerCase();
  if (choice === "claude") {
    const key = process.env.ANTHROPIC_API_KEY;
    if (key) return new ClaudeProvider(key);
  }
  return new MockProvider();
}
