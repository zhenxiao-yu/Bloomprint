import { GenericHttpProvider } from "@/ai/providers/genericHttp";
import { keyFor } from "@/ai/costPolicy";

export class QwenProvider extends GenericHttpProvider {
  constructor() {
    super({
      name: "qwen",
      apiKey: keyFor("qwen"),
      endpoint: process.env.QWEN_API_URL,
      model: process.env.QWEN_MODEL ?? "qwen-plus",
    });
  }
}
