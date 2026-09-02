import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { normalizeVideoModel } from "@/lib/video-api";
import { buildVideoGenerationRequest } from "@/lib/video/videoGenerationRequest";
import { getVideoModelRuleFromRegistry } from "@/lib/video/videoModelRules";
import {
  AUDIO_REFERENCE_GENERATED_AUDIO_CONFLICT,
  getGeneratedAudioReferenceIssue,
  normalizeGeneratedAudioForReferences,
  validateReferenceSelectionForRule,
} from "@/lib/video/videoReferenceRules";
import type { UploadMediaItem } from "@/types/video";

const DOMESTIC_MODELS = [
  "seedance_2_0_mini",
  "seedance_2_0_fast",
  "seedance_2_0",
  "seedance_2_5",
] as const;

function model(id: (typeof DOMESTIC_MODELS)[number]) {
  return normalizeVideoModel({
    id,
    name: id === "seedance_2_0" ? "Seedance 2.0" : id,
    provider: "seedance",
    credits: id === "seedance_2_0_fast" ? 12 : 23,
    durations: [5, 10, 15],
    duration: { type: "values", selection: "discrete", values: [5, 10, 15], default: 5 },
    ratios: id === "seedance_2_0" ? ["16:9", "9:16"] : ["16:9"],
    resolutions: ["720p"],
    audio: { supported: true, default: false },
    supportsAudio: true,
    imagePlusGenerateAudio: true,
    uploadSlots: ["reference_images", "reference_videos", "reference_audios"],
    referenceImages: true,
    maxReferenceImages: 9,
    referenceVideos: true,
    maxReferenceVideos: 2,
    referenceAudios: true,
    maxReferenceAudios: 1,
    maxTotalReferences: 11,
    mixedReference: { imageVideo: true, maxImages: 9, maxVideos: 2, imageAudio: true, videoAudio: false, imageVideoAudio: false },
    audioReference: {
      enabled: true,
      max: 1,
      formats: ["wav"],
      mimeTypes: ["audio/wav"],
      minDurationSeconds: 5,
      maxDurationSeconds: 5,
      maxMixedImages: 1,
      maxMixedVideos: 0,
      requiresImage: true,
    },
    generatedAudioReference: {
      status: "REAL_CERTIFIED",
      images: { max: 9 },
      videos: { max: 2 },
      audios: { max: 0 },
      maxTotal: 11,
      mixed: { imageVideo: true, maxImages: 9, maxVideos: 2 },
      overflowSemantics: "UNSUPPORTED",
      selectionPolicy: "preserve_and_block_when_over_limit",
    },
  });
}

function reference(type: "image" | "video" | "audio", index: number): UploadMediaItem {
  const prefix = type === "image" ? "1" : type === "video" ? "2" : "3";
  return {
    id: `${type}-${index}`,
    assetId: `${prefix}0000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    canonicalReferenceStatus: "CANONICAL",
    privateReference: true,
    type,
    name: `${type}-${index}.${type === "image" ? "png" : type === "video" ? "mp4" : "wav"}`,
    mimeType: type === "audio" ? "audio/wav" : `${type}/${type === "image" ? "png" : "mp4"}`,
    duration: type === "audio" ? 5 : undefined,
    previewUrl: `https://api.shadowedgeai.com/api/internal/${type}-reference/${index}/signed`,
    url: `https://api.shadowedgeai.com/api/internal/${type}-reference/${index}/signed`,
    uploadStatus: "ready",
  };
}

function references(imageCount: number, videoCount: number) {
  return [
    ...Array.from({ length: imageCount }, (_value, index) => reference("image", index + 1)),
    ...Array.from({ length: videoCount }, (_value, index) => reference("video", index + 1)),
  ];
}

function mentionPrompt(imageCount: number, videoCount: number) {
  return [
    ...Array.from({ length: imageCount }, (_value, index) => `@Image ${index + 1}`),
    ...Array.from({ length: videoCount }, (_value, index) => `@Video ${index + 1}`),
    "Create a coherent short video.",
  ].join(" ");
}

