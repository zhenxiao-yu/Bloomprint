import { describe, expect, it } from "vitest";
import { buildRenderBody, parseRenderResponse } from "@/lib/imageProvider";

describe("buildRenderBody", () => {
  it("builds an OpenAI text-only body by default", () => {
    const body = buildRenderBody("gpt-image-1", "a tidy modern front yard");
    expect(body).toEqual({ model: "gpt-image-1", prompt: "a tidy modern front yard", n: 1, size: "1024x1024" });
    expect(body).not.toHaveProperty("image");
  });

  it("builds a ControlNet img2img body when a photo is given and controlnet is on (openai)", () => {
    const body = buildRenderBody("sdxl", "lush pollinator bed", { photoBase64: "AAAA", controlnet: true });
    expect(body).toMatchObject({ image: "AAAA", controlnet: "depth", strength: 0.7, model: "sdxl" });
  });

  it("builds a SiliconFlow body with image_size (not size/n) and ignores controlnet", () => {
    const body = buildRenderBody("black-forest-labs/FLUX.1-schnell", "a calm shade garden", {
      format: "siliconflow",
      photoBase64: "AAAA",
      controlnet: true,
    });
    expect(body).toEqual({
      model: "black-forest-labs/FLUX.1-schnell",
      prompt: "a calm shade garden",
      image_size: "1024x1024",
    });
    expect(body).not.toHaveProperty("size");
    expect(body).not.toHaveProperty("image");
  });

  it("clamps the prompt to 1000 chars", () => {
    const body = buildRenderBody("m", "x".repeat(2000));
    expect((body.prompt as string).length).toBe(1000);
  });
});

describe("parseRenderResponse", () => {
  it("reads OpenAI b64_json into a data URL", () => {
    expect(parseRenderResponse({ data: [{ b64_json: "QUJD" }] }, "openai")).toBe("data:image/png;base64,QUJD");
  });
  it("reads an OpenAI url when no b64", () => {
    expect(parseRenderResponse({ data: [{ url: "https://x/y.png" }] }, "openai")).toBe("https://x/y.png");
  });
  it("reads a SiliconFlow images[].url", () => {
    expect(parseRenderResponse({ images: [{ url: "https://sf/i.png" }] }, "siliconflow")).toBe("https://sf/i.png");
  });
  it("returns null on an empty/mismatched shape", () => {
    expect(parseRenderResponse({}, "openai")).toBeNull();
    expect(parseRenderResponse({ data: [{ url: "x" }] }, "siliconflow")).toBeNull();
  });
});
