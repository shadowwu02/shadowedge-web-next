import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { normalizeVideoModel } from "@/lib/video-api";
import { getVideoModelRuleFromRegistry, normalizeVideoParamsForRule } from "@/lib/video/videoModelRules";
import { validateReferenceSelectionForRule } from "@/lib/video/videoReferenceRules";
import type { UploadMediaItem } from "@/types/video";

describe("ArtsDance registry-driven capabilities", () => {
  const model = normalizeVideoModel({
    id: "seedance_2_0",
    name: "Seedance 2.0",
    provider: "xinhankr",
    providerModel: "artsdance-2-0-pro-260801",
    credits: 23,
    durations: [5, 10, 15],
    duration: { default: 5 },
    ratios: ["16:9", "9:16", "1:1", "4:3", "3:4"],
    resolutions: ["720p", "1080p"],
    supportsAudio: true,
    uploadSlots: ["reference_images", "reference_videos"],
    referenceImages: true,
    maxReferenceImages: 9,
    referenceVideos: true,
    maxReferenceVideos: 2,
    referenceAudios: false,
    maxReferenceAudios: 0,
    maxTotalReferences: 11,
    mixedReference: { imageVideo: true, maxImages: 9, maxVideos: 2, imageAudio: false, videoAudio: false, imageVideoAudio: false },
    imagePlusGenerateAudio: true,
  });

  it("uses Backend counts, resolutions, durations, ratios, and generated audio", () => {
    const rule = getVideoModelRuleFromRegistry(model);
    expect(rule.maxReferences).toEqual({ image: 9, video: 2, audio: 0, total: 11 });
    expect(rule.supportedMediaTypes).toEqual(["image", "video"]);
    expect(normalizeVideoParamsForRule(rule, { duration: 15, quality: "1080p", ratio: "3:4", generateAudio: true })).toEqual({
      duration: 15, quality: "1080p", resolution: "1080p", ratio: "3:4", generateAudio: true,
    });
  });

  it("allows the verified mixed contract through nine images and two videos", () => {
    const rule = getVideoModelRuleFromRegistry(model);
    const image = (id: string): UploadMediaItem => ({ id, assetId: id, type: "image", name: id, url: `https://assets.shadowedgeai.com/${id}.png`, uploadStatus: "ready" });
    const video = (id: string): UploadMediaItem => ({ id, assetId: id, type: "video", name: id, url: `https://assets.shadowedgeai.com/${id}.mp4`, uploadStatus: "ready" });
    expect(validateReferenceSelectionForRule(rule, [], [image("i1"), video("v1")])).toBe("");
    expect(validateReferenceSelectionForRule(rule, [], [image("i1"), image("i2"), image("i3"), video("v1")])).toBe("");
    expect(validateReferenceSelectionForRule(rule, [], [
      ...Array.from({ length: 9 }, (_value, index) => image(`i${index + 1}`)), video("v1"), video("v2"),
    ])).toBe("");
    expect(validateReferenceSelectionForRule(rule, [], [
      ...Array.from({ length: 10 }, (_value, index) => image(`i${index + 1}`)), video("v1"),
    ])).toContain("Reference limit reached");
    expect(validateReferenceSelectionForRule(rule, [], [
      ...Array.from({ length: 9 }, (_value, index) => image(`i${index + 1}`)), video("v1"), video("v2"), video("v3"),
    ])).toContain("Reference limit reached");
  });

  it("restores verified mixed drafts and disables Generate only beyond the Backend capability", () => {
    const rule = getVideoModelRuleFromRegistry(model);
    const restoredDraft: UploadMediaItem[] = [
      { id: "i1", assetId: "i1", type: "image", name: "i1", url: "https://assets.shadowedgeai.com/i1.png", uploadStatus: "ready" },
      { id: "i2", assetId: "i2", type: "image", name: "i2", url: "https://assets.shadowedgeai.com/i2.png", uploadStatus: "ready" },
      { id: "v1", assetId: "v1", type: "video", name: "v1", url: "https://assets.shadowedgeai.com/v1.mp4", uploadStatus: "ready" },
    ];
    expect(validateReferenceSelectionForRule(rule, [], restoredDraft)).toBe("");

    const unsupportedDraft: UploadMediaItem[] = [
      ...Array.from({ length: 10 }, (_value, index) => ({ id: `i${index + 1}`, assetId: `i${index + 1}`, type: "image" as const, name: `i${index + 1}`, url: `https://assets.shadowedgeai.com/i${index + 1}.png`, uploadStatus: "ready" as const })),
      restoredDraft[2],
    ];
    expect(validateReferenceSelectionForRule(rule, [], unsupportedDraft)).toContain("Reference limit reached");

    const workspaceSource = readFileSync(join(process.cwd(), "src/components/video/VideoWorkspace.tsx"), "utf8");
    expect(workspaceSource).toContain("!referenceSelectionIssue");
    expect(workspaceSource).toContain('t("video.errors.unsupportedReferenceCombination")');
  });
});
