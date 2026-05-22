import type { AIProvider } from "@/ai/provider";
import type { PlanProvider } from "@/domain/models";
import { ClaudeProvider } from "@/ai/claude";
import { MockProvider } from "@/ai/mock";
import { canUseProvider, keyFor } from "@/ai/costPolicy";
import { DeepSeekProvider } from "@/ai/providers/deepseek";
import { DoubaoProvider } from "@/ai/providers/doubao";
import { GlmProvider } from "@/ai/providers/glm";
import { OllamaProvider } from "@/ai/providers/ollama";
import { QwenProvider } from "@/ai/providers/qwen";
import { SiliconFlowProvider } from "@/ai/providers/siliconflow";

export const PRESENTATION_ROUTES: Record<string, PlanProvider[]> = {
  homeowner_explanation: ["deepseek", "qwen", "doubao", "mock"],
  staff_talking_points: ["deepseek", "qwen", "glm", "mock"],
  bilingual_summary: ["qwen", "doubao", "deepseek", "mock"],
  evidence_summary: ["deepseek", "qwen", "mock"],
  refinement_copy: ["deepseek", "qwen", "mock"],
  photo_caption: ["qwen", "glm", "mock"],
};

export function getProviderFromEnv(): AIProvider {
  const requested = (process.env.AI_PROVIDER ?? "mock").toLowerCase() as PlanProvider;
  return providerFor(canUseProvider(requested) ? requested : "mock");
}

function providerFor(name: PlanProvider): AIProvider {
  switch (name) {
    case "claude":
      return keyFor("claude") ? new ClaudeProvider(keyFor("claude") as string) : new MockProvider();
    case "deepseek":
      return new DeepSeekProvider();
    case "qwen":
      return new QwenProvider();
    case "doubao":
      return new DoubaoProvider();
    case "glm":
      return new GlmProvider();
    case "siliconflow":
      return new SiliconFlowProvider();
    case "ollama":
      return new OllamaProvider();
    case "none":
      return { name: "none", enhancePlan: async () => null };
    default:
      return new MockProvider();
  }
}
