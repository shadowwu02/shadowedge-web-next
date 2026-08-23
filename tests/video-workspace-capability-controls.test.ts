import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { normalizeVideoModel } from "@/lib/video-api";
import { getVideoHistoryGenerateAudio } from "@/lib/video/historyUtils";
import { buildVideoGenerationRequest } from "@/lib/video/videoGenerationRequest";
import { getVideoModelRuleFromRegistry } from "@/lib/video/videoModelRules";

function rawModel(overrides: Record<string, unknown>) {
  return {
    id: "seedance_2_0",
    name: "Seedance 2.0",
    credits: 23,
    maxPromptLength: 4000,
    ratios: ["16:9"],
    resolutions: ["720p"],
    duration: { default: 5, values: [5, 10, 15] },
    durations: [5, 10, 15],
    supportsAudio: true,
    audio: { default: true, supported: true },
    ...overrides,
  };
}

const range = (min: number, max: number) => Array.from({ length: max - min + 1 }, (_value, index) => min + index);

describe("video workspace public capability controls", () => {
  it("reads the explicit Seedance 2.0 public continuous range", () => {
    const model = normalizeVideoModel(rawModel({
      duration: { selection: "continuous", default: 5, min: 5, max: 15, step: 1, values: range(5, 15) },
      durations: range(5, 15),
    }));
    const rule = getVideoModelRuleFromRegistry(model);

    expect(model.durations).toEqual(range(5, 15));
    expect(model.durationPolicy).toEqual({ selection: "continuous", min: 5, max: 15, step: 1 });
    expect(rule.durations).toEqual(range(5, 15));
    expect(rule.durationPolicy.selection).toBe("continuous");
    expect(model.durationDefault).toBe(5);
  });

  it("reads the explicit Seedance 2.5 public 5-30 range", () => {
    const model = normalizeVideoModel(rawModel({
      id: "seedance_2_5",
      name: "Seedance 2.5",
      duration: { selection: "continuous", default: 5, min: 5, max: 30, step: 1, values: range(5, 30) },
      durations: range(5, 30),
      supportsAudio: false,
      audio: { default: false, supported: false },
    }));

    expect(model.durations).toEqual(range(5, 30));
    expect(model.durationPolicy).toEqual({ selection: "continuous", min: 5, max: 30, step: 1 });
    expect(model.durationDefault).toBe(5);
    expect(model.supportsAudio).toBe(false);
  });

  it("fails closed instead of synthesizing executable durations from min/max", () => {
    const model = normalizeVideoModel(rawModel({
      duration: { default: 5, min: 5, max: 30, step: 1 },
      durations: [],
    }));

    expect(model.durations).toEqual([5]);
  });

  it.each([false, true])("keeps generate_audio=%s consistent in transport and history metadata", (generateAudio) => {
    const model = normalizeVideoModel(rawModel({}));
    const request = buildVideoGenerationRequest({
      clientRequestId: `VIDEO_audio_${generateAudio ? "on" : "off"}_12345678`,
      duration: 5,
      generateAudio,
      media: [],
      model,
      prompt: "A safe landscape",
      quality: "720p",
      ratio: "16:9",
    });

    expect(request.generate_audio).toBe(generateAudio);
    expect(request.meta.generate_audio).toBe(generateAudio);
    expect(request.meta.generateAudio).toBe(generateAudio);
    expect(getVideoHistoryGenerateAudio(request)).toBe(generateAudio);
  });

  it("renders a Catalog-driven duration slider and keeps the result player explicitly audible", () => {
    const paramsSource = readFileSync("src/components/video/VideoParamsPanel.tsx", "utf8");
    const streamSource = readFileSync("src/components/video/VideoGenerationStream.tsx", "utf8");

    expect(paramsSource).toContain('modelRule.durationPolicy.selection === "continuous"');
    expect(paramsSource).toContain('type="range"');
    expect(paramsSource).toContain("max={modelRule.durationPolicy.max}");
    expect(paramsSource).toContain("min={modelRule.durationPolicy.min}");
    expect(paramsSource).toContain("step={modelRule.durationPolicy.step}");
    expect(streamSource).toContain("muted={false}");
    expect(streamSource).toContain('preload="metadata"');
    expect(streamSource).toContain('t("video.params.audioOn")');
    expect(streamSource).not.toContain("autoPlay");
  });
});
