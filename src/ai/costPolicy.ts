import type { PlanProvider } from "@/domain/models";

const KEY_ENV: Partial<Record<PlanProvider, string>> = {
  claude: "ANTHROPIC_API_KEY",
  deepseek: "DEEPSEEK_API_KEY",
  qwen: "QWEN_API_KEY",
  doubao: "DOUBAO_API_KEY",
  glm: "GLM_API_KEY",
  siliconflow: "SILICONFLOW_API_KEY",
};

export function aiEnabled(): boolean {
  return process.env.ENABLE_AI !== "false";
}

export function keyFor(provider: PlanProvider): string | null {
  const env = KEY_ENV[provider];
  return env ? process.env[env] ?? null : null;
}

export function canUseProvider(provider: PlanProvider): boolean {
  if (!aiEnabled()) return provider === "mock" || provider === "none";
  if (provider === "mock" || provider === "none" || provider === "ollama") return true;
  return Boolean(keyFor(provider));
}
