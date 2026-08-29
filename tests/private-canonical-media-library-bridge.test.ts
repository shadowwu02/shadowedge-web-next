import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { mediaAssetToUploadMediaItem } from "@/lib/assets-api";
import { getFluxProxyReviewSummary, listFluxProxyMentionBindings } from "@/lib/video/fluxproxyInternational";
import { buildVideoGenerationRequest } from "@/lib/video/videoGenerationRequest";
import type { MediaAssetRecord } from "@/lib/assets-api";
import type { UploadMediaItem, VideoModel } from "@/types/video";

const ASSET_ID = "33333333-3333-4333-8333-333333333333";
const SIGNED_PREVIEW = "https://api.shadowedge.example/api/internal/fluxproxy-assets/receipt/expires/signature";
const PUBLIC_PROVIDER_MODEL_ALIAS = "seedance_2_5_international";
const REFERENCE_BINDING_PROFILE = "rbp_d3c7a4198e5f2b60";

const model = {
  id: "seedance_2_5_international",
  label: "Seedance 2.5 International",
  provider: "fluxproxy",
  providerModel: PUBLIC_PROVIDER_MODEL_ALIAS,
  referenceBindingProfileId: REFERENCE_BINDING_PROFILE,
  productLine: "international",
  customerPricingStatus: "READY",
  credits: 18,
  maxPromptLength: 10_000,
  durations: Array.from({ length: 27 }, (_value, index) => index + 4),
  durationDefault: 4,
  durationPolicy: { type: "range", selection: "discrete_range", min: 4, max: 30, step: 1 },
  ratios: ["16:9"],
  qualities: ["480p", "720p"],
  referenceImages: true,
  referenceVideos: true,
  referenceAudios: true,
  maxReferenceImages: 30,
  maxReferenceVideos: 10,
  maxReferenceAudios: 10,
  maxTotalReferences: 50,
  internationalCapabilities: { family: "2.5", imageMax: 30, videoMax: 10, audioMax: 10, videoTotalDurationMax: 30, audioTotalDurationMax: 30, referenceCountLimitsVerified: true },
  creditRules: { pricingVersion: "FLUXPROXY_INTERNATIONAL_PRICING_V1_20260826", baseCredits: 18, table: { "4": { "720p": 18 } }, referenceSurchargeCredits: 0 },
  tupleCapabilities: [{ duration: 4, resolution: "720p", allowedAspectRatios: ["16:9"], audio: { supported: false, default: false }, pricing: { status: "READY", pricingVersion: "FLUXPROXY_INTERNATIONAL_PRICING_V1_20260826", currentCustomerCredits: 18 } }],
} satisfies VideoModel;

function record(status: "ACTIVE" | "PROCESSING" | "FAILED" = "ACTIVE"): MediaAssetRecord {
  return {
    id: ASSET_ID,
    type: "image",
    source: "uploaded",
    status: "ready",
    url: null,
    publicUrl: null,
    previewUrl: SIGNED_PREVIEW,
    previewExpiresAt: "2026-08-27T00:30:00.000Z",
    privateReference: true,
    filename: "private-reference.png",
    displayName: "Private reference",
    mimeType: "image/png",
    sizeBytes: 1024,
    providerAssetReview: { referenceBindingProfileId: REFERENCE_BINDING_PROFILE, assetType: "image", status, isCurrent: true, authoritySource: "SUPERSEDING", authorityGeneration: 2 },
  };
}

