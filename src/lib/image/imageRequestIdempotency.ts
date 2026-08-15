import { ApiError } from "@/types/api";

export type PendingImageGenerationOperation = {
  idempotencyKey: string;
  signature: string;
};

export type ImageGenerationOperationIdentity = {
  prompt: string;
  modelId: string;
  ratio: string;
  resolution: string;
  quality: string;
  batchCount: number;
  referenceImageAssetIds: string[];
  meta?: Record<string, unknown>;
};

const pendingImageOperationStorageKey = "shadowedge.image.pending-generation-operation.v1";

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try { return window.sessionStorage; } catch { return null; }
}

export function readPendingImageGenerationOperation(): PendingImageGenerationOperation | null {
  try {
    const parsed = JSON.parse(storage()?.getItem(pendingImageOperationStorageKey) || "null");
    return typeof parsed?.idempotencyKey === "string" && typeof parsed?.signature === "string" ? parsed : null;
  } catch { return null; }
}

export function writePendingImageGenerationOperation(operation: PendingImageGenerationOperation) {
  storage()?.setItem(pendingImageOperationStorageKey, JSON.stringify(operation));
}

export function clearPendingImageGenerationOperation() {
  storage()?.removeItem(pendingImageOperationStorageKey);
}

function createIdempotencyKey() {
  return globalThis.crypto.randomUUID();
}

export function resolveImageGenerationOperation(
  current: PendingImageGenerationOperation | null,
  identity: ImageGenerationOperationIdentity,
  createKey: () => string = createIdempotencyKey,
): PendingImageGenerationOperation {
  const signature = JSON.stringify(identity);
  if (current?.signature === signature) return current;
  return { idempotencyKey: createKey(), signature };
}

export function isAmbiguousImageGenerationFailure(error: unknown) {
  // A gateway 502/503/504 can be emitted after the browser POST reached a
  // durable acceptance boundary. Keep the key so a deliberate retry recovers
  // the same Job rather than creating a second billable operation.
  return error instanceof ApiError && (
    error.kind === "network" ||
    (error.kind === "server" && [502, 503, 504].includes(Number(error.status)))
  );
}
