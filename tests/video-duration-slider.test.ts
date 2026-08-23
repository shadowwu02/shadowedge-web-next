import { describe, expect, it } from "vitest";

import { normalizeVideoModel } from "@/lib/video-api";
import { buildVideoGenerationRequest } from "@/lib/video/videoGenerationRequest";
import {
  readVideoDurationSliderValue,
  resolveVideoDurationSliderContract,
} from "@/lib/video/videoDurationSlider";
import { estimateVideoCreditsForParams, getVideoModelRuleFromRegistry } from "@/lib/video/videoModelRules";

const range = (min: number, max: number) => Array.from({ length: max - min + 1 }, (_value, index) => min + index);

function rangeModel(id: "seedance_2_0" | "seedance_2_5", max: number) {
  const durations = range(5, max);
  return normalizeVideoModel({
    id,
    name: id,
    credits: 23,
    duration: { selection: "discrete_range", min: 5, max, step: 1, default: 5 },
    durations: [],
    ratios: ["16:9"],
    resolutions: ["720p"],
    creditRules: {
      table: Object.fromEntries(durations.map((duration) => [String(duration), { "720p": Math.ceil(duration * 4.5) }])),
    },
  });
}

function request(model: ReturnType<typeof rangeModel>, duration: number) {
  return buildVideoGenerationRequest({
    prompt: "A safe duration slider fixture",
    model,
    duration,
    ratio: "16:9",
    quality: "720p",
    generateAudio: false,
    media: [],
  });
}

describe("video duration slider contract", () => {
  it.each([
    ["seedance_2_0", 15, [5, 12, 15]],
    ["seedance_2_5", 30, [5, 20, 30]],
  ] as const)("preserves exact integer duration state for %s", (id, max, samples) => {
    const model = rangeModel(id, max);
    const rule = getVideoModelRuleFromRegistry(model);
    const contract = resolveVideoDurationSliderContract(rule.durationPolicy, rule.durations);

    expect(contract).toEqual({ min: 5, max, step: 1, values: range(5, max) });
    for (const duration of samples) {
      expect(readVideoDurationSliderValue(duration, contract!)).toBe(duration);
      expect(request(model, duration).duration).toBe(duration);
      expect(request(model, duration).meta.duration).toBe(`${duration}s`);
    }
  });

  it("keeps estimated credits synchronized with the exact slider duration", () => {
    const seedance20 = getVideoModelRuleFromRegistry(rangeModel("seedance_2_0", 15));
    const seedance25 = getVideoModelRuleFromRegistry(rangeModel("seedance_2_5", 30));

    expect(estimateVideoCreditsForParams(seedance20, { duration: 12, quality: "720p", ratio: "16:9" })).toBe(54);
    expect(estimateVideoCreditsForParams(seedance25, { duration: 30, quality: "720p", ratio: "16:9" })).toBe(135);
  });

  it("rejects fractional, out-of-range, and non-Catalog slider output without rounding or clamping", () => {
    const model = rangeModel("seedance_2_0", 15);
    const rule = getVideoModelRuleFromRegistry(model);
    const contract = resolveVideoDurationSliderContract(rule.durationPolicy, rule.durations)!;

    expect(readVideoDurationSliderValue(12.5, contract)).toBeNull();
    expect(readVideoDurationSliderValue(4, contract)).toBeNull();
    expect(readVideoDurationSliderValue(16, contract)).toBeNull();
  });

  it("keeps fixed Catalog models on the existing discrete duration UI", () => {
    expect(resolveVideoDurationSliderContract(
      { selection: "discrete", min: 5, max: 5, step: 1 },
      [5],
    )).toBeNull();
  });

  it("fails closed when a range policy and its explicit duration values disagree", () => {
    expect(resolveVideoDurationSliderContract(
      { selection: "discrete_range", min: 5, max: 15, step: 1 },
      [5, 10, 15],
    )).toBeNull();
    expect(resolveVideoDurationSliderContract(
      { selection: "discrete_range", min: 5, max: 15, step: 1 },
      [...range(5, 15), 12.5],
    )).toBeNull();
  });
});
