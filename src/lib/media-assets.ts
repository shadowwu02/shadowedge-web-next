import type { UploadMediaItem, UploadMediaRole, UploadMediaSource, UploadMediaType, VideoTaskRecord } from "@/types/video";
import { getMediaTypeFromUrl, isRemoteMediaUrl, isTransientMediaUrl } from "@/lib/upload-rules";

export const LOCAL_MEDIA_ASSETS_KEY = "shadowedge_local_upload_assets_v1";
export const LOCAL_MEDIA_ASSETS_MAX = 80;

type RawMediaAsset = Partial<UploadMediaItem> & Record<string, unknown>;
type MediaAssetSourceInput = UploadMediaSource | "current" | "uploads" | "local";
type ReusableHistoryRecord = Partial<VideoTaskRecord> & Record<string, unknown>;

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
  const name = pickString(raw.name, raw.originalName, raw.original_name, raw.filename, raw.fileName) || `${type} asset`;
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
    originalName: pickString(raw.originalName, raw.original_name, name),
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
) {
  const url = getHistoryUrlFromItem(item);
  if (!url || isTransientMediaUrl(url) || !isRemoteMediaUrl(url)) return null;

  const raw = asRecord(item);
  const recordId = getHistoryRecordId(record, recordIndex);
  const name =
    pickString(raw.name, raw.originalName, raw.original_name, raw.filename, raw.fileName, record.prompt) ||
    `${source === "generated_result" ? "Generated" : "History"} ${type}`;
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
      originalName: raw.originalName || raw.original_name || name,
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
) {
  const asset = createReusableHistoryAsset(record, recordIndex, item, type, role, source, namespace);
  if (asset) items.push(asset);
}

function collectUploadAssetItems(
  items: UploadMediaItem[],
  record: ReusableHistoryRecord,
  recordIndex: number,
  uploadAssets: Record<string, unknown>,
) {
  Object.entries(uploadAssets).forEach(([slot, value]) => {
    asArray(value).forEach((item) => {
      const url = getHistoryUrlFromItem(item);
      if (!url) return;
      const type = inferHistoryType(item, url, slot);
      const role = type === "image" ? inferHistoryRole(item, slot) : "reference";
      addReusableAsset(items, record, recordIndex, item, type, role, "history", "history-upload");
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

    asArray(rawRecord.mediaList || meta.mediaList).forEach((item) => {
      const url = getHistoryUrlFromItem(item);
      if (!url) return;
      const type = inferHistoryType(item, url);
      const role = type === "image" ? inferHistoryRole(item) : "reference";
      addReusableAsset(items, rawRecord, recordIndex, item, type, role, "history", "history-media-list");
    });

    asArray(rawRecord.reference_images || rawRecord.referenceImages || meta.reference_images || meta.referenceImages).forEach((item) =>
      addReusableAsset(items, rawRecord, recordIndex, item, "image", "reference", "history", "history-ref-image"),
    );
    asArray(rawRecord.reference_videos || rawRecord.referenceVideos || meta.reference_videos || meta.referenceVideos).forEach((item) =>
      addReusableAsset(items, rawRecord, recordIndex, item, "video", "reference", "history", "history-ref-video"),
    );
    asArray(
      rawRecord.reference_audios ||
        rawRecord.referenceAudios ||
        rawRecord.reference_audio ||
        rawRecord.audio_urls ||
        rawRecord.audioUrl ||
        meta.reference_audios ||
        meta.referenceAudios,
    ).forEach((item) => addReusableAsset(items, rawRecord, recordIndex, item, "audio", "reference", "history", "history-ref-audio"));

    const assets = asRecord(rawRecord.assets || meta.assets);
    asArray(assets.images).forEach((item) => addReusableAsset(items, rawRecord, recordIndex, item, "image", "reference", "history", "history-assets-image"));
    asArray(assets.videos).forEach((item) => addReusableAsset(items, rawRecord, recordIndex, item, "video", "reference", "history", "history-assets-video"));
    asArray(assets.audios).forEach((item) => addReusableAsset(items, rawRecord, recordIndex, item, "audio", "reference", "history", "history-assets-audio"));

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
        name: pickString(rawRecord.prompt, meta.original_prompt, meta.prompt) || "Generated video",
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
