import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  GPT_IMAGE_2_CUSTOMER_REFERENCE_LIMIT,
  resolveImageCustomerCapabilities,
} from "@/lib/image/imageCustomerCapabilities";
import { estimateImageCredits } from "@/lib/image/imageModelRules";
import type { ImageGenerationParams, ImageModel } from "@/types/image";

const promptPanelSource = readFileSync(new URL("../src/components/image/ImagePromptPanel.tsx", import.meta.url), "utf8");
const referenceTraySource = readFileSync(new URL("../src/components/image/ImageReferenceTray.tsx", import.meta.url), "utf8");
const workspaceSource = readFileSync(new URL("../src/components/image/ImageWorkspace.tsx", import.meta.url), "utf8");
const hookSource = readFileSync(new URL("../src/hooks/useImageGeneration.ts", import.meta.url), "utf8");
const dictionarySource = readFileSync(new URL("../src/i18n/dictionary.ts", import.meta.url), "utf8");

function model(overrides: Partial<ImageModel> = {}): ImageModel {
  return {
    id: "gpt_image_2",
    name: "GPT Image 2",
    label: "GPT Image 2",
    provider: "internal",
    providerModel: "gpt-image-2",
    available: true,
    capabilities: {
      textToImage: true,
      imageToImage: true,
      maxReferences: 16,
      maxPromptLength: 4000,
      maxBatchCount: 1,
      ratios: ["1:1", "16:9"],
      resolutions: ["1K", "2K", "4K"],
      qualities: ["low", "medium", "high"],
    },
    creditRules: {
      baseCredits: 2,
      qualityCredits: { medium: 2 },
    },
    defaults: { ratio: "1:1", resolution: "1K", quality: "medium", batchCount: 1 },
    ...overrides,
  };
}

function params(resolution: string, quality = "medium"): ImageGenerationParams {
  const aspectRatio = resolution.toLowerCase() === "4k" ? "16:9" : "1:1";
  return { aspectRatio, ratio: aspectRatio, resolution, quality, batchCount: 1 };
}

describe("GPT Image 2 reduced customer capability policy", () => {
  it("keeps Medium and hides Low/High from the selectable quality projection", () => {
    const policy = resolveImageCustomerCapabilities({ model: model(), params: params("1K") });
    expect(policy.availableQualities).toEqual(["medium"]);
    expect(policy.availableQualities).not.toContain("low");
    expect(policy.availableQualities).not.toContain("high");
    expect(policy.canGenerate).toBe(true);
  });

  it.each(["1K", "2K", "4K"])("keeps Medium text-to-image %s selectable", (resolution) => {
    const policy = resolveImageCustomerCapabilities({ model: model(), params: params(resolution), referenceCount: 0 });
    expect(policy.availableResolutions).toEqual(["1K", "2K", "4K"]);
    expect(policy.normalizedParams.resolution).toBe(resolution);
    expect(policy.canGenerate).toBe(true);
  });

  it("limits one-reference image-to-image to 1K and safely normalizes 2K/4K", () => {
    for (const resolution of ["2K", "4K"]) {
      const policy = resolveImageCustomerCapabilities({ model: model(), params: params(resolution), referenceCount: 1 });
      expect(policy.availableResolutions).toEqual(["1K"]);
      expect(policy.normalizedParams.resolution).toBe("1K");
      expect(policy.adjustments).toContain("single_reference_resolution_normalized");
      expect(policy.canGenerate).toBe(false);
    }
  });

  it("keeps one-reference 1K generation ready", () => {
    const policy = resolveImageCustomerCapabilities({ model: model(), params: params("1K"), referenceCount: 1 });
    expect(policy.availableResolutions).toEqual(["1K"]);
    expect(policy.canGenerate).toBe(true);
  });

  it("blocks a second reference before generation and marks a legacy multi-reference draft unsafe", () => {
    const policy = resolveImageCustomerCapabilities({ model: model(), params: params("1K"), referenceCount: 2 });
    expect(GPT_IMAGE_2_CUSTOMER_REFERENCE_LIMIT).toBe(1);
    expect(policy.maxReferences).toBe(1);
    expect(policy.canGenerate).toBe(false);
    expect(policy.blockReason).toBe("reference_limit_exceeded");
    expect(policy.adjustments).toContain("excess_references_removed");
  });

  it.each(["low", "high"])("normalizes a legacy %s draft to Medium", (quality) => {
    const policy = resolveImageCustomerCapabilities({ model: model(), params: params("2K", quality) });
    expect(policy.normalizedParams.quality).toBe("medium");
    expect(policy.adjustments).toContain("quality_normalized");
    expect(policy.canGenerate).toBe(false);
  });

  it("fails closed when the live catalog does not contain the certified Medium capability", () => {
    const unavailable = model({
      capabilities: { ...model().capabilities, qualities: ["low", "high"] },
    });
    const policy = resolveImageCustomerCapabilities({ model: unavailable, params: params("1K", "low") });
    expect(policy.canGenerate).toBe(false);
    expect(policy.blockReason).toBe("quality_unavailable");
  });

  it("keeps the Medium credit preview at 2 for every certified resolution", () => {
    for (const resolution of ["1K", "2K", "4K"]) {
      expect(estimateImageCredits(model(), params(resolution))).toBe(2);
    }
  });

  it("recognizes the canonical provider-model alias without exposing provider details", () => {
    const aliased = model({ id: "catalog-entry", name: "Image", label: "Image", providerModel: "gpt-image-2" });
    const policy = resolveImageCustomerCapabilities({ model: aliased, params: params("2K", "high") });
    expect(policy.isReducedGptImage2Policy).toBe(true);
    expect(policy.normalizedParams.quality).toBe("medium");
  });

  it("never expands reference support beyond the live catalog", () => {
    const textOnly = model({
      capabilities: { ...model().capabilities, imageToImage: false, maxReferences: 0 },
    });
    const policy = resolveImageCustomerCapabilities({ model: textOnly, params: params("1K"), referenceCount: 1 });
    expect(policy.maxReferences).toBe(0);
    expect(policy.canGenerate).toBe(false);
  });

  it("keeps a catalog-unavailable model fail-closed", () => {
    const policy = resolveImageCustomerCapabilities({ model: model({ available: false }), params: params("1K") });
    expect(policy.canGenerate).toBe(false);
    expect(policy.blockReason).toBe("catalog_unavailable");
  });
});

