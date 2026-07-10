export const REMAKE_LONG_VIDEO_ACTIVE_JOB_KEY = "shadowedge_remake_long_video_active_job_v1";
export const REMAKE_LONG_VIDEO_ACTIVE_JOB_VERSION = 1;
export const REMAKE_LONG_VIDEO_ACTIVE_JOB_TTL_MS = 24 * 60 * 60 * 1000;

export type RemakeLongVideoActiveJob = {
  analysisJobId: string;
  clientRequestId: string;
  createdAt: number;
  expiresAt: number;
  version: typeof REMAKE_LONG_VIDEO_ACTIVE_JOB_VERSION;
};

export type ReadRemakeLongVideoActiveJobResult = {
  job: RemakeLongVideoActiveJob | null;
  status: "expired" | "invalid" | "missing" | "ok" | "unavailable";
};

export type SaveRemakeLongVideoActiveJobInput = Pick<
  RemakeLongVideoActiveJob,
  "analysisJobId" | "clientRequestId"
> & {
  createdAt?: number;
};

export type SaveRemakeLongVideoActiveJobResult = {
  job?: RemakeLongVideoActiveJob;
  ok: boolean;
  reason?: "invalid" | "storage_unavailable" | "storage_write_failed";
};

const sensitiveTextPatterns = [
  /api[_-]?key/i,
  /authorization/i,
  /bearer\s+/i,
  /cookie/i,
  /secret/i,
  /session/i,
  /token/i,
];

function safeLocalStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function sanitizeId(value: unknown) {
  const text = typeof value === "string" ? value.trim().slice(0, 200) : "";
  if (!text || sensitiveTextPatterns.some((pattern) => pattern.test(text))) return "";
  return text;
}

function normalizeCreatedAt(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function normalizeJob(value: unknown): RemakeLongVideoActiveJob | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.version !== REMAKE_LONG_VIDEO_ACTIVE_JOB_VERSION) return null;

  const analysisJobId = sanitizeId(record.analysisJobId);
  const clientRequestId = sanitizeId(record.clientRequestId);
  const createdAt = normalizeCreatedAt(record.createdAt);
  const expiresAt = normalizeCreatedAt(record.expiresAt) || createdAt + REMAKE_LONG_VIDEO_ACTIVE_JOB_TTL_MS;
  if (!analysisJobId || !clientRequestId || !createdAt || !expiresAt) return null;

  return {
    analysisJobId,
    clientRequestId,
    createdAt,
    expiresAt,
    version: REMAKE_LONG_VIDEO_ACTIVE_JOB_VERSION,
  };
}

function removeStoredJob(storage: Storage) {
  try {
    storage.removeItem(REMAKE_LONG_VIDEO_ACTIVE_JOB_KEY);
  } catch {
    // Storage cleanup is best-effort.
  }
}

export function readRemakeLongVideoActiveJob(): ReadRemakeLongVideoActiveJobResult {
  const storage = safeLocalStorage();
  if (!storage) return { job: null, status: "unavailable" };

  try {
    const raw = storage.getItem(REMAKE_LONG_VIDEO_ACTIVE_JOB_KEY);
    if (!raw) return { job: null, status: "missing" };

    const job = normalizeJob(JSON.parse(raw));
    if (!job) {
      removeStoredJob(storage);
      return { job: null, status: "invalid" };
    }

    if (job.expiresAt <= Date.now()) {
      removeStoredJob(storage);
      return { job: null, status: "expired" };
    }

    return { job, status: "ok" };
  } catch {
    removeStoredJob(storage);
    return { job: null, status: "invalid" };
  }
}

export const restoreRemakeLongVideoActiveJob = readRemakeLongVideoActiveJob;

export function saveRemakeLongVideoActiveJob(
  input: SaveRemakeLongVideoActiveJobInput,
): SaveRemakeLongVideoActiveJobResult {
  const createdAt = normalizeCreatedAt(input.createdAt) || Date.now();
  const job = normalizeJob({
    analysisJobId: input.analysisJobId,
    clientRequestId: input.clientRequestId,
    createdAt,
    expiresAt: createdAt + REMAKE_LONG_VIDEO_ACTIVE_JOB_TTL_MS,
    version: REMAKE_LONG_VIDEO_ACTIVE_JOB_VERSION,
  });
  if (!job) return { ok: false, reason: "invalid" };

  const storage = safeLocalStorage();
  if (!storage) return { job, ok: false, reason: "storage_unavailable" };

  try {
    storage.setItem(REMAKE_LONG_VIDEO_ACTIVE_JOB_KEY, JSON.stringify(job));
    return { job, ok: true };
  } catch {
    return { job, ok: false, reason: "storage_write_failed" };
  }
}

export function clearRemakeLongVideoActiveJob() {
  const storage = safeLocalStorage();
  if (!storage) return false;
  removeStoredJob(storage);
  return true;
}
