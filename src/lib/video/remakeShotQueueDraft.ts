import type { RemakeShotGenerationState, RemakeShotGenerationStatus, RemakeShotQueueStatus } from "@/components/video/remake/remakeTypes";

export const REMAKE_SHOT_QUEUE_DRAFT_KEY = "shadowedge_video_remake_queue_draft_v1";
export const REMAKE_SHOT_QUEUE_DRAFT_VERSION = 1;
export const REMAKE_SHOT_QUEUE_DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

const QUEUE_STATUSES = new Set<RemakeShotQueueStatus>(["idle", "running", "paused", "completed", "failed", "cancelled"]);
const SHOT_STATUSES = new Set<RemakeShotGenerationStatus>(["idle", "queued", "generating", "success", "failed", "skipped"]);
const SENSITIVE_TEXT_PATTERNS = [/authorization/i, /bearer\s+/i, /access[_-]?token/i, /refresh[_-]?token/i, /api[_-]?key/i, /cookie/i, /session/i];

export type RemakeShotQueueDraftShotState = Pick<
  RemakeShotGenerationState,
  "error" | "outputUrl" | "queueIndex" | "queueRunId" | "queueTotal" | "status" | "taskId" | "updatedAt"
>;

export type RemakeShotQueueDraft = {
  version: typeof REMAKE_SHOT_QUEUE_DRAFT_VERSION;
  userKeyHash?: string;
  analysisId: string;
  queueRunId: string;
  status: RemakeShotQueueStatus;
  orderedShotKeys: string[];
  currentIndex: number;
  activeShotKey?: string;
  pausedShotKey?: string;
  ignoredShotKeys: string[];
  skippedShotKeys: string[];
  failedShotKeys: string[];
  completedShotKeys: string[];
  shotStates: Record<string, RemakeShotQueueDraftShotState>;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
};

export type ReadRemakeShotQueueDraftResult = {
  draft: RemakeShotQueueDraft | null;
  status: "ok" | "missing" | "expired" | "invalid" | "unavailable" | "analysis_mismatch" | "user_mismatch";
};

type SaveRemakeShotQueueDraftInput = {
  activeShotKey?: string;
  analysisId: string;
  ignoredShotKeys?: string[];
  orderedShotKeys: string[];
  pausedShotKey?: string;
  queueRunId: string;
  queueTotal: number;
  shotStates: Record<string, RemakeShotGenerationState | undefined>;
  status: RemakeShotQueueStatus;
  userKeyHash?: string;
};

type ReadRemakeShotQueueDraftOptions = {
  analysisId?: string;
  userKeyHash?: string;
};

type RawRecord = Record<string, unknown>;

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

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function asNumber(value: unknown) {
  const next = Number(value);
  return Number.isFinite(next) ? next : undefined;
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? Array.from(new Set(value.map(asString).filter(Boolean))) : [];
}

function sanitizeText(value: unknown, maxLength = 500) {
  const text = asString(value).replace(/\s+/g, " ").slice(0, maxLength);
  if (!text) return "";
  return SENSITIVE_TEXT_PATTERNS.some((pattern) => pattern.test(text)) ? "" : text;
}

function sanitizeStoredUrl(value: unknown) {
  const raw = asString(value);
  if (!raw) return "";

  const lower = raw.toLowerCase();
  if (lower.startsWith("data:") || lower.startsWith("blob:") || lower.includes("base64,")) return "";
  if (SENSITIVE_TEXT_PATTERNS.some((pattern) => pattern.test(raw))) return "";

  if (raw.startsWith("/uploads/")) return raw;

  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    ["access_token", "refresh_token", "token", "api_key", "apikey", "authorization", "session", "cookie"].forEach((param) =>
      url.searchParams.delete(param),
    );
    return url.toString();
  } catch {
    return "";
  }
}

function sanitizeQueueStatus(value: unknown): RemakeShotQueueStatus {
  const status = asString(value) as RemakeShotQueueStatus;
  return QUEUE_STATUSES.has(status) ? status : "idle";
}

function sanitizeShotStatus(value: unknown): RemakeShotGenerationStatus {
  const status = asString(value) as RemakeShotGenerationStatus;
  return SHOT_STATUSES.has(status) ? status : "idle";
}

