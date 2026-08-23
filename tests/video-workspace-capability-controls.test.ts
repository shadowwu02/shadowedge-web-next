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

describe("video workspace public capability controls", () => {
  it("preserves the explicit Seedance 2.0 public 5/10/15 duration set", () => {
    const model = normalizeVideoModel(rawModel({}));
    const rule = getVideoModelRuleFromRegistry(model);

    expect(model.durations).toEqual([5, 10, 15]);
    expect(rule.durations).toEqual([5, 10, 15]);
    expect(model.durationDefault).toBe(5);
  });

  it("does not expand Seedance 2.5 discovery min/max into the public selector", () => {
    const model = normalizeVideoModel(rawModel({
      id: "seedance_2_5",
      name: "Seedance 2.5",
      duration: { default: 5, min: 5, max: 30, step: 1, values: [5], verifiedValues: [5] },
      durations: [5],
      supportsAudio: false,
      audio: { default: false, supported: false },
    }));

    expect(model.durations).toEqual([5]);
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

  it("keeps the duration UI discrete and the result player explicitly audible", () => {
    const paramsSource = readFileSync("src/components/video/VideoParamsPanel.tsx", "utf8");
    const streamSource = readFileSync("src/components/video/VideoGenerationStream.tsx", "utf8");

    expect(paramsSource).toContain('role="radiogroup"');
    expect(paramsSource).toContain('role="radio"');
    expect(paramsSource).not.toContain('type="range"');
    expect(streamSource).toContain("muted={false}");
    expect(streamSource).toContain('preload="metadata"');
    expect(streamSource).toContain('t("video.params.audioOn")');
    expect(streamSource).not.toContain("autoPlay");
  });
});
