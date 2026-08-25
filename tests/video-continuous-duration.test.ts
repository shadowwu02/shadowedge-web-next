import { describe, expect, it } from "vitest";

import { normalizeVideoModel } from "@/lib/video-api";
import { buildVideoGenerationRequest } from "@/lib/video/videoGenerationRequest";

const range = (min: number, max: number) => Array.from({ length: max - min + 1 }, (_value, index) => min + index);

function model(id: "seedance_2_0" | "seedance_2_5", max: number) {
  const durations = range(5, max);
  return normalizeVideoModel({
    id,
    name: id === "seedance_2_0" ? "Seedance 2.0" : "Seedance 2.5",
    credits: 23,
    durations,
    duration: { type: "range", selection: "discrete_range", min: 5, max, step: 1, default: 5 },
    durations: [],
    ratios: ["16:9"],
    resolutions: ["720p"],
    supportsAudio: id === "seedance_2_0",
    audio: { supported: id === "seedance_2_0", default: false },
    creditRules: {
      schemaVersion: "video_credits_v1",
      baseCredits: 23,
      table: Object.fromEntries(durations.map((duration) => [String(duration), { "720p": Math.ceil(duration * 4.5) }])),
    },
  });
}

function build(selectedModel: ReturnType<typeof model>, duration: number) {
  return buildVideoGenerationRequest({
    prompt: "A safe continuous duration fixture",
    model: selectedModel,
    duration,
    ratio: "16:9",
    quality: "720p",
    generateAudio: false,
    media: [],
  });
}

describe("discrete range video duration selector contract", () => {
  it("preserves representative Seedance 2.0 seconds from 5 through 15", () => {
    const selectedModel = model("seedance_2_0", 15);
    expect(selectedModel.durations).toEqual(range(5, 15));
    for (const duration of [5, 6, 12, 15]) {
      const request = build(selectedModel, duration);
      expect(request.duration).toBe(duration);
      expect(request.meta.duration).toBe(`${duration}s`);
    }
  });

  it("preserves representative Seedance 2.5 seconds without clamp or fallback", () => {
    const selectedModel = model("seedance_2_5", 30);
    expect(selectedModel.durations).toEqual(range(5, 30));
    for (const duration of [5, 6, 15, 20, 25, 30]) {
      const request = build(selectedModel, duration);
      expect(request.duration).toBe(duration);
      expect(request.meta.duration).toBe(`${duration}s`);
    }
    expect(build(selectedModel, 12).clientCost).toBe(54);
    expect(build(selectedModel, 30).clientCost).toBe(135);
  });

  it.each([4, 16, 12.5])("rejects invalid Seedance 2.0 duration %s", (duration) => {
    expect(() => build(model("seedance_2_0", 15), duration)).toThrowError(
      expect.objectContaining({ code: "VIDEO_DURATION_UNSUPPORTED" }),
    );
  });

  it("does not trust a bare internal-style min/max range", () => {
    const normalized = normalizeVideoModel({
      id: "seedance_2_5",
      name: "Seedance 2.5",
      credits: 23,
      durations: [5],
      duration: { min: 5, max: 30, step: 1, default: 5 },
      ratios: ["16:9"],
      resolutions: ["720p"],
    });
    expect(normalized.durationPolicy?.selection).toBe("discrete");
    expect(normalized.durations).toEqual([5]);
  });
});
