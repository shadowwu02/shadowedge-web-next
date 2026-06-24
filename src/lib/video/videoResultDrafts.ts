import { saveVideoDraft } from "@/lib/video/videoDraft";
import { collectHistoryInputMediaAssets } from "@/lib/media-assets";
import { parseMentionBindings, serializeMentionBindings } from "@/lib/video/videoMentionBindings";
import type { ImageHistoryItem } from "@/types/image";
import type { UploadMediaItem, VideoTaskRecord } from "@/types/video";

export const VIDEO_DRAFT_NOTICE_KEY = "shadowedge_video_create_draft_notice_v1";

type ImageResultDraftInput = {
  image: ImageHistoryItem;
  outputIndex?: number;
  outputUrl?: string;
};

type ImageResultVideoDraft = {
  media: UploadMediaItem;
  prompt: string;
};

type VideoResultDraftInput = {
  video: VideoTaskRecord;
  outputUrl?: string;
};

type VideoResultVideoDraft = {
  media: UploadMediaItem;
  prompt: string;
  modelId: string;
  providerModel?: string;
  modelLabel?: string;
  params: {
    duration?: number;
    ratio?: string;
    quality?: string;
    generateAudio?: boolean;
  };
};

type VideoFailedDraftInput = {
  video: VideoTaskRecord;
};

type VideoFailedDraft = {
  prompt: string;
  modelId: string;
  providerModel?: string;
  modelLabel?: string;
  params: {
    duration?: number;
    ratio?: string;
    quality?: string;
    generateAudio?: boolean;
  };
  referenceMedia: UploadMediaItem[];
  mentionBindings: ReturnType<typeof parseMentionBindings>;
  missingReferences: boolean;
};

function safeLocalStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function pickString(...values: unknown[]) {
  return values.find((value) => typeof value === "string" && value.trim()) as string | undefined;
}

function pickBoolean(...values: unknown[]) {
  return values.find((value) => typeof value === "boolean") as boolean | undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) return [value];
  if (value && typeof value === "object") return [value];
  return [];
}

function isUnsafeReferenceUrl(url: string) {
  const value = String(url || "").trim();
  if (!/^https?:\/\//i.test(value)) return true;
  if (/^(data|blob|file|javascript):/i.test(value)) return true;
  if (/localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]/i.test(value)) return true;

  try {
    const parsed = new URL(value);
    return ["localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"].includes(parsed.hostname.toLowerCase());
  } catch {
    return true;
  }
}

function getNestedOutputUrls(value: unknown): string[] {
  const record = asRecord(value);
  const output = asRecord(record.output);
  const result = asRecord(record.result);
  const data = asRecord(record.data);
  const meta = asRecord(record.meta);
  const candidates = [
    record.outputUrl,
    record.output_url,
    record.imageUrl,
    record.image_url,
    record.videoUrl,
    record.video_url,
    record.resultUrl,
    record.result_url,
    record.url,
    record.outputUrls,
    record.output_urls,
    record.images,
    record.results,
    output.outputUrl,
    output.output_url,
    output.imageUrl,
    output.image_url,
    output.videoUrl,
    output.video_url,
    output.url,
    output.urls,
    result.outputUrl,
    result.output_url,
    result.imageUrl,
    result.image_url,
    result.videoUrl,
    result.video_url,
    result.url,
    result.outputUrls,
    result.output_urls,
    data.outputUrl,
    data.output_url,
    data.imageUrl,
    data.image_url,
    data.videoUrl,
    data.video_url,
    data.outputUrls,
    data.output_urls,
    meta.outputUrl,
    meta.output_url,
    meta.imageUrl,
    meta.image_url,
    meta.videoUrl,
    meta.video_url,
    meta.outputUrls,
    meta.output_urls,
  ];

  return candidates
    .flatMap((candidate) => (Array.isArray(candidate) ? candidate : [candidate]))
    .flatMap((candidate) => {
      if (typeof candidate === "string") return [candidate];
      const nested = asRecord(candidate);
      return [
        nested.url,
        nested.imageUrl,
        nested.image_url,
        nested.videoUrl,
        nested.video_url,
        nested.outputUrl,
        nested.output_url,
        nested.resultUrl,
        nested.result_url,
      ];
    })
    .map((candidate) => String(candidate || "").trim())
    .filter(Boolean);
}

