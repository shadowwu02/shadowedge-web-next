import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { normalizeVideoModel } from "@/lib/video-api";
import { buildVideoGenerationRequest } from "@/lib/video/videoGenerationRequest";
import { getVideoModelRuleFromRegistry } from "@/lib/video/videoModelRules";
import {
  AUDIO_REFERENCE_GENERATED_AUDIO_CONFLICT,
  VIDEO_REFERENCE_GENERATED_AUDIO_UNVERIFIED,
  getGeneratedAudioReferenceIssue,
  normalizeGeneratedAudioForReferences,
  validateReferenceSelectionForRule,
} from "@/lib/video/videoReferenceRules";
import type { UploadMediaItem } from "@/types/video";

function model(id: "seedance_2_0_mini" | "seedance_2_0_fast" | "seedance_2_0" | "seedance_2_5") {
  const imageMax = id === "seedance_2_0" ? 2 : 1;
  return normalizeVideoModel({
    id,
    name: id === "seedance_2_0" ? "Seedance 2.0" : id,
    providerModel: id === "seedance_2_0" ? "artsdance-2-0-pro-260801" : id,
    credits: 23,
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
      images: { max: imageMax },
      videos: { max: 0 },
      audios: { max: 0 },
      overflowSemantics: "UNVERIFIED",
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

describe("Seedance 2.0 two-Image generated-audio capability", () => {
  it("allows 0/1/2 Images, blocks the third at selection, and classifies 3+ as UNVERIFIED", () => {
    const rule = getVideoModelRuleFromRegistry(model("seedance_2_0"));
    const images = [reference("image", 1), reference("image", 2), reference("image", 3)];
    expect(rule.generatedAudioReference).toMatchObject({ imageMax: 2, overflowSemantics: "UNVERIFIED" });
    expect(getGeneratedAudioReferenceIssue(rule, true, [])).toBe("");
    expect(getGeneratedAudioReferenceIssue(rule, true, images.slice(0, 1))).toBe("");
    expect(getGeneratedAudioReferenceIssue(rule, true, images.slice(0, 2))).toBe("");
    expect(validateReferenceSelectionForRule(rule, images.slice(0, 1), [images[1]], true)).toBe("");
    expect(validateReferenceSelectionForRule(rule, images.slice(0, 2), [images[2]], true)).toContain("certified with up to 2");
    expect(getGeneratedAudioReferenceIssue(rule, true, images)).toContain("certified with up to 2");
  });

  it("allows the original 10s / 9:16 / 720p scenario and preserves two-ID readiness-submit parity", () => {
    const selectedModel = model("seedance_2_0");
    const images = [reference("image", 1), reference("image", 2)];
    const request = buildVideoGenerationRequest({
      clientRequestId: "VIDEO_two_image_audio_12345678",
      duration: 10,
      generateAudio: true,
      media: images,
      model: selectedModel,
      prompt: "Use @Image 1 for the opening and @Image 2 for the ending.",
      quality: "720p",
      ratio: "9:16",
    });
    expect(request.generate_audio).toBe(true);
    expect(request.reference_image_asset_ids).toEqual(images.map((item) => item.assetId));
    expect(request.assets.images).toHaveLength(2);
    expect(request.mediaList.filter((item) => item.type === "image")).toHaveLength(2);
  });

  it("blocks the reverse toggle for three Images without deleting references and recomputes on model switch", () => {
    const seedance20 = getVideoModelRuleFromRegistry(model("seedance_2_0"));
    const mini = getVideoModelRuleFromRegistry(model("seedance_2_0_mini"));
    const images = [reference("image", 1), reference("image", 2), reference("image", 3)];
    expect(getGeneratedAudioReferenceIssue(seedance20, true, images.slice(0, 2))).toBe("");
    expect(getGeneratedAudioReferenceIssue(seedance20, true, images)).not.toBe("");
    expect(normalizeGeneratedAudioForReferences(mini, { generateAudio: true }, images.slice(0, 2))).toEqual({ generateAudio: true });
    expect(getGeneratedAudioReferenceIssue(mini, true, images.slice(0, 2))).toContain("up to 1");
    expect(images).toHaveLength(3);
  });

  it("keeps other models at one Image and preserves Audio Reference and Video Reference guards", () => {
    for (const id of ["seedance_2_0_mini", "seedance_2_0_fast", "seedance_2_5"] as const) {
      const rule = getVideoModelRuleFromRegistry(model(id));
      expect(rule.generatedAudioReference?.imageMax).toBe(1);
      expect(getGeneratedAudioReferenceIssue(rule, true, [reference("image", 1), reference("image", 2)])).toContain("up to 1");
      expect(getGeneratedAudioReferenceIssue(rule, true, [reference("video", 1)])).toBe(VIDEO_REFERENCE_GENERATED_AUDIO_UNVERIFIED);
      expect(getGeneratedAudioReferenceIssue(rule, true, [reference("audio", 1)])).toBe(AUDIO_REFERENCE_GENERATED_AUDIO_CONFLICT);
      expect(getGeneratedAudioReferenceIssue(rule, false, [reference("image", 1), reference("image", 2), reference("image", 3)])).toBe("");
    }
  });

  it("uses the exact bounded compatibility matrix when the legacy catalog assembler omits the additive field", () => {
    for (const [id, maximum] of [
      ["seedance_2_0", 2],
      ["seedance_2_0_mini", 1],
      ["seedance_2_0_fast", 1],
      ["seedance_2_5", 1],
    ] as const) {
      const legacyResponseModel = { ...model(id), generatedAudioReference: undefined };
      expect(getVideoModelRuleFromRegistry(legacyResponseModel).generatedAudioReference?.imageMax).toBe(maximum);
    }
  });

  it("wires picker selection, toggle blocking, and non-truncating model-switch readiness to the shared rule", () => {
    const workspace = readFileSync("src/components/video/VideoWorkspace.tsx", "utf8");
    const upload = readFileSync("src/components/video/UploadBox.tsx", "utf8");
    const drawer = readFileSync("src/components/video/MediaPickerDrawer.tsx", "utf8");
    expect(workspace).toContain("const effectiveGenerateAudio = params.generateAudio");
    expect(workspace).not.toContain("setParams((current) => current.generateAudio ? { ...current, generateAudio: false } : current)");
    expect(workspace).toContain("generateAudio={effectiveGenerateAudio}");
    expect(upload).toContain("validateReferenceSelectionForRule(modelRule, currentMedia, selectedNewItems, generateAudio)");
    expect(drawer).toContain("validateReferenceSelectionForRule(modelRule, referenceMedia, newItems, generateAudio)");
  });
});
