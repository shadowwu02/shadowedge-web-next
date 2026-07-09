import { normalizeMediaAssetUrl } from "@/lib/media-assets";
import type { UploadMediaItem, UploadMediaType } from "@/types/video";

export const REMAKE_SHOT_VIDEO_HANDOFF_KEY = "shadowedge_remake_video_handoff_v1";
const REMAKE_SHOT_VIDEO_HANDOFF_VERSION = 1;

const SENSITIVE_TEXT_PATTERNS = [
  /api[_-]?key/i,
  /authorization/i,
  /bearer\s+/i,
  /cookie/i,
  /providerEndpoint/i,
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

export type RemakeShotVideoHandoffReference = {
  duration?: number;
  height?: number;
  label?: string;
  mimeType?: string;
  source: "remake-keyframe";
  type: Extract<UploadMediaType, "image" | "video">;
  url: string;
  width?: number;
};

export type RemakeShotVideoHandoffNotes = {
  camera?: string;
  characters?: string;
  scene?: string;
  style?: string;
};

export type RemakeShotVideoHandoff = {
  analysisId?: string;
  createdAt: string;
  duration?: number;
  modelId?: string;
  notes?: RemakeShotVideoHandoffNotes;
  prompt: string;
  providerModel?: string;
  quality?: string;
  ratio?: string;
  referenceMedia: RemakeShotVideoHandoffReference[];
  shotGroupId?: string;
  shotNumber?: number;
  source: "remake-shot";
  sourceTimeRange?: {
    end?: number;
    start?: number;
  };
  version: typeof REMAKE_SHOT_VIDEO_HANDOFF_VERSION;
};

export type SaveRemakeShotVideoHandoffInput = Omit<RemakeShotVideoHandoff, "createdAt" | "version" | "source"> & {
  createdAt?: string;
};

export type SaveRemakeShotVideoHandoffResult = {
  handoff?: RemakeShotVideoHandoff;
  ok: boolean;
  reason?: "invalid_payload" | "missing_prompt" | "storage_unavailable" | "storage_write_failed";
};

function safeLocalStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function cleanText(value: unknown, maxLength = 1000) {
  const text = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  if (!text) return "";
  if (SENSITIVE_TEXT_PATTERNS.some((pattern) => pattern.test(text))) return "";
  return text.slice(0, maxLength);
}

function cleanPrompt(value: unknown) {
  const text = typeof value === "string" ? value.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim() : "";
  if (!text) return "";
  if (SENSITIVE_TEXT_PATTERNS.some((pattern) => pattern.test(text))) return "";
  return text.slice(0, 12000);
}

function cleanPositiveNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

function cleanShotNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : undefined;
}

function cleanCreatedAt(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";
  const parsed = Date.parse(text);
  return text && Number.isFinite(parsed) ? new Date(parsed).toISOString() : new Date().toISOString();
}

function cleanOptionalTimestamp(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

function normalizeSafeHandoffUrl(value: unknown) {
  const normalized = normalizeMediaAssetUrl(typeof value === "string" ? value : "");
  if (!normalized) return "";

  const lower = normalized.toLowerCase();
  if (
    lower.startsWith("blob:") ||
    lower.startsWith("data:") ||
    lower.startsWith("file:") ||
    lower.startsWith("javascript:") ||
    lower.includes("127.0.0.1") ||
    lower.includes("localhost") ||
    lower.includes("0.0.0.0") ||
    lower.includes("[::1]")
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
    return "";
  }
}

function normalizeReferenceMedia(raw: unknown): RemakeShotVideoHandoffReference | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  const type = String(record.type || "").trim().toLowerCase();
  if (type !== "image" && type !== "video") return null;

  const url = normalizeSafeHandoffUrl(record.url);
  if (!url) return null;

  return {
    duration: cleanPositiveNumber(record.duration),
    height: cleanPositiveNumber(record.height),
    label: cleanText(record.label, 180) || undefined,
    mimeType: cleanText(record.mimeType, 120) || undefined,
    source: "remake-keyframe",
    type,
    url,
    width: cleanPositiveNumber(record.width),
  };
}

function normalizeNotes(raw: unknown): RemakeShotVideoHandoffNotes | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const record = raw as Record<string, unknown>;
  const notes: RemakeShotVideoHandoffNotes = {
    camera: cleanText(record.camera, 500) || undefined,
    characters: cleanText(record.characters, 500) || undefined,
    scene: cleanText(record.scene, 500) || undefined,
    style: cleanText(record.style, 500) || undefined,
  };
  return Object.values(notes).some(Boolean) ? notes : undefined;
}