function inferFileName(url: string, image: ImageHistoryItem, outputIndex: number) {
  const raw = asRecord(image.raw);
  const meta = asRecord(image.meta);
  const explicitName = pickString(raw.fileName, raw.filename, raw.name, meta.fileName, meta.filename, meta.name);
  if (explicitName) return explicitName;

  try {
    const parsed = new URL(url);
    const tail = decodeURIComponent(parsed.pathname.split("/").filter(Boolean).pop() || "");
    if (tail && tail.includes(".")) return tail;
  } catch {
    // Fall through to a stable generated filename.
  }

  const id = pickString(image.dbJobId, image.jobId, image.id) || "image-result";
  return `${String(id).replace(/[^\w.-]+/g, "-")}-${outputIndex + 1}.png`;
}

function parseDuration(value: unknown) {
  const duration = Number(String(value || "").replace("s", "").trim());
  return Number.isFinite(duration) && duration > 0 ? duration : undefined;
}

function inferVideoFileName(url: string, video: VideoTaskRecord) {
  const raw = asRecord(video);
  const meta = asRecord(video.meta);
  const explicitName = pickString(
    raw.fileName,
    raw.filename,
    raw.name,
    meta.fileName,
    meta.filename,
    meta.name,
  );
  if (explicitName) return explicitName;

  try {
    const parsed = new URL(url);
    const tail = decodeURIComponent(parsed.pathname.split("/").filter(Boolean).pop() || "");
    if (tail && tail.includes(".")) return tail;
  } catch {
    // Fall through to a stable generated filename.
  }

  const id = pickString(video.dbJobId, video.jobId, video.providerJobId, raw.id) || "video-result";
  return `${String(id).replace(/[^\w.-]+/g, "-")}.mp4`;
}

function createImageResultMedia(image: ImageHistoryItem, url: string, outputIndex: number): UploadMediaItem {
  const jobId = pickString(image.dbJobId, image.jobId, image.id) || String(image.createdAt || "image-result");
  const fileName = inferFileName(url, image, outputIndex);
  const name = fileName || `Generated image ${outputIndex + 1}`;

  return {
    id: `image-result:${String(jobId).replace(/[^\w.-]+/g, "-")}:${outputIndex + 1}`,
    type: "image",
    role: "reference",
    source: "generated_result",
    name,
    url,
    previewUrl: url,
    filename: fileName,
    originalName: fileName,
    mimeType: "image/*",
    uploadStatus: "ready",
  };
}

export function getReusableImageOutputUrl(image: ImageHistoryItem, outputUrl?: string) {
  const candidates = [outputUrl, image.outputUrl, ...(image.outputUrls || []), ...getNestedOutputUrls(image.raw), ...getNestedOutputUrls(image.meta)];
  const url = candidates.map((candidate) => String(candidate || "").trim()).find((candidate) => candidate && !isUnsafeReferenceUrl(candidate));
  return url || "";
}

export function getReusableVideoOutputUrl(video: VideoTaskRecord, outputUrl?: string) {
  const meta = asRecord(video.meta);
  const candidates = [
    outputUrl,
    video.outputUrl,
    video.videoUrl,
    ...(video.outputUrls || []),
    ...getNestedOutputUrls(video),
    ...getNestedOutputUrls(meta),
  ];
  const url = candidates.map((candidate) => String(candidate || "").trim()).find((candidate) => candidate && !isUnsafeReferenceUrl(candidate));
  return url || "";
}

export function buildVideoDraftFromImageResult(input: ImageResultDraftInput): ImageResultVideoDraft | null {
  const outputUrl = getReusableImageOutputUrl(input.image, input.outputUrl);
  if (!outputUrl) return null;

  return {
    media: createImageResultMedia(input.image, outputUrl, input.outputIndex || 0),
    prompt: input.image.prompt || "",
  };
}

