import { apiRequest } from "@/lib/api";
import { getStoredAuthToken } from "@/lib/auth";
import { ApiError } from "@/types/api";
import type {
  RemakeMode,
  RemakeSegment,
  RemakeSourceVideoMetadata,
  RemakeStoryboard,
  RemakeTargetRegion,
} from "@/components/video/remake/remakeTypes";
import { getSafeHistoryOutputUrl, getSafeHistoryThumbnailUrl } from "@/lib/video/historyUtils";
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

export type VideoRemakeReverseAnalyzeInput = {
  characterRules: string;
  mode: RemakeMode;
  sceneStyle: string;
  sourceFileName?: string;
  sourceLanguage?: string;
  sourceVideoUrl?: string;
  targetLanguage?: string;
  targetRegion: RemakeTargetRegion;
  translateDialogue: boolean;
};

export type VideoRemakeReverseAnalyzeResponse = {
  meta?: {
    analysisId?: string;
    analysisSource?: "fallback" | "vlm";
    estimatedCredits?: number;
    metadataOnly?: boolean;
    mock?: boolean;
    nextStep?: string;
    segments?: RemakeSegment[];
    sourceVideo?: RemakeSourceVideoMetadata;
    fallbackReason?: string;
    vlmFailed?: boolean;
    vlmModel?: string;
    vlmProvider?: string;
    vlmUnavailable?: boolean;
  };
  storyboard: RemakeStoryboard;
};

export type VideoRemakeLongAnalysisStage =
  | "queued"
  | "reading_metadata"
  | "extracting_keyframes"
  | "building_storyboard"
  | "completed"
  | "failed";

export type VideoRemakeLongAnalysisStatus = "queued" | "processing" | "completed" | "failed";

export type VideoRemakeLongAnalysisJob = {
  analysisJobId: string;
  status: VideoRemakeLongAnalysisStatus;
  progress: number;
  stage: VideoRemakeLongAnalysisStage;
  result?: {
    note?: string;
    remakePrompt?: string;
    scenes?: unknown[];
    segments?: RemakeSegment[];
    shotList?: unknown[];
    sourceVideo?: RemakeSourceVideoMetadata;
    storyboard?: RemakeStoryboard;
    summary?: string;
  } | null;
  sourceVideo?: RemakeSourceVideoMetadata;
  errorCode?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
};

export type VideoRemakeLongAnalysisCreateInput = {
  analysisEngine?: "mock" | "real_vlm";
  clientRequestId?: string;
  confirmCost?: boolean;
  estimateId?: string;
  sourceAssetId?: string;
  sourceVideoUrl: string;
};

export type VideoRemakeLongAnalysisCostEstimateInput = {
  analysisEngine?: "mock" | "real_vlm";
  sourceAssetId?: string;
  sourceVideoUrl: string;
};

export type VideoRemakeLongAnalysisAdapterStatus = {
  connected: boolean;
  dryRunOnly: boolean;
  maxDurationSeconds?: number;
  maxFrames?: number;
  maxSegments?: number;
  provider: string;
  providerCallMade?: boolean;
  requestBuilderReady?: boolean;
  supportsRealCalls: boolean;
};

export type VideoRemakeLongAnalysisCostEstimate = {
  analysisMode: "mock_only" | "real_vlm";
  adapterStatus?: VideoRemakeLongAnalysisAdapterStatus;
  balance: number | null;
  billableNow: boolean;
  chargeCreditsNow: number;
  estimatedCredits: number;
  estimatedCreditsIfRealVlm: number;
  estimatedCostUnits: number | null;
  estimatedKeyframeCount: number | null;
  estimatedSegmentCount: number | null;
  hasEnoughCredits: boolean;
  message: string;
  mode: "long_video";
  requiresConfirmation: boolean;
  requiresMetadataProbe: boolean;
  requiresRealVlmEnabled: boolean;
  safety: {
    adapterDryRunOnly?: boolean;
    mockOnly: boolean;
    supportsRealCalls?: boolean;
    vlmEnabled: boolean;
    willCallProvider: boolean;
    willChargeCredits: boolean;
  };
};

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

function getReverseAnalyzeErrorMessage(payload: unknown) {
  const record = asRecord(payload);
  return pickString(record.message, record.error, record.code) || "Reverse analyze API request failed.";
}

