import { describe, expect, it } from "vitest";
import {
  buildImageGenerateRequest,
  isCanonicalImageReferenceReady,
  normalizeImageUploadResponse,
} from "@/lib/image-api";
import type { ImageModel } from "@/types/image";

const ASSET_ID = "dce629ad-7df4-483c-99d9-a35f3d116f39";
const model: ImageModel = {
  id: "nano_banana",
  name: "Nano Banana",
  label: "Nano Banana",
  provider: "public",
  providerModel: "nano_banana",
  capabilities: {
    textToImage: true,
    imageToImage: true,
    maxReferences: 14,
    maxPromptLength: 4000,
    maxBatchCount: 1,
    ratios: ["1:1"],
    resolutions: ["1k"],
    qualities: [],
  },
  creditRules: { baseCredits: 2 },
  defaults: { ratio: "1:1", resolution: "1k", quality: "", batchCount: 1 },
};

const baseUpload = {
  assetId: ASSET_ID,
  canonicalStatus: "ready",
  mimetype: "image/png",
  url: "https://api.shadowedgeai.com/uploads/images/reference.png",
};

describe("Image upload Canonical READY state", () => {
  it("marks an upload READY only when the server confirms canonical reference eligibility", () => {
    const upload = normalizeImageUploadResponse({
      data: {
        ...baseUpload,
        referenceEligibility: { eligible: true, status: "ready" },
      },
    });

    expect(upload.assetId).toBe(ASSET_ID);
    expect(upload.uploadStatus).toBe("ready");
    expect(isCanonicalImageReferenceReady(upload)).toBe(true);
  });

  it.each([
    ["missing asset id", { url: baseUpload.url, mimetype: baseUpload.mimetype, canonicalStatus: "ready", referenceEligibility: { eligible: true, status: "ready" } }],
    ["invalid asset id", { ...baseUpload, assetId: "legacy-image-123", referenceEligibility: { eligible: true, status: "ready" } }],
    ["missing server eligibility", baseUpload],
    ["failed finalize", { ...baseUpload, canonicalStatus: "failed", referenceEligibility: { eligible: false, status: "failed" } }],
  ])("does not mark %s as a usable reference", (_label, data) => {
    const upload = normalizeImageUploadResponse({ data });

    expect(upload.assetId).toBeUndefined();
    expect(upload.referenceEligibility).toBe(false);
    expect(upload.uploadStatus).toBe("not_reference_eligible");
    expect(isCanonicalImageReferenceReady(upload)).toBe(false);
  });

  it("never serializes a URL or non-UUID reference into an Image request", () => {
    const request = buildImageGenerateRequest({
      prompt: "Preserve the subject.",
      model,
      params: {},
      referenceImageAssetIds: [ASSET_ID, "https://api.shadowedgeai.com/uploads/images/reference.png", "legacy-image-123"],
    });

    expect(request.referenceImageAssetIds).toEqual([ASSET_ID]);
    expect(request.reference_image_asset_ids).toEqual([ASSET_ID]);
    expect(request.meta?.referenceImageAssetIds).toEqual([ASSET_ID]);
  });
});
