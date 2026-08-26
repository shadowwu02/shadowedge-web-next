import { describe, expect, it } from "vitest";
import { buildVideoGenerationRequest } from "@/lib/video/videoGenerationRequest";
import { getFluxProxyInputSlots, getFluxProxyMediaCounters, getFluxProxyMediaLimits, getFluxProxyMentionToken, getFluxProxyReviewSummary, isFluxProxyInternationalModel, listFluxProxyMentionBindings, listFluxProxyMentionTokens } from "@/lib/video/fluxproxyInternational";
import type { UploadMediaItem, VideoModel } from "@/types/video";

const model = { id: "seedance_2_5_international", label: "Seedance 2.5 International", provider: "fluxproxy", providerModel: "dreamina-seedance-2-5-260628-df", productLine: "international", customerPricingStatus: "MISSING_OWNER_DECISION", credits: 0, maxPromptLength: 10000, durations: [], durationDefault: 5, ratios: ["16:9"], qualities: ["480p", "720p"] } satisfies VideoModel;
const media = (type: UploadMediaItem["type"], id: string, role?: UploadMediaItem["role"]): UploadMediaItem => ({ id, assetId: id, type, role, name: id, duration: type === "image" ? 0 : 3, uploadStatus: "ready", providerAssetReview: { provider: "fluxproxy", providerModel: model.providerModel!, status: "ACTIVE" } });

describe("FluxProxy International frontend contract", () => {
  it("identifies only the International product line", () => {
    expect(isFluxProxyInternationalModel(model)).toBe(true);
    expect(isFluxProxyInternationalModel({ id: "seedance_2_5", provider: "xinhankr" })).toBe(false);
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
  });
  it("hard-blocks customer generation while pricing is missing", () => {
    expect(() => buildVideoGenerationRequest({ prompt: "safe", model, duration: 5, ratio: "16:9", quality: "720p", generateAudio: false, media: [] })).toThrowError(expect.objectContaining({ code: "FLUXPROXY_CUSTOMER_PRICING_REQUIRED" }));
  });
});
