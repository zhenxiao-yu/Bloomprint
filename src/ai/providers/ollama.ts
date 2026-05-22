import { GenericHttpProvider } from "@/ai/providers/genericHttp";

export class OllamaProvider extends GenericHttpProvider {
  constructor() {
    super({
      name: "ollama",
      endpoint: process.env.OLLAMA_API_URL ?? "http://127.0.0.1:11434/api/chat",
      model: process.env.OLLAMA_MODEL ?? "llama3.1",
    });
  }
}
