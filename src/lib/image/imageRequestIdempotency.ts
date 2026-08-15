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
  return error instanceof ApiError && error.kind === "network";
}
