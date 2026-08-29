import { describe, expect, it } from "vitest";

import { normalizeVideoModel } from "@/lib/video-api";
import { buildVideoGenerationRequest } from "@/lib/video/videoGenerationRequest";
import { getVideoModelRuleFromRegistry } from "@/lib/video/videoModelRules";
import { resolveVideoPromptBoundReferences } from "@/lib/video/videoPromptBoundReferences";
import {
  AUDIO_REFERENCE_GENERATED_AUDIO_CONFLICT,
  getGeneratedAudioReferenceIssue,
  validateReferenceSelectionForRule,
} from "@/lib/video/videoReferenceRules";
import type { UploadMediaItem } from "@/types/video";

function videoModel(id: "seedance_2_0_mini" | "seedance_2_0_fast" | "seedance_2_0" | "seedance_2_5") {
  const seedance25 = id === "seedance_2_5";
  return normalizeVideoModel({
    id,
    name: id,
    provider: "xinhankr",
    providerModel: id,
    credits: id === "seedance_2_0_fast" ? 12 : 23,
    durations: [5],
    duration: { values: [5], default: 5 },
    ratios: ["16:9"],
    resolutions: ["720p"],
    uploadSlots: ["reference_images", "reference_videos", "reference_audios"],
    referenceImages: true,
    maxReferenceImages: 9,
    referenceVideos: true,
    maxReferenceVideos: 2,
    referenceAudios: true,
    maxReferenceAudios: 1,
    maxTotalReferences: 11,
    mixedReference: {
      imageVideo: true,
      maxImages: 9,
      maxVideos: 2,
      imageAudio: !seedance25,
      videoAudio: seedance25,
      imageVideoAudio: false,
    },
    audioReference: {
      enabled: true,
      beta: false,
      max: 1,
      formats: ["wav"],
      mimeTypes: ["audio/wav"],
      maxFileBytes: 15 * 1024 * 1024,
      minDurationSeconds: 5,
      maxDurationSeconds: 5,
      serializer: seedance25 ? "content_audio_url" : "flat_audios",
      surchargeCredits: 0,
      audioOnly: seedance25,
      requiresImage: !seedance25,
      maxMixedImages: seedance25 ? 0 : 1,
      maxMixedVideos: seedance25 ? 1 : 0,
      generatedAudioCompatible: false,
    },
  });
}

function ready(type: "image" | "video" | "audio", index = 1): UploadMediaItem {
  const prefix = type === "image" ? "1" : type === "video" ? "2" : "3";
  return {
    id: `${type}-${index}`,
    assetId: `${prefix}0000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    type,
    name: `${type}-${index}.${type === "audio" ? "wav" : type === "video" ? "mp4" : "png"}`,
    mimeType: type === "audio" ? "audio/wav" : undefined,
    duration: type === "audio" ? 5 : undefined,
    url: `https://api.shadowedgeai.com/api/assets/${type}-${index}`,
    uploadStatus: "ready",
  };
}

function request(model: ReturnType<typeof videoModel>, prompt: string, media: UploadMediaItem[]) {
  return buildVideoGenerationRequest({
    duration: 5,
    generateAudio: false,
    media,
    model,
    prompt,
    quality: "720p",
    ratio: "16:9",
  });
}

