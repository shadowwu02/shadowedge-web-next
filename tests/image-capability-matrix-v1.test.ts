import { describe, expect, it } from "vitest";
import {
  IMAGE_OUTPUT_QUANTITY_MAX,
  NANO_BANANA_CUSTOMER_REFERENCE_LIMIT,
  resolveImageCustomerCapabilities,
} from "@/lib/image/imageCustomerCapabilities";
import { buildImageGenerateRequest } from "@/lib/image-api";
import type { ImageGenerationParams, ImageModel } from "@/types/image";

function gptModel(): ImageModel {
  return {
    id: "gpt_image_2",
    name: "GPT Image 2",
    label: "GPT Image 2",
    provider: "derouter",
    providerModel: "gpt-image-2",
    available: true,
    capabilities: {
      textToImage: true,
      imageToImage: true,
      maxReferences: 16,
      maxPromptLength: 4000,
      maxBatchCount: 1,
      ratios: ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"],
      resolutions: ["1K", "2K", "4K"],
      qualities: ["low", "medium", "high"],
    },
    creditRules: { baseCredits: 2, qualityCredits: { medium: 2 } },
    defaults: { ratio: "1:1", resolution: "1K", quality: "medium", batchCount: 1 },
  };
}

function params(resolution: string, aspectRatio: string, quality = "medium", batchCount = 1): ImageGenerationParams {
  return { aspectRatio, ratio: aspectRatio, resolution, quality, batchCount };
}

describe("IMAGE_CAPABILITY_MATRIX_V1", () => {
  it.each([
    ["1K", "1:1", 0, "T2I", "1K · 1:1"],
    ["2K", "1:1", 0, "T2I", "2K · 1:1"],
    ["4K", "16:9", 0, "T2I", "4K · 16:9"],
    ["1K", "1:1", 1, "I2I", "1K · 1:1"],
  ])("accepts %s/%s refs=%i", (resolution, aspectRatio, refs, mode, label) => {
    const capability = resolveImageCustomerCapabilities({
      model: gptModel(),
      params: params(resolution, aspectRatio),
      referenceCount: refs,
    });
    expect(capability.canGenerate).toBe(true);
    expect(capability.mode).toBe(mode);
    expect(capability.effectiveAspectRatio).toBe(aspectRatio);
    expect(capability.resolutionOptions.some((option) => option.label === label)).toBe(true);
    expect(capability.aspectRatioUiMode).toBe("DERIVED_READ_ONLY");
    expect(capability.quantityMax).toBe(1);
    expect(capability.creditPreview).toBe(2);
  });

  it.each([
    ["low", "1K", "1:1", 0, 1],
    ["high", "1K", "1:1", 0, 1],
    ["medium", "1K", "9:16", 0, 1],
    ["medium", "4K", "1:1", 0, 1],
    ["medium", "2K", "1:1", 1, 1],
    ["medium", "1K", "1:1", 2, 1],
    ["medium", "1K", "1:1", 0, 2],
    ["medium", "8K", "1:1", 0, 1],
    ["medium", "1K", "invalid", 0, 1],
  ])("normalizes but blocks invalid %s/%s/%s refs=%i quantity=%i", (quality, resolution, ratio, refs, quantity) => {
    const capability = resolveImageCustomerCapabilities({
      model: gptModel(),
      params: params(resolution, ratio, quality, quantity),
      referenceCount: refs,
    });
    expect(capability.canGenerate).toBe(false);
    expect(capability.adjustments.length).toBeGreaterThan(0);
  });

  it("builds an explicit canonical request without an independent ratio choice", () => {
    const capability = resolveImageCustomerCapabilities({
      model: gptModel(),
      params: params("4K", "16:9"),
      referenceCount: 0,
    });
    const request = buildImageGenerateRequest({
      prompt: "A safe landscape",
      model: gptModel(),
      params: capability.normalizedParams,
      referenceImageAssetIds: [],
      idempotencyKey: "image-matrix-v1",
    });
    expect(request).toMatchObject({
      aspectRatio: "16:9",
      aspect_ratio: "16:9",
      ratio: "16:9",
      resolution: "4K",
      quality: "medium",
      quantity: 1,
      mode: "T2I",
    });
    expect(IMAGE_OUTPUT_QUANTITY_MAX).toBe(1);
  });
});

describe.each(["nano_banana", "nano_banana_lite"])("%s exact OOBB contract", (id) => {
  it("keeps 1K, 1:1, 14 references, quantity 1, and 2 credits", () => {
    const model: ImageModel = {
      ...gptModel(),
      id,
      name: id,
      label: id,
      provider: "oobb",
      providerModel: id,
      capabilities: {
        ...gptModel().capabilities,
        maxReferences: 14,
        ratios: ["1:1"],
        resolutions: ["1K"],
        qualities: [],
      },
      creditRules: { baseCredits: 2 },
      defaults: { ratio: "1:1", resolution: "1K", quality: "", batchCount: 1 },
    };
    const capability = resolveImageCustomerCapabilities({
      model,
      params: params("1K", "1:1", ""),
      referenceCount: 14,
    });
    expect(capability).toMatchObject({
      canGenerate: true,
      providerEligibility: "oobb_catalog_certified",
      effectiveAspectRatio: "1:1",
      maxReferences: NANO_BANANA_CUSTOMER_REFERENCE_LIMIT,
      quantityMax: 1,
      creditPreview: 2,
    });
  });
});
