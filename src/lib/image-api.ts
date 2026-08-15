import { apiRequest } from "@/lib/api";
import { normalizeImageHistoryItem } from "@/lib/image/imageHistoryUtils";
import { normalizeImageGenerationParams, normalizeImageModel } from "@/lib/image/imageModelRules";
import { filterRetiredHiggsfieldModels } from "@/lib/higgsfieldProductionRetirement";
import type {
  ImageGenerateRequest,
  ImageGenerateResponse,
  ImageHistoryItem,
  ImageJobStatus,
  ImageModel,
  ImageUploadResponse,
} from "@/types/image";

type RawRecord = Record<string, unknown>;
const canonicalAssetIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const supportedReferenceImageMimes = new Set(["image/png", "image/jpeg", "image/webp"]);

function asRecord(value: unknown): RawRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as RawRecord) : {};
}

function pickString(...values: unknown[]) {
  return values.find((value) => typeof value === "string" && value.trim()) as string | undefined;
}

function pickArray(...values: unknown[]) {
  const array = values.find(Array.isArray);
  return (array || []) as unknown[];
}

function extractItems(data: unknown) {
  if (Array.isArray(data)) return data;
  const record = asRecord(data);
  return pickArray(record.items, record.history, record.records, record.data);
}

export async function getImageModels() {
  const envelope = await apiRequest<{ models?: unknown[] }>("/api/image/models", {
    method: "GET",
  });

  return filterRetiredHiggsfieldModels((envelope.data?.models || []).map(normalizeImageModel));
}

export function normalizeImageUploadResponse(payload: unknown, sourceFile?: File): ImageUploadResponse {
  const envelope = asRecord(payload);
  const data = asRecord(envelope.data || envelope);
  const url = pickString(data.url, data.imageUrl, data.image_url, data.publicUrl, data.public_url);

  if (!url) {
    throw new Error("Image upload succeeded but no URL was returned.");
  }

  const filename = pickString(data.filename, data.name, sourceFile?.name) || sourceFile?.name || "image";
  const originalName = pickString(data.originalName, data.originalname, sourceFile?.name, filename) || filename;
  const mimeType = pickString(data.mimeType, data.mime_type, data.mimetype, sourceFile?.type) || sourceFile?.type || "image";
  const assetId = pickString(data.assetId, data.asset_id);
  const eligibility = asRecord(data.referenceEligibility ?? data.reference_eligibility);
  const canonicalStatus = String(data.canonicalStatus ?? data.canonical_status ?? eligibility.status ?? "").trim().toLowerCase();
  const referenceEligible =
    eligibility.eligible === true &&
    canonicalStatus === "ready" &&
    Boolean(assetId && canonicalAssetIdPattern.test(assetId)) &&
    supportedReferenceImageMimes.has(mimeType.toLowerCase());

  return {
    id: referenceEligible ? assetId! : pickString(data.id, data.mediaId, data.media_id, data.key, url) || url,
    assetId: referenceEligible ? assetId : undefined,
    canonicalStatus: canonicalStatus || (referenceEligible ? "ready" : "failed"),
    referenceEligibility: referenceEligible,
    type: "image",
    name: originalName,
    url,
    previewUrl: pickString(data.previewUrl, data.preview_url, data.thumbnailUrl, data.thumbnail_url, url) || url,
    size: Number(data.size || data.bytes || sourceFile?.size || 0) || undefined,
    mimeType,
    filename,
    originalName,
    uploadStatus: referenceEligible ? "ready" : "not_reference_eligible",
    errorMessage: referenceEligible ? "" : "REFERENCE_ASSET_FINALIZE_REQUIRED",
    raw: payload,
  };
}

export function isCanonicalImageReferenceReady(value: {
  assetId?: string;
  canonicalStatus?: string;
  mimeType?: string;
  referenceEligibility?: boolean;
  uploadStatus?: string;
}) {
  return Boolean(
    value.uploadStatus === "ready" &&
    value.referenceEligibility === true &&
    String(value.canonicalStatus || "").toLowerCase() === "ready" &&
    value.assetId &&
    canonicalAssetIdPattern.test(value.assetId) &&
    supportedReferenceImageMimes.has(String(value.mimeType || "").toLowerCase())
  );
}

export async function uploadImage(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const envelope = await apiRequest<Record<string, unknown>>("/api/image/upload", {
    method: "POST",
    body: formData,
  });

  return normalizeImageUploadResponse(envelope, file);
}