describe("Prompt-bound Video generation reference authority", () => {
  it("keeps Tray media available while only Prompt @ mentions become active", () => {
    const media = [ready("image"), ready("audio")];
    const state = resolveVideoPromptBoundReferences({ media, prompt: "Use @Audio 1" });
    expect(state.availableItems.map((item) => item.type)).toEqual(["image", "audio"]);
    expect(state.activeItems.map((item) => item.type)).toEqual(["audio"]);
    expect(state.counts).toEqual({ image: 0, video: 0, audio: 1 });
    expect(validateReferenceSelectionForRule(getVideoModelRuleFromRegistry(videoModel("seedance_2_0")), [], state.activeItems))
      .toContain("requires one image");
  });

  it("reproduces Smoke A fail-closed before submit and becomes serializer-ready only after @Image is bound", () => {
    const media = [ready("image"), ready("audio")];
    for (const id of ["seedance_2_0_mini", "seedance_2_0_fast", "seedance_2_0"] as const) {
      const model = videoModel(id);
      expect(() => request(model, "Use @Audio 1", media)).toThrowError(
        expect.objectContaining({ code: "VIDEO_PROMPT_REFERENCE_SELECTION_INVALID" }),
      );

      const built = request(model, "Use @Image 1 and @Audio 1", media);
      expect(built.reference_image_asset_ids).toEqual([media[0].assetId]);
      expect(built.reference_audio_asset_ids).toEqual([media[1].assetId]);
      expect(built.reference_video_asset_ids).toEqual([]);
      expect(built.clientCost).toBe(id === "seedance_2_0_fast" ? 12 : 23);
    }
  });

  it("does not infer a reference or Audio mutex from Tray-only media", () => {
    const model = videoModel("seedance_2_0");
    const rule = getVideoModelRuleFromRegistry(model);
    const media = [ready("image"), ready("audio")];
    const state = resolveVideoPromptBoundReferences({ media, prompt: "A text-only cinematic scene" });
    expect(state.activeItems).toEqual([]);
    expect(validateReferenceSelectionForRule(rule, [], state.activeItems)).toBe("");
    expect(getGeneratedAudioReferenceIssue(rule, true, state.activeItems)).toBe("");
    expect(request(model, "A text-only cinematic scene", media).mode).toBe("text-to-video");
  });

  it("recomputes immediately when a Prompt mention is deleted or becomes stale", () => {
    const media = [ready("image"), ready("audio")];
    const both = resolveVideoPromptBoundReferences({ media, prompt: "Use @Image 1 and @Audio 1" });
    const audioOnly = resolveVideoPromptBoundReferences({ media, prompt: "Use @Audio 1" });
    const stale = resolveVideoPromptBoundReferences({ media: [media[1]], prompt: "Use @Image 1 and @Audio 1" });
    expect(both.counts).toEqual({ image: 1, video: 0, audio: 1 });
    expect(audioOnly.counts).toEqual({ image: 0, video: 0, audio: 1 });
    expect(stale.unresolvedMentions.map((mention) => mention.type)).toEqual(["image"]);
    expect(() => request(videoModel("seedance_2_0"), "Use @Image 1 and @Audio 1", [media[1]]))
      .toThrowError(expect.objectContaining({ code: "VIDEO_PROMPT_REFERENCE_UNRESOLVED" }));
  });

  it("uses the active bound audio set for generated-audio mutual exclusion", () => {
    const rule = getVideoModelRuleFromRegistry(videoModel("seedance_2_0"));
    const media = [ready("image"), ready("audio")];
    const trayOnly = resolveVideoPromptBoundReferences({ media, prompt: "No references" });
    const bound = resolveVideoPromptBoundReferences({ media, prompt: "Use @Image 1 and @Audio 1" });
    expect(getGeneratedAudioReferenceIssue(rule, true, trayOnly.activeItems)).toBe("");
    expect(getGeneratedAudioReferenceIssue(rule, true, bound.activeItems)).toBe(AUDIO_REFERENCE_GENERATED_AUDIO_CONFLICT);
  });

  it("preserves the certified Seedance 2.5 audio-only and video-plus-audio matrix", () => {
    const model = videoModel("seedance_2_5");
    const audio = ready("audio");
    const video = ready("video");
    const image = ready("image");
    expect(request(model, "Use @Audio 1", [audio]).reference_audio_asset_ids).toEqual([audio.assetId]);
    expect(request(model, "Use @Video 1 and @Audio 1", [video, audio]).reference_video_asset_ids).toEqual([video.assetId]);
    expect(() => request(model, "Use @Image 1 and @Audio 1", [image, audio]))
      .toThrowError(expect.objectContaining({ code: "VIDEO_PROMPT_REFERENCE_SELECTION_INVALID" }));
    expect(() => request(model, "Use @Image 1, @Video 1 and @Audio 1", [image, video, audio]))
      .toThrowError(expect.objectContaining({ code: "VIDEO_PROMPT_REFERENCE_SELECTION_INVALID" }));
    expect(() => request(model, "Use @Audio 1 and @Audio 2", [audio, ready("audio", 2)]))
      .toThrowError(expect.objectContaining({ code: "VIDEO_PROMPT_REFERENCE_SELECTION_INVALID" }));
  });
});
