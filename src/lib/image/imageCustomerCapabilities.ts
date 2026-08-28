import { estimateImageCredits, normalizeImageGenerationParams } from "@/lib/image/imageModelRules";
import type { ImageGenerationParams, ImageModel } from "@/types/image";

export type ImageCustomerMode = "T2I" | "I2I";
export type ImageProviderEligibility = "xinhankr_certified" | "oobb_catalog_certified" | "catalog_only" | "blocked";
export type ImageCustomerCapabilityBlockReason =
  | "catalog_unavailable" | "quality_unavailable" | "resolution_unavailable"
  | "aspect_ratio_unavailable" | "reference_limit_exceeded" | "quantity_unavailable" | "provider_unavailable";
export type ImageCustomerCapabilityAdjustment =
  | "quality_normalized" | "single_reference_resolution_normalized" | "resolution_normalized"
  | "aspect_ratio_normalized" | "quantity_normalized" | "excess_references_removed";

export type ImageCustomerResolutionOption = {
  value: string;
  label: string;
  aspectRatio: string;
  providerSize: string;
  mode: ImageCustomerMode;
};

export type ImageCustomerAspectRatioOption = {
  value: string;
  providerSize: string;
  effectivePixelSize: string;
  evidence: "direct" | "existing_direct" | "direct_provider_remap" | "symmetry";
};

export type ImageCustomerCapabilities = {
  model: string;
  modelId: string;
  modes: ImageCustomerMode[];
  mode: ImageCustomerMode;
  availableQualities: string[];
  availableResolutions: string[];
  availableAspectRatios: string[];
  resolutionOptions: ImageCustomerResolutionOption[];
  aspectRatioOptions: ImageCustomerAspectRatioOption[];
  quality: string;
  resolution: string;
  aspectRatio: string;
  effectiveAspectRatio: string;
  effectivePixelSize: string;
  providerSize: string;
  aspectRatioUiMode: "SELECTABLE" | "DERIVED_READ_ONLY";
  referenceLimit: number;
  maxReferences: number;
  quantity: 1;
  quantityMax: 1;
  credit: number;
  creditPreview: number;
  availability: boolean;
  customerSelectable: boolean;
  providerEligibilityCategory: ImageProviderEligibility;
  providerEligibility: ImageProviderEligibility;
  normalizedParams: ImageGenerationParams;
  canGenerate: boolean;
  blockReason: ImageCustomerCapabilityBlockReason | null;
  adjustments: ImageCustomerCapabilityAdjustment[];
  isReducedGptImage2Policy: boolean;
  isNanoPolicy: boolean;
};

type ResolveImageCustomerCapabilitiesInput = { model: ImageModel; params?: Partial<ImageGenerationParams>; referenceCount?: number };
type NativeTuple = Omit<ImageCustomerAspectRatioOption, "value">;

const GPT_IMAGE_2_ALIASES = new Set(["gpt_image_2", "gpt-image-2", "gpt image 2"]);
const NANO_ALIASES = new Set(["nano_banana", "nano-banana", "nano banana", "nano_banana_lite", "nano-banana-lite", "nano banana lite"]);
const TARGET_RATIOS = ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"] as const;

function tuple(providerSize: string, effectivePixelSize = providerSize, evidence: NativeTuple["evidence"] = "direct"): NativeTuple {
  return { providerSize, effectivePixelSize, evidence };
}

export const GPT_IMAGE_2_NATIVE_RATIO_MATRIX = {
  T2I: {
    "1k": {
      "1:1": tuple("1024x1024", "1024x1024", "existing_direct"), "16:9": tuple("1024x576"),
      "9:16": tuple("576x1024"), "4:3": tuple("1024x768"),
      "3:4": tuple("768x1024", "1086x1448", "direct_provider_remap"), "3:2": tuple("1024x688"),
      "2:3": tuple("688x1024", "688x1024", "symmetry"),
    },
    "2k": {
      "1:1": tuple("2048x2048", "2048x2048", "existing_direct"), "16:9": tuple("2048x1152"),
      "9:16": tuple("1152x2048"), "4:3": tuple("2048x1536"), "3:4": tuple("1536x2048"),
      "3:2": tuple("2048x1360"), "2:3": tuple("1360x2048", "1360x2048", "symmetry"),
    },
    "4k": {
      "1:1": tuple("3840x3840"), "16:9": tuple("3840x2160", "3840x2160", "existing_direct"),
      "9:16": tuple("2160x3840"), "4:3": tuple("3840x2880"), "3:4": tuple("2880x3840"),
      "3:2": tuple("3840x2560"), "2:3": tuple("2560x3840", "2560x3840", "symmetry"),
    },
  },
  I2I: {
    "1k": {
      "1:1": tuple("1024x1024", "1024x1024", "existing_direct"), "16:9": tuple("1024x576"),
      "9:16": tuple("576x1024"), "4:3": tuple("1024x768"), "3:4": tuple("768x1024"),
    },
    "2k": { "1:1": tuple("2048x2048") },
    "4k": { "1:1": tuple("3840x3840") },
  },
} as const;