export async function reverseAnalyzeVideoRemake(input: VideoRemakeReverseAnalyzeInput): Promise<VideoRemakeReverseAnalyzeResponse> {
  let response: Response;
  const token = getStoredAuthToken();

  try {
    response = await fetch("/api/internal/video/reverse-analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(input),
      cache: "no-store",
    });
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Reverse analyze API is unavailable.");
  }

  const text = await response.text();
  let payload: unknown = null;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = {
      ok: false,
      error: text,
    };
  }

  const record = asRecord(payload);
  if (!response.ok || record.ok === false) {
    throw new ApiError(getReverseAnalyzeErrorMessage(record), {
      code: pickString(record.code, record.error_code, record.errorCode),
      kind: response.status === 401 ? "auth" : response.status >= 500 ? "server" : "unknown",
      payload: record,
      status: response.status,
    });
  }

  const data = asRecord(record.data);
  const storyboard = (record.storyboard || data.storyboard) as RemakeStoryboard | undefined;

  if (!storyboard?.shots?.length) {
    throw new Error("Reverse analyze API returned no storyboard.");
  }

  return {
    meta: asRecord(record.meta || data.meta) as VideoRemakeReverseAnalyzeResponse["meta"],
    storyboard,
  };
}

function normalizeLongAnalysisJob(payload: unknown): VideoRemakeLongAnalysisJob {
  const record = asRecord(payload);
  const job = asRecord(record.job || record.data || record);
  const result = asRecord(job.result || record.result);
  const sourceVideo = asRecord(job.sourceVideo || result.sourceVideo);
  const analysisJobId = pickString(job.analysisJobId, job.id, record.analysisJobId, record.id) || "";

  return {
    analysisJobId,
    errorCode: pickString(job.errorCode, job.error_code, record.errorCode, record.error),
    errorMessage: pickString(job.errorMessage, job.error_message, record.errorMessage, record.message),
    metadata: asRecord(job.metadata),
    progress: Math.min(1, Math.max(0, Number(job.progress ?? record.progress ?? 0) || 0)),
    result: Object.keys(result).length ? (result as VideoRemakeLongAnalysisJob["result"]) : null,
    sourceVideo: Number(sourceVideo.duration)
      ? {
          codec: pickString(sourceVideo.codec),
          duration: Number(sourceVideo.duration),
          fps: Number(sourceVideo.fps) || undefined,
          height: Number(sourceVideo.height) || undefined,
          width: Number(sourceVideo.width) || undefined,
        }
      : undefined,
    stage: (pickString(job.stage, record.stage) || "queued") as VideoRemakeLongAnalysisStage,
    status: (pickString(job.status, record.status) || "queued") as VideoRemakeLongAnalysisStatus,
  };
}

function normalizeLongAnalysisCostEstimate(payload: unknown): VideoRemakeLongAnalysisCostEstimate {
  const record = asRecord(payload);
  const estimate = asRecord(record.estimate || asRecord(record.data).estimate || record);
  const adapter = asRecord(estimate.adapterStatus || record.adapterStatus || asRecord(record.data).adapterStatus);
  const safety = asRecord(estimate.safety);
  const analysisMode = pickString(estimate.analysisMode) === "real_vlm" ? "real_vlm" : "mock_only";

  return {
    analysisMode,
    adapterStatus: Object.keys(adapter).length
      ? {
          connected: adapter.connected === true,
          dryRunOnly: adapter.dryRunOnly === true,
          maxDurationSeconds: Number.isFinite(Number(adapter.maxDurationSeconds)) ? Number(adapter.maxDurationSeconds) : undefined,
          maxFrames: Number.isFinite(Number(adapter.maxFrames)) ? Number(adapter.maxFrames) : undefined,
          maxSegments: Number.isFinite(Number(adapter.maxSegments)) ? Number(adapter.maxSegments) : undefined,
          provider: pickString(adapter.provider) || "disabled",
          providerCallMade: adapter.providerCallMade === true,
          requestBuilderReady: adapter.requestBuilderReady === true,
          supportsRealCalls: adapter.supportsRealCalls === true,
        }
      : undefined,
    balance: Number.isFinite(Number(estimate.balance)) ? Number(estimate.balance) : null,
    billableNow: estimate.billableNow === true,
    chargeCreditsNow: Number(estimate.chargeCreditsNow || 0),
    estimatedCredits: Number(estimate.estimatedCredits || 0),
    estimatedCreditsIfRealVlm: Number(estimate.estimatedCreditsIfRealVlm || 0),
    estimatedCostUnits: Number.isFinite(Number(estimate.estimatedCostUnits)) ? Number(estimate.estimatedCostUnits) : null,
    estimatedKeyframeCount: Number.isFinite(Number(estimate.estimatedKeyframeCount)) ? Number(estimate.estimatedKeyframeCount) : null,
    estimatedSegmentCount: Number.isFinite(Number(estimate.estimatedSegmentCount)) ? Number(estimate.estimatedSegmentCount) : null,
    hasEnoughCredits: estimate.hasEnoughCredits !== false,
    message: pickString(estimate.message) || "",
    mode: "long_video",
    requiresConfirmation: estimate.requiresConfirmation === true,
    requiresMetadataProbe: estimate.requiresMetadataProbe === true,
    requiresRealVlmEnabled: estimate.requiresRealVlmEnabled === true,
    safety: {
      adapterDryRunOnly: safety.adapterDryRunOnly === true,
      mockOnly: safety.mockOnly !== false,
      supportsRealCalls: safety.supportsRealCalls === true,
      vlmEnabled: safety.vlmEnabled === true,
      willCallProvider: safety.willCallProvider === true,
      willChargeCredits: safety.willChargeCredits === true,
    },
  };
}