function normalizeHandoff(raw: unknown): RemakeShotVideoHandoff | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  if (record.version !== REMAKE_SHOT_VIDEO_HANDOFF_VERSION || record.source !== "remake-shot") return null;

  const prompt = cleanPrompt(record.prompt);
  const createdAt = cleanCreatedAt(record.createdAt);
  if (!prompt || !Number.isFinite(Date.parse(createdAt))) return null;

  const referenceMedia = Array.isArray(record.referenceMedia)
    ? record.referenceMedia.map(normalizeReferenceMedia).filter((item): item is RemakeShotVideoHandoffReference => Boolean(item))
    : [];
  const sourceTimeRange = record.sourceTimeRange && typeof record.sourceTimeRange === "object" && !Array.isArray(record.sourceTimeRange)
    ? {
        end: cleanOptionalTimestamp((record.sourceTimeRange as Record<string, unknown>).end),
        start: cleanOptionalTimestamp((record.sourceTimeRange as Record<string, unknown>).start),
      }
    : undefined;

  return {
    analysisId: cleanText(record.analysisId, 160) || undefined,
    createdAt,
    duration: cleanPositiveNumber(record.duration),
    modelId: cleanText(record.modelId, 160) || undefined,
    notes: normalizeNotes(record.notes),
    prompt,
    providerModel: cleanText(record.providerModel, 160) || undefined,
    quality: cleanText(record.quality, 80) || undefined,
    ratio: cleanText(record.ratio, 40) || undefined,
    referenceMedia,
    shotGroupId: cleanText(record.shotGroupId, 160) || undefined,
    shotNumber: cleanShotNumber(record.shotNumber),
    source: "remake-shot",
    sourceTimeRange: sourceTimeRange && (sourceTimeRange.start !== undefined || sourceTimeRange.end !== undefined) ? sourceTimeRange : undefined,
    version: REMAKE_SHOT_VIDEO_HANDOFF_VERSION,
  };
}

export function saveRemakeShotVideoHandoff(input: SaveRemakeShotVideoHandoffInput): SaveRemakeShotVideoHandoffResult {
  const handoff = normalizeHandoff({
    ...input,
    createdAt: input.createdAt || new Date().toISOString(),
    source: "remake-shot",
    version: REMAKE_SHOT_VIDEO_HANDOFF_VERSION,
  });

  if (!handoff) {
    return { ok: false, reason: cleanPrompt(input.prompt) ? "invalid_payload" : "missing_prompt" };
  }

  const storage = safeLocalStorage();
  if (!storage) return { handoff, ok: false, reason: "storage_unavailable" };

  try {
    storage.setItem(REMAKE_SHOT_VIDEO_HANDOFF_KEY, JSON.stringify(handoff));
    return { handoff, ok: true };
  } catch {
    return { handoff, ok: false, reason: "storage_write_failed" };
  }
}

export function consumeRemakeShotVideoHandoff() {
  const storage = safeLocalStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(REMAKE_SHOT_VIDEO_HANDOFF_KEY);
    storage.removeItem(REMAKE_SHOT_VIDEO_HANDOFF_KEY);
    if (!raw) return null;
    return normalizeHandoff(JSON.parse(raw));
  } catch {
    try {
      storage.removeItem(REMAKE_SHOT_VIDEO_HANDOFF_KEY);
    } catch {
      // Ignore storage access failures.
    }
    return null;
  }
}

export function remakeShotHandoffReferenceToUploadMediaItem(
  reference: RemakeShotVideoHandoffReference,
  index: number,
  handoff: Pick<RemakeShotVideoHandoff, "analysisId" | "shotGroupId" | "shotNumber">,
): UploadMediaItem | null {
  const url = normalizeSafeHandoffUrl(reference.url);
  if (!url) return null;

  const label = cleanText(reference.label, 180) || `Remake reference ${index + 1}`;
  const shotNumber = handoff.shotNumber ? `shot-${handoff.shotNumber}` : "shot";
  const idParts = ["remake", handoff.analysisId, handoff.shotGroupId, shotNumber, reference.type, String(index + 1)]
    .map((part) => cleanText(part, 80))
    .filter(Boolean);

  return {
    duration: reference.duration,
    id: idParts.join(":") || `remake:${reference.type}:${index + 1}`,
    mimeType: reference.mimeType || (reference.type === "image" ? "image/jpeg" : "video/mp4"),
    name: label,
    previewUrl: reference.type === "image" ? url : "",
    role: "reference",
    source: "reference_selected",
    type: reference.type,
    uploadStatus: "ready",
    url,
  };
}
