import { describe, expect, it } from "vitest";

import { buildVideoGenerationRequest } from "@/lib/video/videoGenerationRequest";
import { normalizeVideoModel } from "@/lib/video-api";
import type { UploadMediaItem, VideoModel } from "@/types/video";

const model: VideoModel = normalizeVideoModel({
  id: "seedance_2_0",
  label: "Seedance 2.0",
  providerModel: "seedance_2_0",
  credits: 12,
  maxPromptLength: 4000,
  durations: [5],
  durationDefault: 5,
  ratios: ["16:9"],
  qualities: ["720p"],
  uploadSlots: ["reference_images", "reference_videos", "reference_audios"],
  referenceImages: true,
  maxReferenceImages: 9,
  referenceVideos: true,
  maxReferenceVideos: 2,
  referenceAudios: true,
  maxReferenceAudios: 1,
  maxTotalReferences: 12,
  mixedReference: { imageVideo: true, maxImages: 9, maxVideos: 2, imageAudio: true, videoAudio: true, imageVideoAudio: true },
  audioReference: {
    enabled: true,
    max: 1,
    formats: ["wav"],
    mimeTypes: ["audio/wav"],
    maxFileBytes: 15728640,
    minDurationSeconds: 0,
    maxDurationSeconds: 60,
    surchargeCredits: 0,
    audioOnly: true,
    requiresImage: false,
    maxMixedImages: 9,
    maxMixedVideos: 2,
    generatedAudioCompatible: true,
  },
});

const media: UploadMediaItem[] = [
  { id: "image-1", assetId: "10000000-0000-4000-8000-000000000001", type: "image", name: "image.png", url: "https://api.shadowedgeai.com/uploads/image.png", uploadStatus: "ready" },
  { id: "video-1", assetId: "20000000-0000-4000-8000-000000000001", type: "video", name: "video.mp4", url: "https://api.shadowedgeai.com/uploads/video.mp4", uploadStatus: "ready" },
  { id: "audio-1", assetId: "30000000-0000-4000-8000-000000000001", type: "audio", name: "audio.wav", url: "https://api.shadowedgeai.com/uploads/audio.wav", uploadStatus: "ready" },
];

function build(prompt: string) {
  return buildVideoGenerationRequest({
    prompt,
    model,
    duration: 5,
    ratio: "16:9",
    quality: "720p",
    generateAudio: false,
    media,
  });
}

describe("Seedance reference transport", () => {
  it("rejects URL-only and non-UUID legacy reference identities instead of falling back to item.id", () => {
    const legacy = [{
      ...media[0],
      id: "https://api.shadowedgeai.com/uploads/legacy.png",
      assetId: undefined,
    }];
    expect(() => buildVideoGenerationRequest({
      prompt: "Use @Image 1",
      model,
      duration: 5,
      ratio: "16:9",
      quality: "720p",
      generateAudio: false,
      media: legacy,
    })).toThrowError(expect.objectContaining({ code: "XINHANKR_ARTSDANCE_REFERENCE_ASSET_ID_INVALID" }));
  });

  it("transports only an explicitly mentioned image", () => {
    const request = build("使用 @图1 作为产品参考");
    expect(request.reference_images).toEqual([media[0].url]);
    expect(request.reference_videos).toEqual([]);
    expect(request.reference_audios).toEqual([]);
    expect(request.reference_image_asset_ids).toEqual([media[0].assetId]);
  });

  it("transports only an explicitly mentioned video", () => {
    const request = build("使用 @视频1 作为运动参考");
    expect(request.reference_images).toEqual([]);
    expect(request.reference_videos).toEqual([media[1].url]);
    expect(request.reference_audios).toEqual([]);
    expect(request.reference_video_asset_ids).toEqual([media[1].assetId]);
  });

  it("transports only an explicitly mentioned audio clip", () => {
    const request = build("使用 @音频1 作为节奏参考");
    expect(request.reference_images).toEqual([]);
    expect(request.reference_videos).toEqual([]);
    expect(request.reference_audios).toEqual([media[2].url]);
    expect(request.reference_audio_asset_ids).toEqual([media[2].assetId]);
  });

  it("supports mixed image and video mentions without attaching unmentioned audio", () => {
    const request = build("Use @Image 1 and follow @Video 1");
    expect(request.reference_images).toEqual([media[0].url]);
    expect(request.reference_videos).toEqual([media[1].url]);
    expect(request.reference_audios).toEqual([]);
    expect(request.mediaList.map((item) => item.type)).toEqual(["image", "video"]);
    expect(request.reference_image_asset_ids).toEqual([media[0].assetId]);
    expect(request.reference_video_asset_ids).toEqual([media[1].assetId]);
  });

  it("keeps ordinary generation text-only even when ready attachments exist", () => {
    const request = build("A cinematic product video");
    expect(request.reference_images).toEqual([]);
    expect(request.reference_videos).toEqual([]);
    expect(request.reference_audios).toEqual([]);
    expect(request.mediaList).toEqual([]);
    expect(request.reference_image_asset_ids).toEqual([]);
    expect(request.mode).toBe("text-to-video");
  });
});
