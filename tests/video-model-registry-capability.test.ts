import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { normalizeVideoModel } from "@/lib/video-api";
import { getVideoModelRuleFromRegistry, normalizeVideoParamsForRule } from "@/lib/video/videoModelRules";
import { validateReferenceSelectionForRule } from "@/lib/video/videoReferenceRules";
import type { UploadMediaItem } from "@/types/video";

describe("ArtsDance registry-driven capabilities", () => {
  const assetId = (kind: "image" | "video", index: number) =>
    `${kind === "image" ? "1" : "2"}0000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
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

  const referenceModels = ["seedance_2_0_mini", "seedance_2_0_fast", "seedance_2_0", "seedance_2_5"];

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
    const image = (id: string): UploadMediaItem => ({ id, assetId: assetId("image", Number(id.slice(1))), type: "image", name: id, url: `https://assets.shadowedgeai.com/${id}.png`, uploadStatus: "ready" });
    const video = (id: string): UploadMediaItem => ({ id, assetId: assetId("video", Number(id.slice(1))), type: "video", name: id, url: `https://assets.shadowedgeai.com/${id}.mp4`, uploadStatus: "ready" });
    expect(validateReferenceSelectionForRule(rule, [], [image("i1"), video("v1")])).toBe("");
    expect(validateReferenceSelectionForRule(rule, [], [image("i1"), image("i2"), image("i3"), video("v1")])).toBe("");
    expect(validateReferenceSelectionForRule(rule, [], [
      ...Array.from({ length: 9 }, (_value, index) => image(`i${index + 1}`)), video("v1"), video("v2"),
    ])).toBe("");
    expect(validateReferenceSelectionForRule(rule, [], [
      ...Array.from({ length: 10 }, (_value, index) => image(`i${index + 1}`)), video("v1"),
    ])).toContain("up to 9 reference images");
    expect(validateReferenceSelectionForRule(rule, [], [
      ...Array.from({ length: 9 }, (_value, index) => image(`i${index + 1}`)), video("v1"), video("v2"), video("v3"),
    ])).toContain("up to 2 reference videos");
  });

  it.each(referenceModels)("drives %s Reference slots from the Backend registry", (id) => {
    const rule = getVideoModelRuleFromRegistry({ ...model, id, label: id });
    expect(rule.uploadSlots).toEqual(["reference_images", "reference_videos"]);
    expect(rule.maxReferences).toEqual({ image: 9, video: 2, audio: 0, total: 11 });
    expect(rule.supportedMediaTypes).toEqual(["image", "video"]);
    expect(rule.supportsAudioReference).toBe(false);
    expect(rule.mixedReference).toMatchObject({ imageVideo: true, maxImages: 9, maxVideos: 2 });
  });

  it("restores verified mixed drafts and disables Generate only beyond the Backend capability", () => {
    const rule = getVideoModelRuleFromRegistry(model);
    const restoredDraft: UploadMediaItem[] = [
      { id: "i1", assetId: assetId("image", 1), type: "image", name: "i1", url: "https://assets.shadowedgeai.com/i1.png", uploadStatus: "ready" },
      { id: "i2", assetId: assetId("image", 2), type: "image", name: "i2", url: "https://assets.shadowedgeai.com/i2.png", uploadStatus: "ready" },
      { id: "v1", assetId: assetId("video", 1), type: "video", name: "v1", url: "https://assets.shadowedgeai.com/v1.mp4", uploadStatus: "ready" },
    ];
    expect(validateReferenceSelectionForRule(rule, [], restoredDraft)).toBe("");

    const unsupportedDraft: UploadMediaItem[] = [
      ...Array.from({ length: 10 }, (_value, index) => ({ id: `i${index + 1}`, assetId: assetId("image", index + 1), type: "image" as const, name: `i${index + 1}`, url: `https://assets.shadowedgeai.com/i${index + 1}.png`, uploadStatus: "ready" as const })),
      restoredDraft[2],
    ];
    expect(validateReferenceSelectionForRule(rule, [], unsupportedDraft)).toContain("up to 9 reference images");

    const workspaceSource = readFileSync(join(process.cwd(), "src/components/video/VideoWorkspace.tsx"), "utf8");
    expect(workspaceSource).toContain("!referenceSelectionIssue");
    expect(workspaceSource).toContain('t("video.errors.unsupportedReferenceCombination")');
  });
});
