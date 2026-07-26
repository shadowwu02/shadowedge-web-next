import {
  STUDIO_CREATIVE_CANVAS_EDIT_STATUSES,
  type StudioCreativeCanvasEditStatus,
} from "@/features/studio/capabilities/studioCreativeCanvas";
import { ApiError } from "@/types/api";

export const STUDIO_CREATIVE_CANVAS_ACTIVE_DRAFTS_STORAGE_KEY =
  "shadowedge_studio_creative_canvas_active_drafts_v1";

export const STUDIO_CREATIVE_CANVAS_DRAFT_TYPES = [
  "EDIT_SESSION",
  "AI_PLAN",
  "AI_OPTIMIZATION",
] as const;

export type StudioCreativeCanvasDraftType =
  typeof STUDIO_CREATIVE_CANVAS_DRAFT_TYPES[number];

export type StudioCreativeCanvasActiveDraft = Readonly<{
  draftId: string;
  projectId: string;
  graphVersion: string;
  status: StudioCreativeCanvasEditStatus;
  createdAt: string;
  draftType: StudioCreativeCanvasDraftType;
  editSessionId: string;
}>;

type ActiveDraftIndex = Record<string, StudioCreativeCanvasActiveDraft>;

export type StudioCreativeCanvasRecoveryOptions = Readonly<{
  signal?: AbortSignal;
  maxAttempts?: number;
  timeoutMs?: number;
  retryDelaysMs?: readonly number[];
  wait?: (delayMs: number, signal?: AbortSignal) => Promise<void>;
}>;

const DEFAULT_RECOVERY_RETRY_DELAYS_MS = [300, 900] as const;

function abortError() {
  const error = new Error("Canvas Draft recovery was cancelled.");
  error.name = "AbortError";
  return error;
}

function waitForRecoveryRetry(delayMs: number, signal?: AbortSignal) {
  if (signal?.aborted) return Promise.reject(abortError());
  return new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      signal?.removeEventListener("abort", handleAbort);
      resolve();
    }, delayMs);
    const handleAbort = () => {
      window.clearTimeout(timer);
      signal?.removeEventListener("abort", handleAbort);
      reject(abortError());
    };
    signal?.addEventListener("abort", handleAbort, { once: true });
  });
}

export function isTemporaryCanvasDraftRecoveryError(reason: unknown) {
  return reason instanceof ApiError && reason.kind === "network";
}

export function canvasDraftRecoveryErrorMessage(reason: unknown) {
  if (isTemporaryCanvasDraftRecoveryError(reason)) {
    return "Canvas Draft recovery was interrupted by a temporary network problem. Retry restore.";
  }
  return reason instanceof Error
    ? reason.message
    : "The saved Canvas Draft could not be restored.";
}

/**
 * Replays read-only Draft recovery after transient transport failures only.
 * Authentication, permission, validation, and terminal Draft errors fail closed.
 */
export async function recoverStudioCreativeCanvasDraft<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  options: StudioCreativeCanvasRecoveryOptions = {},
) {
  const maxAttempts = Math.max(1, options.maxAttempts ?? 3);
  const timeoutMs = Math.max(0, options.timeoutMs ?? 8_000);
  const retryDelaysMs = options.retryDelaysMs ?? DEFAULT_RECOVERY_RETRY_DELAYS_MS;
  const wait = options.wait ?? waitForRecoveryRetry;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (options.signal?.aborted) throw abortError();

    const attemptController = new AbortController();
    let timedOut = false;
    const handleParentAbort = () => attemptController.abort();
    options.signal?.addEventListener("abort", handleParentAbort, { once: true });
    const timeout = timeoutMs > 0
      ? window.setTimeout(() => {
        timedOut = true;
        attemptController.abort();
      }, timeoutMs)
      : null;

    try {
      return await operation(attemptController.signal);
    } catch (reason: unknown) {
      if (options.signal?.aborted) throw abortError();
      const failure = timedOut
        ? new ApiError("Canvas Draft recovery request timed out.", { kind: "network" })
        : reason;
      if (!isTemporaryCanvasDraftRecoveryError(failure) || attempt + 1 >= maxAttempts) {
        throw failure;
      }
    } finally {
      if (timeout !== null) window.clearTimeout(timeout);
      options.signal?.removeEventListener("abort", handleParentAbort);
    }

    await wait(retryDelaysMs[Math.min(attempt, retryDelaysMs.length - 1)] ?? 0, options.signal);
  }

  throw new Error("Canvas Draft recovery exhausted its retry boundary.");
}

function storage() {
  return typeof window === "undefined" ? null : window.localStorage;
}

function isActiveDraft(value: unknown, projectId?: string): value is StudioCreativeCanvasActiveDraft {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.draftId === "string" &&
    Boolean(record.draftId.trim()) &&
    typeof record.projectId === "string" &&
    Boolean(record.projectId.trim()) &&
    (!projectId || record.projectId === projectId) &&
    typeof record.graphVersion === "string" &&
    Boolean(record.graphVersion.trim()) &&
    typeof record.createdAt === "string" &&
    Boolean(record.createdAt.trim()) &&
    typeof record.editSessionId === "string" &&
    Boolean(record.editSessionId.trim()) &&
    STUDIO_CREATIVE_CANVAS_DRAFT_TYPES.includes(
      record.draftType as StudioCreativeCanvasDraftType,
    ) &&
    STUDIO_CREATIVE_CANVAS_EDIT_STATUSES.includes(
      record.status as StudioCreativeCanvasEditStatus,
    )
  );
}

function readIndex(): ActiveDraftIndex {
  const target = storage();
  if (!target) return {};
  try {
    const parsed = JSON.parse(
      target.getItem(STUDIO_CREATIVE_CANVAS_ACTIVE_DRAFTS_STORAGE_KEY) || "{}",
    ) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(([projectId, value]) => isActiveDraft(value, projectId)),
    );
  } catch {
    return {};
  }
}

function writeIndex(index: ActiveDraftIndex) {
  const target = storage();
  if (!target) return false;
  try {
    target.setItem(
      STUDIO_CREATIVE_CANVAS_ACTIVE_DRAFTS_STORAGE_KEY,
      JSON.stringify(index),
    );
    return true;
  } catch {
    return false;
  }
}

export function getActiveStudioCreativeCanvasDraft(projectId: string) {
  const value = readIndex()[projectId];
  return isActiveDraft(value, projectId) ? value : null;
}

export function saveActiveStudioCreativeCanvasDraft(
  value: StudioCreativeCanvasActiveDraft,
) {
  if (!isActiveDraft(value, value.projectId)) return false;
  return writeIndex({
    ...readIndex(),
    [value.projectId]: value,
  });
}

export function clearActiveStudioCreativeCanvasDraft(projectId: string) {
  const index = readIndex();
  if (!index[projectId]) return true;
  delete index[projectId];
  return writeIndex(index);
}
