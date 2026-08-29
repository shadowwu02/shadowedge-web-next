import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { mediaAssetToUploadMediaItem } from "@/lib/assets-api";
import { mergeMediaAssets, normalizeMediaAsset } from "@/lib/media-assets";
import { normalizeUploadResponse, normalizeVideoModel } from "@/lib/video-api";
import { LEGACY_REFERENCE_REUPLOAD_REQUIRED } from "@/lib/video/canonicalReferenceAssets";
import { getVideoModelRuleFromRegistry } from "@/lib/video/videoModelRules";
import { buildVideoGenerationRequest } from "@/lib/video/videoGenerationRequest";
import {
  AUDIO_REFERENCE_GENERATED_AUDIO_CONFLICT,
  getGeneratedAudioReferenceIssue,
  normalizeGeneratedAudioForReferences,
  validateReferenceSelectionForRule,
} from "@/lib/video/videoReferenceRules";
import type { UploadMediaItem } from "@/types/video";

const AUDIO_ASSET_ID = "30000000-0000-4000-8000-000000000001";
const AUDIO_URL = "https://assets.shadowedgeai.com/uploads/audios/canonical.wav";

function model(id: string) {
  const seedance25 = id === "seedance_2_5";
  return normalizeVideoModel({
    id,
    name: id,
    durations: [5],
    duration: { values: [5], default: 5 },
    ratios: ["16:9"],
    resolutions: ["720p"],
    audio: { supported: true, default: false },
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
      surchargeCredits: 0,
      audioOnly: seedance25,
      requiresImage: !seedance25,
      maxMixedImages: seedance25 ? 0 : 1,
      maxMixedVideos: seedance25 ? 1 : 0,
      generatedAudioCompatible: false,
    },
  });
}

function audio(overrides: Partial<UploadMediaItem> = {}): UploadMediaItem {
  return {
    id: AUDIO_ASSET_ID,
    assetId: AUDIO_ASSET_ID,
    canonicalReferenceStatus: "CANONICAL",
    type: "audio",
    name: "canonical.wav",
    mimeType: "audio/wav",
    duration: 5,
    url: AUDIO_URL,
    uploadStatus: "ready",
    ...overrides,
  };
}

describe("generated-audio and Audio Reference mutual exclusion", () => {
  it("uses one reference-rule authority for all four certified domestic models", () => {
    for (const id of ["seedance_2_0_mini", "seedance_2_0_fast", "seedance_2_0", "seedance_2_5"]) {
      const rule = getVideoModelRuleFromRegistry(model(id));
      expect(getGeneratedAudioReferenceIssue(rule, true, [audio()])).toBe(AUDIO_REFERENCE_GENERATED_AUDIO_CONFLICT);
      expect(normalizeGeneratedAudioForReferences(rule, { generateAudio: true, duration: 5 }, [audio()]))
        .toEqual({ generateAudio: false, duration: 5 });
      expect(getGeneratedAudioReferenceIssue(rule, false, [audio()])).toBe("");
      expect(getGeneratedAudioReferenceIssue(rule, true, [])).toBe("");
    }
  });

  it("normalizes legacy draft and model-switch state before it can remain ready", () => {
    const draft = { generateAudio: true, duration: 5, quality: "720p", ratio: "16:9" };
    const seedance20 = getVideoModelRuleFromRegistry(model("seedance_2_0"));
    const seedance25 = getVideoModelRuleFromRegistry(model("seedance_2_5"));
    expect(normalizeGeneratedAudioForReferences(seedance20, draft, [audio()]).generateAudio).toBe(false);
    expect(normalizeGeneratedAudioForReferences(seedance25, draft, [audio()]).generateAudio).toBe(false);
  });

  it("wires normalization, toggle blocking, readiness, and submit guard to the same helper", () => {
    const source = readFileSync(join(process.cwd(), "src/components/video/VideoWorkspace.tsx"), "utf8");
    expect(source).toContain("getGeneratedAudioReferenceIssue(selectedModelRule, effectiveGenerateAudio, media)");
    expect(source).toContain("buildParamsForModelAndReferences(nextModel, draft?.params, draftMedia)");
    expect(source).toContain("onReferencesBound={handleReferencesBound}");
    expect(source).toContain("!generatedAudioReferenceIssue && internationalReferenceReviewReady");
    expect(source).toContain("disabled={generatedAudioBlockedByReference || (!isAudioSupported && !params.generateAudio)}");
    expect(source).toContain("if (generatedAudioReferenceIssue)");
  });
});

