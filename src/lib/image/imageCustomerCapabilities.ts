import { normalizeImageGenerationParams } from "@/lib/image/imageModelRules";
import type { ImageGenerationParams, ImageModel } from "@/types/image";

export type ImageCustomerCapabilityBlockReason =
  | "catalog_unavailable"
  | "quality_unavailable"
  | "resolution_unavailable"
  | "reference_limit_exceeded";

export type ImageCustomerCapabilityAdjustment =
  | "quality_normalized"
  | "single_reference_resolution_normalized"
  | "excess_references_removed";

export type ImageCustomerCapabilities = {
  availableQualities: string[];
  availableResolutions: string[];
  maxReferences: number;
  normalizedParams: ImageGenerationParams;
  canGenerate: boolean;
  blockReason: ImageCustomerCapabilityBlockReason | null;
  adjustments: ImageCustomerCapabilityAdjustment[];
  isReducedGptImage2Policy: boolean;
};

type ResolveImageCustomerCapabilitiesInput = {
  model: ImageModel;
  params?: Partial<ImageGenerationParams>;
  referenceCount?: number;
};

const GPT_IMAGE_2_ALIASES = new Set(["gpt_image_2", "gpt-image-2", "gpt image 2"]);
const GPT_IMAGE_2_CUSTOMER_QUALITIES = ["medium"];
const GPT_IMAGE_2_T2I_RESOLUTIONS = ["1k", "2k", "4k"];
const GPT_IMAGE_2_I2I_RESOLUTIONS = ["1k"];
export const GPT_IMAGE_2_CUSTOMER_REFERENCE_LIMIT = 1;

function normalizedKey(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function isGptImage2(model: ImageModel) {
  return [model.id, model.providerModel, model.name, model.label]
    .map(normalizedKey)
    .some((value) => GPT_IMAGE_2_ALIASES.has(value));
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

export function resolveImageCustomerCapabilities({
  model,
  params = {},
  referenceCount = 0,
}: ResolveImageCustomerCapabilitiesInput): ImageCustomerCapabilities {
  const safeReferenceCount = Math.max(0, Math.floor(Number(referenceCount) || 0));
  const catalogParams = normalizeImageGenerationParams(model, params);

  if (!isGptImage2(model)) {
    const availableQualities = [...model.capabilities.qualities];
    const availableResolutions = [...model.capabilities.resolutions];
    const maxReferences = Math.max(0, model.capabilities.maxReferences || 0);
    const referenceLimitExceeded = safeReferenceCount > maxReferences;
    const catalogUnavailable = model.available === false;

    return {
      availableQualities,
      availableResolutions,
      maxReferences,
      normalizedParams: catalogParams,
      canGenerate: !catalogUnavailable && !referenceLimitExceeded,
      blockReason: catalogUnavailable
        ? "catalog_unavailable"
        : referenceLimitExceeded
          ? "reference_limit_exceeded"
          : null,
      adjustments: referenceLimitExceeded ? ["excess_references_removed"] : [],
      isReducedGptImage2Policy: false,
    };
  }

  const availableQualities = selectCatalogOptions(model.capabilities.qualities, GPT_IMAGE_2_CUSTOMER_QUALITIES);
  const maxReferences = model.capabilities.imageToImage
    ? Math.min(GPT_IMAGE_2_CUSTOMER_REFERENCE_LIMIT, Math.max(0, model.capabilities.maxReferences || 0))
    : 0;
  const allowedResolutionKeys = safeReferenceCount > 0 ? GPT_IMAGE_2_I2I_RESOLUTIONS : GPT_IMAGE_2_T2I_RESOLUTIONS;
  const availableResolutions = selectCatalogOptions(model.capabilities.resolutions, allowedResolutionKeys);
  const medium = findOption(availableQualities, "medium");
  const oneK = findOption(availableResolutions, "1k");
  const requestedQuality = String(params.quality ?? catalogParams.quality);
  const requestedResolution = String(params.resolution ?? catalogParams.resolution);
  const normalizedQuality = medium || "";
  const normalizedResolution = safeReferenceCount > 0
    ? oneK
    : findOption(availableResolutions, requestedResolution) || availableResolutions[0] || "";
  const adjustments: ImageCustomerCapabilityAdjustment[] = [];

  if (normalizedQuality && !sameOption(requestedQuality, normalizedQuality)) {
    adjustments.push("quality_normalized");
  }
  if (safeReferenceCount > 0 && normalizedResolution && !sameOption(requestedResolution, normalizedResolution)) {
    adjustments.push("single_reference_resolution_normalized");
  }
  if (safeReferenceCount > maxReferences) {
    adjustments.push("excess_references_removed");
  }

  const normalizedParams = {
    ...catalogParams,
    quality: normalizedQuality,
    resolution: normalizedResolution,
  };
  const referenceLimitExceeded = safeReferenceCount > maxReferences;
  const catalogUnavailable = model.available === false;
  const qualityUnavailable = !normalizedQuality;
  const resolutionUnavailable = !normalizedResolution;
  const qualityNeedsNormalization = Boolean(normalizedQuality && !sameOption(requestedQuality, normalizedQuality));
  const resolutionNeedsNormalization = Boolean(
    safeReferenceCount > 0 && normalizedResolution && !sameOption(requestedResolution, normalizedResolution),
  );
  const blockReason: ImageCustomerCapabilityBlockReason | null = catalogUnavailable
    ? "catalog_unavailable"
    : qualityUnavailable || qualityNeedsNormalization
      ? "quality_unavailable"
      : resolutionUnavailable || resolutionNeedsNormalization
        ? "resolution_unavailable"
        : referenceLimitExceeded
          ? "reference_limit_exceeded"
          : null;

  return {
    availableQualities,
    availableResolutions,
    maxReferences,
    normalizedParams,
    canGenerate: blockReason === null,
    blockReason,
    adjustments,
    isReducedGptImage2Policy: true,
  };
}

export function areImageGenerationParamsEqual(left: ImageGenerationParams, right: ImageGenerationParams) {
  return (
    sameOption(left.ratio, right.ratio) &&
    sameOption(left.resolution, right.resolution) &&
    sameOption(left.quality, right.quality) &&
    left.batchCount === right.batchCount
  );
}