describe("Domestic video full generated-audio reference capability", () => {
  it("projects the same 9 Image / 2 Video / 11 total certified contract for all four models", () => {
    for (const id of DOMESTIC_MODELS) {
      const rule = getVideoModelRuleFromRegistry(model(id));
      expect(rule.generatedAudioReference).toMatchObject({
        imageMax: 9,
        videoMax: 2,
        audioMax: 0,
        maxTotal: 11,
        mixedImageVideo: true,
        mixedMaxImages: 9,
        mixedMaxVideos: 2,
        overflowSemantics: "UNSUPPORTED",
      });
    }
  });

  it("keeps every certified GA tuple ready and preserves request-ID parity", () => {
    const legalTuples = [[0, 0], [1, 0], [9, 0], [0, 1], [0, 2], [1, 1], [9, 1], [1, 2], [9, 2]] as const;
    for (const id of DOMESTIC_MODELS) {
      const selectedModel = model(id);
      const rule = getVideoModelRuleFromRegistry(selectedModel);
      for (const [imageCount, videoCount] of legalTuples) {
        const media = references(imageCount, videoCount);
        expect(getGeneratedAudioReferenceIssue(rule, true, media)).toBe("");
        expect(validateReferenceSelectionForRule(rule, [], media, true)).toBe("");
        const request = buildVideoGenerationRequest({
          clientRequestId: `VIDEO_full_cap_${id}_${imageCount}_${videoCount}`,
          duration: 5,
          generateAudio: true,
          media,
          model: selectedModel,
          prompt: mentionPrompt(imageCount, videoCount),
          quality: "720p",
          ratio: "16:9",
        });
        expect(request.reference_image_asset_ids).toEqual(media.filter((item) => item.type === "image").map((item) => item.assetId));
        expect(request.reference_video_asset_ids).toEqual(media.filter((item) => item.type === "video").map((item) => item.assetId));
      }
    }
  });

  it("allows Image 09 and Video 02, then blocks Image 10 and Video 03 at selection with product limits", () => {
    for (const id of DOMESTIC_MODELS) {
      const rule = getVideoModelRuleFromRegistry(model(id));
      const nineImages = references(9, 0);
      const twoVideos = references(0, 2);
      expect(validateReferenceSelectionForRule(rule, [], nineImages, true)).toBe("");
      expect(validateReferenceSelectionForRule(rule, nineImages, [reference("image", 10)], true)).toContain("up to 9 reference images");
      expect(validateReferenceSelectionForRule(rule, [], twoVideos, true)).toBe("");
      expect(validateReferenceSelectionForRule(rule, twoVideos, [reference("video", 3)], true)).toContain("up to 2 reference videos");
      const maxMixed = references(9, 2);
      expect(validateReferenceSelectionForRule(rule, maxMixed, [reference("image", 10)], true)).toContain("up to 9 reference images");
      expect(validateReferenceSelectionForRule(rule, maxMixed, [reference("video", 3)], true)).toContain("up to 2 reference videos");
    }
  });

  it("blocks the Audio Reference mutex without silently changing the toggle or deleting bindings", () => {
    for (const id of DOMESTIC_MODELS) {
      const rule = getVideoModelRuleFromRegistry(model(id));
      const audio = reference("audio", 1);
      const params = { generateAudio: true, duration: 5 };
      expect(getGeneratedAudioReferenceIssue(rule, true, [audio])).toBe(AUDIO_REFERENCE_GENERATED_AUDIO_CONFLICT);
      expect(validateReferenceSelectionForRule(rule, [], [audio], true)).toBe(AUDIO_REFERENCE_GENERATED_AUDIO_CONFLICT);
      expect(normalizeGeneratedAudioForReferences(rule, params, [audio])).toBe(params);
      expect(getGeneratedAudioReferenceIssue(rule, false, [audio])).toBe("");
    }
  });

  it("keeps the original Seedance 2.0 customer tuple ready", () => {
    const selectedModel = model("seedance_2_0");
    const images = references(2, 0);
    const request = buildVideoGenerationRequest({
      clientRequestId: "VIDEO_original_customer_scenario",
      duration: 10,
      generateAudio: true,
      media: images,
      model: selectedModel,
      prompt: mentionPrompt(2, 0),
      quality: "720p",
      ratio: "9:16",
    });
    expect(request.generate_audio).toBe(true);
    expect(request.reference_image_asset_ids).toEqual(images.map((item) => item.assetId));
  });

  it("preserves the legal maximum bindings across all Domestic model switches", () => {
    const bound = references(9, 2);
    const params = { generateAudio: true, duration: 5, quality: "720p", ratio: "16:9" };
    for (const id of DOMESTIC_MODELS) {
      const rule = getVideoModelRuleFromRegistry(model(id));
      expect(normalizeGeneratedAudioForReferences(rule, params, bound)).toBe(params);
      expect(validateReferenceSelectionForRule(rule, [], bound, true)).toBe("");
    }
  });

  it("derives an omitted additive GA object only from the authoritative Backend reference contract", () => {
    const responseWithoutAuthority = normalizeVideoModel({
      ...model("seedance_2_0"),
      generatedAudioReference: undefined,
      provider: "seedance",
    });
    expect(getVideoModelRuleFromRegistry(responseWithoutAuthority).generatedAudioReference).toMatchObject({
      imageMax: 9,
      videoMax: 2,
      audioMax: 0,
      maxTotal: 11,
      mixedImageVideo: true,
      mixedMaxImages: 9,
      mixedMaxVideos: 2,
    });
    const nonDomesticWithoutAuthority = normalizeVideoModel({
      ...model("seedance_2_0"),
      generatedAudioReference: undefined,
      provider: "other",
    });
    expect(getVideoModelRuleFromRegistry(nonDomesticWithoutAuthority).generatedAudioReference?.imageMax).toBe(0);
  });

  it("wires picker selection, readiness, and non-truncating model switches to shared rules", () => {
    const workspace = readFileSync("src/components/video/VideoWorkspace.tsx", "utf8");
    const upload = readFileSync("src/components/video/UploadBox.tsx", "utf8");
    const drawer = readFileSync("src/components/video/MediaPickerDrawer.tsx", "utf8");
    expect(workspace).toContain("const effectiveGenerateAudio = params.generateAudio");
    expect(workspace).toContain("if (generatedAudioReferenceIssue) return localizedGeneratedAudioToggleIssue");
    expect(workspace).toContain("setWorkspaceNotice(localizedGeneratedAudioToggleIssue)");
    expect(workspace).toContain("generateAudio={effectiveGenerateAudio}");
    expect(upload).toContain("validateReferenceSelectionForRule(modelRule, currentMedia, selectedNewItems, generateAudio)");
    expect(drawer).toContain("validateReferenceSelectionForRule(modelRule, referenceMedia, newItems, generateAudio)");
  });
});
