import { GenericHttpProvider } from "@/ai/providers/genericHttp";
import { keyFor } from "@/ai/costPolicy";

export class DeepSeekProvider extends GenericHttpProvider {
  constructor() {
    super({
      name: "deepseek",
      apiKey: keyFor("deepseek"),
      endpoint: process.env.DEEPSEEK_API_URL ?? "https://api.deepseek.com/chat/completions",
      model: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
    });
  }
}