const LEGACY_DEFAULT_RATIO = {
  T2I: { "1k": "1:1", "2k": "1:1", "4k": "16:9" },
  I2I: { "1k": "1:1", "2k": "1:1", "4k": "1:1" },
} as const;

export const GPT_IMAGE_2_CUSTOMER_REFERENCE_LIMIT = 1;
export const NANO_BANANA_CUSTOMER_REFERENCE_LIMIT = 14;
export const IMAGE_OUTPUT_QUANTITY_MAX = 1;

function normalizedKey(value: unknown) { return String(value || "").trim().toLowerCase(); }
function modelKeys(model: ImageModel) { return [model.id, model.providerModel, model.name, model.label].map(normalizedKey); }
function isGptImage2(model: ImageModel) { return modelKeys(model).some((value) => GPT_IMAGE_2_ALIASES.has(value)); }
function isNanoModel(model: ImageModel) { return modelKeys(model).some((value) => NANO_ALIASES.has(value)); }
function sameOption(left: string, right: string) { return normalizedKey(left) === normalizedKey(right); }
function findOption(options: string[], requested: string) {
  const key = normalizedKey(requested);
  return options.find((option) => normalizedKey(option) === key) || "";
}
function selectCatalogOptions(catalogOptions: string[], approvedOptions: readonly string[]) {
  const approved = new Set(approvedOptions.map(normalizedKey));
  return catalogOptions.filter((option) => approved.has(normalizedKey(option)));
}
function matrixFor(mode: ImageCustomerMode, resolution: string): Record<string, NativeTuple> {
  return (GPT_IMAGE_2_NATIVE_RATIO_MATRIX[mode] as Record<string, Record<string, NativeTuple>>)[normalizedKey(resolution)] || {};
}
function ratioOptions(mode: ImageCustomerMode, resolution: string, catalogRatios: readonly string[] = TARGET_RATIOS): ImageCustomerAspectRatioOption[] {
  const matrix = matrixFor(mode, resolution);
  // V2 Catalog intentionally projected an empty GPT Image ratio array. During
  // the V3 rolling transition, the certified client matrix is the safe source;
  // once V3 Catalog is deployed, a non-empty list narrows it normally.
  const effectiveCatalogRatios = catalogRatios.length ? catalogRatios : TARGET_RATIOS;
  const catalog = new Set(effectiveCatalogRatios.map(normalizedKey));
  return TARGET_RATIOS.filter((ratio) => matrix[ratio] && catalog.has(normalizedKey(ratio))).map((value) => ({ value, ...matrix[value] }));
}
function buildResolutionOptions(resolutions: string[], mode: ImageCustomerMode, aspectRatio: string, catalogRatios: readonly string[] = TARGET_RATIOS) {
  return resolutions.map((resolution) => {
    const options = ratioOptions(mode, resolution, catalogRatios);
    const option = options.find((item) => item.value === aspectRatio) || options[0];
    return { value: resolution, label: `${resolution.toUpperCase()} · ${option?.value || ""}`, aspectRatio: option?.value || "", providerSize: option?.providerSize || "", mode };
  });
}
export function getDerivedImageAspectRatio(resolution: string, mode: ImageCustomerMode = "T2I") {
  return (LEGACY_DEFAULT_RATIO[mode] as Record<string, string>)[normalizedKey(resolution)] || "";
}

