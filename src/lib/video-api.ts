import { apiRequest } from "@/lib/api";
import type {
  UploadedMediaResponse,
  UploadMediaType,
  VideoGenerationRequest,
  VideoHistoryItem,
  VideoModel,
  VideoStatusResponse,
} from "@/types/video";

type RawModel = Record<string, unknown>;
type RawRecord = Record<string, unknown>;

function buildDurationArray(config: unknown) {
  const item = (config || {}) as { values?: unknown[]; min?: number; max?: number };
  if (Array.isArray(item.values)) return item.values.map(Number).filter(Number.isFinite);
  const min = Number(item.min || 1);
  const max = Number(item.max || 15);
  return Array.from({ length: Math.max(0, max - min + 1) }, (_, index) => min + index);
}

export function normalizeVideoModel(model: RawModel): VideoModel {
  const durations = Array.isArray(model.durations)
    ? model.durations.map(Number).filter(Number.isFinite)
    : buildDurationArray(model.duration);
  const label = String(model.name || model.label || model.id || "Video Model")
    .replace(/\s*HF\s*$/i, "")
    .trim();

  return {
    id: String(model.id || label),
    label,
    provider: String(model.provider || "auto"),
    providerModel: String(model.providerModel || ""),
    desc: String(model.desc || model.type || model.mode || "Video generation"),
    credits: Number(model.credits || 0),
    creditBase: Number(model.creditBase || model.credits || 0),
    durations: durations.length ? durations : [5],
    durationDefault: Number((model.duration as { default?: number } | undefined)?.default || durations[0] || 5),
    ratios: Array.isArray(model.ratios) && model.ratios.length ? model.ratios.map(String) : ["16:9"],
    qualities: Array.isArray(model.resolutions)
      ? model.resolutions.map(String)
      : Array.isArray(model.qualities)
        ? model.qualities.map(String)
        : ["720p"],
    supportsAudio: Boolean(model.supportsAudio),
    uploadSlots: Array.isArray(model.uploadSlots) ? model.uploadSlots.map(String) : ["media"],
    raw: model,
  };
}

export async function getVideoModels() {
  const envelope = await apiRequest<{ models: RawModel[] }>("/api/video/models", {
    method: "GET",
  });
  return (envelope.data?.models || []).map(normalizeVideoModel);
}

function assertRemoteMediaUrl(url: string) {
  const value = String(url || "").trim();
  if (!value) return;
  if (value.startsWith("blob:") || value.startsWith("data:")) {
    throw new Error("Local preview media cannot be sent to generation. Please wait for upload to finish.");
  }
}

function asRecord(value: unknown): RawRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as RawRecord) : {};
}

function pickArray(...values: unknown[]) {
  const array = values.find(Array.isArray);
  return (array || []) as unknown[];
}

function normalizeMediaList(value: unknown): VideoGenerationRequest["mediaList"] {
  return pickArray(value)
    .map((item) => asRecord(item))
    .map((item) => {
      const url = pickString(item.url, item.uri, item.remoteUri, item.videoUrl, item.audioUrl, item.imageUrl) || "";
      return {
        id: pickString(item.id, item.mediaId, item.media_id),
        type: inferUploadType(item.type || item.mimeType || item.mime_type),
        url,
        role: pickString(item.role, item.slot, item.kind) || "reference",
        duration: Number(item.duration || 0) || undefined,
        name: pickString(item.name, item.filename, item.originalName),
        mimeType: pickString(item.mimeType, item.mime_type),
        size: Number(item.size || 0) || undefined,
      };
    })
    .filter((item) => item.url);
}

function extractHistoryItems(data: unknown) {
  if (Array.isArray(data)) return data;
  const record = asRecord(data);
  if (Array.isArray(record.items)) return record.items;
  if (Array.isArray(record.history)) return record.history;
  if (Array.isArray(record.records)) return record.records;
  if (Array.isArray(record.data)) return record.data;
  return [];
}

