import { describe, expect, it } from "vitest";
import { ApiError } from "@/types/api";
import {
  isAmbiguousImageGenerationFailure,
  resolveImageGenerationOperation,
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
    expect(isAmbiguousImageGenerationFailure(new ApiError("credits", { code: "INSUFFICIENT_CREDITS" }))).toBe(false);
  });
});