export async function estimateLongVideoRemakeAnalysisCost(input: VideoRemakeLongAnalysisCostEstimateInput) {
  const sourceAssetId = input.sourceAssetId?.trim() || undefined;
  const envelope = await apiRequest<VideoRemakeLongAnalysisCostEstimate>("/api/remake/long-video-cost-estimate", {
    method: "POST",
    body: JSON.stringify({
      analysisEngine: input.analysisEngine || "mock",
      mode: "long_video",
      sourceAssetId,
      sourceVideoUrl: sourceAssetId ? undefined : input.sourceVideoUrl,
    }),
  });

  return normalizeLongAnalysisCostEstimate(envelope.data || envelope);
}

export async function createLongVideoRemakeAnalysis(input: VideoRemakeLongAnalysisCreateInput) {
  const sourceAssetId = input.sourceAssetId?.trim() || undefined;
  const envelope = await apiRequest<VideoRemakeLongAnalysisJob>("/api/remake/analyze-long-video", {
    method: "POST",
    body: JSON.stringify({
      analysisEngine: input.analysisEngine || "mock",
      clientRequestId: input.clientRequestId,
      confirmCost: input.confirmCost,
      estimateId: input.estimateId,
      mode: "long_video",
      sourceAssetId,
      sourceVideoUrl: sourceAssetId ? undefined : input.sourceVideoUrl,
    }),
  });

  return normalizeLongAnalysisJob(envelope.data || envelope);
}

