import { describe, expect, it } from "vitest";

import { buildVideoGenerationRequest } from "@/lib/video/videoGenerationRequest";
import type { UploadMediaItem, VideoModel } from "@/types/video";

const model: VideoModel = {
  id: "seedance_2_0",
  label: "Seedance 2.0",
  providerModel: "seedance_2_0",
  credits: 12,
  durations: [5],
  durationDefault: 5,
  ratios: ["16:9"],
  qualities: ["720p"],
};

const media: UploadMediaItem[] = [
  { id: "image-1", assetId: "asset-image-1", type: "image", name: "image.png", url: "https://api.shadowedgeai.com/uploads/image.png", uploadStatus: "ready" },
  { id: "video-1", assetId: "asset-video-1", type: "video", name: "video.mp4", url: "https://api.shadowedgeai.com/uploads/video.mp4", uploadStatus: "ready" },
  { id: "audio-1", assetId: "asset-audio-1", type: "audio", name: "audio.wav", url: "https://api.shadowedgeai.com/uploads/audio.wav", uploadStatus: "ready" },
];

function build(prompt: string) {
  return buildVideoGenerationRequest({
    prompt,
    model,
    duration: 5,
    ratio: "16:9",
    quality: "720p",
    generateAudio: true,
    media,
  });
}

describe("Seedance reference transport", () => {
  it("transports only an explicitly mentioned image", () => {
    const request = build("使用 @图1 作为产品参考");
    expect(request.reference_images).toEqual([media[0].url]);
    expect(request.reference_videos).toEqual([]);
    expect(request.reference_audios).toEqual([]);
    expect(request.reference_image_asset_ids).toEqual(["asset-image-1"]);
  });

  it("transports only an explicitly mentioned video", () => {
    const request = build("使用 @视频1 作为运动参考");
    expect(request.reference_images).toEqual([]);
    expect(request.reference_videos).toEqual([media[1].url]);
    expect(request.reference_audios).toEqual([]);
    expect(request.reference_video_asset_ids).toEqual(["asset-video-1"]);
  });

  it("transports only an explicitly mentioned audio clip", () => {
    const request = build("使用 @音频1 作为节奏参考");
    expect(request.reference_images).toEqual([]);
    expect(request.reference_videos).toEqual([]);
    expect(request.reference_audios).toEqual([media[2].url]);
    expect(request.reference_audio_asset_ids).toEqual(["asset-audio-1"]);
  });

  it("supports mixed image and video mentions without attaching unmentioned audio", () => {
    const request = build("Use @Image 1 and follow @Video 1");
    expect(request.reference_images).toEqual([media[0].url]);
    expect(request.reference_videos).toEqual([media[1].url]);
    expect(request.reference_audios).toEqual([]);
    expect(request.mediaList.map((item) => item.type)).toEqual(["image", "video"]);
    expect(request.reference_image_asset_ids).toEqual(["asset-image-1"]);
    expect(request.reference_video_asset_ids).toEqual(["asset-video-1"]);
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
