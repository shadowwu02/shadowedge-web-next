import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { normalizeVideoModel } from "@/lib/video-api";
import {
  configureAudioUploadContract,
  getMediaLibraryUploadAccept,
  getMediaLibraryUploadTypes,
  validateAudioUploadFile,
} from "@/lib/video/audioUploadContract";
import { normalizeAudioReferenceBindingsForRule } from "@/lib/video/videoReferenceRules";
import { getVideoModelRule } from "@/lib/video/videoModelRules";
import { saveVideoDraft } from "@/lib/video/videoDraft";
import { getReadyMentionableMediaItems } from "@/lib/video-mentions";
import { UPLOAD_TYPE_LIMITS } from "@/lib/upload-rules";
import {
  getVideoTuplePricingDecision,
  normalizeVideoTupleAudio,
} from "@/lib/video/videoTupleAuthority";
import type { UploadMediaItem } from "@/types/video";

const VERSION = "VIDEO_PUBLIC_PRICING_V2_20260825";

function catalogModel(id: string, durations: number[], resolutions: string[], price: (duration: number, resolution: string) => number) {
  return normalizeVideoModel({
    id,
    name: id,
    durations,
    duration: { type: "values", values: durations, default: durations[0] },
    ratios: ["16:9"],
    resolutions,
    audio: { supported: true, default: false },
    tupleCapabilities: durations.flatMap((duration) => resolutions.map((resolution) => ({
      duration,
      resolution,
      allowedAspectRatios: ["16:9"],
      audio: { supported: resolution === "720p", default: false },
      pricing: { status: "READY", pricingVersion: VERSION, currentCustomerCredits: price(duration, resolution) },
    }))),
    creditRules: { pricingVersion: VERSION },
  });
}

describe("domestic pricing customer blocker", () => {
  const models = [
    catalogModel("seedance_2_0_mini", Array.from({ length: 11 }, (_, index) => index + 5), ["720p", "1080p"], (d, r) => Math.ceil((r === "720p" ? 23 : 46) * d / 5)),
    catalogModel("seedance_2_0_fast", [5, 6, 7, 15], ["720p", "1080p"], (d, r) => Math.ceil((r === "720p" ? 12 : 24) * d / 5)),
    catalogModel("seedance_2_0", Array.from({ length: 11 }, (_, index) => index + 5), ["720p", "1080p", "4K"], (d, r) => d * (r === "720p" ? 4.5 : r === "1080p" ? 9 : 18)),
    catalogModel("seedance_2_5", Array.from({ length: 26 }, (_, index) => index + 5), ["720p", "1080p"], (d, r) => d * (r === "720p" ? 4.5 : 9)),
  ];

  it("keeps every customer-selectable tuple priced and approved", () => {
    for (const model of models) {
      for (const tuple of model.tupleCapabilities || []) {
        expect(getVideoTuplePricingDecision(model, {
          duration: tuple.duration,
          resolution: tuple.resolution,
          generateAudio: false,
        })).toEqual({ pricingVersion: VERSION, creditAmount: tuple.pricing.currentCustomerCredits });
      }
    }
  });

  it("does not misclassify unsupported generated audio as missing pricing", () => {
    const seedance25 = models.at(-1)!;
    expect(getVideoTuplePricingDecision(seedance25, { duration: 5, resolution: "1080p", generateAudio: true }))
      .toEqual({ pricingVersion: VERSION, creditAmount: 45 });
    expect(normalizeVideoTupleAudio(seedance25, {
      duration: 5,
      quality: "1080p",
      ratio: "16:9",
      generateAudio: true,
    }).generateAudio).toBe(false);
  });

  it("never exposes internal pricing approval copy", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src", "components", "video", "VideoWorkspace.tsx"), "utf8");
    expect(source).not.toContain("Pricing approval required");
    expect(source).not.toContain("approved customer Credit price");
    expect(source).toContain('t("video.actions.configurationUnavailable")');
  });
});