describe("canonical WAV identity across upload, refresh, picker, and Prompt @", () => {
  it("promotes the backend canonical UUID to the upload item's primary identity", () => {
    const uploaded = normalizeUploadResponse({
      ok: true,
      data: {
        assetId: AUDIO_ASSET_ID,
        url: AUDIO_URL,
        type: "audios",
        originalname: "canonical.wav",
        mimetype: "audio/wav",
        durationSeconds: 5,
      },
    });
    expect(uploaded).toMatchObject({ id: AUDIO_ASSET_ID, assetId: AUDIO_ASSET_ID, type: "audio" });
  });

  it("keeps the same UUID after local-cache normalization and Asset Library refresh", () => {
    const local = normalizeMediaAsset({
      id: AUDIO_URL,
      assetId: AUDIO_ASSET_ID,
      url: AUDIO_URL,
      type: "audio",
      name: "canonical.wav",
      mimeType: "audio/wav",
    }, "uploads");
    const refreshed = mediaAssetToUploadMediaItem({
      id: AUDIO_ASSET_ID,
      type: "audio",
      source: "uploaded",
      status: "ready",
      url: AUDIO_URL,
      displayName: "canonical.wav",
      mimeType: "audio/wav",
      durationSeconds: 5,
    });
    expect(local).toMatchObject({ id: AUDIO_ASSET_ID, assetId: AUDIO_ASSET_ID, canonicalReferenceStatus: "CANONICAL" });
    expect(refreshed).toMatchObject({ id: AUDIO_ASSET_ID, assetId: AUDIO_ASSET_ID, canonicalReferenceStatus: "CANONICAL" });
  });

  it("upgrades a stale URL-only snapshot to the canonical projection for the same media", () => {
    const stale = audio({
      id: AUDIO_URL,
      assetId: undefined,
      canonicalReferenceStatus: LEGACY_REFERENCE_REUPLOAD_REQUIRED,
      source: "local_upload_cache",
    });
    const canonical = audio({ source: "asset-library" });
    const merged = mergeMediaAssets([stale], [canonical]);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ id: AUDIO_ASSET_ID, assetId: AUDIO_ASSET_ID, source: "asset-library" });
  });

  it("does not let an existing legacy reference misclassify a new canonical WAV", () => {
    const rule = getVideoModelRuleFromRegistry(model("seedance_2_5"));
    const legacyVideo: UploadMediaItem = {
      id: "https://assets.shadowedgeai.com/legacy.mp4",
      type: "video",
      name: "legacy.mp4",
      url: "https://assets.shadowedgeai.com/legacy.mp4",
      uploadStatus: "ready",
    };
    expect(validateReferenceSelectionForRule(rule, [legacyVideo], [audio()])).toBe("");
    expect(validateReferenceSelectionForRule(rule, [], [legacyVideo, audio()])).toBe(LEGACY_REFERENCE_REUPLOAD_REQUIRED);
  });

  it("keeps Prompt @ and the generation request bound only to the canonical UUID", () => {
    const request = buildVideoGenerationRequest({
      duration: 5,
      generateAudio: false,
      media: [audio()],
      model: model("seedance_2_5"),
      prompt: "Use @音频1",
      quality: "720p",
      ratio: "16:9",
    });
    expect(request.reference_audio_asset_ids).toEqual([AUDIO_ASSET_ID]);
    expect(request.reference_audio_asset_ids).not.toContain(AUDIO_URL);
  });

  it("keeps a truly URL-only WAV fail-closed", () => {
    const rule = getVideoModelRuleFromRegistry(model("seedance_2_5"));
    const legacy = audio({ id: AUDIO_URL, assetId: undefined, canonicalReferenceStatus: LEGACY_REFERENCE_REUPLOAD_REQUIRED });
    expect(validateReferenceSelectionForRule(rule, [], [legacy])).toBe(LEGACY_REFERENCE_REUPLOAD_REQUIRED);
  });
});
