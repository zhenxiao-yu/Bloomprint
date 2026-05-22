import { GenericHttpProvider } from "@/ai/providers/genericHttp";
import { keyFor } from "@/ai/costPolicy";

export class GlmProvider extends GenericHttpProvider {
  constructor() {
    super({
      name: "glm",
      apiKey: keyFor("glm"),
      endpoint: process.env.GLM_API_URL,
      model: process.env.GLM_MODEL ?? "glm-4-flash",
    });
  }
}
