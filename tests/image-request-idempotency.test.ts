import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/types/api";
import {
  clearPendingImageGenerationOperation,
  isAmbiguousImageGenerationFailure,
  readPendingImageGenerationOperation,
  resolveImageGenerationOperation,
  writePendingImageGenerationOperation,
} from "@/lib/image/imageRequestIdempotency";

const identity = {
  prompt: "A ceramic cup",
  modelId: "gpt_image_2",
  ratio: "1:1",
  resolution: "1K",
  quality: "low",
  batchCount: 1,
  referenceImageAssetIds: [],
};

describe("image generation idempotency lifecycle", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("reuses the same key for an ambiguous retry of the same operation", () => {
    const first = resolveImageGenerationOperation(null, identity, () => "operation-key-1");
    const retry = resolveImageGenerationOperation(first, identity, () => "operation-key-2");
    expect(retry.idempotencyKey).toBe("operation-key-1");
  });

  it("creates a new key when the user starts a different generation", () => {
    const first = resolveImageGenerationOperation(null, identity, () => "operation-key-1");
    const next = resolveImageGenerationOperation(first, { ...identity, prompt: "A blue ceramic cup" }, () => "operation-key-2");
    expect(next.idempotencyKey).toBe("operation-key-2");
  });

  it("only retains a key for ambiguous network failures", () => {
    expect(isAmbiguousImageGenerationFailure(new ApiError("network", { kind: "network" }))).toBe(true);
    expect(isAmbiguousImageGenerationFailure(new ApiError("gateway timeout", { kind: "server", status: 504 }))).toBe(true);
    expect(isAmbiguousImageGenerationFailure(new ApiError("credits", { code: "INSUFFICIENT_CREDITS" }))).toBe(false);
  });

  it("keeps an ambiguous operation key through a workspace refresh and clears it after acceptance", () => {
    const values = new Map<string, string>();
    vi.stubGlobal("window", {
      sessionStorage: {
        getItem: (key: string) => values.get(key) || null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
      },
    });
    const operation = resolveImageGenerationOperation(null, identity, () => "operation-key-refresh");
    writePendingImageGenerationOperation(operation);
    expect(readPendingImageGenerationOperation()).toEqual(operation);
    const retry = resolveImageGenerationOperation(readPendingImageGenerationOperation(), identity, () => "new-key-must-not-be-used");
    expect(retry.idempotencyKey).toBe("operation-key-refresh");
    clearPendingImageGenerationOperation();
    expect(readPendingImageGenerationOperation()).toBeNull();
  });
});
