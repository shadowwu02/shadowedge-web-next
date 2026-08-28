import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  GPT_IMAGE_2_NATIVE_RATIO_MATRIX,
  resolveImageCustomerCapabilities,
} from "@/lib/image/imageCustomerCapabilities";
import { buildImageGenerateRequest } from "@/lib/image-api";
import type { ImageGenerationParams, ImageModel } from "@/types/image";

const panelSource = readFileSync(new URL("../src/components/image/ImagePromptPanel.tsx", import.meta.url), "utf8");
const generationHookSource = readFileSync(new URL("../src/hooks/useImageGeneration.ts", import.meta.url), "utf8");

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

function params(resolution: string, aspectRatio: string): ImageGenerationParams {
  return { aspectRatio, ratio: aspectRatio, resolution, quality: "medium", batchCount: 1 };
}

describe("IMAGE_NATIVE_RATIO_MATRIX_V3", () => {
  it("projects all 21 certified T2I tuples and preserves exact request ratio", () => {
    let count = 0;
    for (const [resolution, ratios] of Object.entries(GPT_IMAGE_2_NATIVE_RATIO_MATRIX.T2I)) {
      for (const [aspectRatio, tuple] of Object.entries(ratios)) {
        count += 1;
        const capability = resolveImageCustomerCapabilities({
          model: model("gpt_image_2"),
          params: params(resolution, aspectRatio),
          referenceCount: 0,
        });
        expect(capability.canGenerate).toBe(true);
        expect(capability.aspectRatioUiMode).toBe("SELECTABLE");
        expect(capability.aspectRatio).toBe(aspectRatio);
        expect(capability.providerSize).toBe(tuple.providerSize);
        expect(capability.effectivePixelSize).toBe(tuple.effectivePixelSize);
        const request = buildImageGenerateRequest({
          prompt: "Safe scene",
          model: model("gpt_image_2"),
          params: capability.normalizedParams,
          referenceImageAssetIds: [],
          idempotencyKey: `t2i-${resolution}-${aspectRatio}`,
        });
        expect(request).toMatchObject({ mode: "T2I", resolution: resolution.toUpperCase(), aspectRatio, ratio: aspectRatio, quantity: 1 });
      }
    }
    expect(count).toBe(21);
  });

  it("keeps I2I certification independent by resolution", () => {
    for (const [resolution, ratios] of Object.entries(GPT_IMAGE_2_NATIVE_RATIO_MATRIX.I2I)) {
      for (const [aspectRatio, tuple] of Object.entries(ratios)) {
        const capability = resolveImageCustomerCapabilities({
          model: model("gpt_image_2"), params: params(resolution, aspectRatio), referenceCount: 1,
        });
        expect(capability.canGenerate).toBe(true);
        expect(capability.availableAspectRatios).toEqual(Object.keys(ratios));
        expect(capability.providerSize).toBe(tuple.providerSize);
      }
    }
    for (const [resolution, ratio] of [["1K", "3:2"], ["1K", "2:3"], ["2K", "16:9"], ["4K", "9:16"]]) {
      expect(resolveImageCustomerCapabilities({
        model: model("gpt_image_2"), params: params(resolution, ratio), referenceCount: 1,
      }).canGenerate).toBe(false);
    }
  });

  it("renders independent resolution and native ratio controls plus certified dimension preview", () => {
    expect(panelSource).toContain('data-image-aspect-ratio-selector="native-v3"');
    expect(panelSource).toContain('data-image-output-dimensions={customerCapabilities.effectivePixelSize}');
    expect(panelSource).toContain('onUpdateParams({ aspectRatio: event.target.value, ratio: event.target.value })');
  });

  it("remains rollout-compatible with the V2 Catalog empty-ratio projection", () => {
    const legacyCatalogModel = model("gpt_image_2");
    legacyCatalogModel.capabilities.ratios = [];
    const capability = resolveImageCustomerCapabilities({
      model: legacyCatalogModel,
      params: params("2K", "9:16"),
      referenceCount: 0,
    });
    expect(capability.availableAspectRatios).toEqual(["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"]);
    expect(capability.normalizedParams).toMatchObject({ resolution: "2K", aspectRatio: "9:16" });
    expect(capability.effectivePixelSize).toBe("1152x2048");
    expect(generationHookSource).toContain("setParams((current) => resolveImageCustomerCapabilities({");
    expect(generationHookSource).toContain("referenceCount: references.length");
  });

  it("does not contaminate Nano or Nano Lite with GPT Image 2 ratios", () => {
    for (const id of ["nano_banana", "nano_banana_lite"] as const) {
      const capability = resolveImageCustomerCapabilities({
        model: model(id), params: { ...params("1K", "16:9"), quality: "" }, referenceCount: 0,
      });
      expect(capability.aspectRatioUiMode).toBe("DERIVED_READ_ONLY");
      expect(capability.availableAspectRatios).toEqual(["1:1"]);
      expect(capability.aspectRatio).toBe("1:1");
      expect(capability.canGenerate).toBe(false);
    }
  });
});
