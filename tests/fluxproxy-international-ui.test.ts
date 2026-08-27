import { describe, expect, it } from "vitest";
import { buildVideoGenerationRequest } from "@/lib/video/videoGenerationRequest";
import { getFluxProxyInputSlots, getFluxProxyInternationalDisplayName, getFluxProxyMediaCounters, getFluxProxyMediaLimits, getFluxProxyMentionToken, getFluxProxyReviewSummary, isFluxProxyInternationalModel, listFluxProxyMentionBindings, listFluxProxyMentionTokens } from "@/lib/video/fluxproxyInternational";
import type { UploadMediaItem, VideoModel } from "@/types/video";

const model = { id: "seedance_2_5_international", label: "Seedance 2.5 International", provider: "fluxproxy", providerModel: "dreamina-seedance-2-5-260628-df", productLine: "international", customerPricingStatus: "READY", credits: 23, maxPromptLength: 10000, durations: Array.from({ length: 27 }, (_value, index) => index + 4), durationDefault: 5, durationPolicy: { type: "range", selection: "discrete_range", min: 4, max: 30, step: 1 }, ratios: ["16:9"], qualities: ["480p", "720p"], referenceImages: true, referenceVideos: true, referenceAudios: true, maxReferenceImages: 30, maxReferenceVideos: 10, maxReferenceAudios: 10, maxTotalReferences: 50, internationalCapabilities: { family: "2.5", imageMax: 30, videoMax: 10, audioMax: 10, videoTotalDurationMax: 30, audioTotalDurationMax: 30, referenceCountLimitsVerified: true }, creditRules: { pricingVersion: "FLUXPROXY_INTERNATIONAL_PRICING_V1_20260826", baseCredits: 23, table: { "5": { "720p": 23 } }, referenceSurchargeCredits: 0 }, tupleCapabilities: [{ duration: 5, resolution: "720p", allowedAspectRatios: ["16:9"], audio: { supported: false, default: false }, pricing: { status: "READY", pricingVersion: "FLUXPROXY_INTERNATIONAL_PRICING_V1_20260826", currentCustomerCredits: 23 } }] } satisfies VideoModel;
const media = (type: UploadMediaItem["type"], id: string, role?: UploadMediaItem["role"]): UploadMediaItem => ({ id, assetId: id, type, role, name: id, url: `https://api.shadowedge.example/assets/${id}`, duration: type === "image" ? 0 : 3, uploadStatus: "ready", providerAssetReview: { provider: "fluxproxy", providerModel: model.providerModel!, status: "ACTIVE", isCurrent: true } });

describe("FluxProxy International frontend contract", () => {
  it("identifies only the International product line", () => {
    expect(isFluxProxyInternationalModel(model)).toBe(true);
    expect(isFluxProxyInternationalModel({ id: "seedance_2_5", provider: "xinhankr" })).toBe(false);
    expect(getFluxProxyInternationalDisplayName(model, "zh")).toBe("Seedance 2.5 国际版");
  });
  it("projects all four distinct English and Chinese model-card names", () => {
    const ids = ["seedance_2_0_international", "seedance_2_0_fast_international", "seedance_2_0_mini_international", "seedance_2_5_international"];
    expect(ids.map((id) => getFluxProxyInternationalDisplayName({ id, label: id }, "en"))).toEqual([
      "Seedance 2.0 International", "Seedance 2.0 Fast International", "Seedance 2.0 Mini International", "Seedance 2.5 International",
    ]);
    expect(ids.map((id) => getFluxProxyInternationalDisplayName({ id, label: id }, "zh"))).toEqual([
      "Seedance 2.0 国际版", "Seedance 2.0 Fast 国际版", "Seedance 2.0 Mini 国际版", "Seedance 2.5 国际版",
    ]);
  });
  it("derives 2.5 counters and documented limits", () => {
    const items = [media("image", "i"), media("video", "v"), media("audio", "a")];
    expect(getFluxProxyMediaCounters(items)).toEqual({ images: 1, videos: 1, audios: 1, videoDuration: 3, audioDuration: 3 });
    expect(getFluxProxyMediaLimits(model)).toMatchObject({ image: 30, video: 10, audio: 10, videoTotalDuration: 30, audioTotalDuration: 30 });
    expect(getFluxProxyInputSlots(model).map((slot) => slot.type)).toEqual(["image", "video", "audio"]);
  });
  it("keeps deterministic mention tokens in media order", () => {
    const items = [media("image", "first", "start_frame"), media("image", "last", "end_frame"), media("video", "v"), media("audio", "a")];
    expect(listFluxProxyMentionTokens(items)).toEqual(["@图1", "@图2", "@视频1", "@音频1"]);
    expect(listFluxProxyMentionTokens(items, "en")).toEqual(["@Image1", "@Image2", "@Video1", "@Audio1"]);
    expect(getFluxProxyMentionToken(media("image", "i"), 2)).toBe("@图2");
    expect(listFluxProxyMentionBindings(items).map(({ token, assetId, type }) => ({ token, assetId, type }))).toEqual([
      { token: "@图1", assetId: "first", type: "image" },
      { token: "@图2", assetId: "last", type: "image" },
      { token: "@视频1", assetId: "v", type: "video" },
      { token: "@音频1", assetId: "a", type: "audio" },
    ]);
  });
  it("requires ACTIVE review for the exact provider model", () => {
    const active = media("image", "i");
    expect(getFluxProxyReviewSummary([active], model.providerModel).ready).toBe(true);
    expect(getFluxProxyReviewSummary([{ ...active, providerAssetReview: { ...active.providerAssetReview!, providerModel: "other" } }], model.providerModel)).toMatchObject({ ready: false, modelMismatch: 1 });
    expect(getFluxProxyReviewSummary([{ ...active, providerAssetReview: { ...active.providerAssetReview!, isCurrent: false, status: "FAILED" } }], model.providerModel)).toMatchObject({ ready: false, failed: 0, staleAuthority: 1 });
  });
  it("builds an exact Pricing V1 customer request with canonical references", () => {
    const image = media("image", "00000000-0000-4000-8000-000000000001", "reference");
    const request = buildVideoGenerationRequest({ prompt: "Use @Image 1 safely", model, duration: 5, ratio: "16:9", quality: "720p", generateAudio: false, media: [image] });
    expect(request.pricingVersion).toBe("FLUXPROXY_INTERNATIONAL_PRICING_V1_20260826");
    expect(request.creditAmount).toBe(23);
    expect(request.references).toEqual([{ assetId: image.assetId, type: "image", role: "reference_image" }]);
  });
});