function createVideoResultMedia(video: VideoTaskRecord, url: string): UploadMediaItem {
  const raw = asRecord(video);
  const meta = asRecord(video.meta);
  const jobId = pickString(video.dbJobId, video.jobId, video.providerJobId, raw.id) || String(video.createdAt || "video-result");
  const fileName = inferVideoFileName(url, video);
  const name = fileName || "Generated video";
  const previewUrl = pickString(video.thumbnailUrl, video.thumbnail, meta.thumbnailUrl, meta.thumbnail_url, meta.thumbnail) || "";

  return {
    id: `video-result:${String(jobId).replace(/[^\w.-]+/g, "-")}`,
    type: "video",
    role: "reference",
    source: "generated_result",
    name,
    url,
    previewUrl,
    filename: fileName,
    originalName: fileName,
    mimeType: "video/*",
    duration: parseDuration(video.duration ?? meta.duration),
    uploadStatus: "ready",
  };
}

function getVideoPrompt(video: VideoTaskRecord) {
  const raw = asRecord(video);
  const meta = asRecord(video.meta);
  return pickString(meta.original_prompt, meta.originalPrompt, raw.original_prompt, raw.originalPrompt, meta.prompt, video.prompt) || "";
}

function getVideoModelId(video: VideoTaskRecord) {
  const raw = asRecord(video);
  const meta = asRecord(video.meta);
  return pickString(video.modelId, video.frontendModel, video.model, meta.modelId, meta.frontendModel, meta.model, raw.model_id, raw.frontend_model) || "";
}

function getVideoProviderModel(video: VideoTaskRecord) {
  const meta = asRecord(video.meta);
  return pickString(video.providerModel, meta.providerModel, meta.provider_model);
}

function getVideoModelLabel(video: VideoTaskRecord) {
  const raw = asRecord(video);
  const meta = asRecord(video.meta);
  return pickString(raw.modelLabel, video.model, meta.modelLabel, meta.model);
}

function getVideoFailedMentionBindings(video: VideoTaskRecord) {
  const raw = asRecord(video);
  const meta = asRecord(video.meta);
  return serializeMentionBindings(parseMentionBindings(meta.mentionBindings ?? meta.mention_bindings ?? raw.mentionBindings ?? raw.mention_bindings));
}

function getPotentialVideoReferenceCount(video: VideoTaskRecord) {
  const raw = asRecord(video);
  const meta = asRecord(video.meta);
  const uploadAssets = asRecord(video.upload_assets || video.uploadAssets || meta.upload_assets || meta.uploadAssets);
  const assets = asRecord(video.assets || meta.assets);

  return [
    ...asArray(video.mediaList || meta.mediaList),
    ...asArray(video.reference_images || meta.reference_images || meta.referenceImages),
    ...asArray(video.reference_videos || meta.reference_videos || meta.referenceVideos),
    ...asArray(video.reference_audios || meta.reference_audios || meta.referenceAudios),
    ...asArray(uploadAssets.media),
    ...asArray(uploadAssets.reference_images || uploadAssets.referenceImages || uploadAssets.images),
    ...asArray(uploadAssets.reference_videos || uploadAssets.referenceVideos || uploadAssets.videos),
    ...asArray(uploadAssets.reference_audios || uploadAssets.referenceAudios || uploadAssets.audios),
    ...asArray(assets.images),
    ...asArray(assets.videos),
    ...asArray(assets.audios),
    raw.first_frame_image || raw.firstFrameImage || meta.first_frame_image || meta.firstFrameImage,
    raw.last_frame_image || raw.lastFrameImage || meta.last_frame_image || meta.lastFrameImage,
  ].filter(Boolean).length;
}

export function buildVideoDraftFromVideoResult(input: VideoResultDraftInput): VideoResultVideoDraft | null {
  const outputUrl = getReusableVideoOutputUrl(input.video, input.outputUrl);
  if (!outputUrl) return null;

  const raw = asRecord(input.video);
  const meta = asRecord(input.video.meta);
  const prompt = pickString(meta.original_prompt, meta.prompt, input.video.prompt) || "";
  const modelId = pickString(input.video.modelId, input.video.frontendModel, input.video.model, meta.modelId, meta.frontendModel, meta.model) || "";
  const providerModel = pickString(input.video.providerModel, meta.providerModel, meta.provider_model);
  const modelLabel = pickString(raw.modelLabel, input.video.model, meta.modelLabel, meta.model);

  return {
    media: createVideoResultMedia(input.video, outputUrl),
    prompt,
    modelId,
    providerModel,
    modelLabel,
    params: {
      duration: parseDuration(input.video.duration ?? meta.duration),
      ratio: pickString(input.video.ratio, meta.ratio),
      quality: pickString(input.video.quality, meta.quality),
      generateAudio: pickBoolean(raw.generateAudio, meta.generateAudio, meta.generate_audio),
    },
  };
}

