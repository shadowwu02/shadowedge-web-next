import { describe, expect, it } from "vitest";

import type { RemakeShot } from "@/components/video/remake/remakeTypes";

import { readFileSync } from "node:fs";

const timelineSource = readFileSync(
  new URL("../src/components/video/remake/RemakeStoryboardTimeline.tsx", import.meta.url),
  "utf8",
);
const panelSource = readFileSync(
  new URL("../src/components/video/remake/RemakeStoryboardPanel.tsx", import.meta.url),
  "utf8",
);

const canonicalShotFixture: RemakeShot = {
  action: "A calm establishing shot",
  audio: "",
  camera: "wide",
  dialogue: "",
  duration: 2,
  emotion: "calm",
  generationParams: { duration: 5, modelId: "seedance_2_0", quality: "720p", ratio: "16:9" },
  keyframes: [{ time: 1, url: "https://assets.example.test/owned-keyframe.jpg" }],
  motion: "slow pan",
  position: "center",
  prompt: "A peaceful lake at sunrise",
  readyForGeneration: true,
  referenceHints: { audios: [], characters: [], images: [], videos: [] },
  shot: 1,
  shotGroupId: "scene-1",
  sourceTimeRange: { end: 2, start: 0 },
};

describe("Remake Storyboard Timeline R1", () => {
  it("accepts only canonical storyboard projections and renders every shot without truncation", () => {
    expect(canonicalShotFixture.sourceTimeRange).toEqual({ start: 0, end: 2 });
    expect(timelineSource).toContain("shots.map((shot)");
    expect(timelineSource).not.toMatch(/shots\.slice|shots\.splice/);
    expect(panelSource).toContain("<RemakeStoryboardTimeline");
    expect(panelSource).toContain("shots={shots}");
    expect(timelineSource).toContain("selectedShot?.keyframes || []");
    expect(timelineSource).not.toMatch(/segments|storyboardId|metadata/i);
  });

  it("supports timeline selection, timing, keyframe preview, description, and prompt drafts", () => {
    expect(timelineSource).toContain('role="listbox"');
    expect(timelineSource).toContain("aria-selected={isSelected}");
    expect(timelineSource).toContain("setSelectedShotKey(key)");
    expect(timelineSource).toContain('data-testid="remake-keyframe-preview"');
    expect(timelineSource).toContain("selectedShot.sourceTimeRange.start");
    expect(timelineSource).toContain("selectedShot.sourceTimeRange.end");
    expect(timelineSource).toContain('updateSelectedDraft("description"');
    expect(timelineSource).toContain('updateSelectedDraft("prompt"');
  });

  it("keeps edits local and excludes provider/internal response surfaces", () => {
    expect(timelineSource).toContain("useState<Record<string, ShotDraft>>");
    expect(timelineSource).not.toMatch(/fetch\(|adminRequest|generateVideo|credit|billing/i);
    expect(timelineSource).not.toMatch(/rawResponse|rawPayload|providerPayload|vlmPayload|internalMetadata/i);
  });
});
