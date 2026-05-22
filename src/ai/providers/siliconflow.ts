import { GenericHttpProvider } from "@/ai/providers/genericHttp";
import { keyFor } from "@/ai/costPolicy";

export class SiliconFlowProvider extends GenericHttpProvider {
  constructor() {
    super({
      name: "siliconflow",
      apiKey: keyFor("siliconflow"),
      endpoint: process.env.SILICONFLOW_API_URL ?? "https://api.siliconflow.cn/v1/chat/completions",
      model: process.env.SILICONFLOW_MODEL,
    });
  }
}
