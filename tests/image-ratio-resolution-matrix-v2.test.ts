import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { resolveImageCustomerCapabilities } from "@/lib/image/imageCustomerCapabilities";
import { buildImageGenerateRequest } from "@/lib/image-api";
import type { ImageGenerationParams, ImageModel } from "@/types/image";

const panelSource = readFileSync(new URL("../src/components/image/ImagePromptPanel.tsx", import.meta.url), "utf8");
const dictionarySource = readFileSync(new URL("../src/i18n/dictionary.ts", import.meta.url), "utf8");

function model(id: "gpt_image_2" | "nano_banana" | "nano_banana_lite"): ImageModel {
  const nano = id !== "gpt_image_2";
  return {
    id,
    name: id,
    label: id,
    provider: "shadowedge",
    providerModel: id === "gpt_image_2" ? "gpt-image-2" : id,
    available: true,
    capabilities: {
      textToImage: true,
      imageToImage: true,
      maxReferences: nano ? 14 : 16,
      maxPromptLength: 4000,
      maxBatchCount: 1,
      ratios: nano ? ["1:1"] : ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"],
      resolutions: nano ? ["1K"] : ["1K", "2K", "4K"],
      qualities: nano ? [] : ["low", "medium", "high"],
    },
    creditRules: { baseCredits: 2, qualityCredits: nano ? undefined : { medium: 2 } },
    defaults: { ratio: "1:1", resolution: "1K", quality: nano ? "" : "medium", batchCount: 1 },
  };
}

function params(resolution: string, aspectRatio: string, quality = "medium", batchCount = 1): ImageGenerationParams {
  return { aspectRatio, ratio: aspectRatio, resolution, quality, batchCount };
}

describe("IMAGE_RATIO_RESOLUTION_MATRIX_V2", () => {
  it.each([
    ["gpt_image_2", 0, "1K", "1:1", "1024x1024", "T2I", 1],
    ["gpt_image_2", 0, "2K", "1:1", "2048x2048", "T2I", 1],
    ["gpt_image_2", 0, "4K", "16:9", "3840x2160", "T2I", 1],
    ["gpt_image_2", 1, "1K", "1:1", "1024x1024", "I2I", 1],
    ["nano_banana", 0, "1K", "1:1", "1024x1024", "T2I", 14],
    ["nano_banana", 14, "1K", "1:1", "1024x1024", "I2I", 14],
    ["nano_banana_lite", 0, "1K", "1:1", "1024x1024", "T2I", 14],
    ["nano_banana_lite", 14, "1K", "1:1", "1024x1024", "I2I", 14],
  ] as const)("projects %s refs=%i %s/%s from one capability source", (id, refs, resolution, ratio, pixels, mode, referenceLimit) => {
    const capability = resolveImageCustomerCapabilities({
      model: model(id),
      params: params(resolution, ratio, id === "gpt_image_2" ? "medium" : ""),
      referenceCount: refs,
    });
    expect(capability).toMatchObject({
      model: id,
      modelId: id,
      mode,
      quality: id === "gpt_image_2" ? "medium" : "",
      resolution,
      aspectRatio: ratio,
      effectiveAspectRatio: ratio,
      effectivePixelSize: pixels,
      referenceLimit,
      maxReferences: referenceLimit,
      quantity: 1,
      quantityMax: 1,
      credit: 2,
      creditPreview: 2,
      availability: true,
      canGenerate: true,
      aspectRatioUiMode: id === "gpt_image_2" ? "SELECTABLE" : "DERIVED_READ_ONLY",
    });
  });

  it.each([
    ["1K", "21:9", 0, 1],
    ["1K", "3:2", 1, 1],
    ["2K", "16:9", 1, 1],
    ["1K", "1:1", 2, 1],
    ["1K", "1:1", 0, 2],
  ])("normalizes UI state but blocks explicit unsupported %s/%s refs=%i quantity=%i", (resolution, ratio, refs, quantity) => {
    const capability = resolveImageCustomerCapabilities({
      model: model("gpt_image_2"),
      params: params(resolution, ratio, "medium", quantity),
      referenceCount: refs,
    });
    expect(capability.canGenerate).toBe(false);
    expect(capability.adjustments.length).toBeGreaterThan(0);
  });

  it("builds an explicit backend request with quality, resolution, ratio, quantity, mode, and references", () => {
    const capability = resolveImageCustomerCapabilities({
      model: model("gpt_image_2"),
      params: params("1K", "1:1"),
      referenceCount: 1,
    });
    const request = buildImageGenerateRequest({
      prompt: "A safe scene",
      model: model("gpt_image_2"),
      params: capability.normalizedParams,
      referenceImageAssetIds: ["10000000-0000-4000-8000-000000000001"],
      idempotencyKey: "image-ratio-resolution-v2",
    });
    expect(request).toMatchObject({
      model: "gpt_image_2",
      quality: "medium",
      resolution: "1K",
      aspectRatio: "1:1",
      ratio: "1:1",
      quantity: 1,
      mode: "I2I",
      referenceImageAssetIds: ["10000000-0000-4000-8000-000000000001"],
    });
  });

  it("keeps resolution separate from native ratio and exposes certified output dimensions", () => {
    expect(panelSource).toContain('"image.params.resolution"');
    expect(panelSource).not.toContain('t(usesGenerationTiers ? "image.params.generationTier"');
    expect(panelSource).toContain('data-image-aspect-ratio-selector="native-v3"');
    expect(panelSource).toContain('data-image-output-dimensions={customerCapabilities.effectivePixelSize}');
    expect(dictionarySource).toContain('"image.params.resolution": "Resolution"');
    expect(dictionarySource).toContain('"image.params.resolution": "清晰度"');
    expect(dictionarySource).toContain('"image.params.outputDimensions": "Output dimensions"');
    expect(dictionarySource).toContain('"image.params.outputDimensions": "输出尺寸"');
  });
});