function sanitizeShotState(value: unknown): RemakeShotQueueDraftShotState | null {
  const raw = asRecord(value);
  const status = sanitizeShotStatus(raw.status);
  const updatedAt = asNumber(raw.updatedAt);

  return {
    error: sanitizeText(raw.error),
    outputUrl: sanitizeStoredUrl(raw.outputUrl),
    queueIndex: asNumber(raw.queueIndex),
    queueRunId: sanitizeText(raw.queueRunId, 120),
    queueTotal: asNumber(raw.queueTotal),
    status,
    taskId: sanitizeText(raw.taskId, 160),
    updatedAt,
  };
}

function sanitizeShotStates(value: unknown, allowedKeys: Set<string>) {
  const raw = asRecord(value);
  const next: Record<string, RemakeShotQueueDraftShotState> = {};

  Object.entries(raw).forEach(([key, item]) => {
    const shotKey = asString(key);
    if (!shotKey || !allowedKeys.has(shotKey)) return;
    const state = sanitizeShotState(item);
    if (!state) return;
    next[shotKey] = state;
  });

  return next;
}

function removeStoredDraft(storage: Storage | null) {
  if (!storage) return;
  try {
    storage.removeItem(REMAKE_SHOT_QUEUE_DRAFT_KEY);
  } catch {
    // Ignore storage access failures.
  }
}

function normalizeDraft(raw: unknown): RemakeShotQueueDraft | null {
  const record = asRecord(raw);
  if (record.version !== REMAKE_SHOT_QUEUE_DRAFT_VERSION) return null;

  const analysisId = sanitizeText(record.analysisId, 160);
  const queueRunId = sanitizeText(record.queueRunId, 160);
  const orderedShotKeys = asStringArray(record.orderedShotKeys);
  if (!analysisId || !queueRunId || !orderedShotKeys.length) return null;

  const allowedKeys = new Set(orderedShotKeys);
  const ignoredShotKeys = asStringArray(record.ignoredShotKeys).filter((key) => allowedKeys.has(key));
  const skippedShotKeys = asStringArray(record.skippedShotKeys).filter((key) => allowedKeys.has(key));
  const failedShotKeys = asStringArray(record.failedShotKeys).filter((key) => allowedKeys.has(key));
  const completedShotKeys = asStringArray(record.completedShotKeys).filter((key) => allowedKeys.has(key));
  const activeShotKey = asString(record.activeShotKey);
  const pausedShotKey = asString(record.pausedShotKey);
  const createdAt = asNumber(record.createdAt) || Date.now();
  const updatedAt = asNumber(record.updatedAt) || createdAt;
  const expiresAt = asNumber(record.expiresAt) || updatedAt + REMAKE_SHOT_QUEUE_DRAFT_TTL_MS;

  return {
    activeShotKey: activeShotKey && allowedKeys.has(activeShotKey) ? activeShotKey : undefined,
    analysisId,
    completedShotKeys,
    createdAt,
    currentIndex: asNumber(record.currentIndex) || 0,
    expiresAt,
    failedShotKeys,
    ignoredShotKeys,
    orderedShotKeys,
    pausedShotKey: pausedShotKey && allowedKeys.has(pausedShotKey) ? pausedShotKey : undefined,
    queueRunId,
    shotStates: sanitizeShotStates(record.shotStates, allowedKeys),
    skippedShotKeys,
    status: sanitizeQueueStatus(record.status),
    updatedAt,
    userKeyHash: sanitizeText(record.userKeyHash, 80),
    version: REMAKE_SHOT_QUEUE_DRAFT_VERSION,
  };
}

function getCurrentIndex(orderedShotKeys: string[], activeShotKey?: string, pausedShotKey?: string, shotStates?: Record<string, RemakeShotGenerationState | undefined>) {
  const preferredKey = activeShotKey || pausedShotKey;
  if (preferredKey) {
    const index = orderedShotKeys.indexOf(preferredKey);
    if (index >= 0) return index;
  }

  const nextIndex = orderedShotKeys.findIndex((key) => {
    const status = shotStates?.[key]?.status;
    return status !== "success" && status !== "skipped";
  });
  return nextIndex >= 0 ? nextIndex : Math.max(0, orderedShotKeys.length - 1);
}

function collectKeysByStatus(
  orderedShotKeys: string[],
  shotStates: Record<string, RemakeShotGenerationState | undefined>,
  status: RemakeShotGenerationStatus,
) {
  return orderedShotKeys.filter((key) => shotStates[key]?.status === status);
}

