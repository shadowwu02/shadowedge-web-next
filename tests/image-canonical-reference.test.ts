import { describe, expect, it } from "vitest";
import { buildImageGenerateRequest, normalizeImageUploadResponse } from "@/lib/image-api";
import type { ImageModel } from "@/types/image";

const ASSET_ID = "dce629ad-7df4-483c-99d9-a35f3d116f39";

const model: ImageModel = {
  id: "gpt_image_2",
  name: "GPT Image 2",
  label: "GPT Image 2",
  provider: "public",
  providerModel: "gpt-image-2",
  capabilities: {
    textToImage: true,
    imageToImage: true,
    maxReferences: 9,
    maxPromptLength: 4000,
    maxBatchCount: 1,
    ratios: ["1:1"],
    resolutions: ["1k"],
    qualities: ["standard"],
  },
  creditRules: { baseCredits: 1 },
  defaults: { ratio: "1:1", resolution: "1k", quality: "standard", batchCount: 1 },
};

describe("Image Canonical Reference contract", () => {
  it("preserves the UUID returned by the Canonical upload contract", () => {
    const upload = normalizeImageUploadResponse({
      data: {
        assetId: ASSET_ID,
        id: "legacy-filename.png",
        url: "https://api.shadowedgeai.com/uploads/images/reference.png",
        mimetype: "image/png",
      },
    });

    expect(upload.assetId).toBe(ASSET_ID);
    expect(upload.id).toBe("legacy-filename.png");
  });

  it("never promotes a URL or legacy id to a Canonical assetId", () => {
    const upload = normalizeImageUploadResponse({
      data: {
        id: "https://api.shadowedgeai.com/uploads/images/reference.png",
        url: "https://api.shadowedgeai.com/uploads/images/reference.png",
        mimetype: "image/png",
      },
    });

    expect(upload.assetId).toBeUndefined();
  });

  it("builds Image-to-Image requests from Canonical UUIDs without URL references", () => {
    const request = buildImageGenerateRequest({
      prompt: "Preserve the subject.",
      model,
      params: {},
      referenceImageAssetIds: [ASSET_ID],
    });

    expect(request.referenceImageAssetIds).toEqual([ASSET_ID]);
    expect(request.reference_image_asset_ids).toEqual([ASSET_ID]);
    expect(request.referenceImages).toEqual([]);
    expect(request.reference_images).toEqual([]);
  });
});
