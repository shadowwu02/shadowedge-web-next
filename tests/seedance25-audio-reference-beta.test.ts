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
  validateFilesForReferenceRule,
  validateReferenceSelectionForRule,
} from "@/lib/video/videoReferenceRules";
import type { UploadMediaItem } from "@/types/video";

function catalogModel(id: string, audioReference = false) {
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
    uploadSlots: audioReference ? ["reference_images", "reference_videos", "reference_audios"] : ["reference_images", "reference_videos"],
    referenceImages: true,
    maxReferenceImages: 9,
    referenceVideos: true,
    maxReferenceVideos: 2,
    referenceAudios: audioReference,
    maxReferenceAudios: audioReference ? 1 : 0,
    maxTotalReferences: 11,
    mixedReference: { imageVideo: true, maxImages: 9, maxVideos: 2, imageAudio: false, videoAudio: false, imageVideoAudio: false },
    audioReference: audioReference ? {
      enabled: true,
      beta: true,
      max: 1,
      formats: ["wav", "mp3"],
      mimeTypes: ["audio/wav", "audio/mpeg"],
      maxFileBytes: 15 * 1024 * 1024,
      minDurationSeconds: 2,
      maxDurationSeconds: 30,
      serializer: "content_audio_url_reference_audio",
      surchargeCredits: 0,
    } : { enabled: false, beta: false, max: 0 },
  });
}

const ready = (type: "image" | "video" | "audio", index = 1): UploadMediaItem => ({
  id: `${type}-${index}`,
  assetId: `${type === "image" ? "1" : type === "video" ? "2" : "3"}0000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
  type,
  name: `${type}-${index}`,
  url: `https://api.shadowedgeai.com/api/assets/${type}-${index}`,
  uploadStatus: "ready",
});

describe("Seedance 2.5 Audio Reference Beta", () => {
  it("is catalog-driven and remains disabled for Mini, Fast, and Seedance 2.0", () => {
    const model = catalogModel("seedance_2_5", true);
    const seedance25 = getVideoModelRuleFromRegistry(model);
    expect(seedance25.supportsAudioReference).toBe(true);
    expect(seedance25.maxReferences.audio).toBe(1);
    expect(seedance25.audioReference).toMatchObject({ beta: true, max: 1, surchargeCredits: 0 });
    expect(getReferenceAccept(seedance25)).toContain("audio/wav");
    expect(getReferenceAccept(seedance25)).toContain("audio/mpeg");
    expect(projectStudioPublicVideoCatalog([model], new Date("2026-08-26T00:00:00.000Z")).models[0].catalogModel).toBe(model);

    for (const id of ["seedance_2_0_mini", "seedance_2_0_fast", "seedance_2_0"]) {
      const rule = getVideoModelRuleFromRegistry(catalogModel(id));
      expect(rule.supportsAudioReference).toBe(false);
      expect(rule.maxReferences.audio).toBe(0);
    }
  });

  it("binds localized @Audio to the canonical Audio Asset UUID", () => {
    const model = catalogModel("seedance_2_5", true);
    const audio = ready("audio");
    const request = buildVideoGenerationRequest({
      duration: 5,
      generateAudio: false,
      media: [audio],
      model,
      prompt: "使用 @音频1 作为音频参考",
      quality: "720p",
      ratio: "16:9",
    });
    expect(request.reference_audio_asset_ids).toEqual([audio.assetId]);
    expect(request.reference_audios).toEqual([audio.url]);
    expect(request.generate_audio).toBe(false);
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

  it("allows one canonical audio and blocks image/audio, video/audio, and a second audio", () => {
    const rule = getVideoModelRuleFromRegistry(catalogModel("seedance_2_5", true));
    expect(validateReferenceSelectionForRule(rule, [], [ready("audio")])).toBe("");
    expect(validateReferenceSelectionForRule(rule, [], [ready("image"), ready("audio")])).toContain("mixed audio");
    expect(validateReferenceSelectionForRule(rule, [], [ready("video"), ready("audio")])).toContain("mixed audio");
    expect(validateReferenceSelectionForRule(rule, [ready("audio")], [ready("audio", 2)])).toContain("up to 1");
  });

  it("accepts only catalog WAV/MP3 files before upload", () => {
    const rule = getVideoModelRuleFromRegistry(catalogModel("seedance_2_5", true));
    expect(validateFilesForReferenceRule(rule, [new File(["safe"], "safe.wav", { type: "audio/wav" })])).toBe("");
    expect(validateFilesForReferenceRule(rule, [new File(["safe"], "safe.mp3", { type: "audio/mpeg" })])).toBe("");
    expect(validateFilesForReferenceRule(rule, [new File(["unsafe"], "unsafe.m4a", { type: "audio/mp4" })])).toContain("WAV or MP3");
  });

  it("uses the dedicated private audio upload route and renders the Beta label", () => {
    const apiSource = readFileSync(join(process.cwd(), "src/lib/video-api.ts"), "utf8");
    const traySource = readFileSync(join(process.cwd(), "src/components/video/ReferenceMediaTray.tsx"), "utf8");
    expect(apiSource).toContain('"/api/upload-audio-reference"');
    expect(traySource).toContain('t("video.references.audioReferenceBeta")');
  });
});