function baseCapability(model: ImageModel, catalogParams: ImageGenerationParams, referenceCount: number): ImageCustomerCapabilities {
  const mode: ImageCustomerMode = referenceCount > 0 ? "I2I" : "T2I";
  const maxReferences = Math.max(0, model.capabilities.maxReferences || 0);
  const normalizedParams = { ...catalogParams, aspectRatio: catalogParams.aspectRatio || catalogParams.ratio, ratio: catalogParams.aspectRatio || catalogParams.ratio, batchCount: 1 };
  const referenceLimitExceeded = referenceCount > maxReferences;
  const catalogUnavailable = model.available === false;
  const quantityInvalid = catalogParams.batchCount !== 1;
  const blockReason: ImageCustomerCapabilityBlockReason | null = catalogUnavailable ? "catalog_unavailable" : referenceLimitExceeded ? "reference_limit_exceeded" : quantityInvalid ? "quantity_unavailable" : null;
  const effectivePixelSize = model.capabilities.resolutionOptions?.find((item) => sameOption(item.id, normalizedParams.resolution))?.providerSize || "";
  return {
    model: model.id, modelId: model.id, modes: model.capabilities.imageToImage ? ["T2I", "I2I"] : ["T2I"], mode,
    availableQualities: [...model.capabilities.qualities], availableResolutions: [...model.capabilities.resolutions],
    availableAspectRatios: normalizedParams.aspectRatio ? [normalizedParams.aspectRatio] : [],
    resolutionOptions: model.capabilities.resolutions.map((resolution) => ({
      value: resolution,
      label: resolution.toUpperCase(),
      aspectRatio: normalizedParams.aspectRatio || "1:1",
      providerSize: model.capabilities.resolutionOptions?.find((item) => sameOption(item.id, resolution))?.providerSize || "",
      mode,
    })),
    aspectRatioOptions: normalizedParams.aspectRatio ? [{ value: normalizedParams.aspectRatio, providerSize: effectivePixelSize, effectivePixelSize, evidence: "existing_direct" }] : [],
    quality: normalizedParams.quality, resolution: normalizedParams.resolution, aspectRatio: normalizedParams.aspectRatio,
    effectiveAspectRatio: normalizedParams.aspectRatio, effectivePixelSize, providerSize: effectivePixelSize,
    aspectRatioUiMode: "DERIVED_READ_ONLY", referenceLimit: maxReferences, maxReferences, quantity: 1, quantityMax: 1,
    credit: estimateImageCredits(model, normalizedParams), creditPreview: estimateImageCredits(model, normalizedParams),
    availability: !catalogUnavailable, customerSelectable: blockReason === null,
    providerEligibilityCategory: catalogUnavailable ? "blocked" : "catalog_only", providerEligibility: catalogUnavailable ? "blocked" : "catalog_only",
    normalizedParams, canGenerate: blockReason === null, blockReason,
    adjustments: [...(referenceLimitExceeded ? ["excess_references_removed" as const] : []), ...(quantityInvalid ? ["quantity_normalized" as const] : [])],
    isReducedGptImage2Policy: false, isNanoPolicy: false,
  };
}