function buildShotStates(orderedShotKeys: string[], shotStates: Record<string, RemakeShotGenerationState | undefined>) {
  return orderedShotKeys.reduce<Record<string, RemakeShotQueueDraftShotState>>((next, key) => {
    const state = sanitizeShotState(shotStates[key]);
    if (state) next[key] = state;
    return next;
  }, {});
}

export function getRemakeQueueUserKeyHash(value: unknown) {
  const raw = asString(value).toLowerCase();
  if (!raw) return "";

  let hash = 2166136261;
  for (let index = 0; index < raw.length; index += 1) {
    hash ^= raw.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `u_${(hash >>> 0).toString(36)}`;
}

export function readRemakeShotQueueDraft(options: ReadRemakeShotQueueDraftOptions = {}): ReadRemakeShotQueueDraftResult {
  const storage = safeLocalStorage();
  if (!storage) return { draft: null, status: "unavailable" };

  try {
    const raw = storage.getItem(REMAKE_SHOT_QUEUE_DRAFT_KEY);
    if (!raw) return { draft: null, status: "missing" };

    const draft = normalizeDraft(JSON.parse(raw));
    if (!draft) {
      removeStoredDraft(storage);
      return { draft: null, status: "invalid" };
    }

    if (draft.expiresAt <= Date.now()) {
      removeStoredDraft(storage);
      return { draft: null, status: "expired" };
    }

    if (options.analysisId && draft.analysisId !== options.analysisId) {
      return { draft: null, status: "analysis_mismatch" };
    }

    if (draft.userKeyHash && options.userKeyHash && draft.userKeyHash !== options.userKeyHash) {
      return { draft: null, status: "user_mismatch" };
    }

    if (draft.userKeyHash && options.userKeyHash === "") {
      return { draft: null, status: "user_mismatch" };
    }

    return { draft, status: "ok" };
  } catch {
    removeStoredDraft(storage);
    return { draft: null, status: "invalid" };
  }
}

export function saveRemakeShotQueueDraft(input: SaveRemakeShotQueueDraftInput) {
  const storage = safeLocalStorage();
  const orderedShotKeys = asStringArray(input.orderedShotKeys);
  const analysisId = sanitizeText(input.analysisId, 160);
  const queueRunId = sanitizeText(input.queueRunId, 160);
  const now = Date.now();

  if (!analysisId || !queueRunId || !orderedShotKeys.length) return { draft: null, ok: false };

  const allowedKeys = new Set(orderedShotKeys);
  const ignoredShotKeys = asStringArray(input.ignoredShotKeys).filter((key) => allowedKeys.has(key));
  const activeShotKey = asString(input.activeShotKey);
  const pausedShotKey = asString(input.pausedShotKey);
  const shotStates = buildShotStates(orderedShotKeys, input.shotStates);
  const draft: RemakeShotQueueDraft = {
    activeShotKey: activeShotKey && allowedKeys.has(activeShotKey) ? activeShotKey : undefined,
    analysisId,
    completedShotKeys: collectKeysByStatus(orderedShotKeys, input.shotStates, "success"),
    createdAt: now,
    currentIndex: getCurrentIndex(orderedShotKeys, activeShotKey, pausedShotKey, input.shotStates),
    expiresAt: now + REMAKE_SHOT_QUEUE_DRAFT_TTL_MS,
    failedShotKeys: collectKeysByStatus(orderedShotKeys, input.shotStates, "failed"),
    ignoredShotKeys,
    orderedShotKeys,
    pausedShotKey: pausedShotKey && allowedKeys.has(pausedShotKey) ? pausedShotKey : undefined,
    queueRunId,
    shotStates,
    skippedShotKeys: collectKeysByStatus(orderedShotKeys, input.shotStates, "skipped"),
    status: sanitizeQueueStatus(input.status),
    updatedAt: now,
    userKeyHash: sanitizeText(input.userKeyHash, 80),
    version: REMAKE_SHOT_QUEUE_DRAFT_VERSION,
  };

  if (!storage) return { draft, ok: false };

  try {
    storage.setItem(REMAKE_SHOT_QUEUE_DRAFT_KEY, JSON.stringify(draft));
    return { draft, ok: true };
  } catch {
    removeStoredDraft(storage);
    return { draft, ok: false };
  }
}

export function clearRemakeShotQueueDraft() {
  removeStoredDraft(safeLocalStorage());
}
