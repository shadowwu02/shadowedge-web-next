import { describe, expect, it } from "vitest";
import { normalizeImageModel } from "../src/lib/image/imageModelRules";
import { isImageActiveStatus } from "../src/lib/image/imageHistoryUtils";

describe("OOBB production image UI contract", () => {
  it("uses capability-driven tiers and keeps references hidden", () => {
    const model = normalizeImageModel({
      id: "nano_banana",
      name: "Nano Banana",
      description: "快速高质量 AI 图片生成",
      provider: "oobb",
      providerModel: "gemini-3.1-flash-image",
      capabilities: {
        textToImage: true,
        imageToImage: false,
        maxReferences: 0,
        maxBatchCount: 1,
        ratios: ["1:1"],
        resolutions: ["1k", "2k"],
        qualities: []
      }
    });
    expect(model.description).toBe("快速高质量 AI 图片生成");
    expect(model.capabilities.resolutions).toEqual(["1k", "2k"]);
    expect(model.capabilities.maxReferences).toBe(0);
  });

  it("treats UNCERTAIN as active so generate remains blocked", () => {
    expect(isImageActiveStatus("UNCERTAIN")).toBe(true);
  });
});
