import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getVideoModelRule } from "../src/lib/video/videoModelRules";
import { validateReferenceSelectionForRule } from "../src/lib/video/videoReferenceRules";
import type { UploadMediaItem } from "../src/types/video";

const models = [
  ["seedance_2_0_mini", "Seedance 2.0 Mini", 23],
  ["seedance_2_0_fast", "Seedance 2.0 Fast", 12],
  ["seedance_2_0", "Seedance 2.0", 23],
  ["seedance_2_5", "Seedance 2.5", 23],
] as const;

const assetId = (kind: "image" | "video" | "audio", index: number) =>
  `${kind === "image" ? "1" : kind === "video" ? "2" : "3"}0000000-0000-4000-8000-${String(index).padStart(12, "0")}`;

describe("ArtsDance Seedance production UI contract", () => {
  it.each(models)("freezes %s to the verified 9 Image + 2 Video capability", (alias, label, credits) => {
    const rule = getVideoModelRule(alias);
    expect(rule.label).toBe(label);
    expect(rule.ratios).toEqual(["16:9"]);
    expect(rule.durations).toEqual([5]);
    expect(rule.qualities).toEqual(["720p"]);
    expect(rule.uploadSlots).toEqual(["reference_images", "reference_videos"]);
    expect(rule.maxReferences).toEqual({ total: 11, image: 9, video: 2, audio: 0 });
    expect(rule.supportsImageReference).toBe(true);
    expect(rule.supportsVideoReference).toBe(true);
    expect(rule.supportsAudioReference).toBe(false);
    expect(rule.mixedReference).toMatchObject({ imageVideo: true, maxImages: 9, maxVideos: 2 });
    expect(rule.credits).toBe(credits);
  });

  it.each(models)("validates mixed references and restored drafts for %s", (alias) => {
    const rule = getVideoModelRule(alias);
    const image = (index: number): UploadMediaItem => ({
      id: `image-${index}`, assetId: assetId("image", index), type: "image", name: `image-${index}`,
      url: `https://assets.shadowedgeai.com/image-${index}.png`, uploadStatus: "ready",
    });
    const video = (index: number): UploadMediaItem => ({
      id: `video-${index}`, assetId: assetId("video", index), type: "video", name: `video-${index}`,
      url: `https://assets.shadowedgeai.com/video-${index}.mp4`, uploadStatus: "ready",
    });
    expect(validateReferenceSelectionForRule(rule, [], [image(1), video(1)])).toBe("");
    expect(validateReferenceSelectionForRule(rule, [], [image(1), image(2), image(3), video(1)])).toBe("");
    expect(validateReferenceSelectionForRule(rule, [], [
      ...Array.from({ length: 9 }, (_value, index) => image(index + 1)), video(1), video(2),
    ])).toBe("");
    expect(validateReferenceSelectionForRule(rule, [], [
      ...Array.from({ length: 10 }, (_value, index) => image(index + 1)), video(1),
    ])).toContain("Reference limit reached");
    expect(validateReferenceSelectionForRule(rule, [], [
      ...Array.from({ length: 9 }, (_value, index) => image(index + 1)), video(1), video(2), video(3),
    ])).toContain("Reference limit reached");
    expect(validateReferenceSelectionForRule(rule, [], [{
      id: "audio-1", assetId: assetId("audio", 1), type: "audio", name: "audio-1",
      url: "https://assets.shadowedgeai.com/audio-1.mp3", uploadStatus: "ready",
    }])).toContain("does not support audio references");
  });

  it("keeps the legacy 2.5 Pro alias compatible without exposing Pro in the label", () => {
    expect(getVideoModelRule("seedance_2_5_pro").modelId).toBe("seedance_2_5");
    expect(getVideoModelRule("seedance_2_5_pro").label).toBe("Seedance 2.5");
  });

  it("uses the build-time production gate and registry-driven reference controls", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src", "components", "video", "VideoWorkspace.tsx"),
      "utf8",
    );
    expect(source).toContain("NEXT_PUBLIC_XINHANKR_ARTSDANCE_PRODUCTION_ENABLED");
    expect(source).toContain("requiredModels");
    expect(source).toContain("legacySeedanceFallbackModels");
    expect(source).toContain("selectedModelRule.uploadSlots.length > 0");
    expect(source).not.toContain('label: "Seedance 2.5 Pro"');
  });
});
