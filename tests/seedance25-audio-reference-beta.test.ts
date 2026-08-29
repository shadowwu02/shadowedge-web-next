import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { normalizeVideoModel } from "@/lib/video-api";
import { mediaAssetToUploadMediaItem } from "@/lib/assets-api";
import { projectStudioPublicVideoCatalog } from "@/lib/studio-provider-models-api";
import { getVideoModelRuleFromRegistry } from "@/lib/video/videoModelRules";
import { buildVideoGenerationRequest } from "@/lib/video/videoGenerationRequest";
import {
  getReferenceAccept,
  normalizeAudioReferenceBindingsForRule,
  validateFilesForReferenceRule,
  validateReferenceSelectionForRule,
} from "@/lib/video/videoReferenceRules";
import type { UploadMediaItem } from "@/types/video";

function catalogModel(id: string) {
  const seedance25 = id === "seedance_2_5";
  return normalizeVideoModel({
    id,
    name: id,
    provider: "xinhankr",
    providerModel: id,
    credits: 23,
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
    mixedReference: { imageVideo: true, maxImages: 9, maxVideos: 2, imageAudio: !seedance25, videoAudio: seedance25, imageVideoAudio: false },
    audioReference: {
      enabled: true,
      beta: false,
      max: 1,
      formats: ["wav"],
      mimeTypes: ["audio/wav", "audio/x-wav", "audio/wave"],
      maxFileBytes: 15 * 1024 * 1024,
      minDurationSeconds: 5,
      maxDurationSeconds: 5,
      serializer: seedance25 ? "content_audio_url" : "flat_audios",
      surchargeCredits: 0,
      audioOnly: seedance25,
      requiresImage: !seedance25,
      maxMixedImages: seedance25 ? 0 : 1,
      maxMixedVideos: seedance25 ? 1 : 0,
    },
  });
}

const ready = (type: "image" | "video" | "audio", index = 1): UploadMediaItem => ({
  id: `${type}-${index}`,
  assetId: `${type === "image" ? "1" : type === "video" ? "2" : "3"}0000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
  type,
  name: `${type}-${index}.${type === "audio" ? "wav" : type === "video" ? "mp4" : "png"}`,
  ...(type === "audio" ? { duration: 5, mimeType: "audio/wav" } : {}),
  url: `https://api.shadowedgeai.com/api/assets/${type}-${index}`,
  uploadStatus: "ready",
});

