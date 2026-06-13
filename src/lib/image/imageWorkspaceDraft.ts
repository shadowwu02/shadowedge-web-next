import type { ImageGenerationParams, ImageReferenceItem } from "@/types/image";

export const IMAGE_WORKSPACE_DRAFT_KEY = "shadowedge_image_workspace_draft_v1";
export const IMAGE_WORKSPACE_DRAFT_VERSION = 1;
export const IMAGE_WORKSPACE_DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

const SENSITIVE_URL_PARAMS = ["access_token", "refresh_token", "token", "api_key", "apikey", "authorization", "session", "cookie"];
const SENSITIVE_TEXT_PATTERNS = [/authorization/i, /bearer\s+/i, /access[_-]?token/i, /refresh[_-]?token/i, /api[_-]?key/i, /cookie/i, /session/i];

export type ImageWorkspaceDraftReference = {
  id: string;
  name: string;
  url: string;
  mimeType?: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  uploadedAt?: string;
};

export type ImageWorkspaceDraft = {
  version: typeof IMAGE_WORKSPACE_DRAFT_VERSION;
  updatedAt: string;
  prompt: string;
  modelId: string;
  ratio: string;
  resolution?: string;
  quality?: string;
  batchCount?: number;
  references: ImageWorkspaceDraftReference[];
};

export type ReadImageWorkspaceDraftResult = {
  draft: ImageWorkspaceDraft | null;
  status: "ok" | "missing" | "expired" | "invalid" | "unavailable";
};

type RawRecord = Record<string, unknown>;

type SaveImageWorkspaceDraftInput = {
  prompt: string;
  modelId: string;
  params: ImageGenerationParams;
  references: ImageReferenceItem[];
};

function safeLocalStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function asRecord(value: unknown): RawRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as RawRecord) : {};
}

function asString(value: unknown, maxLength = 2000) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return "";
  if (SENSITIVE_TEXT_PATTERNS.some((pattern) => pattern.test(text))) return "";
  return text.slice(0, maxLength);
}

function asNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function sanitizeStoredUrl(value: unknown) {
  const raw = asString(value, 4096);
  if (!raw) return "";

  const lower = raw.toLowerCase();
  if (lower.startsWith("data:") || lower.startsWith("blob:") || lower.includes("base64,")) return "";

  if (raw.startsWith("/uploads/") || raw.startsWith("/api/uploads/")) return raw;

  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    SENSITIVE_URL_PARAMS.forEach((param) => url.searchParams.delete(param));
    return url.toString();
  } catch {
    return "";
  }
}

function removeStoredDraft(storage: Storage | null) {
  if (!storage) return;
  try {
    storage.removeItem(IMAGE_WORKSPACE_DRAFT_KEY);
  } catch {
    // Ignore storage access failures.
  }
}

function sanitizeReference(value: unknown): ImageWorkspaceDraftReference | null {
  const raw = asRecord(value);
  const url = sanitizeStoredUrl(raw.url);
  if (!url) return null;

  const name = asString(raw.name, 240) || asString(raw.originalName, 240) || asString(raw.filename, 240) || "Reference image";
  const uploadedAt = asString(raw.uploadedAt, 80);

  return {
    id: asString(raw.id, 240) || url,
    name,
    url,
    mimeType: asString(raw.mimeType, 120) || asString(raw.mimetype, 120),
    sizeBytes: asNumber(raw.sizeBytes ?? raw.size),
    width: asNumber(raw.width),
    height: asNumber(raw.height),
    uploadedAt,
  };
}

function sanitizeReferences(value: unknown, maxReferences = 20) {
  if (!Array.isArray(value)) return [];
  return value.map(sanitizeReference).filter((item): item is ImageWorkspaceDraftReference => Boolean(item)).slice(0, Math.max(0, maxReferences));
}

function normalizeDraft(raw: unknown): ImageWorkspaceDraft | null {
  const record = asRecord(raw);
  if (record.version !== IMAGE_WORKSPACE_DRAFT_VERSION) return null;

  const updatedAt = asString(record.updatedAt, 80);
  const updatedTime = Date.parse(updatedAt);
  if (!updatedAt || !Number.isFinite(updatedTime)) return null;

  return {
    version: IMAGE_WORKSPACE_DRAFT_VERSION,
    updatedAt,
    prompt: asString(record.prompt, 2000),
    modelId: asString(record.modelId, 240),
    ratio: asString(record.ratio, 80),
    resolution: asString(record.resolution, 80),
    quality: asString(record.quality, 80),
    batchCount: asNumber(record.batchCount),
    references: sanitizeReferences(record.references),
  };
}

export function readImageWorkspaceDraft(): ReadImageWorkspaceDraftResult {
  const storage = safeLocalStorage();
  if (!storage) return { draft: null, status: "unavailable" };

  try {
    const raw = storage.getItem(IMAGE_WORKSPACE_DRAFT_KEY);
    if (!raw) return { draft: null, status: "missing" };

    const draft = normalizeDraft(JSON.parse(raw));
    if (!draft) {
      removeStoredDraft(storage);
      return { draft: null, status: "invalid" };
    }

    if (Date.parse(draft.updatedAt) + IMAGE_WORKSPACE_DRAFT_TTL_MS <= Date.now()) {
      removeStoredDraft(storage);
      return { draft: null, status: "expired" };
    }

    return { draft, status: "ok" };
  } catch {
    removeStoredDraft(storage);
    return { draft: null, status: "invalid" };
  }
}

export function saveImageWorkspaceDraft(input: SaveImageWorkspaceDraftInput) {
  const storage = safeLocalStorage();
  const draft: ImageWorkspaceDraft = {
    version: IMAGE_WORKSPACE_DRAFT_VERSION,
    updatedAt: new Date().toISOString(),
    prompt: input.prompt.slice(0, 2000),
    modelId: input.modelId,
    ratio: input.params.ratio,
    resolution: input.params.resolution,
    quality: input.params.quality,
    batchCount: input.params.batchCount,
    references: input.references
      .filter((item) => item.url && item.uploadStatus !== "failed")
      .map((item) => sanitizeReference({
        id: item.id,
        name: item.name,
        url: item.url,
        mimeType: item.mimeType,
        sizeBytes: item.size,
        width: item.width,
        height: item.height,
        uploadedAt: item.uploadedAt || new Date().toISOString(),
      }))
      .filter((item): item is ImageWorkspaceDraftReference => Boolean(item)),
  };

  if (!storage) return { draft, ok: false };

  try {
    storage.setItem(IMAGE_WORKSPACE_DRAFT_KEY, JSON.stringify(draft));
    return { draft, ok: true };
  } catch {
    return { draft, ok: false };
  }
}

export function clearImageWorkspaceDraft() {
  removeStoredDraft(safeLocalStorage());
}

export function getImageReferencesFromDraft(draft: ImageWorkspaceDraft, maxReferences: number): ImageReferenceItem[] {
  return draft.references.slice(0, Math.max(0, maxReferences)).map((reference) => ({
    id: reference.id,
    type: "image",
    name: reference.name,
    url: reference.url,
    previewUrl: reference.url,
    size: reference.sizeBytes,
    mimeType: reference.mimeType,
    uploadStatus: "ready",
    width: reference.width,
    height: reference.height,
    uploadedAt: reference.uploadedAt,
  }));
}
