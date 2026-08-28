import { estimateImageCredits, normalizeImageGenerationParams } from "@/lib/image/imageModelRules";
import type { ImageGenerationParams, ImageModel } from "@/types/image";

export type ImageCustomerMode = "T2I" | "I2I";
export type ImageProviderEligibility = "xinhankr_certified" | "oobb_catalog_certified" | "catalog_only" | "blocked";

export type ImageCustomerCapabilityBlockReason =
  | "catalog_unavailable"
  | "quality_unavailable"
  | "resolution_unavailable"
  | "aspect_ratio_unavailable"
  | "reference_limit_exceeded"
  | "quantity_unavailable"
  | "provider_unavailable";

export type ImageCustomerCapabilityAdjustment =
  | "quality_normalized"
  | "single_reference_resolution_normalized"
  | "resolution_normalized"
  | "aspect_ratio_normalized"
  | "quantity_normalized"
  | "excess_references_removed";

export type ImageCustomerResolutionOption = {
  value: string;
  label: string;
  aspectRatio: string;
  providerSize: string;
  mode: ImageCustomerMode;
};

export type ImageCustomerCapabilities = {
  model: string;
  modelId: string;
  modes: ImageCustomerMode[];
  mode: ImageCustomerMode;
  availableQualities: string[];
  availableResolutions: string[];
  resolutionOptions: ImageCustomerResolutionOption[];
  quality: string;
  resolution: string;
  aspectRatio: string;
  effectiveAspectRatio: string;
  effectivePixelSize: string;
  aspectRatioUiMode: "DERIVED_READ_ONLY";
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

type ResolveImageCustomerCapabilitiesInput = {
  model: ImageModel;
  params?: Partial<ImageGenerationParams>;
  referenceCount?: number;
};

const GPT_IMAGE_2_ALIASES = new Set(["gpt_image_2", "gpt-image-2", "gpt image 2"]);
const NANO_ALIASES = new Set([
  "nano_banana", "nano-banana", "nano banana",
  "nano_banana_lite", "nano-banana-lite", "nano banana lite",
]);
const GPT_IMAGE_2_CUSTOMER_QUALITIES = ["medium"];
const GPT_IMAGE_2_T2I_RESOLUTIONS = ["1k", "2k", "4k"];
const GPT_IMAGE_2_I2I_RESOLUTIONS = ["1k"];
const RESOLUTION_CONTRACT = Object.freeze({
  "1k": Object.freeze({ aspectRatio: "1:1", providerSize: "1024x1024" }),
  "2k": Object.freeze({ aspectRatio: "1:1", providerSize: "2048x2048" }),
  "4k": Object.freeze({ aspectRatio: "16:9", providerSize: "3840x2160" }),
});

export const GPT_IMAGE_2_CUSTOMER_REFERENCE_LIMIT = 1;
export const NANO_BANANA_CUSTOMER_REFERENCE_LIMIT = 14;
export const IMAGE_OUTPUT_QUANTITY_MAX = 1;

function normalizedKey(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function modelKeys(model: ImageModel) {
  return [model.id, model.providerModel, model.name, model.label].map(normalizedKey);
}

function isGptImage2(model: ImageModel) {
  return modelKeys(model).some((value) => GPT_IMAGE_2_ALIASES.has(value));
}

function isNanoModel(model: ImageModel) {
  return modelKeys(model).some((value) => NANO_ALIASES.has(value));
}

function selectCatalogOptions(catalogOptions: string[], approvedOptions: string[]) {
  const approved = new Set(approvedOptions.map(normalizedKey));
  return catalogOptions.filter((option) => approved.has(normalizedKey(option)));
}

function findOption(options: string[], requested: string) {
  const key = normalizedKey(requested);
  return options.find((option) => normalizedKey(option) === key) || "";
}

function sameOption(left: string, right: string) {
  return normalizedKey(left) === normalizedKey(right);
}

function resolutionContract(value: string) {
  return RESOLUTION_CONTRACT[normalizedKey(value) as keyof typeof RESOLUTION_CONTRACT] || null;
}

function buildResolutionOptions(resolutions: string[], mode: ImageCustomerMode) {
  return resolutions.map((resolution) => {
    const contract = resolutionContract(resolution);
    return {
      value: resolution,
      label: `${resolution.toUpperCase()} · ${contract?.aspectRatio || "1:1"}`,
      aspectRatio: contract?.aspectRatio || "1:1",
      providerSize: contract?.providerSize || "",
      mode,
    } satisfies ImageCustomerResolutionOption;
  });
}

export function getDerivedImageAspectRatio(resolution: string, mode: ImageCustomerMode = "T2I") {
  if (mode === "I2I") return normalizedKey(resolution) === "1k" ? "1:1" : "";
  return resolutionContract(resolution)?.aspectRatio || "";
}

function baseCapability(model: ImageModel, catalogParams: ImageGenerationParams, referenceCount: number): ImageCustomerCapabilities {
  const mode: ImageCustomerMode = referenceCount > 0 ? "I2I" : "T2I";
  const maxReferences = Math.max(0, model.capabilities.maxReferences || 0);
  const normalizedParams = {
    ...catalogParams,
    aspectRatio: catalogParams.aspectRatio || catalogParams.ratio,
    ratio: catalogParams.aspectRatio || catalogParams.ratio,
    batchCount: 1,
  };
  const referenceLimitExceeded = referenceCount > maxReferences;
  const catalogUnavailable = model.available === false;
  const quantityInvalid = catalogParams.batchCount !== 1;
  const blockReason: ImageCustomerCapabilityBlockReason | null = catalogUnavailable
    ? "catalog_unavailable"
    : referenceLimitExceeded
      ? "reference_limit_exceeded"
      : quantityInvalid
        ? "quantity_unavailable"
        : null;
  return {
    model: model.id,
    modelId: model.id,
    modes: model.capabilities.imageToImage ? ["T2I", "I2I"] : ["T2I"],
    mode,
    availableQualities: [...model.capabilities.qualities],
    availableResolutions: [...model.capabilities.resolutions],
    resolutionOptions: model.capabilities.resolutions.map((resolution) => ({
      value: resolution,
      label: `${resolution.toUpperCase()} · ${normalizedParams.aspectRatio || "1:1"}`,
      aspectRatio: normalizedParams.aspectRatio || "1:1",
      providerSize: model.capabilities.resolutionOptions?.find((item) => sameOption(item.id, resolution))?.providerSize || "",
      mode,
    })),
    quality: normalizedParams.quality,
    resolution: normalizedParams.resolution,
    aspectRatio: normalizedParams.aspectRatio,
    effectiveAspectRatio: normalizedParams.aspectRatio,
    effectivePixelSize: model.capabilities.resolutionOptions?.find((item) => sameOption(item.id, normalizedParams.resolution))?.providerSize || "",
    aspectRatioUiMode: "DERIVED_READ_ONLY",
    referenceLimit: maxReferences,
    maxReferences,
    quantity: 1,
    quantityMax: 1,
    credit: estimateImageCredits(model, normalizedParams),
    creditPreview: estimateImageCredits(model, normalizedParams),
    availability: !catalogUnavailable,
    customerSelectable: blockReason === null,
    providerEligibilityCategory: catalogUnavailable ? "blocked" : "catalog_only",
    providerEligibility: catalogUnavailable ? "blocked" : "catalog_only",
    normalizedParams,
    canGenerate: blockReason === null,
    blockReason,
    adjustments: [
      ...(referenceLimitExceeded ? ["excess_references_removed" as const] : []),
      ...(quantityInvalid ? ["quantity_normalized" as const] : []),
    ],
    isReducedGptImage2Policy: false,
    isNanoPolicy: false,
  };
}

export function resolveImageCustomerCapabilities({
  model,
  params = {},
  referenceCount = 0,
}: ResolveImageCustomerCapabilitiesInput): ImageCustomerCapabilities {
  const safeReferenceCount = Math.max(0, Math.floor(Number(referenceCount) || 0));
  const catalogParams = normalizeImageGenerationParams(model, params);

  if (isNanoModel(model)) {
    const mode: ImageCustomerMode = safeReferenceCount > 0 ? "I2I" : "T2I";
    const oneK = findOption(model.capabilities.resolutions, "1k");
    const maxReferences = Math.min(NANO_BANANA_CUSTOMER_REFERENCE_LIMIT, Math.max(0, model.capabilities.maxReferences || 0));
    const normalizedParams = { ...catalogParams, aspectRatio: "1:1", ratio: "1:1", resolution: oneK, batchCount: 1 };
    const adjustments: ImageCustomerCapabilityAdjustment[] = [];
    if (!sameOption(params.resolution ?? catalogParams.resolution, oneK)) adjustments.push("single_reference_resolution_normalized");
    if (!sameOption(params.aspectRatio ?? params.ratio ?? catalogParams.aspectRatio, "1:1")) adjustments.push("aspect_ratio_normalized");
    if (safeReferenceCount > maxReferences) adjustments.push("excess_references_removed");
    if (Number(params.batchCount ?? catalogParams.batchCount) !== 1) adjustments.push("quantity_normalized");
    // Customer readiness is a public catalog decision. The browser must not
    // couple capability admission to an internal provider/routing identity,
    // which is intentionally redacted by the backend public model contract.
    const catalogUnavailable = model.available === false;
    const blockReason: ImageCustomerCapabilityBlockReason | null = catalogUnavailable
      ? "provider_unavailable"
      : !oneK
        ? "resolution_unavailable"
        : safeReferenceCount > maxReferences
          ? "reference_limit_exceeded"
          : adjustments.length
            ? "aspect_ratio_unavailable"
            : null;
    return {
      model: model.id,
      modelId: model.id,
      modes: ["T2I", "I2I"],
      mode,
      availableQualities: [...model.capabilities.qualities],
      availableResolutions: oneK ? [oneK] : [],
      resolutionOptions: oneK ? buildResolutionOptions([oneK], mode) : [],
      quality: normalizedParams.quality,
      resolution: normalizedParams.resolution,
      aspectRatio: "1:1",
      effectiveAspectRatio: "1:1",
      effectivePixelSize: resolutionContract(oneK)?.providerSize || "1024x1024",
      aspectRatioUiMode: "DERIVED_READ_ONLY",
      referenceLimit: maxReferences,
      maxReferences,
      quantity: 1,
      quantityMax: 1,
      credit: estimateImageCredits(model, normalizedParams),
      creditPreview: estimateImageCredits(model, normalizedParams),
      availability: !catalogUnavailable,
      customerSelectable: blockReason === null,
      providerEligibilityCategory: catalogUnavailable ? "blocked" : "oobb_catalog_certified",
      providerEligibility: catalogUnavailable ? "blocked" : "oobb_catalog_certified",
      normalizedParams,
      canGenerate: blockReason === null,
      blockReason,
      adjustments,
      isReducedGptImage2Policy: false,
      isNanoPolicy: true,
    };
  }

  if (!isGptImage2(model)) return baseCapability(model, catalogParams, safeReferenceCount);

  const mode: ImageCustomerMode = safeReferenceCount > 0 ? "I2I" : "T2I";
  const availableQualities = selectCatalogOptions(model.capabilities.qualities, GPT_IMAGE_2_CUSTOMER_QUALITIES);
  const maxReferences = model.capabilities.imageToImage
    ? Math.min(GPT_IMAGE_2_CUSTOMER_REFERENCE_LIMIT, Math.max(0, model.capabilities.maxReferences || 0))
    : 0;
  const allowedResolutionKeys = mode === "I2I" ? GPT_IMAGE_2_I2I_RESOLUTIONS : GPT_IMAGE_2_T2I_RESOLUTIONS;
  const availableResolutions = selectCatalogOptions(model.capabilities.resolutions, allowedResolutionKeys);
  const medium = findOption(availableQualities, "medium");
  const requestedQuality = String(params.quality ?? catalogParams.quality);
  const requestedResolution = String(params.resolution ?? catalogParams.resolution);
  const normalizedQuality = medium || "";
  const normalizedResolution = mode === "I2I"
    ? findOption(availableResolutions, "1k")
    : findOption(availableResolutions, requestedResolution) || availableResolutions[0] || "";
  const derivedAspectRatio = getDerivedImageAspectRatio(normalizedResolution, mode);
  const requestedAspectRatio = String(params.aspectRatio ?? params.ratio ?? catalogParams.aspectRatio);
  const requestedQuantity = Number(params.batchCount ?? catalogParams.batchCount);
  const adjustments: ImageCustomerCapabilityAdjustment[] = [];

  if (normalizedQuality && !sameOption(requestedQuality, normalizedQuality)) adjustments.push("quality_normalized");
  if (mode === "I2I" && normalizedResolution && !sameOption(requestedResolution, normalizedResolution)) {
    adjustments.push("single_reference_resolution_normalized");
  } else if (mode === "T2I" && normalizedResolution && !sameOption(requestedResolution, normalizedResolution)) {
    adjustments.push("resolution_normalized");
  }
  if (derivedAspectRatio && !sameOption(requestedAspectRatio, derivedAspectRatio)) adjustments.push("aspect_ratio_normalized");
  if (requestedQuantity !== 1) adjustments.push("quantity_normalized");
  if (safeReferenceCount > maxReferences) adjustments.push("excess_references_removed");

  const normalizedParams = {
    ...catalogParams,
    aspectRatio: derivedAspectRatio,
    ratio: derivedAspectRatio,
    quality: normalizedQuality,
    resolution: normalizedResolution,
    batchCount: 1,
  };
  const catalogUnavailable = model.available === false;
  const blockReason: ImageCustomerCapabilityBlockReason | null = catalogUnavailable
    ? "catalog_unavailable"
    : !normalizedQuality || adjustments.includes("quality_normalized")
      ? "quality_unavailable"
      : !normalizedResolution || adjustments.includes("single_reference_resolution_normalized") || adjustments.includes("resolution_normalized")
        ? "resolution_unavailable"
        : !derivedAspectRatio || adjustments.includes("aspect_ratio_normalized")
          ? "aspect_ratio_unavailable"
          : safeReferenceCount > maxReferences
            ? "reference_limit_exceeded"
            : requestedQuantity !== 1
              ? "quantity_unavailable"
              : null;

  return {
    model: model.id,
    modelId: model.id,
    modes: ["T2I", "I2I"],
    mode,
    availableQualities,
    availableResolutions,
    resolutionOptions: buildResolutionOptions(availableResolutions, mode),
    quality: normalizedQuality,
    resolution: normalizedResolution,
    aspectRatio: derivedAspectRatio,
    effectiveAspectRatio: derivedAspectRatio,
    effectivePixelSize: resolutionContract(normalizedResolution)?.providerSize || "",
    aspectRatioUiMode: "DERIVED_READ_ONLY",
    referenceLimit: maxReferences,
    maxReferences,
    quantity: 1,
    quantityMax: 1,
    credit: estimateImageCredits(model, normalizedParams),
    creditPreview: estimateImageCredits(model, normalizedParams),
    availability: !catalogUnavailable,
    customerSelectable: blockReason === null,
    providerEligibilityCategory: catalogUnavailable ? "blocked" : "xinhankr_certified",
    providerEligibility: catalogUnavailable ? "blocked" : "xinhankr_certified",
    normalizedParams,
    canGenerate: blockReason === null,
    blockReason,
    adjustments,
    isReducedGptImage2Policy: true,
    isNanoPolicy: false,
  };
}

export function areImageGenerationParamsEqual(left: ImageGenerationParams, right: ImageGenerationParams) {
  return (
    sameOption(left.aspectRatio, right.aspectRatio) &&
    sameOption(left.ratio, right.ratio) &&
    sameOption(left.resolution, right.resolution) &&
    sameOption(left.quality, right.quality) &&
    left.batchCount === right.batchCount
  );
}
