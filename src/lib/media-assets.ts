import type { UploadMediaItem, UploadMediaRole, UploadMediaSource, UploadMediaType, VideoTaskRecord } from "@/types/video";
import { getMediaTypeFromUrl, isRemoteMediaUrl, isTransientMediaUrl } from "@/lib/upload-rules";

export const LOCAL_MEDIA_ASSETS_KEY = "shadowedge_local_upload_assets_v1";
export const LOCAL_MEDIA_ASSETS_MAX = 80;

type RawMediaAsset = Partial<UploadMediaItem> & Record<string, unknown>;
type MediaAssetSourceInput = UploadMediaSource | "current" | "uploads" | "local";
type ReusableHistoryRecord = Partial<VideoTaskRecord> & Record<string, unknown>;
export type MediaDisplayLocale = "en" | "zh";

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

function cleanFilename(value: unknown) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return "";
  return raw.replace(/[?#].*$/, "").split(/[\\/]/).filter(Boolean).pop() || raw;
}

function safeDecodeFilename(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function isGenericFilename(value: string) {
  const name = cleanFilename(value);
  const stem = name.replace(/\.[a-z0-9]{2,6}$/i, "");
  if (!stem) return true;
  if (stem.length > 48) return true;
  if (/^[0-9a-f]{24,}$/i.test(stem.replace(/-/g, ""))) return true;
  if (/^(remote[-_])?(image|video|audio)[-_]?\d*$/i.test(stem)) return true;
  return false;
}

function filenameFromUrl(url: string) {
  if (!url) return "";
  const path = (() => {
    try {
      return new URL(url).pathname;
    } catch {
      return url;
    }
  })();

  const name = safeDecodeFilename(cleanFilename(path));
  return name && !isGenericFilename(name) ? name : "";
}

function hasMediaExtension(value: string) {
  return /\.(png|jpe?g|webp|gif|avif|mp4|mov|webm|m4v|mp3|wav|m4a|aac|ogg)$/i.test(cleanFilename(value));
}

function isUnhelpfulDisplayName(value: string) {
  const name = cleanFilename(value);
  const stem = name.replace(/\.[a-z0-9]{2,8}$/i, "");
  if (!stem) return true;
  if (/^[0-9a-f]{24,}$/i.test(stem.replace(/-/g, ""))) return true;
  if (/^(remote[-_])?(image|video|audio|file|media)[-_]?\d*$/i.test(stem)) return true;
  return !hasMediaExtension(name) && stem.length > 80;
}

const englishPromptNameHints = [
  "cinematic",
  "commercial",
  "camera",
  "lighting",
  "scene",
  "style",
  "prompt",
  "realistic",
  "product",
  "video",
  "shot",
  "lens",
  "studio",
  "soft light",
  "slow camera",
  "ultra",
  "render",
  "animation",
];

const chinesePromptNameHints = ["镜头", "画面", "风格", "生成", "场景", "人物", "光影", "产品", "视频", "商业", "广告", "灯光", "高级", "柔和", "推进"];

export function looksLikePromptMediaName(value: unknown) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return false;
  if (/[\r\n]/.test(raw)) return true;

  const name = cleanFilename(raw);
  const hasExtension = hasMediaExtension(name);
  const lower = name.toLowerCase();
  const words = name.split(/\s+/).filter(Boolean).length;
  const separators = (name.match(/[,.，。;；:：]/g) || []).length;
  const englishHits = englishPromptNameHints.filter((hint) => lower.includes(hint)).length;
  const chineseHits = chinesePromptNameHints.filter((hint) => name.includes(hint)).length;

  if (!hasExtension && name.length > 80) return true;
  if (!hasExtension && words >= 10 && separators >= 2) return true;
  if (!hasExtension && name.length > 42 && englishHits >= 3) return true;
  if (!hasExtension && name.length > 24 && chineseHits >= 3) return true;
  if (!hasExtension && name.length > 44 && separators >= 4) return true;
  return false;
}

function localizedFallbackAssetName(
  type: UploadMediaType,
  source: UploadMediaSource | MediaAssetSourceInput | undefined,
  index: number,
  locale: MediaDisplayLocale,
) {
  const isGenerated = source === "generated_result";
  const ordinal = Math.max(1, index + 1);

  if (locale === "zh") {
    if (isGenerated) {
      if (type === "video") return "生成视频";
      if (type === "audio") return "生成音频";
      return "生成图片";
    }
    if (type === "video") return `参考视频 ${ordinal}`;
    if (type === "audio") return `参考音频 ${ordinal}`;
    return `参考图 ${ordinal}`;
  }

  if (isGenerated) {
    if (type === "video") return "Generated video";
    if (type === "audio") return "Generated audio";
    return "Generated image";
  }
  if (type === "video") return `Reference video ${ordinal}`;
  if (type === "audio") return `Reference audio ${ordinal}`;
  return `Reference image ${ordinal}`;
}

export function sanitizeMediaDisplayName({
  rawName,
  type,
  index = 0,
  source = "reference_selected",
  locale = "en",
}: {
  rawName: unknown;
  type: UploadMediaType;
  index?: number;
  source?: UploadMediaSource | MediaAssetSourceInput;
  locale?: MediaDisplayLocale;
}) {
  const name = safeDecodeFilename(cleanFilename(rawName));
  if (name && !isUnhelpfulDisplayName(name) && !looksLikePromptMediaName(name)) return name;
  return localizedFallbackAssetName(type, source, index, locale);
}

export function sanitizeMediaDisplayNameFromCandidates({
  candidates,
  type,
  index = 0,
  source = "reference_selected",
  locale = "en",
}: {
  candidates: unknown[];
  type: UploadMediaType;
  index?: number;
  source?: UploadMediaSource | MediaAssetSourceInput;
  locale?: MediaDisplayLocale;
}) {
  for (const candidate of candidates) {
    const name = safeDecodeFilename(cleanFilename(candidate));
    if (name && !isUnhelpfulDisplayName(name) && !looksLikePromptMediaName(name)) return name;
  }
  return localizedFallbackAssetName(type, source, index, locale);
}

export function getSafeMediaItemDisplayName(item: Partial<UploadMediaItem>, index = 0, locale: MediaDisplayLocale = "en") {
  return sanitizeMediaDisplayNameFromCandidates({
    candidates: [item.name, item.originalName, item.filename],
    index,
    locale,
    source: item.source || "reference_selected",
    type: item.type || "image",
  });
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

function normalizeType(type: unknown, url: string, mimeType?: string): UploadMediaType {
  const hint = String(type || mimeType || "").toLowerCase();
  if (hint.includes("video")) return "video";
  if (hint.includes("audio")) return "audio";
  return getMediaTypeFromUrl(url, hint);
}

function normalizeRole(value: unknown): UploadMediaRole | undefined {
  const raw = String(value || "").toLowerCase();
  if (raw === "start_frame" || raw === "start" || raw === "first_frame" || raw === "start_image") return "start_frame";
  if (raw === "end_frame" || raw === "end" || raw === "last_frame" || raw === "end_image") return "end_frame";
  if (raw === "reference" || raw === "ref") return "reference";
  return undefined;
}

function normalizeSource(source: MediaAssetSourceInput = "local_upload_cache"): UploadMediaSource {
  if (source === "current") return "current_upload";
  if (source === "uploads" || source === "local") return "local_upload_cache";
  return source;
}

function isMediaAsset(item: UploadMediaItem | null): item is UploadMediaItem {
  return Boolean(item);
}

function safePreviewUrl(value: string | undefined) {
  if (!value || isTransientMediaUrl(value)) return "";
  return value;
}

function fileSignature(item: Partial<UploadMediaItem>) {
  const name = item.originalName || item.filename || item.name || "";
  const size = Number(item.size || 0) || 0;
  const type = item.mimeType || item.type || "";
  return name && size ? `file:${String(name).toLowerCase()}:${size}:${String(type).toLowerCase()}` : "";
}

export function getMediaAssetKeys(item: UploadMediaItem) {
  return [
    item.id ? `id:${item.id}` : "",
    item.url && !isTransientMediaUrl(item.url) ? `url:${item.url}` : "",
    fileSignature(item),
  ].filter(Boolean);
}

export function getMediaAssetSourceLabel(source: UploadMediaItem["source"]) {
  if (source === "current_upload") return "Current";
  if (source === "reference_selected") return "Added";
  if (source === "generated_result") return "Generated";
  if (source === "history") return "History";
  if (source === "local_upload_cache") return "Uploads";
  return "Asset";
}

export function normalizeMediaAsset(item: unknown, source: MediaAssetSourceInput = "uploads"): UploadMediaItem | null {
  const raw = (item || {}) as RawMediaAsset;
  const url =
    pickString(raw.url, raw.previewUrl, raw.mediaUrl, raw.publicUrl, raw.fileUrl, raw.imageUrl, raw.videoUrl, raw.audioUrl) || "";

  if (!url || isTransientMediaUrl(url) || !isRemoteMediaUrl(url)) return null;

  const mimeType = pickString(raw.mimeType, raw.mime_type, raw.mimetype);
  const type = normalizeType(raw.type, url, mimeType);
  const role = normalizeRole(raw.role || raw.assetRole);
  const name = sanitizeMediaDisplayNameFromCandidates({
    candidates: [
      raw.displayName,
      raw.display_name,
      raw.originalName,
      raw.original_name,
      raw.originalFilename,
      raw.original_filename,
      raw.filename,
      raw.fileName,
      raw.name,
      filenameFromUrl(url),
    ],
    source: normalizeSource(source),
    type,
  });
  const rawPreviewUrl =
    type === "image"
      ? pickString(raw.previewUrl, raw.thumbnailUrl, raw.thumbnail_url, url) || url
      : pickString(raw.previewUrl, raw.thumbnailUrl, raw.thumbnail_url) || "";

  return {
    id: pickString(raw.id, raw.mediaId, raw.media_id, raw.key, url) || url,
    type,
    name,
    url,
    previewUrl: safePreviewUrl(rawPreviewUrl),
    role,
    source: normalizeSource(source),
    size: Number(raw.size || raw.bytes || 0) || undefined,
    mimeType,
    filename: pickString(raw.filename, raw.fileName),
    originalName: pickString(raw.originalName, raw.original_name, raw.originalFilename, raw.original_filename, name),
    duration: Number(raw.duration || raw.durationSeconds || raw.duration_seconds || 0) || undefined,
    uploadStatus: "ready",
    errorMessage: source === "current" ? raw.errorMessage : "",
  };
}

export function mergeMediaAssets(...groups: UploadMediaItem[][]) {
  const seen = new Set<string>();
  const merged: UploadMediaItem[] = [];

  groups.flat().forEach((item) => {
    if (!item) return;
    const keys = getMediaAssetKeys(item);
    if (!keys.length || keys.some((key) => seen.has(key))) return;
    keys.forEach((key) => seen.add(key));
    merged.push(item);
  });

  return merged;
}

export function readLocalMediaAssets() {
  const storage = safeLocalStorage();
  if (!storage) return [];

  try {
    const raw = storage.getItem(LOCAL_MEDIA_ASSETS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list)
      ? list.map((item) => normalizeMediaAsset(item, "uploads")).filter(isMediaAsset).slice(0, LOCAL_MEDIA_ASSETS_MAX)
      : [];
  } catch {
    return [];
  }
}

export function saveLocalMediaAssets(items: UploadMediaItem[]) {
  const storage = safeLocalStorage();
  const normalized = mergeMediaAssets(
    items
      .filter((item) => item.uploadStatus === "ready")
      .map((item) => normalizeMediaAsset(item, "uploads"))
      .filter(isMediaAsset),
  ).slice(0, LOCAL_MEDIA_ASSETS_MAX);

  if (!storage) return normalized;

  try {
    storage.setItem(LOCAL_MEDIA_ASSETS_KEY, JSON.stringify(normalized));
  } catch {
    try {
      storage.setItem(LOCAL_MEDIA_ASSETS_KEY, JSON.stringify(normalized.slice(0, 40)));
    } catch {
      // Ignore local asset cache quota failures; uploads should still work.
    }
  }

  return normalized;
}

export function appendLocalMediaAssets(items: UploadMediaItem[]) {
  return saveLocalMediaAssets(mergeMediaAssets(items, readLocalMediaAssets()));
}

export function removeLocalMediaAsset(idOrUrl: string) {
  const nextItems = readLocalMediaAssets().filter((item) => item.id !== idOrUrl && item.url !== idOrUrl);
  return saveLocalMediaAssets(nextItems);
}

export function collectCurrentMediaAssets(currentUploads: UploadMediaItem[]) {
  return currentUploads.filter(Boolean).map((item) => ({ ...item, source: item.source || ("current_upload" as const) }));
}

export function collectReferenceMediaAssets(referenceMedia: UploadMediaItem[]) {
  return referenceMedia.filter(Boolean).map((item) => ({ ...item, source: "reference_selected" as const }));
}

export function collectLocalMediaAssets() {
  return readLocalMediaAssets();
}

function getHistoryRecordId(record: ReusableHistoryRecord, index: number) {
  return (
    pickString(record.jobId, record.job_id, record.providerJobId, record.provider_job_id, record.dbJobId, record.id) ||
    pickString(record.createdAt, record.created_at, record.completedAt, record.completed_at) ||
    `history-${index}`
  );
}

function getHistoryMeta(record: ReusableHistoryRecord) {
  return asRecord(record.meta);
}

function getHistoryUrlFromItem(item: unknown) {
  if (typeof item === "string") return item;
  const raw = asRecord(item);
  return (
    pickString(
      raw.url,
      raw.uri,
      raw.remoteUri,
      raw.remote_url,
      raw.mediaUrl,
      raw.media_url,
      raw.publicUrl,
      raw.public_url,
      raw.fileUrl,
      raw.file_url,
      raw.imageUrl,
      raw.image_url,
      raw.videoUrl,
      raw.video_url,
      raw.audioUrl,
      raw.audio_url,
    ) || ""
  );
}

function inferHistoryRole(item: unknown, slot = "", fallbackRole: UploadMediaRole = "reference") {
  const raw = asRecord(item);
  const explicitRole = normalizeRole(raw.role || raw.assetRole || raw.slot || raw.kind);
  if (explicitRole) return explicitRole;

  const normalizedSlot = slot.toLowerCase();
  if (normalizedSlot.includes("start") || normalizedSlot.includes("first")) return "start_frame";
  if (normalizedSlot.includes("end") || normalizedSlot.includes("last")) return "end_frame";
  return fallbackRole;
}

function inferHistoryType(item: unknown, url: string, slot = "", fallbackType?: UploadMediaType) {
  const raw = asRecord(item);
  const slotHint = slot.toLowerCase();
  const mimeType = pickString(raw.mimeType, raw.mime_type, raw.mimetype);
  if (slotHint.includes("audio")) return "audio";
  if (slotHint.includes("video")) return "video";
  if (slotHint.includes("image") || slotHint.includes("frame")) return "image";
  return normalizeType(raw.type || raw.kind || fallbackType, url, mimeType);
}

function createReusableHistoryAsset(
  record: ReusableHistoryRecord,
  recordIndex: number,
  item: unknown,
  type: UploadMediaType,
  role: UploadMediaRole,
  source: UploadMediaSource,
  namespace: string,
  assetIndex = 0,
) {
  const url = getHistoryUrlFromItem(item);
  if (!url || isTransientMediaUrl(url) || !isRemoteMediaUrl(url)) return null;

  const raw = asRecord(item);
  const recordId = getHistoryRecordId(record, recordIndex);
  const name = sanitizeMediaDisplayNameFromCandidates({
    candidates: [
      raw.displayName,
      raw.display_name,
      raw.originalName,
      raw.original_name,
      raw.originalFilename,
      raw.original_filename,
      raw.filename,
      raw.fileName,
      raw.name,
      filenameFromUrl(url),
    ],
    index: assetIndex,
    source,
    type,
  });
  const previewUrl =
    type === "image"
      ? pickString(raw.previewUrl, raw.preview_url, raw.thumbnailUrl, raw.thumbnail_url, url) || url
      : pickString(raw.previewUrl, raw.preview_url, raw.thumbnailUrl, raw.thumbnail_url, record.thumbnailUrl, record.thumbnail) || "";

  return normalizeMediaAsset(
    {
      duration: raw.duration || raw.durationSeconds || raw.duration_seconds,
      filename: raw.filename || raw.fileName,
      id: pickString(raw.id, raw.mediaId, raw.media_id, raw.key) || `${namespace}:${recordId}:${type}:${url}`,
      mimeType: raw.mimeType || raw.mime_type || raw.mimetype,
      name,
      originalName: raw.originalName || raw.original_name || raw.originalFilename || raw.original_filename || name,
      previewUrl,
      role,
      size: raw.size || raw.bytes,
      type,
      url,
    },
    source,
  );
}

function addReusableAsset(
  items: UploadMediaItem[],
  record: ReusableHistoryRecord,
  recordIndex: number,
  item: unknown,
  type: UploadMediaType,
  role: UploadMediaRole,
  source: UploadMediaSource,
  namespace: string,
  assetIndex = 0,
) {
  const asset = createReusableHistoryAsset(record, recordIndex, item, type, role, source, namespace, assetIndex);
  if (asset) items.push(asset);
}

function collectUploadAssetItems(
  items: UploadMediaItem[],
  record: ReusableHistoryRecord,
  recordIndex: number,
  uploadAssets: Record<string, unknown>,
) {
  Object.entries(uploadAssets).forEach(([slot, value]) => {
    asArray(value).forEach((item, assetIndex) => {
      const url = getHistoryUrlFromItem(item);
      if (!url) return;
      const type = inferHistoryType(item, url, slot);
      const role = type === "image" ? inferHistoryRole(item, slot) : "reference";
      addReusableAsset(items, record, recordIndex, item, type, role, "history", "history-upload", assetIndex);
    });
  });
}

export function collectHistoryInputMediaAssets(records: VideoTaskRecord[]) {
  const items: UploadMediaItem[] = [];

  records.forEach((record, recordIndex) => {
    const rawRecord = record as ReusableHistoryRecord;
    const meta = getHistoryMeta(rawRecord);

    addReusableAsset(
      items,
      rawRecord,
      recordIndex,
      pickString(rawRecord.first_frame_image, rawRecord.firstFrameImage, rawRecord.firstFrame, rawRecord.image_url, rawRecord.imageUrl, meta.first_frame_image, meta.firstFrameImage),
      "image",
      "start_frame",
      "history",
      "history-start",
    );
    addReusableAsset(
      items,
      rawRecord,
      recordIndex,
      pickString(rawRecord.last_frame_image, rawRecord.lastFrameImage, rawRecord.lastFrame, rawRecord.end_frame_image, rawRecord.endFrameImage, meta.last_frame_image, meta.lastFrameImage),
      "image",
      "end_frame",
      "history",
      "history-end",
    );

    asArray(rawRecord.mediaList || meta.mediaList).forEach((item, assetIndex) => {
      const url = getHistoryUrlFromItem(item);
      if (!url) return;
      const type = inferHistoryType(item, url);
      const role = type === "image" ? inferHistoryRole(item) : "reference";
      addReusableAsset(items, rawRecord, recordIndex, item, type, role, "history", "history-media-list", assetIndex);
    });

    asArray(rawRecord.reference_images || rawRecord.referenceImages || meta.reference_images || meta.referenceImages).forEach((item, assetIndex) =>
      addReusableAsset(items, rawRecord, recordIndex, item, "image", "reference", "history", "history-ref-image", assetIndex),
    );
    asArray(rawRecord.reference_videos || rawRecord.referenceVideos || meta.reference_videos || meta.referenceVideos).forEach((item, assetIndex) =>
      addReusableAsset(items, rawRecord, recordIndex, item, "video", "reference", "history", "history-ref-video", assetIndex),
    );
    asArray(
      rawRecord.reference_audios ||
        rawRecord.referenceAudios ||
        rawRecord.reference_audio ||
        rawRecord.audio_urls ||
        rawRecord.audioUrl ||
        meta.reference_audios ||
        meta.referenceAudios,
    ).forEach((item, assetIndex) => addReusableAsset(items, rawRecord, recordIndex, item, "audio", "reference", "history", "history-ref-audio", assetIndex));

    const assets = asRecord(rawRecord.assets || meta.assets);
    asArray(assets.images).forEach((item, assetIndex) => addReusableAsset(items, rawRecord, recordIndex, item, "image", "reference", "history", "history-assets-image", assetIndex));
    asArray(assets.videos).forEach((item, assetIndex) => addReusableAsset(items, rawRecord, recordIndex, item, "video", "reference", "history", "history-assets-video", assetIndex));
    asArray(assets.audios).forEach((item, assetIndex) => addReusableAsset(items, rawRecord, recordIndex, item, "audio", "reference", "history", "history-assets-audio", assetIndex));

    collectUploadAssetItems(
      items,
      rawRecord,
      recordIndex,
      asRecord(rawRecord.upload_assets || rawRecord.uploadAssets || meta.upload_assets || meta.uploadAssets),
    );
  });

  return mergeMediaAssets(items);
}

function isCompletedHistoryStatus(status: unknown) {
  return ["completed", "success", "succeeded", "done"].includes(String(status || "").toLowerCase());
}

export function collectGeneratedResultMediaAssets(records: VideoTaskRecord[]) {
  const items: UploadMediaItem[] = [];

  records.forEach((record, recordIndex) => {
    if (!isCompletedHistoryStatus(record.status)) return;

    const rawRecord = record as ReusableHistoryRecord;
    const meta = getHistoryMeta(rawRecord);
    const outputUrls = asArray(rawRecord.outputUrls || rawRecord.output_urls || meta.outputUrls || meta.output_urls);
    const outputUrl =
      pickString(rawRecord.videoUrl, rawRecord.video_url, rawRecord.outputUrl, rawRecord.output_url, meta.videoUrl, meta.video_url, meta.outputUrl, meta.output_url) ||
      pickString(...outputUrls);

    if (!outputUrl) return;

    addReusableAsset(
      items,
      rawRecord,
      recordIndex,
      {
        id: `generated:${getHistoryRecordId(rawRecord, recordIndex)}`,
        name: "Generated video",
        previewUrl: pickString(rawRecord.thumbnailUrl, rawRecord.thumbnail, meta.thumbnailUrl, meta.thumbnail_url, meta.thumbnail),
        thumbnailUrl: pickString(rawRecord.thumbnailUrl, rawRecord.thumbnail, meta.thumbnailUrl, meta.thumbnail_url, meta.thumbnail),
        type: "video",
        url: outputUrl,
      },
      "video",
      "reference",
      "generated_result",
      "generated-result",
    );
  });

  return mergeMediaAssets(items);
}

export function collectReusableVideoAssets(records: VideoTaskRecord[]) {
  return mergeMediaAssets(collectHistoryInputMediaAssets(records), collectGeneratedResultMediaAssets(records));
}