export function normalizeVideoHistoryItem(item: unknown): VideoHistoryItem {
  const record = asRecord(item);
  const rawMeta = asRecord(record.meta);
  const rawMentionBindings =
    record.mentionBindings || record.mention_bindings || rawMeta.mentionBindings || rawMeta.mention_bindings;
  const meta =
    rawMentionBindings && !rawMeta.mentionBindings
      ? {
          ...rawMeta,
          mentionBindings: rawMentionBindings,
        }
      : rawMeta;
  const uploadAssets = asRecord(record.upload_assets || record.uploadAssets || meta.upload_assets || meta.uploadAssets);
  const outputUrls = pickArray(record.outputUrls, record.output_urls, meta.outputUrls, meta.output_urls)
    .map(String)
    .filter(Boolean);
  const videoUrl =
    pickString(record.videoUrl, record.video_url, record.outputUrl, record.output_url, meta.videoUrl, meta.outputUrl, outputUrls[0]) || "";
  const mediaList = normalizeMediaList(record.mediaList || meta.mediaList || uploadAssets.media);
  const jobId = pickString(record.jobId, record.job_id, record.providerJobId, record.provider_job_id, record.dbJobId, record.id) || "";

  return {
    jobId,
    dbJobId: pickString(record.dbJobId, record.db_job_id, record.id) || null,
    providerJobId: pickString(record.providerJobId, record.provider_job_id) || "",
    status: pickString(record.status, meta.status) || (videoUrl ? "completed" : "unknown"),
    model: pickString(record.model, record.frontendModel, record.frontend_model, meta.frontend_model, meta.model) || "-",
    modelId: pickString(record.modelId, record.model_id, meta.model_id),
    frontendModel: pickString(record.frontendModel, record.frontend_model, meta.frontend_model, record.model),
    providerModel: pickString(record.providerModel, record.provider_model, meta.providerModel, meta.provider_model),
    provider: pickString(record.provider, meta.provider),
    duration: pickString(record.duration, meta.duration),
    ratio: pickString(record.ratio, record.aspect_ratio, meta.ratio, meta.aspect_ratio),
    quality: pickString(record.quality, record.resolution, meta.quality, meta.resolution),
    prompt: pickString(record.prompt, meta.original_prompt, meta.prompt) || "",
    videoUrl,
    outputUrl: pickString(record.outputUrl, record.output_url, meta.outputUrl, meta.output_url),
    outputUrls: outputUrls.length ? outputUrls : videoUrl ? [videoUrl] : [],
    thumbnail: pickString(record.thumbnail, record.thumbnailUrl, record.thumbnail_url, meta.thumbnail, meta.thumbnailUrl),
    thumbnailUrl: pickString(record.thumbnailUrl, record.thumbnail_url, meta.thumbnailUrl, meta.thumbnail_url),
    reference_images: pickArray(record.reference_images, record.referenceImages, meta.reference_images, meta.referenceImages).map(String),
    reference_videos: pickArray(record.reference_videos, record.referenceVideos, meta.reference_videos, meta.referenceVideos).map(String),
    reference_audios: pickArray(record.reference_audios, record.referenceAudios, meta.reference_audios, meta.referenceAudios).map(String),
    mediaList,
    error_message: pickString(record.error_message, record.errorMessage, record.error, meta.error_message, meta.errorMessage),
    errorCode: pickString(record.error_code, record.errorCode, meta.error_code, meta.errorCode),
    message: pickString(record.public_message, record.publicMessage, record.message, meta.message),
    cost_credits: Number(record.cost_credits || record.costCredits || meta.cost_credits || 0) || undefined,
    createdAt: pickString(record.createdAt, record.created_at, meta.createdAt, meta.created_at) || Date.now(),
    updatedAt: pickString(record.updatedAt, record.updated_at, meta.updatedAt, meta.updated_at),
    completedAt: pickString(record.completedAt, record.completed_at, meta.completedAt, meta.completed_at),
    meta,
    retryable: true,
    source: "server",
  };
}

export function normalizeVideoGenerationRequest(request: VideoGenerationRequest): VideoGenerationRequest {
  const referenceImages = (request.reference_images || []).filter(Boolean);
  const referenceVideos = (request.reference_videos || []).filter(Boolean);
  const referenceAudios = (request.reference_audios || []).filter(Boolean);
  const mediaList = (request.mediaList || []).filter((item) => item?.url);

  [...referenceImages, ...referenceVideos, ...referenceAudios, ...mediaList.map((item) => item.url)].forEach(assertRemoteMediaUrl);

  return {
    ...request,
    prompt: String(request.prompt || "").trim(),
    assets: {
      images: (request.assets?.images || []).filter(Boolean),
      videos: (request.assets?.videos || []).filter(Boolean),
      audios: (request.assets?.audios || []).filter(Boolean),
    },
    first_frame_image: request.first_frame_image || "",
    last_frame_image: request.last_frame_image || "",
    reference_images: referenceImages,
    reference_videos: referenceVideos,
    reference_audios: referenceAudios,
    mediaList,
    image: request.image || request.imageUrl || referenceImages[0] || request.assets?.images?.[0] || "",
    imageUrl: request.imageUrl || request.image || referenceImages[0] || request.assets?.images?.[0] || "",
    video: request.video || request.videoUrl || referenceVideos[0] || request.assets?.videos?.[0] || "",
    videoUrl: request.videoUrl || request.video || referenceVideos[0] || request.assets?.videos?.[0] || "",
    upload_assets: {
      media: request.upload_assets?.media || mediaList,
    },
  };
}