describe("model-specific normalization and shared UI guard", () => {
  it.each(["nano_banana", "nano_banana_lite"])("preserves the %s catalog contract", (id) => {
    const nano = model({
      id,
      name: id,
      label: id,
      provider: "oobb",
      providerModel: id,
      capabilities: {
        ...model().capabilities,
        maxReferences: 14,
        ratios: ["1:1"],
        resolutions: ["1K"],
        qualities: [],
      },
      defaults: { ratio: "1:1", resolution: "1K", quality: "", batchCount: 1 },
    });
    const policy = resolveImageCustomerCapabilities({ model: nano, params: params("1K", ""), referenceCount: 3 });
    expect(policy.isReducedGptImage2Policy).toBe(false);
    expect(policy.availableQualities).toEqual(nano.capabilities.qualities);
    expect(policy.availableResolutions).toEqual(nano.capabilities.resolutions);
    expect(policy.maxReferences).toBe(14);
    expect(policy.effectiveAspectRatio).toBe("1:1");
    expect(policy.canGenerate).toBe(true);
  });

  it("reapplies the GPT Image 2 policy after switching back from another model", () => {
    const nano = model({ id: "nano_banana", name: "Nano Banana", label: "Nano Banana", providerModel: "nano_banana" });
    expect(resolveImageCustomerCapabilities({ model: nano, params: params("4K", "high") }).isReducedGptImage2Policy).toBe(false);
    const restored = resolveImageCustomerCapabilities({ model: model(), params: params("4K", "high"), referenceCount: 1 });
    expect(restored.normalizedParams).toMatchObject({ quality: "medium", resolution: "1K" });
  });

  it("uses the shared policy for options, references, normalization, and the submit boundary", () => {
    expect(promptPanelSource).toContain("customerCapabilities.availableQualities");
    expect(promptPanelSource).toContain("customerCapabilities.availableResolutions");
    expect(promptPanelSource).toContain("!customerCapabilities.canGenerate");
    expect(referenceTraySource).toContain("maxReferences");
    expect(workspaceSource).toContain("image.customerCapabilities.maxReferences");
    expect(hookSource.match(/resolveImageCustomerCapabilities/g)?.length).toBeGreaterThanOrEqual(2);
    expect(hookSource).toContain("areImageGenerationParamsEqual(requestedParams, effectiveCapabilities.normalizedParams)");
  });

  it("normalizes restored state before any generation request can be built", () => {
    const policyIndex = hookSource.indexOf("const effectiveCapabilities = resolveImageCustomerCapabilities");
    const requestIndex = hookSource.indexOf("const request = buildImageGenerateRequest");
    const networkIndex = hookSource.indexOf("const response = await generateImage(request)");
    expect(policyIndex).toBeGreaterThan(-1);
    expect(requestIndex).toBeGreaterThan(policyIndex);
    expect(networkIndex).toBeGreaterThan(requestIndex);
    expect(hookSource).toContain("current.slice(0, maxReferences)");
    expect(hookSource).toContain("setCapabilityNotice(tf(\"image.capability.referencesTrimmed\"");
  });

  it("keeps the history and result stack outside the capability projection", () => {
    expect(workspaceSource).toContain("jobs={image.history}");
    expect(workspaceSource).toContain("<ImageHistoryPanel");
    expect(workspaceSource).toContain("<ImageOutputDetailPanel");
    expect(workspaceSource).toContain("<ImageResultStack");
  });

  it("provides responsive controls and bilingual customer-safe capability copy", () => {
    expect(promptPanelSource).toContain("min-w-0 max-w-full");
    expect(referenceTraySource).toContain("sm:flex-row");
    expect(referenceTraySource).toContain("grid-cols-2");
    expect(dictionarySource).toContain('"image.capability.temporarilyUnavailable": "Temporarily unavailable"');
    expect(dictionarySource).toContain('"image.capability.temporarilyUnavailable": "暂不可用"');
    expect(dictionarySource).toContain('"image.capability.singleReferenceLimit": "Currently supports 1 reference image"');
    expect(dictionarySource).toContain('"image.capability.singleReferenceLimit": "当前支持 1 张参考图"');
    expect(`${promptPanelSource}\n${referenceTraySource}`).not.toMatch(/DeRouter|Xinhankr|OOBB/i);
  });
});
