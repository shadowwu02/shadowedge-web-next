import type { UploadMediaItem, UploadMediaType } from "@/types/video";
import { getMediaTypeFromUrl, isRemoteMediaUrl, isTransientMediaUrl } from "@/lib/upload-rules";

export const LOCAL_MEDIA_ASSETS_KEY = "shadowedge_local_upload_assets_v1";
export const LOCAL_MEDIA_ASSETS_MAX = 80;

type RawMediaAsset = Partial<UploadMediaItem> & Record<string, unknown>;

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

function normalizeType(type: unknown, url: string, mimeType?: string): UploadMediaType {
  const hint = String(type || mimeType || "").toLowerCase();
  if (hint.includes("video")) return "video";
  if (hint.includes("audio")) return "audio";
  return getMediaTypeFromUrl(url, hint);
}

function isMediaAsset(item: UploadMediaItem | null): item is UploadMediaItem {
  return Boolean(item);
}

export function normalizeMediaAsset(item: unknown, source = "uploads"): UploadMediaItem | null {
  const raw = (item || {}) as RawMediaAsset;
  const url =
    pickString(raw.url, raw.previewUrl, raw.mediaUrl, raw.publicUrl, raw.fileUrl, raw.imageUrl, raw.videoUrl, raw.audioUrl) || "";

  if (!url || isTransientMediaUrl(url) || !isRemoteMediaUrl(url)) return null;

  const mimeType = pickString(raw.mimeType, raw.mime_type, raw.mimetype);
  const type = normalizeType(raw.type, url, mimeType);
  const name = pickString(raw.name, raw.originalName, raw.original_name, raw.filename, raw.fileName) || `${type} asset`;
  const previewUrl = type === "image" ? pickString(raw.previewUrl, raw.thumbnailUrl, raw.thumbnail_url, url) || url : pickString(raw.previewUrl, raw.thumbnailUrl, raw.thumbnail_url) || "";

  return {
    id: pickString(raw.id, raw.mediaId, raw.media_id, raw.key, url) || url,
    type,
    name,
    url,
    previewUrl,
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
    const key = item.url && !isTransientMediaUrl(item.url) ? item.url : item.id;
    if (!key || seen.has(key)) return;
    seen.add(key);
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
  return currentUploads.filter(Boolean);
}

export function collectLocalMediaAssets() {
  return readLocalMediaAssets();
}