export function resolveImageCustomerCapabilities({ model, params = {}, referenceCount = 0 }: ResolveImageCustomerCapabilitiesInput): ImageCustomerCapabilities {
  const safeReferenceCount = Math.max(0, Math.floor(Number(referenceCount) || 0));
  const catalogParams = normalizeImageGenerationParams(model, params);

  if (isNanoModel(model)) {
    const mode: ImageCustomerMode = safeReferenceCount > 0 ? "I2I" : "T2I";
    const oneK = findOption(model.capabilities.resolutions, "1k");
    const catalogReferenceMaximum = Math.min(NANO_BANANA_CUSTOMER_REFERENCE_LIMIT, Math.max(0, model.capabilities.maxReferences || 0));
    const i2iNativeOptions = model.capabilities.nativeRatioOptionsByMode?.I2I || [];
    const catalogNativeOptions = model.capabilities.nativeRatioOptionsByMode?.[mode] || [];
    const safeNativeOptions = (catalogNativeOptions.length ? catalogNativeOptions : [{
      value: "1:1", effectivePixelSize: "1024x1024", evidence: "existing_direct", maxReferences: catalogReferenceMaximum
    }]);
    const availableAspectRatios = safeNativeOptions.map((option) => option.value);
    const requestedAspectRatio = String((params.aspectRatio ?? params.ratio ?? catalogParams.aspectRatio) || "1:1");
    const normalizedAspectRatio = findOption(availableAspectRatios, requestedAspectRatio)
      || findOption(availableAspectRatios, "1:1") || availableAspectRatios[0] || "";
    const selectedNativeOption = safeNativeOptions.find((option) => sameOption(option.value, normalizedAspectRatio));
    const selectedReferenceOption = i2iNativeOptions.find((option) => sameOption(option.value, normalizedAspectRatio));
    const selectedReferenceMaximum = i2iNativeOptions.length
      ? Math.max(0, selectedReferenceOption?.maxReferences || 0)
      : sameOption(normalizedAspectRatio, "1:1") ? catalogReferenceMaximum : 0;
    const maxReferences = Math.min(catalogReferenceMaximum, selectedReferenceMaximum);
    const normalizedParams = { ...catalogParams, aspectRatio: normalizedAspectRatio, ratio: normalizedAspectRatio, resolution: oneK, batchCount: 1 };
    const adjustments: ImageCustomerCapabilityAdjustment[] = [];
    if (!sameOption(params.resolution ?? catalogParams.resolution, oneK)) adjustments.push("single_reference_resolution_normalized");
    if (!sameOption(requestedAspectRatio, normalizedAspectRatio)) adjustments.push("aspect_ratio_normalized");
    if (safeReferenceCount > maxReferences) adjustments.push("excess_references_removed");
    if (Number(params.batchCount ?? catalogParams.batchCount) !== 1) adjustments.push("quantity_normalized");
    const catalogUnavailable = model.available === false;
    const blockReason: ImageCustomerCapabilityBlockReason | null = catalogUnavailable ? "provider_unavailable" : !oneK ? "resolution_unavailable" : safeReferenceCount > maxReferences ? "reference_limit_exceeded" : !selectedNativeOption || adjustments.includes("aspect_ratio_normalized") ? "aspect_ratio_unavailable" : null;
    const aspectRatioOptions: ImageCustomerAspectRatioOption[] = safeNativeOptions.map((option) => ({
      value: option.value,
      providerSize: option.effectivePixelSize,
      effectivePixelSize: option.effectivePixelSize,
      evidence: option.evidence as ImageCustomerAspectRatioOption["evidence"],
    }));
    return {
      model: model.id, modelId: model.id, modes: ["T2I", "I2I"], mode,
      availableQualities: [...model.capabilities.qualities], availableResolutions: oneK ? [oneK] : [], availableAspectRatios,
      resolutionOptions: oneK ? [{ value: oneK, label: `${oneK.toUpperCase()} · ${normalizedAspectRatio}`, aspectRatio: normalizedAspectRatio, providerSize: selectedNativeOption?.effectivePixelSize || "", mode }] : [], aspectRatioOptions,
      quality: normalizedParams.quality, resolution: normalizedParams.resolution, aspectRatio: normalizedAspectRatio, effectiveAspectRatio: normalizedAspectRatio,
      effectivePixelSize: selectedNativeOption?.effectivePixelSize || "", providerSize: selectedNativeOption?.effectivePixelSize || "", aspectRatioUiMode: availableAspectRatios.length > 1 ? "SELECTABLE" : "DERIVED_READ_ONLY",
      referenceLimit: maxReferences, maxReferences, quantity: 1, quantityMax: 1,
      credit: estimateImageCredits(model, normalizedParams), creditPreview: estimateImageCredits(model, normalizedParams),
      availability: !catalogUnavailable, customerSelectable: blockReason === null,
      providerEligibilityCategory: catalogUnavailable ? "blocked" : "xinhankr_certified", providerEligibility: catalogUnavailable ? "blocked" : "xinhankr_certified",
      normalizedParams, canGenerate: blockReason === null, blockReason, adjustments, isReducedGptImage2Policy: false, isNanoPolicy: true,
    };
  }

  if (!isGptImage2(model)) return baseCapability(model, catalogParams, safeReferenceCount);

  const mode: ImageCustomerMode = safeReferenceCount > 0 ? "I2I" : "T2I";
  const availableQualities = selectCatalogOptions(model.capabilities.qualities, ["medium"]);
  const maxReferences = model.capabilities.imageToImage ? Math.min(GPT_IMAGE_2_CUSTOMER_REFERENCE_LIMIT, Math.max(0, model.capabilities.maxReferences || 0)) : 0;
  const matrixResolutions = Object.keys(GPT_IMAGE_2_NATIVE_RATIO_MATRIX[mode]);
  const availableResolutions = selectCatalogOptions(model.capabilities.resolutions, matrixResolutions);
  const medium = findOption(availableQualities, "medium");
  const requestedQuality = String(params.quality ?? catalogParams.quality);
  const requestedResolution = String(params.resolution ?? catalogParams.resolution);
  const normalizedResolution = findOption(availableResolutions, requestedResolution) || availableResolutions[0] || "";
  const options = ratioOptions(mode, normalizedResolution, model.capabilities.ratios);
  const availableAspectRatios = options.map((item) => item.value);
  const requestedAspectRatio = String(params.aspectRatio ?? params.ratio ?? catalogParams.aspectRatio);
  const legacyRatio = getDerivedImageAspectRatio(normalizedResolution, mode);
  const normalizedAspectRatio = findOption(availableAspectRatios, requestedAspectRatio) || findOption(availableAspectRatios, legacyRatio) || availableAspectRatios[0] || "";
  const selectedTuple = options.find((item) => item.value === normalizedAspectRatio);
  const requestedQuantity = Number(params.batchCount ?? catalogParams.batchCount);
  const adjustments: ImageCustomerCapabilityAdjustment[] = [];
  if (medium && !sameOption(requestedQuality, medium)) adjustments.push("quality_normalized");
  if (normalizedResolution && !sameOption(requestedResolution, normalizedResolution)) adjustments.push(mode === "I2I" ? "single_reference_resolution_normalized" : "resolution_normalized");
  if (normalizedAspectRatio && !sameOption(requestedAspectRatio, normalizedAspectRatio)) adjustments.push("aspect_ratio_normalized");
  if (requestedQuantity !== 1) adjustments.push("quantity_normalized");
  if (safeReferenceCount > maxReferences) adjustments.push("excess_references_removed");
  const normalizedParams = { ...catalogParams, aspectRatio: normalizedAspectRatio, ratio: normalizedAspectRatio, quality: medium || "", resolution: normalizedResolution, batchCount: 1 };
  const catalogUnavailable = model.available === false;
  const blockReason: ImageCustomerCapabilityBlockReason | null = catalogUnavailable ? "catalog_unavailable"
    : !medium || adjustments.includes("quality_normalized") ? "quality_unavailable"
    : !normalizedResolution || adjustments.includes("single_reference_resolution_normalized") || adjustments.includes("resolution_normalized") ? "resolution_unavailable"
    : !selectedTuple || adjustments.includes("aspect_ratio_normalized") ? "aspect_ratio_unavailable"
    : safeReferenceCount > maxReferences ? "reference_limit_exceeded" : requestedQuantity !== 1 ? "quantity_unavailable" : null;
  return {
    model: model.id, modelId: model.id, modes: ["T2I", "I2I"], mode,
    availableQualities, availableResolutions, availableAspectRatios, resolutionOptions: buildResolutionOptions(availableResolutions, mode, normalizedAspectRatio, model.capabilities.ratios), aspectRatioOptions: options,
    quality: medium || "", resolution: normalizedResolution, aspectRatio: normalizedAspectRatio, effectiveAspectRatio: normalizedAspectRatio,
    effectivePixelSize: selectedTuple?.effectivePixelSize || "", providerSize: selectedTuple?.providerSize || "", aspectRatioUiMode: "SELECTABLE",
    referenceLimit: maxReferences, maxReferences, quantity: 1, quantityMax: 1,
    credit: estimateImageCredits(model, normalizedParams), creditPreview: estimateImageCredits(model, normalizedParams),
    availability: !catalogUnavailable, customerSelectable: blockReason === null,
    providerEligibilityCategory: catalogUnavailable ? "blocked" : "xinhankr_certified", providerEligibility: catalogUnavailable ? "blocked" : "xinhankr_certified",
    normalizedParams, canGenerate: blockReason === null, blockReason, adjustments, isReducedGptImage2Policy: true, isNanoPolicy: false,
  };
}

export function areImageGenerationParamsEqual(left: ImageGenerationParams, right: ImageGenerationParams) {
  return sameOption(left.aspectRatio, right.aspectRatio) && sameOption(left.ratio, right.ratio) && sameOption(left.resolution, right.resolution) && sameOption(left.quality, right.quality) && left.batchCount === right.batchCount;
}