describe("Certified domestic Audio Reference", () => {
  it("is catalog-driven and enabled with max one WAV for all four models", () => {
    for (const id of ["seedance_2_0_mini", "seedance_2_0_fast", "seedance_2_0", "seedance_2_5"]) {
      const model = catalogModel(id);
      const rule = getVideoModelRuleFromRegistry(model);
      expect(rule.supportsAudioReference).toBe(true);
      expect(rule.maxReferences.audio).toBe(1);
      expect(rule.audioReference).toMatchObject({ beta: false, max: 1, surchargeCredits: 0 });
      expect(getReferenceAccept(rule)).toContain("audio/wav");
      expect(getReferenceAccept(rule)).not.toContain("audio/mpeg");
      expect(projectStudioPublicVideoCatalog([model], new Date("2026-08-28T00:00:00.000Z")).models[0].catalogModel).toBe(model);
    }
  });

  it("binds localized @Audio to the canonical Audio Asset UUID", () => {
    const audio = ready("audio");
    for (const id of ["seedance_2_0_mini", "seedance_2_0_fast", "seedance_2_0", "seedance_2_5"]) {
      const model = catalogModel(id);
      const media = id === "seedance_2_5" ? [audio] : [ready("image"), audio];
      const request = buildVideoGenerationRequest({
        duration: 5,
        generateAudio: false,
        media,
        model,
        prompt: id === "seedance_2_5" ? "使用 @音频1 作为音频参考" : "使用 @图1 和 @音频1 作为参考",
        quality: "720p",
        ratio: "16:9",
      });
      expect(request.reference_audio_asset_ids).toEqual([audio.assetId]);
      expect(request.reference_audios).toEqual([audio.url]);
      expect(request.generate_audio).toBe(false);
    }
  });

  it("keeps private canonical audio selectable without exposing an R2 object URL", () => {
    const item = mediaAssetToUploadMediaItem({
      id: "30000000-0000-4000-8000-000000000001",
      type: "audio",
      status: "ready",
      filename: "private.wav",
      mimeType: "audio/wav",
      durationSeconds: 5,
      privateReference: true,
      publicUrl: null,
      url: null,
    });
    expect(item).toMatchObject({
      assetId: "30000000-0000-4000-8000-000000000001",
      type: "audio",
      uploadStatus: "ready",
    });
    expect(item?.url).toContain("/api/assets/30000000-0000-4000-8000-000000000001/private-audio-reference");
    expect(item?.url).not.toContain("r2.cloudflarestorage.com");
  });

  it("enforces the certified model-specific audio combinations", () => {
    const seedance25 = getVideoModelRuleFromRegistry(catalogModel("seedance_2_5"));
    expect(validateReferenceSelectionForRule(seedance25, [], [ready("audio")])).toBe("");
    expect(validateReferenceSelectionForRule(seedance25, [], [ready("video"), ready("audio")])).toBe("");
    expect(validateReferenceSelectionForRule(seedance25, [], [ready("image"), ready("audio")])).toContain("image and audio");
    expect(validateReferenceSelectionForRule(seedance25, [ready("audio")], [ready("audio", 2)])).toContain("up to 1");
    expect(validateReferenceSelectionForRule(seedance25, [], [{ ...ready("audio"), duration: 6 }])).toContain("5-5 seconds");

    for (const id of ["seedance_2_0_mini", "seedance_2_0_fast", "seedance_2_0"]) {
      const rule = getVideoModelRuleFromRegistry(catalogModel(id));
      expect(validateReferenceSelectionForRule(rule, [], [ready("image"), ready("audio")])).toBe("");
      expect(validateReferenceSelectionForRule(rule, [], [ready("audio")])).toContain("requires one image");
      expect(validateReferenceSelectionForRule(rule, [], [ready("video"), ready("audio")])).toContain("video and audio");
    }
  });

  it("normalizes only the generation binding when switching between incompatible audio modes", () => {
    const mini = getVideoModelRuleFromRegistry(catalogModel("seedance_2_0_mini"));
    const fast = getVideoModelRuleFromRegistry(catalogModel("seedance_2_0_fast"));
    const seedance25 = getVideoModelRuleFromRegistry(catalogModel("seedance_2_5"));
    const imageAudio = [ready("image"), ready("audio")];
    expect(normalizeAudioReferenceBindingsForRule(fast, imageAudio).map((item) => item.type)).toEqual(["image", "audio"]);
    expect(normalizeAudioReferenceBindingsForRule(seedance25, imageAudio).map((item) => item.type)).toEqual(["image"]);
    expect(normalizeAudioReferenceBindingsForRule(mini, [ready("audio")])).toEqual([]);
  });

  it("accepts only the certified WAV file contract before binding", () => {
    const rule = getVideoModelRuleFromRegistry(catalogModel("seedance_2_5"));
    expect(validateFilesForReferenceRule(rule, [new File(["safe"], "safe.wav", { type: "audio/wav" })])).toBe("");
    expect(validateFilesForReferenceRule(rule, [new File(["unsafe"], "unsafe.mp3", { type: "audio/mpeg" })])).toContain("WAV");
    expect(validateFilesForReferenceRule(rule, [new File(["unsafe"], "unsafe.m4a", { type: "audio/mp4" })])).toContain("WAV");
  });

  it("uses the canonical media upload route and retains optional Beta rendering", () => {
    const apiSource = readFileSync(join(process.cwd(), "src/lib/video-api.ts"), "utf8");
    const traySource = readFileSync(join(process.cwd(), "src/components/video/ReferenceMediaTray.tsx"), "utf8");
    expect(apiSource).toContain('apiRequest<Record<string, unknown>>("/api/upload-media"');
    expect(apiSource).not.toContain('"/api/upload-audio-reference"');
    expect(traySource).toContain('t("video.references.audioReferenceBeta")');
  });
});