function normalizeGenerateResponse(payload: unknown): ImageGenerateResponse {
  const data = asRecord(payload);
  const params = asRecord(data.params);
  const jobId = pickString(data.jobId, data.dbJobId, data.id);
  const outputUrls = pickArray(data.outputUrls, data.output_urls)
    .map((value) => typeof value === "string" ? value.trim() : "")
    .filter(Boolean);
  const outputUrl = pickString(data.outputUrl, data.output_url, outputUrls[0]) || "";

  if (!jobId) {
    throw new Error("Image generate API returned no jobId.");
  }

  return {
    jobId,
    dbJobId: pickString(data.dbJobId, data.jobId, data.id) || jobId,
    status: String(data.status || "queued"),
    provider: String(data.provider || ""),
    model: String(data.model || ""),
    providerModel: String(data.providerModel || data.provider_model || ""),
    cost: Number(data.cost || data.creditsCharged || 0) || 0,
    creditsBalance: Number(data.creditsBalance || 0) || undefined,
    estimatedOutputCount: Number(data.estimatedOutputCount || data.batchCount || 1) || 1,
    outputUrl,
    outputUrls: Array.from(new Set([outputUrl, ...outputUrls].filter(Boolean))),
    asyncRuntime: pickString(data.asyncRuntime, data.async_runtime),
    outboxId: pickString(data.outboxId, data.outbox_id),
    params: {
      ratio: String(params.ratio || data.ratio || ""),
      resolution: String(params.resolution || data.resolution || ""),
      quality: String(params.quality || data.quality || ""),
      batchCount: Number(params.batchCount || data.batchCount || 1) || 1,
    },
    raw: payload,
  };
}

export async function generateImage(payload: ImageGenerateRequest) {
  const idempotencyKey = payload.idempotencyKey || crypto.randomUUID();
  const request = {
    ...payload,
    prompt: String(payload.prompt || "").trim(),
    model: payload.model || payload.modelId || "",
    ratio: payload.ratio || payload.aspect_ratio,
    aspect_ratio: payload.aspect_ratio || payload.ratio,
    referenceImages: [],
    reference_images: [],
    referenceImageAssetIds: (payload.referenceImageAssetIds || payload.reference_image_asset_ids || []).filter((value) => typeof value === "string" && canonicalAssetIdPattern.test(value)),
    reference_image_asset_ids: (payload.reference_image_asset_ids || payload.referenceImageAssetIds || []).filter((value) => typeof value === "string" && canonicalAssetIdPattern.test(value)),
  };

  const envelope = await apiRequest<ImageGenerateResponse>("/api/image/generate", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(request),
  });

  return normalizeGenerateResponse(envelope.data);
}

export async function getImageStatus(jobId: string) {
  const params = new URLSearchParams({ jobId, t: String(Date.now()) });
  const envelope = await apiRequest<ImageJobStatus>(`/api/image/status?${params.toString()}`, {
    method: "GET",
  });

  return normalizeImageHistoryItem(envelope.data) as ImageJobStatus;
}

export async function getImageHistory(limit = 50): Promise<ImageHistoryItem[]> {
  const envelope = await apiRequest<unknown>(`/api/image/history?limit=${limit}&t=${Date.now()}`, {
    method: "GET",
  });

  return extractItems(envelope.data).map(normalizeImageHistoryItem);
}

export function buildImageGenerateRequest(input: {
  prompt: string;
  model: ImageModel;
  params: Partial<ImageGenerateRequest>;
  referenceImageAssetIds?: string[];
  idempotencyKey?: string;
  meta?: Record<string, unknown>;
}): ImageGenerateRequest {
  const normalizedParams = normalizeImageGenerationParams(input.model, {
    ratio: input.params.ratio,
    resolution: input.params.resolution,
    quality: input.params.quality,
    batchCount: input.params.batchCount,
  });

  return {
    idempotencyKey: input.idempotencyKey || crypto.randomUUID(),
    prompt: input.prompt.trim(),
    model: input.model.id,
    modelId: input.model.id,
    providerModel: input.model.providerModel,
    ratio: normalizedParams.ratio,
    aspect_ratio: normalizedParams.ratio,
    resolution: normalizedParams.resolution,
    quality: normalizedParams.quality,
    batchCount: normalizedParams.batchCount,
    referenceImages: [],
    reference_images: [],
    referenceImageAssetIds: (input.referenceImageAssetIds || []).filter((value) => canonicalAssetIdPattern.test(value)),
    reference_image_asset_ids: (input.referenceImageAssetIds || []).filter((value) => canonicalAssetIdPattern.test(value)),
    meta: {
      source: "image_workspace",
      model_id: input.model.id,
      provider_model: input.model.providerModel,
      ratio: normalizedParams.ratio,
      resolution: normalizedParams.resolution,
      quality: normalizedParams.quality,
      batchCount: normalizedParams.batchCount,
      referenceCount: (input.referenceImageAssetIds || []).filter((value) => canonicalAssetIdPattern.test(value)).length,
      referenceImageAssetIds: (input.referenceImageAssetIds || []).filter((value) => canonicalAssetIdPattern.test(value)),
      ...(input.meta || {}),
    },
  };
}
