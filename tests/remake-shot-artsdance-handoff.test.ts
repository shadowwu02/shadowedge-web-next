import { describe, expect, it } from "vitest";

import type { RemakeShot } from "@/components/video/remake/remakeTypes";
import {
  buildRemakeShotArtsDancePreview,
  getRemakeShotHandoffReadiness,
} from "@/lib/video/remakeShotVideoHandoff";

const ASSET_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const SOURCE_ASSET_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const USER_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const TENANT_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

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
      assetId: ASSET_ID,
      height: 360,
      mimeType: "image/jpeg",
      mock: false,
      sourceAssetId: SOURCE_ASSET_ID,
      status: "ready",
      tenantId: TENANT_ID,
      time: 6,
      url: "https://assets.shadowedgeai.com/remake-keyframes/tenant-1/user-1/analysis-1/frame_001.jpg",
      userId: USER_ID,
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
    expect(preview?.referenceImages[0].assetId).toBe(ASSET_ID);
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

  it("builds a short-remake preview from canonical materialized keyframes", () => {
    const shot = validShot();
    shot.keyframes = [0, 1, 2].map((index) => ({
      ...shot.keyframes![0],
      analysisId: "short-analysis-1",
      analysisJobId: undefined,
      assetId: `${index + 1}aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa`,
      correlationId: "short-remake-correlation-1",
      sourceMode: "short_remake",
      storageProvider: "r2",
      time: 5 + index,
    }));

    const preview = buildRemakeShotArtsDancePreview(shot);
    expect(preview?.modelId).toBe("seedance_2_0");
    expect(preview?.referenceImages).toHaveLength(3);
    expect(preview?.referenceImages.every((frame) => frame.sourceMode === "short_remake")).toBe(true);
    expect(preview?.referenceImages.every((frame) => Boolean(frame.assetId))).toBe(true);
  });

  it("rejects short-remake temp URLs and incomplete canonical lineage", () => {
    const tempOnly = validShot({
      keyframes: [{
        analysisId: "short-analysis-1",
        correlationId: "short-remake-correlation-1",
        sourceMode: "short_remake",
        time: 6,
        url: "https://api.shadowedgeai.com/uploads/remake-frames/temp/frame_001.jpg",
      }],
    });
    expect(getRemakeShotHandoffReadiness(tempOnly).reason).toBe("missing_canonical_keyframe");

    const missingCorrelation = validShot();
    missingCorrelation.keyframes = [{
      ...missingCorrelation.keyframes![0],
      analysisId: "short-analysis-1",
      analysisJobId: undefined,
      correlationId: undefined,
      sourceMode: "short_remake",
    }];
    expect(buildRemakeShotArtsDancePreview(missingCorrelation)).toBeNull();
  });

  it("rejects zero UUID and non-UUID canonical identities", () => {
    const zero = validShot();
    zero.keyframes = [{ ...zero.keyframes![0], assetId: "00000000-0000-0000-0000-000000000000" }];
    expect(buildRemakeShotArtsDancePreview(zero)).toBeNull();

    const local = validShot();
    local.keyframes = [{ ...local.keyframes![0], assetId: "studio-reference-1" }];
    expect(buildRemakeShotArtsDancePreview(local)).toBeNull();
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
      assetId: `${String(index + 1).padStart(8, "0")}-aaaa-4aaa-8aaa-aaaaaaaaaaaa`,
      time: 4 + index * 0.5,
      url: `https://assets.shadowedgeai.com/remake-keyframes/tenant-1/user-1/analysis-1/frame_${index + 1}.jpg`,
    }));
    expect(buildRemakeShotArtsDancePreview(base)?.referenceImages).toHaveLength(9);
  });
});
