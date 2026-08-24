import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import type { RemakeStoryboard } from "@/components/video/remake/remakeTypes";
import { getRemakeShotGenerationKey } from "@/components/video/remake/remakeTypes";
import { buildRemakeInternalBetaSnapshotInput } from "@/lib/video/remakeInternalBetaExportApi";

const SOURCE_ASSET = "11111111-1111-4111-8111-111111111111";
const REPLACEMENT_ASSET = "22222222-2222-4222-8222-222222222222";

function storyboard(): RemakeStoryboard {
  return {
    id: "analysis-public-ref",
    mode: "single_clip",
    targetRegion: "US",
    characterRules: "",
    sceneStyle: "",
    translateDialogue: true,
    shots: [1, 2].map((shot) => ({
      shotGroupId: `scene-${shot}`,
      shot,
      sourceTimeRange: { start: shot - 1, end: shot },
      duration: 1,
      camera: "static",
      motion: "none",
      position: "wide",
      action: `Shot ${shot}`,
      emotion: "calm",
      dialogue: "",
      audio: "original",
      prompt: `Prompt ${shot}`,
      referenceHints: { images: [], videos: [], audios: [], characters: [] },
      generationParams: { modelId: "seedance_2_0", ratio: "16:9", duration: 5, quality: "720p" },
    })),
  };
}

describe("Remake R10 internal beta productization", () => {
  it("freezes one ordered snapshot using original and READY replacement lineage", () => {
    const timeline = storyboard();
    const second = timeline.shots[1];
    const snapshot = buildRemakeInternalBetaSnapshotInput({
      storyboard: timeline,
      sourceAssetRef: SOURCE_ASSET,
      aspectRatio: "16:9",
      shotGenerations: {
        [getRemakeShotGenerationKey(timeline.id, second)]: {
          status: "success",
          replacement: {
            contractVersion: "remake-shot-replacement-v1",
            original: { version: "v1", shotRef: "shot-2", analysisRef: timeline.id, shotGroupRef: "scene-2", shotNumber: 2 },
            edited: { version: "v2", draftRevision: 1 },
            generated: {
              version: "v3",
              generationRequestRef: "request-ref",
              generationJobRef: "job-ref",
              status: "completed",
              retryAttempt: 0,
              replacesGenerationRequestRef: null,
              assetLineage: {
                assetRef: REPLACEMENT_ASSET,
                sourceGenerationJobRef: "job-ref",
                generationRequestRef: "request-ref",
                originalShotRef: "shot-2",
                status: "ready",
                mimeType: "video/mp4",
                url: "https://assets.example/replacement.mp4",
              },
            },
          },
        },
      },
    });
    expect(snapshot.timelineVersion).toBe(3);
    expect(snapshot.orderedShots).toHaveLength(2);
    expect(snapshot.orderedShots[0]).toMatchObject({ ordinal: 1, visualSource: "original_v1", visualAssetRef: SOURCE_ASSET });
    expect(snapshot.orderedShots[1]).toMatchObject({ ordinal: 2, visualSource: "generated_v3", visualAssetRef: REPLACEMENT_ASSET });
    expect(snapshot.orderedShots.every((shot) => shot.audioSource === "original_audio")).toBe(true);
  });

  it("uses server capability projection and wires the real Remake page without client role inference", () => {
    const hook = readFileSync(new URL("../src/hooks/useRemakeInternalBetaExport.ts", import.meta.url), "utf8");
    const api = readFileSync(new URL("../src/lib/video/remakeInternalBetaExportApi.ts", import.meta.url), "utf8");
    const workspace = readFileSync(new URL("../src/components/video/VideoWorkspace.tsx", import.meta.url), "utf8");
    const panel = readFileSync(new URL("../src/components/video/remake/RemakeStoryboardPanel.tsx", import.meta.url), "utf8");
    expect(api).toContain("/api/remake/internal-export/capability");
    expect(api).toContain("/api/remake/internal-export/snapshots");
    expect(api).toContain("/api/remake/internal-export/preview");
    expect(api).toContain("/api/remake/internal-export/confirm");
    expect(hook).not.toMatch(/role|localStorage|allowlist/i);
    expect(workspace).toContain("useRemakeInternalBetaExport");
    expect(workspace).toContain("exportFlow={remakeInternalBetaExport}");
    expect(panel).toContain("exportFlow={exportFlow}");
  });

  it("preserves exactly-once confirmation and fail-closed behavior", () => {
    const hook = readFileSync(new URL("../src/hooks/useRemakeInternalBetaExport.ts", import.meta.url), "utf8");
    const api = readFileSync(new URL("../src/lib/video/remakeInternalBetaExportApi.ts", import.meta.url), "utf8");
    expect(api).toContain("Idempotency-Key");
    expect(api).toContain("snapshotHash}:${input.receipt.estimateHash");
    expect(hook).toContain("mutationPendingRef");
    expect(hook).not.toMatch(/retry|refund|resubmit/i);
  });
});
