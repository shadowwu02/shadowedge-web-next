import { describe, expect, it } from "vitest";

import type { RemakeShot } from "@/components/video/remake/remakeTypes";
import {
  buildRemakeShotArtsDancePreview,
  getRemakeShotHandoffReadiness,
} from "@/lib/video/remakeShotVideoHandoff";

function validShot(overrides: Partial<RemakeShot> = {}): RemakeShot {
  return {
    action: "The character walks across a rain-wet street beneath reflected city lights.",
    audio: "",
    camera: "waist-height tracking shot",
    dialogue: "",
    duration: 8,
    emotion: "quiet determination",
    generationParams: {
      duration: 8,
      modelId: "seedance_2_0",
      quality: "720p",
      ratio: "16:9",
    },
    keyframes: [{
      analysisJobId: "analysis-1",
      assetId: "asset-frame-1",
      height: 360,
      mimeType: "image/jpeg",
      mock: false,
      sourceAssetId: "source-video-1",
      status: "ready",
      tenantId: "tenant-1",
      time: 6,
      url: "https://assets.shadowedgeai.com/remake-keyframes/tenant-1/user-1/analysis-1/frame_001.jpg",
      userId: "user-1",
      width: 640,
    }],
    motion: "slow forward tracking",
    position: "subject centered against street reflections",
    prompt: "A character walks across a rain-wet city street, slow waist-height tracking shot, neon reflections, cinematic realism.",
    readyForGeneration: true,
    referenceHints: { audios: [], characters: [], images: [], videos: [] },
    shot: 1,
    shotGroupId: "shot_rain_walk",
    sourceTimeRange: { end: 12, start: 4 },
    ...overrides,
  };
}

describe("Remake to ArtsDance canonical handoff", () => {
  it("builds a preview-only seedance_2_0 handoff from a valid canonical shot", () => {
    const preview = buildRemakeShotArtsDancePreview(validShot());
    expect(preview?.modelId).toBe("seedance_2_0");
    expect(preview?.referenceImages).toHaveLength(1);
    expect(preview?.referenceImages[0].assetId).toBe("asset-frame-1");
    expect(preview?.prompt).toContain("rain-wet city street");
  });

  it.each(["Unknown", "[object Object]", "Real VLM remake shot 1"])(
    "rejects placeholder prompt %s",
    (prompt) => {
      const shot = validShot({ prompt });
      expect(getRemakeShotHandoffReadiness(shot).ok).toBe(false);
      expect(buildRemakeShotArtsDancePreview(shot)).toBeNull();
    },
  );

  it("rejects a shot without a ready canonical keyframe", () => {
    const shot = validShot({ keyframes: [{ time: 6, url: "https://example.com/frame.jpg" }] });
    expect(getRemakeShotHandoffReadiness(shot).reason).toBe("missing_canonical_keyframe");
  });

  it("rejects invalid ranges and frames outside the source range", () => {
    expect(getRemakeShotHandoffReadiness(validShot({ sourceTimeRange: { end: 4, start: 12 } })).ok).toBe(false);
    const outside = validShot();
    outside.keyframes = [{ ...outside.keyframes![0], time: 20 }];
    expect(getRemakeShotHandoffReadiness(outside).ok).toBe(false);
  });

  it("caps canonical ArtsDance image references at nine", () => {
    const base = validShot();
    base.keyframes = Array.from({ length: 12 }, (_, index) => ({
      ...base.keyframes![0],
      assetId: `asset-frame-${index + 1}`,
      time: 4 + index * 0.5,
      url: `https://assets.shadowedgeai.com/remake-keyframes/tenant-1/user-1/analysis-1/frame_${index + 1}.jpg`,
    }));
    expect(buildRemakeShotArtsDancePreview(base)?.referenceImages).toHaveLength(9);
  });
});