describe("private canonical Asset media-library bridge", () => {
  it("keeps a no-publicUrl private image selectable by canonical UUID", () => {
    const item = mediaAssetToUploadMediaItem(record());
    expect(item).not.toBeNull();
    expect(item).toMatchObject({
      id: ASSET_ID,
      assetId: ASSET_ID,
      url: SIGNED_PREVIEW,
      previewUrl: SIGNED_PREVIEW,
      privateReference: true,
      uploadStatus: "ready",
    });
    expect(item?.providerAssetReview).toMatchObject({ referenceBindingProfileId: REFERENCE_BINDING_PROFILE, assetType: "image", status: "ACTIVE" });
    expect(getFluxProxyReviewSummary([item as UploadMediaItem], REFERENCE_BINDING_PROFILE).ready).toBe(true);
    expect(listFluxProxyMentionBindings([item as UploadMediaItem])[0]).toMatchObject({ assetId: ASSET_ID, type: "image" });
  });

  it("projects Processing and Failed review UX without creating another review", () => {
    expect(mediaAssetToUploadMediaItem(record("PROCESSING"))?.providerAssetReview?.status).toBe("PROCESSING");
    expect(mediaAssetToUploadMediaItem(record("FAILED"))?.providerAssetReview?.status).toBe("FAILED");
  });

  it("submits only canonical identity for International generation and preserves 18 Credit pricing", () => {
    const item = mediaAssetToUploadMediaItem(record()) as UploadMediaItem;
    const request = buildVideoGenerationRequest({
      prompt: "Use @Image 1 for a safe landscape",
      model,
      duration: 4,
      ratio: "16:9",
      quality: "720p",
      generateAudio: false,
      media: [item],
    });
    expect(request.references).toEqual([{ assetId: ASSET_ID, type: "image", role: "reference_image" }]);
    expect(request.reference_image_asset_ids).toEqual([ASSET_ID]);
    expect(request.creditAmount).toBe(18);
    expect(request.reference_images).toEqual([]);
    expect(request.assets).toEqual({ images: [], videos: [], audios: [] });
    expect(request.mediaList).toEqual([]);
    expect(request.providerModel).toBe("");
    expect(JSON.stringify(request)).not.toContain(SIGNED_PREVIEW);
    expect(JSON.stringify(request)).not.toContain("asset://");
  });

  it("keeps Xinhankr URL transport unchanged", () => {
    const xinhankr = {
      id: "seedance_2_0",
      label: "Seedance 2.0",
      providerModel: "seedance_2_0",
      credits: 23,
      maxPromptLength: 4_000,
      durations: [5],
      durationDefault: 5,
      ratios: ["16:9"],
      qualities: ["720p"],
      uploadSlots: ["reference_images"],
      referenceImages: true,
      maxReferenceImages: 9,
      maxTotalReferences: 9,
    } satisfies VideoModel;
    const item = { ...(mediaAssetToUploadMediaItem(record()) as UploadMediaItem), privateReference: false };
    const request = buildVideoGenerationRequest({ prompt: "Use @Image 1", model: xinhankr, duration: 5, ratio: "16:9", quality: "720p", generateAudio: false, media: [item] });
    expect(request.reference_images).toEqual([SIGNED_PREVIEW]);
    expect(request.mediaList).toHaveLength(1);
  });

  it("loads exact model projections and refreshes expired previews without changing identity", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/video/MediaPickerDrawer.tsx"), "utf8");
    expect(source).toMatch(/listMediaAssets\(\{[^}]*model:\s*modelRule\.modelId/);
    expect(source).toMatch(/refreshPrivateMediaAssetPreview\(item\.assetId/);
    expect(source).toMatch(/candidate\.assetId === item\.assetId/);
    expect(source).toMatch(/refreshKey = `\$\{referenceBindingProfileId \|\| modelRule\.modelId\}:\$\{item\.type\}:\$\{item\.assetId/);
    expect(source).toMatch(/refreshingPreviewsRef\.current\.delete\(refreshKey\)/);
    expect(source).toMatch(/onError=\{\(\) => void refreshPrivatePreview\(item\)\}/);
  });

  it("replaces a selected historical binding projection with the refreshed current projection", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/video/UploadBox.tsx"), "utf8");
    expect(source).toMatch(/refreshPrivateMediaAssetPreview\(item\.assetId as string/);
    expect(source).toMatch(/resolveCurrentReferenceProjections\(selectedRemoteItems, availableMedia, referenceBindingProfileId\)/);
    expect(source).toMatch(/mergeSelectedReferenceMedia\(currentItems, selectedRemoteItems\)/);
    expect(source).toMatch(/referenceBindingProfileId=\{referenceBindingProfileId\}/);
  });
});
