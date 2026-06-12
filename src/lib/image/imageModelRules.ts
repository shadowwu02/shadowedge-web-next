import type { ImageGenerationParams, ImageModel } from "@/types/image";

type RawRecord = Record<string, unknown>;

const fallbackModel: ImageModel = {
  id: "image_auto",
  name: "Auto",
  label: "Auto",
  provider: "higgsfield",
  providerModel: "image_auto",
  capabilities: {
    textToImage: true,
    imageToImage: true,
    maxReferences: 0,
    maxBatchCount: 1,
    ratios: ["auto", "1:1", "16:9", "9:16"],
    resolutions: [],
    qualities: [],
  },
  creditRules: {
    baseCredits: 1,
    unit: "image",
    batchMultiplier: true,
  },
  defaults: {
    ratio: "auto",
    resolution: "",
    quality: "",
    batchCount: 1,
  },
};

function asRecord(value: unknown): RawRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as RawRecord) : {};
}

function pickArray(value: unknown) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function pickBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function pickNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeRecordNumberMap(value: unknown) {
  const record = asRecord(value);
  return Object.fromEntries(
    Object.entries(record)
      .map(([key, entry]) => [key, Number(entry)])
      .filter((entry): entry is [string, number] => Number.isFinite(entry[1])),
  ) as Record<string, number>;
}

export function normalizeImageModel(rawModel: unknown): ImageModel {
  const raw = asRecord(rawModel);
  const capabilities = asRecord(raw.capabilities);
  const defaults = asRecord(raw.defaults);
  const creditRules = asRecord(raw.creditRules);
  const id = String(raw.id || raw.providerModel || raw.name || fallbackModel.id);
  const name = String(raw.name || raw.label || id);
  const maxBatchCount = Math.max(1, pickNumber(capabilities.maxBatchCount ?? raw.maxBatchCount, 1));

  return {
    id,
    name,
    label: name,
    provider: String(raw.provider || fallbackModel.provider),
    providerModel: String(raw.providerModel || raw.provider_model || id),
    capabilities: {
      textToImage: pickBoolean(capabilities.textToImage ?? raw.textToImage, true),
      imageToImage: pickBoolean(capabilities.imageToImage ?? raw.imageToImage, true),
      maxReferences: Math.max(0, pickNumber(capabilities.maxReferences ?? raw.maxReferences, 0)),
      maxBatchCount,
      ratios: pickArray(capabilities.ratios ?? raw.ratios),
      resolutions: pickArray(capabilities.resolutions ?? raw.resolutions),
      qualities: pickArray(capabilities.qualities ?? raw.qualities),
      supportsSeed: pickBoolean(capabilities.supportsSeed ?? raw.supportsSeed, false),
    },
    creditRules: {
      baseCredits: pickNumber(creditRules.baseCredits, 1),
      unit: String(creditRules.unit || "image"),
      batchMultiplier: creditRules.batchMultiplier !== false,
      resolutionCredits: normalizeRecordNumberMap(creditRules.resolutionCredits),
      qualityCredits: normalizeRecordNumberMap(creditRules.qualityCredits),
    },
    defaults: {
      ratio: String(defaults.ratio || ""),
      resolution: String(defaults.resolution || ""),
      quality: String(defaults.quality || ""),
      batchCount: Math.max(1, Math.min(maxBatchCount, pickNumber(defaults.batchCount, 1))),
    },
    raw: rawModel,
  };
}

export function getDefaultImageModel(models: ImageModel[]) {
  return models.find((model) => model.id === "image_auto") || models[0] || fallbackModel;
}

export function getImageModelById(models: ImageModel[], modelId?: string) {
  const key = String(modelId || "").trim();
  if (!key) return getDefaultImageModel(models);
  return models.find((model) => [model.id, model.providerModel, model.name].includes(key)) || getDefaultImageModel(models);
}

function normalizeOption(value: unknown, allowed: string[], fallback: string) {
  const raw = String(value || fallback || "").trim();
  if (!allowed.length) return raw;
  const lower = raw.toLowerCase();
  return allowed.find((item) => item.toLowerCase() === lower) || fallback || allowed[0] || "";
}

export function getDefaultImageParams(model: ImageModel): ImageGenerationParams {
  const ratios = model.capabilities.ratios;
  const resolutions = model.capabilities.resolutions;
  const qualities = model.capabilities.qualities;

  return {
    ratio: normalizeOption(model.defaults.ratio, ratios, ratios[0] || "auto"),
    resolution: normalizeOption(model.defaults.resolution, resolutions, resolutions[0] || ""),
    quality: normalizeOption(model.defaults.quality, qualities, qualities[0] || ""),
    batchCount: Math.max(1, Math.min(model.capabilities.maxBatchCount || 1, Number(model.defaults.batchCount || 1))),
  };
}

export function normalizeImageGenerationParams(model: ImageModel, input: Partial<ImageGenerationParams> = {}): ImageGenerationParams {
  const defaults = getDefaultImageParams(model);
  const maxBatchCount = Math.max(1, model.capabilities.maxBatchCount || 1);
  const requestedBatchCount = Number(input.batchCount || defaults.batchCount || 1);

  return {
    ratio: normalizeOption(input.ratio, model.capabilities.ratios, defaults.ratio),
    resolution: normalizeOption(input.resolution, model.capabilities.resolutions, defaults.resolution),
    quality: normalizeOption(input.quality, model.capabilities.qualities, defaults.quality),
    batchCount: Math.max(1, Math.min(maxBatchCount, Number.isFinite(requestedBatchCount) ? Math.floor(requestedBatchCount) : 1)),
  };
}

function lookupCreditOverride(map: Record<string, number> | undefined, key: string) {
  const lower = String(key || "").toLowerCase();
  const match = Object.entries(map || {}).find(([entryKey]) => entryKey.toLowerCase() === lower);
  return match ? Number(match[1]) : undefined;
}

export function estimateImageCredits(model: ImageModel, params: Partial<ImageGenerationParams> = {}) {
  const normalized = normalizeImageGenerationParams(model, params);
  const rules = model.creditRules || {};
  const resolutionCost = lookupCreditOverride(rules.resolutionCredits, normalized.resolution);
  const qualityCost = lookupCreditOverride(rules.qualityCredits, normalized.quality);
  const unitCost = Math.max(0, resolutionCost ?? qualityCost ?? Number(rules.baseCredits || 1));
  const multiplier = rules.batchMultiplier === false ? 1 : normalized.batchCount;

  return Math.ceil(unitCost * Math.max(1, multiplier));
}

export function canAddImageReference(model: ImageModel, currentCount: number) {
  return currentCount < Math.max(0, model.capabilities.maxReferences || 0);
}
