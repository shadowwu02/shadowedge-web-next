import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import type { RemakeStoryboard } from "@/components/video/remake/remakeTypes";
import {
  getRenderableRemakeStoryboard,
  isRenderableRemakeStoryboard,
} from "@/lib/video/remakeStoryboardVisibility";

function storyboard(overrides: Partial<RemakeStoryboard> = {}): RemakeStoryboard {
  return {
    id: "analysis-1",
    mode: "single_clip",
    analysisSource: "real_vlm",
    providerCallMade: true,
    targetRegion: "US",
    characterRules: "",
    sceneStyle: "cinematic",
    translateDialogue: true,
    vlmCalled: true,
    shots: [
      {
        shotGroupId: "scene-1",
        shot: 1,
        sourceTimeRange: { start: 0, end: 2 },
        duration: 2,
        camera: "wide",
        motion: "static",
        position: "center",
        action: "sunrise",
        emotion: "calm",
        dialogue: "",
        audio: "ambient",
        prompt: "A calm sunrise",
        referenceHints: { images: [], videos: [], audios: [], characters: [] },
        generationParams: { modelId: "seedance_2_0", ratio: "16:9", quality: "720p", duration: 5 },
      },
    ],
    ...overrides,
  };
}

describe("Remake frontend fail-closed storyboard visibility", () => {
  it("renders valid backend real-VLM shots", () => {
    const value = storyboard();
    expect(getRenderableRemakeStoryboard({ storyboard: value })).toBe(value);
    expect(isRenderableRemakeStoryboard({ storyboard: value })).toBe(true);
    expect(getRenderableRemakeStoryboard({
      meta: { vlmProvider: "configured-provider" },
      storyboard: storyboard({ analysisSource: undefined }),
    })).not.toBeNull();
  });

  it("renders zero shots when analysis failed or the VLM result is missing", () => {
    expect(getRenderableRemakeStoryboard({
      analysisStatus: "FAILED",
      storyboard: storyboard(),
    })).toBeNull();
    expect(getRenderableRemakeStoryboard({
      meta: { analysisSource: "real_vlm", providerCallMade: true, vlmCalled: true },
      storyboard: storyboard({ shots: [] }),
    })).toBeNull();
  });

  it("never renders backend fallback, mock, sandbox, or malformed shot data", () => {
    expect(getRenderableRemakeStoryboard({
      meta: { analysisSource: "fallback", mock: true, vlmFailed: true },
      storyboard: storyboard({ analysisSource: "fallback", mock: true }),
    })).toBeNull();
    expect(getRenderableRemakeStoryboard({
      meta: { analysisSource: "sandbox_vlm", sandboxVlm: true },
      storyboard: storyboard({ analysisSource: "sandbox_vlm", sandboxVlm: true }),
    })).toBeNull();
    expect(getRenderableRemakeStoryboard({
      storyboard: storyboard({
        shots: [{ ...storyboard().shots[0], sourceTimeRange: { start: 2, end: 2 } }],
      }),
    })).toBeNull();
  });

  it("wires the fail-closed boundary into analysis, draft restore, and final rendering", () => {
    const workspace = readFileSync(
      new URL("../src/components/video/VideoWorkspace.tsx", import.meta.url),
      "utf8",
    );
    const panel = readFileSync(
      new URL("../src/components/video/remake/RemakeStoryboardPanel.tsx", import.meta.url),
      "utf8",
    );

    expect(workspace).not.toContain("buildMockRemakeStoryboard");
    expect(workspace.match(/getRenderableRemakeStoryboard/g)).toHaveLength(3);
    expect(workspace).toContain('setRemakeAnalysisError(t("video.remake.analysisFailed"))');
    expect(panel).toContain("const renderableStoryboard = isRejectedStoryboard ? null : storyboard");
    expect(panel).toContain('t("video.remake.analysisFailedHint")');
  });
});