export async function getLongVideoRemakeAnalysisStatus(analysisJobId: string) {
  const envelope = await apiRequest<VideoRemakeLongAnalysisJob>(`/api/remake/analysis-status/${encodeURIComponent(analysisJobId)}`, {
    method: "GET",
  });

  return normalizeLongAnalysisJob(envelope.data || envelope);
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
    .map((item) => {
      if (typeof item === "string") {
        const url = item.trim();
        return {
          type: inferUploadType(url),
          url,
        };
      }

      const raw = asRecord(item);
      const url = pickString(raw.url, raw.uri, raw.remoteUri, raw.videoUrl, raw.audioUrl, raw.imageUrl) || "";
      return {
        id: pickString(raw.id, raw.mediaId, raw.media_id),
        type: inferUploadType(raw.type || raw.mimeType || raw.mime_type || url),
        url,
        role: pickString(raw.role, raw.slot, raw.kind) || "reference",
        duration: Number(raw.duration || 0) || undefined,
        name: pickString(raw.name, raw.filename, raw.originalName),
        mimeType: pickString(raw.mimeType, raw.mime_type),
        size: Number(raw.size || 0) || undefined,
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
  const assets = asRecord(record.assets || meta.assets);
  const outputUrls = pickArray(record.outputUrls, record.output_urls, meta.outputUrls, meta.output_urls)
    .map(String)
    .filter(Boolean);
  const normalizedOutputUrl = getSafeHistoryOutputUrl(record);
  const normalizedThumbnailUrl = getSafeHistoryThumbnailUrl(record);
  const videoUrl =
    pickString(record.videoUrl, record.video_url, record.outputUrl, record.output_url, meta.videoUrl, meta.outputUrl, outputUrls[0], normalizedOutputUrl) || "";
  const firstFrameImage = pickString(
    record.first_frame_image,
    record.firstFrameImage,
    record.firstFrame,
    meta.first_frame_image,
    meta.firstFrameImage,
    uploadAssets.first_frame_image,
    uploadAssets.firstFrameImage,
  );
  const lastFrameImage = pickString(
    record.last_frame_image,
    record.lastFrameImage,
    record.lastFrame,
    meta.last_frame_image,
    meta.lastFrameImage,
    uploadAssets.last_frame_image,
    uploadAssets.lastFrameImage,
  );
  const referenceImages = pickArray(record.reference_images, record.referenceImages, meta.reference_images, meta.referenceImages).map(String);
  const referenceVideos = pickArray(record.reference_videos, record.referenceVideos, meta.reference_videos, meta.referenceVideos).map(String);
  const referenceAudios = pickArray(record.reference_audios, record.referenceAudios, meta.reference_audios, meta.referenceAudios).map(String);
  const mediaList = normalizeMediaList([
    ...pickArray(record.mediaList, meta.mediaList, uploadAssets.media),
    ...(firstFrameImage ? [{ type: "image", url: firstFrameImage, role: "start_frame" }] : []),
    ...(lastFrameImage ? [{ type: "image", url: lastFrameImage, role: "end_frame" }] : []),
    ...referenceImages.map((url) => ({ type: "image", url, role: "reference" })),
    ...referenceVideos.map((url) => ({ type: "video", url, role: "reference" })),
    ...referenceAudios.map((url) => ({ type: "audio", url, role: "reference" })),
    ...pickArray(assets.images).map((url) => ({ type: "image", url, role: "reference" })),
    ...pickArray(assets.videos).map((url) => ({ type: "video", url, role: "reference" })),
    ...pickArray(assets.audios).map((url) => ({ type: "audio", url, role: "reference" })),
    ...pickArray(uploadAssets.images).map((url) => ({ type: "image", url, role: "reference" })),
    ...pickArray(uploadAssets.videos).map((url) => ({ type: "video", url, role: "reference" })),
    ...pickArray(uploadAssets.audios).map((url) => ({ type: "audio", url, role: "reference" })),
    ...pickArray(uploadAssets.reference_images).map((url) => ({ type: "image", url, role: "reference" })),
    ...pickArray(uploadAssets.reference_videos).map((url) => ({ type: "video", url, role: "reference" })),
    ...pickArray(uploadAssets.reference_audios).map((url) => ({ type: "audio", url, role: "reference" })),
  ]);
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
    thumbnail: pickString(record.thumbnail, record.thumbnailUrl, record.thumbnail_url, meta.thumbnail, meta.thumbnailUrl, normalizedThumbnailUrl),
    thumbnailUrl: pickString(record.thumbnailUrl, record.thumbnail_url, meta.thumbnailUrl, meta.thumbnail_url, normalizedThumbnailUrl),
    reference_images: referenceImages,
    reference_videos: referenceVideos,
    reference_audios: referenceAudios,
    mediaList,
    error_message: pickString(
      meta.providerPublicMessageEn,
      meta.provider_public_message_en,
      meta.providerPublicMessage,
      meta.provider_public_message,
      meta.errorMessage,
      meta.error_message,
      record.providerPublicMessageEn,
      record.provider_public_message_en,
      record.providerPublicMessage,
      record.provider_public_message,
      record.error_message,
      record.errorMessage,
      record.error,
    ),
    errorCode: pickString(
      meta.providerFailureCategory,
      meta.provider_failure_category,
      meta.error_code,
      meta.errorCode,
      record.providerFailureCategory,
      record.provider_failure_category,
      record.error_code,
      record.errorCode,
    ),
    providerPublicMessage: pickString(meta.providerPublicMessage, meta.provider_public_message, record.providerPublicMessage, record.provider_public_message),
    providerPublicMessageEn: pickString(meta.providerPublicMessageEn, meta.provider_public_message_en, record.providerPublicMessageEn, record.provider_public_message_en),
    providerPublicMessageZh: pickString(meta.providerPublicMessageZh, meta.provider_public_message_zh, record.providerPublicMessageZh, record.provider_public_message_zh),
    providerFailureCategory: pickString(meta.providerFailureCategory, meta.provider_failure_category, record.providerFailureCategory, record.provider_failure_category),
    message: pickString(record.public_message, record.publicMessage, record.message, meta.message),
    cost_credits: Number(record.cost_credits || record.costCredits || meta.cost_credits || 0) || undefined,
    createdAt: pickString(record.createdAt, record.created_at, meta.createdAt, meta.created_at) || Date.now(),
    updatedAt: pickString(record.updatedAt, record.updated_at, meta.updatedAt, meta.updated_at),
    completedAt: pickString(record.completedAt, record.completed_at, meta.completedAt, meta.completed_at),
    first_frame_image: firstFrameImage,
    last_frame_image: lastFrameImage,
    assets,
    upload_assets: uploadAssets,
    meta: {
      ...meta,
      assets,
      first_frame_image: firstFrameImage,
      last_frame_image: lastFrameImage,
      mediaList,
      reference_images: referenceImages,
      reference_videos: referenceVideos,
      reference_audios: referenceAudios,
      upload_assets: uploadAssets,
    },
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
  if (raw.startsWith("video/") || raw.includes("video") || /\.(mp4|mov|webm|m4v)(?:[?#].*)?$/.test(raw)) return "video";
  if (raw.startsWith("audio/") || raw.includes("audio") || /\.(mp3|wav|m4a|aac|ogg)(?:[?#].*)?$/.test(raw)) return "audio";
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
    assetId: pickString(data.assetId, data.asset_id),
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