export function buildVideoDraftFromFailedJob(input: VideoFailedDraftInput): VideoFailedDraft {
  const referenceMedia = collectHistoryInputMediaAssets([input.video]);
  const potentialReferenceCount = getPotentialVideoReferenceCount(input.video);
  const meta = asRecord(input.video.meta);

  return {
    prompt: getVideoPrompt(input.video),
    modelId: getVideoModelId(input.video),
    providerModel: getVideoProviderModel(input.video),
    modelLabel: getVideoModelLabel(input.video),
    params: {
      duration: parseDuration(input.video.duration ?? meta.duration),
      ratio: pickString(input.video.ratio, meta.ratio, meta.aspect_ratio),
      quality: pickString(input.video.quality, meta.quality, meta.resolution),
      generateAudio: pickBoolean(asRecord(input.video).generateAudio, asRecord(input.video).generate_audio, meta.generateAudio, meta.generate_audio),
    },
    referenceMedia,
    mentionBindings: getVideoFailedMentionBindings(input.video),
    missingReferences: potentialReferenceCount > referenceMedia.length,
  };
}

export function readVideoDraftNotice() {
  const storage = safeLocalStorage();
  if (!storage) return "";

  try {
    const notice = storage.getItem(VIDEO_DRAFT_NOTICE_KEY) || "";
    storage.removeItem(VIDEO_DRAFT_NOTICE_KEY);
    return notice;
  } catch {
    return "";
  }
}

export function sendImageResultToVideoDraft(input: ImageResultDraftInput, notice: string) {
  const draftInput = buildVideoDraftFromImageResult(input);
  if (!draftInput) return null;

  const draft = saveVideoDraft({
    prompt: draftInput.prompt,
    modelId: "",
    params: {},
    referenceMedia: [draftInput.media],
    mentionBindings: [],
  });

  const storage = safeLocalStorage();
  if (storage && notice) {
    try {
      storage.setItem(VIDEO_DRAFT_NOTICE_KEY, notice);
    } catch {
      // Ignore storage quota failures; the draft itself has already been saved.
    }
  }

  return draft;
}

export function sendVideoResultToVideoDraft(input: VideoResultDraftInput, notice: string) {
  const draftInput = buildVideoDraftFromVideoResult(input);
  if (!draftInput) return null;

  const draft = saveVideoDraft({
    prompt: draftInput.prompt,
    modelId: draftInput.modelId,
    providerModel: draftInput.providerModel,
    modelLabel: draftInput.modelLabel,
    params: draftInput.params,
    referenceMedia: [draftInput.media],
    mentionBindings: [],
  });

  const storage = safeLocalStorage();
  if (storage && notice) {
    try {
      storage.setItem(VIDEO_DRAFT_NOTICE_KEY, notice);
    } catch {
      // Ignore storage quota failures; the draft itself has already been saved.
    }
  }

  return draft;
}

export function sendVideoFailedJobToVideoDraft(input: VideoFailedDraftInput, notice: string) {
  const draftInput = buildVideoDraftFromFailedJob(input);
  const draft = saveVideoDraft({
    prompt: draftInput.prompt,
    modelId: draftInput.modelId,
    providerModel: draftInput.providerModel,
    modelLabel: draftInput.modelLabel,
    params: draftInput.params,
    referenceMedia: draftInput.referenceMedia,
    mentionBindings: draftInput.mentionBindings,
  });

  const storage = safeLocalStorage();
  if (storage && notice) {
    try {
      storage.setItem(VIDEO_DRAFT_NOTICE_KEY, notice);
    } catch {
      // Ignore storage quota failures; the draft itself has already been saved.
    }
  }

  return {
    ...draft,
    missingReferences: draftInput.missingReferences,
  };
}
