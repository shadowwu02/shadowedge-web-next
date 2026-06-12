import { apiRequest } from "@/lib/api";
import { normalizeImageHistoryItem } from "@/lib/image/imageHistoryUtils";
import { normalizeImageGenerationParams, normalizeImageModel } from "@/lib/image/imageModelRules";
import type {
  ImageGenerateRequest,
  ImageGenerateResponse,
  ImageHistoryItem,
  ImageJobStatus,
  ImageModel,
  ImageUploadResponse,
} from "@/types/image";

type RawRecord = Record<string, unknown>;

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

  return (envelope.data?.models || []).map(normalizeImageModel);
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

  return {
    id: pickString(data.id, data.mediaId, data.media_id, data.key, url) || url,
    type: "image",
    name: originalName,
    url,
    previewUrl: pickString(data.previewUrl, data.preview_url, data.thumbnailUrl, data.thumbnail_url, url) || url,
    size: Number(data.size || data.bytes || sourceFile?.size || 0) || undefined,
    mimeType,
    filename,
    originalName,
    uploadStatus: "ready",
    raw: payload,
  };
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
  const request = {
    ...payload,
    prompt: String(payload.prompt || "").trim(),
    model: payload.model || payload.modelId || "",
    ratio: payload.ratio || payload.aspect_ratio,
    aspect_ratio: payload.aspect_ratio || payload.ratio,
    referenceImages: (payload.referenceImages || payload.reference_images || []).filter(Boolean),
    reference_images: (payload.reference_images || payload.referenceImages || []).filter(Boolean),
  };

  const envelope = await apiRequest<ImageGenerateResponse>("/api/image/generate", {
    method: "POST",
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
  referenceImages?: string[];
  meta?: Record<string, unknown>;
}): ImageGenerateRequest {
  const normalizedParams = normalizeImageGenerationParams(input.model, {
    ratio: input.params.ratio,
    resolution: input.params.resolution,
    quality: input.params.quality,
    batchCount: input.params.batchCount,
  });

  return {
    prompt: input.prompt.trim(),
    model: input.model.id,
    modelId: input.model.id,
    providerModel: input.model.providerModel,
    ratio: normalizedParams.ratio,
    aspect_ratio: normalizedParams.ratio,
    resolution: normalizedParams.resolution,
    quality: normalizedParams.quality,
    batchCount: normalizedParams.batchCount,
    referenceImages: input.referenceImages || [],
    reference_images: input.referenceImages || [],
    meta: {
      source: "image_workspace",
      model_id: input.model.id,
      provider_model: input.model.providerModel,
      ratio: normalizedParams.ratio,
      resolution: normalizedParams.resolution,
      quality: normalizedParams.quality,
      batchCount: normalizedParams.batchCount,
      referenceCount: input.referenceImages?.length || 0,
      ...(input.meta || {}),
    },
  };
}
