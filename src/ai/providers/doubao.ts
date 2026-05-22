import { GenericHttpProvider } from "@/ai/providers/genericHttp";
import { keyFor } from "@/ai/costPolicy";

export class DoubaoProvider extends GenericHttpProvider {
  constructor() {
    super({
      name: "doubao",
      apiKey: keyFor("doubao"),
      endpoint: process.env.DOUBAO_API_URL,
      model: process.env.DOUBAO_MODEL ?? "doubao-seed-1-6",
    });
  }
}
