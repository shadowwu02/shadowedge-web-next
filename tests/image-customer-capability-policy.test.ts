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
      ratios: ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"],
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

function nanoModel(id: "nano_banana" | "nano_banana_lite", overrides: Partial<ImageModel> = {}): ImageModel {
  return model({
    id,
    name: id === "nano_banana" ? "Nano Banana" : "Nano Banana Lite",
    label: id === "nano_banana" ? "Nano Banana" : "Nano Banana Lite",
    provider: "shadowedge",
    providerModel: id,
    capabilities: {
      ...model().capabilities,
      maxReferences: 14,
      ratios: ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"],
      resolutions: ["1K"],
      qualities: [],
      nativeRatioOptionsByMode: {
        T2I: [
          ["1:1", "1024x1024"], ["16:9", "1376x768"], ["9:16", "768x1376"],
          ["4:3", "1200x896"], ["3:4", "896x1200"], ["3:2", "1264x848"], ["2:3", "848x1264"],
        ].map(([value, effectivePixelSize]) => ({ value, effectivePixelSize, evidence: "direct", maxReferences: 0 })),
        I2I: [
          { value: "1:1", effectivePixelSize: "1024x1024", evidence: "existing_direct", maxReferences: 14 },
          { value: "16:9", effectivePixelSize: "1376x768", evidence: "direct", maxReferences: 1 },
          { value: "9:16", effectivePixelSize: "768x1376", evidence: "direct", maxReferences: 1 },
        ],
      },
    },
    creditRules: { baseCredits: 2 },
    defaults: { ratio: "1:1", resolution: "1K", quality: "", batchCount: 1 },
    ...overrides,
  });
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

  it("keeps one-reference 2K/4K restricted to their independently certified 1:1 tuple", () => {
    for (const resolution of ["2K", "4K"]) {
      const policy = resolveImageCustomerCapabilities({ model: model(), params: { ...params(resolution), aspectRatio: "1:1", ratio: "1:1" }, referenceCount: 1 });
      expect(policy.availableResolutions).toEqual(["1K", "2K", "4K"]);
      expect(policy.normalizedParams.resolution).toBe(resolution);
      expect(policy.availableAspectRatios).toEqual(["1:1"]);
      expect(policy.canGenerate).toBe(true);
    }
  });

  it("keeps one-reference 1K generation ready", () => {
    const policy = resolveImageCustomerCapabilities({ model: model(), params: params("1K"), referenceCount: 1 });
    expect(policy.availableResolutions).toEqual(["1K", "2K", "4K"]);
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
    expect(restored.normalizedParams).toMatchObject({ quality: "medium", resolution: "4K", aspectRatio: "1:1" });
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

describe("public provider identity decoupling", () => {
  it("keeps Nano Banana ready when the public provider is redacted to shadowedge", () => {
    const policy = resolveImageCustomerCapabilities({ model: nanoModel("nano_banana"), params: params("1K", "") });
    expect(policy).toMatchObject({ canGenerate: true, maxReferences: 14, effectiveAspectRatio: "1:1", creditPreview: 2 });
  });

  it("keeps Nano Banana Lite ready when the public provider is redacted to shadowedge", () => {
    const policy = resolveImageCustomerCapabilities({ model: nanoModel("nano_banana_lite"), params: params("1K", "") });
    expect(policy).toMatchObject({ canGenerate: true, maxReferences: 14, effectiveAspectRatio: "1:1", creditPreview: 2 });
  });

  it("uses complete public capability metadata when the provider field is absent", () => {
    const policy = resolveImageCustomerCapabilities({
      model: nanoModel("nano_banana", { provider: "" }),
      params: params("1K", ""),
    });
    expect(policy.canGenerate).toBe(true);
    expect(policy.providerEligibility).toBe("xinhankr_certified");
  });

  it.each(["shadowedge", "public", "customer-safe-display"])(
    "does not change customer capability for arbitrary public provider display value %s",
    (provider) => {
      const policy = resolveImageCustomerCapabilities({
        model: nanoModel("nano_banana", { provider }),
        params: params("1K", ""),
      });
      expect(policy.canGenerate).toBe(true);
    },
  );

  it("still fails closed when the public catalog marks the model unavailable", () => {
    const policy = resolveImageCustomerCapabilities({
      model: nanoModel("nano_banana", { available: false }),
      params: params("1K", ""),
    });
    expect(policy.canGenerate).toBe(false);
    expect(policy.blockReason).toBe("provider_unavailable");
  });

  it("normalizes model switches without carrying provider-dependent readiness", () => {
    const nano = resolveImageCustomerCapabilities({ model: nanoModel("nano_banana"), params: params("4K", "high") });
    const lite = resolveImageCustomerCapabilities({ model: nanoModel("nano_banana_lite"), params: nano.normalizedParams });
    const gpt = resolveImageCustomerCapabilities({ model: model(), params: lite.normalizedParams });
    expect(nano.normalizedParams).toMatchObject({ resolution: "1K", aspectRatio: "16:9", quality: "", batchCount: 1 });
    expect(lite.canGenerate).toBe(true);
    expect(gpt.normalizedParams).toMatchObject({ resolution: "1K", aspectRatio: "16:9", quality: "medium", batchCount: 1 });
  });

  it("keeps GPT Image 2 readiness provider-agnostic", () => {
    for (const provider of ["shadowedge", "", "public-display"]) {
      const policy = resolveImageCustomerCapabilities({ model: model({ provider }), params: params("2K") });
      expect(policy.canGenerate).toBe(true);
      expect(policy.providerEligibility).toBe("xinhankr_certified");
    }
  });
});