export async function generateVideo(request: VideoGenerationRequest) {
  const payload = normalizeVideoGenerationRequest(request);
  return apiRequest<{
    jobId: string;
    providerJobId?: string;
    dbJobId?: string;
    status?: string;
    providerModel?: string;
    provider?: string;
    creditsBalance?: number;
  }>("/api/video/generate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export const createVideoTask = generateVideo;

export async function getVideoStatus(jobId: string, force = false) {
  const params = new URLSearchParams({ jobId, t: String(Date.now()) });
  if (force) params.set("force", "1");
  return apiRequest<VideoStatusResponse>(`/api/video/status?${params.toString()}`, {
    method: "GET",
  });
}

export async function getVideoHistory(limit = 50) {
  const envelope = await apiRequest<unknown>(`/api/video/history?limit=${limit}&t=${Date.now()}`, {
    method: "GET",
  });

  return extractHistoryItems(envelope.data).map(normalizeVideoHistoryItem);
}

export async function saveVideoHistory(record: VideoHistoryItem) {
  return apiRequest<unknown>("/api/video/history", {
    method: "POST",
    body: JSON.stringify(record),
  });
}

function inferUploadType(value: unknown, fallbackType?: string): UploadMediaType {
  const raw = String(value || fallbackType || "").toLowerCase();
  if (raw.startsWith("video/") || raw.includes("video")) return "video";
  if (raw.startsWith("audio/") || raw.includes("audio")) return "audio";
  return "image";
}

function pickString(...values: unknown[]) {
  return values.find((value) => typeof value === "string" && value.trim()) as string | undefined;
}

export function normalizeUploadResponse(payload: unknown, sourceFile?: File): UploadedMediaResponse {
  const envelope = (payload || {}) as {
    data?: Record<string, unknown>;
    url?: unknown;
    mediaUrl?: unknown;
    publicUrl?: unknown;
    fileUrl?: unknown;
    imageUrl?: unknown;
  };
  const data = (envelope.data || envelope || {}) as Record<string, unknown>;
  const url = pickString(
    data.url,
    data.mediaUrl,
    data.media_url,
    data.publicUrl,
    data.public_url,
    data.fileUrl,
    data.file_url,
    data.imageUrl,
    data.image_url,
    envelope.url,
    envelope.mediaUrl,
    envelope.publicUrl,
    envelope.fileUrl,
    envelope.imageUrl,
  );

  if (!url) {
    throw new Error("Upload succeeded but no media URL was returned.");
  }

  const mimeType = pickString(data.mimeType, data.mime_type, data.mimetype, data.type, sourceFile?.type) || "";
  const filename = pickString(data.filename, data.fileName, data.name, sourceFile?.name) || sourceFile?.name || "media";
  const originalName = pickString(data.originalname, data.originalName, sourceFile?.name, filename) || filename;

  return {
    id: pickString(data.id, data.mediaId, data.media_id, data.key, url) || url,
    type: inferUploadType(data.type || data.mimeType || data.mimetype, sourceFile?.type),
    name: originalName,
    url,
    size: Number(data.size || data.bytes || sourceFile?.size || 0) || undefined,
    mimeType,
    filename,
    originalName,
    previewUrl: pickString(data.previewUrl, data.preview_url, data.thumbnailUrl, data.thumbnail_url, url) || url,
    duration: Number(data.duration || data.durationSeconds || 0) || undefined,
    raw: payload,
  };
}

export async function uploadMedia(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const envelope = await apiRequest<Record<string, unknown>>("/api/upload-media", {
    method: "POST",
    body: formData,
  });

  return normalizeUploadResponse(envelope, file);
}
