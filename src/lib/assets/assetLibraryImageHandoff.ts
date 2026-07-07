import type { UserAsset } from "@/lib/assets-api";
import { normalizeMediaAssetUrl } from "@/lib/media-assets";
import type { ImageReferenceItem } from "@/types/image";

export const ASSET_LIBRARY_IMAGE_HANDOFF_KEY = "shadowedge_asset_library_image_handoff_v1";
const ASSET_LIBRARY_IMAGE_HANDOFF_VERSION = 1;

const SENSITIVE_TEXT_PATTERNS = [
  /api[_-]?key/i,
  /authorization/i,
  /bearer\s+/i,
  /cookie/i,
  /rawProviderResponse/i,
  /secret/i,
  /session/i,
  /token/i,
];

const SENSITIVE_URL_PARAM_NAMES = new Set([
  "access_token",
  "apikey",
  "api_key",
  "authorization",
  "cookie",
  "expires",
  "refresh_token",
  "session",
  "signature",
  "token",
  "x-amz-algorithm",
  "x-amz-credential",
  "x-amz-date",
  "x-amz-expires",
  "x-amz-security-token",
  "x-amz-signature",
  "x-goog-algorithm",
  "x-goog-credential",
  "x-goog-date",
  "x-goog-expires",
  "x-goog-signature",
]);

export type AssetLibraryImageHandoff = {
  assetId: string;
  createdAt?: string;
  displayName: string;
  filename?: string;
  height?: number;
  kind: "image";
  mimeType?: string;
  previewUrl: string;
  publicUrl: string;
  sizeBytes?: number;
  source: "asset-library";
  sourceJobId?: string;
  updatedAt: number;
  version: typeof ASSET_LIBRARY_IMAGE_HANDOFF_VERSION;
  width?: number;
};

export type SaveAssetLibraryImageHandoffResult = {
  handoff?: AssetLibraryImageHandoff;
  ok: boolean;
  reason?: "invalid_asset" | "missing_url" | "storage_unavailable" | "storage_write_failed" | "unsupported_kind";
};

function safeLocalStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function cleanText(value: unknown, maxLength = 240) {
  const text = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  if (!text) return "";
  if (SENSITIVE_TEXT_PATTERNS.some((pattern) => pattern.test(text))) return "";
  return text.slice(0, maxLength);
}

function cleanNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function normalizeSafeAssetUrl(value: unknown) {
  const normalized = normalizeMediaAssetUrl(typeof value === "string" ? value : "");
  if (!normalized) return "";

  const lower = normalized.toLowerCase();
  if (
    lower.startsWith("blob:") ||
    lower.startsWith("data:") ||
    lower.startsWith("file:") ||
    lower.startsWith("javascript:") ||
    lower.includes("/api/uploads/")
  ) {
    return "";
  }

  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    for (const paramName of Array.from(parsed.searchParams.keys())) {
      const normalizedName = paramName.toLowerCase();
      if (
        SENSITIVE_URL_PARAM_NAMES.has(normalizedName) ||
        normalizedName.includes("token") ||
        normalizedName.includes("secret") ||
        normalizedName.includes("signature")
      ) {
        parsed.searchParams.delete(paramName);
      }
    }
    return parsed.toString();
  } catch {
    return normalized.startsWith("/uploads/") ? normalized : "";
  }
}

function normalizeHandoff(raw: unknown): AssetLibraryImageHandoff | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  if (record.version !== ASSET_LIBRARY_IMAGE_HANDOFF_VERSION) return null;
  if (record.kind !== "image" || record.source !== "asset-library") return null;

  const assetId = cleanText(record.assetId);
  const publicUrl = normalizeSafeAssetUrl(record.publicUrl);
  const previewUrl = normalizeSafeAssetUrl(record.previewUrl) || publicUrl;
  const displayName = cleanText(record.displayName) || cleanText(record.filename) || "Image asset";
  const updatedAt = Number(record.updatedAt);
  if (!assetId || !publicUrl || !Number.isFinite(updatedAt)) return null;

  return {
    assetId,
    createdAt: cleanText(record.createdAt, 80) || undefined,
    displayName,
    filename: cleanText(record.filename) || undefined,
    height: cleanNumber(record.height),
    kind: "image",
    mimeType: cleanText(record.mimeType, 120) || undefined,
    previewUrl,
    publicUrl,
    sizeBytes: cleanNumber(record.sizeBytes),
    source: "asset-library",
    sourceJobId: cleanText(record.sourceJobId) || undefined,
    updatedAt,
    version: ASSET_LIBRARY_IMAGE_HANDOFF_VERSION,
    width: cleanNumber(record.width),
  };
}