describe("audio library upload is independent from model reference capability", () => {
  configureAudioUploadContract({
    version: "video_audio_upload_v1",
    extensions: [".mp3", ".wav", ".m4a"],
    mimeTypes: ["audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp4", "audio/x-m4a"],
  });

  it("accepts the canonical MP3/WAV/M4A contract and exposes audio in upload UI", () => {
    expect(getMediaLibraryUploadTypes()).toEqual(["image", "video", "audio"]);
    expect(getMediaLibraryUploadAccept()).toContain(".m4a");
    expect(validateAudioUploadFile({ name: "one.mp3", type: "audio/mpeg" })).toBe("");
    expect(validateAudioUploadFile({ name: "two.wav", type: "audio/x-wav" })).toBe("");
    expect(validateAudioUploadFile({ name: "three.m4a", type: "audio/mp4" })).toBe("");
    expect(validateAudioUploadFile({ name: "wrong.ogg", type: "audio/ogg" })).toContain("MP3, WAV, and M4A");
    expect(UPLOAD_TYPE_LIMITS.media.audio).toBeGreaterThan(1);
  });

  it("removes only an unsupported audio generation binding on model switch", () => {
    const rule = getVideoModelRule("seedance_2_5");
    const items = [
      { id: "image", type: "image", url: "https://assets.example/image.png" },
      { id: "audio", type: "audio", url: "https://assets.example/audio.mp3" },
    ] as UploadMediaItem[];
    expect(normalizeAudioReferenceBindingsForRule(rule, items).map((item) => item.id)).toEqual(["image"]);
  });

  it("restores canonical audio in drafts and exposes it to Prompt @", () => {
    const audio = {
      id: "audio",
      assetId: "11111111-1111-4111-8111-111111111111",
      canonicalReferenceStatus: "canonical",
      type: "audio",
      url: "https://assets.shadowedgeai.com/uploads/audios/voice.mp3",
      previewUrl: "",
      name: "voice.mp3",
      uploadStatus: "ready",
    } as UploadMediaItem;
    const draft = saveVideoDraft({
      modelId: "future_audio_model",
      prompt: "Use @Audio 1",
      params: { duration: 5, quality: "720p", ratio: "16:9", generateAudio: false },
      referenceMedia: [audio],
    });
    expect(draft.referenceMedia).toHaveLength(1);
    expect(draft.referenceMedia[0].type).toBe("audio");
    expect(getReadyMentionableMediaItems(draft.referenceMedia)[0].displayToken).toBe("@Audio 1");
  });

  it("uses one canonical media endpoint and keeps upload controls model-independent", () => {
    const api = fs.readFileSync(path.join(process.cwd(), "src", "lib", "video-api.ts"), "utf8");
    const uploadBox = fs.readFileSync(path.join(process.cwd(), "src", "components", "video", "UploadBox.tsx"), "utf8");
    const picker = fs.readFileSync(path.join(process.cwd(), "src", "components", "video", "MediaPickerDrawer.tsx"), "utf8");
    expect(api).not.toContain("/api/upload-audio-reference");
    expect(api).toContain('apiRequest<Record<string, unknown>>("/api/upload-media"');
    expect(uploadBox).not.toContain("validateFilesForReferenceRule(modelRule, files");
    expect(picker).not.toContain('if (!allowedTypes.length)');
  });

  it("replaces an existing Prompt audio mention instead of appending a duplicate binding", () => {
    const promptBox = fs.readFileSync(path.join(process.cwd(), "src", "components", "video", "PromptBox.tsx"), "utf8");
    expect(promptBox).toContain("expandActiveMentionRange(promptValue");
    expect(promptBox).toContain("current.map((binding) => (binding.tokenId === bindingToUpdate.tokenId ? nextBinding : binding))");
    expect(promptBox).not.toContain("return [...current, nextBinding, nextBinding]");
  });
});