export function saveAssetLibraryImageHandoff(asset: UserAsset): SaveAssetLibraryImageHandoffResult {
  if (!asset?.id || asset.kind !== "image") return { ok: false, reason: "unsupported_kind" };
  if (asset.status !== "ready") return { ok: false, reason: "invalid_asset" };

  const publicUrl = normalizeSafeAssetUrl(asset.publicUrl);
  const previewUrl = normalizeSafeAssetUrl(asset.previewUrl) || normalizeSafeAssetUrl(asset.thumbnailUrl) || publicUrl;
  if (!publicUrl) return { ok: false, reason: "missing_url" };

  const handoff: AssetLibraryImageHandoff = {
    assetId: cleanText(asset.id),
    createdAt: cleanText(asset.createdAt, 80) || undefined,
    displayName: cleanText(asset.displayName) || cleanText(asset.filename) || "Image asset",
    filename: cleanText(asset.filename) || undefined,
    height: cleanNumber(asset.height),
    kind: "image",
    mimeType: cleanText(asset.mimeType, 120) || undefined,
    previewUrl,
    publicUrl,
    sizeBytes: cleanNumber(asset.sizeBytes),
    source: "asset-library",
    sourceJobId: cleanText(asset.sourceTrace.jobId) || undefined,
    updatedAt: Date.now(),
    version: ASSET_LIBRARY_IMAGE_HANDOFF_VERSION,
    width: cleanNumber(asset.width),
  };

  if (!handoff.assetId) return { ok: false, reason: "invalid_asset" };

  const storage = safeLocalStorage();
  if (!storage) return { handoff, ok: false, reason: "storage_unavailable" };

  try {
    storage.setItem(ASSET_LIBRARY_IMAGE_HANDOFF_KEY, JSON.stringify(handoff));
    return { handoff, ok: true };
  } catch {
    return { handoff, ok: false, reason: "storage_write_failed" };
  }
}

export function consumeAssetLibraryImageHandoff() {
  const storage = safeLocalStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(ASSET_LIBRARY_IMAGE_HANDOFF_KEY);
    storage.removeItem(ASSET_LIBRARY_IMAGE_HANDOFF_KEY);
    if (!raw) return null;
    return normalizeHandoff(JSON.parse(raw));
  } catch {
    try {
      storage.removeItem(ASSET_LIBRARY_IMAGE_HANDOFF_KEY);
    } catch {
      // Ignore storage access failures.
    }
    return null;
  }
}

export function assetLibraryImageHandoffToReference(handoff: AssetLibraryImageHandoff): ImageReferenceItem | null {
  const publicUrl = normalizeSafeAssetUrl(handoff.publicUrl);
  if (!publicUrl) return null;
  const previewUrl = normalizeSafeAssetUrl(handoff.previewUrl) || publicUrl;

  return {
    assetId: handoff.assetId,
    filename: handoff.filename,
    height: handoff.height,
    id: `asset-library:${handoff.assetId}`,
    mimeType: handoff.mimeType,
    name: handoff.displayName || handoff.filename || "Image asset",
    previewUrl,
    raw: {
      assetId: handoff.assetId,
      source: "asset-library",
      sourceJobId: handoff.sourceJobId,
    },
    size: handoff.sizeBytes,
    source: "asset-library",
    type: "image",
    uploadedAt: handoff.createdAt,
    uploadStatus: "ready",
    url: publicUrl,
    width: handoff.width,
  };
}
