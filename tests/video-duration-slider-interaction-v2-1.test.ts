import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { normalizeVideoModel } from "@/lib/video-api";
import {
  readVideoDurationSliderKeyValue,
  readVideoDurationSliderPointerValue,
  readVideoDurationSliderValue,
  resolveVideoDurationSliderContract,
} from "@/lib/video/videoDurationSlider";
import {
  getVideoModelRuleFromRegistry,
  normalizeVideoParamsForRule,
} from "@/lib/video/videoModelRules";
import { getVideoTupleCredits } from "@/lib/video/videoTupleAuthority";

const PRICING_VERSION = "VIDEO_PUBLIC_PRICING_V2_20260825";

function integerRange(min: number, max: number) {
  return Array.from({ length: max - min + 1 }, (_value, index) => min + index);
}

function continuousModel(input: {
  id: string;
  max: number;
  prices720: Record<number, number>;
  prices1080: Record<number, number>;
  prices4K?: Record<number, number>;
}) {
  const durations = integerRange(5, input.max);
  const resolutions = input.prices4K ? ["720p", "1080p", "4K"] : ["720p", "1080p"];
  const table = Object.fromEntries(durations.map((duration) => [
    String(duration),
    Object.fromEntries(resolutions.map((resolution) => {
      const prices = resolution === "720p" ? input.prices720 : resolution === "1080p" ? input.prices1080 : input.prices4K!;
      return [resolution, prices[duration]];
    })),
  ]));

  return normalizeVideoModel({
    id: input.id,
    name: input.id,
    credits: input.prices720[5],
    duration: {
      default: 5,
      max: input.max,
      min: 5,
      selection: "discrete_range",
      step: 1,
      type: "range",
    },
    durations,
    ratios: ["16:9"],
    resolutions,
    audio: { default: false, supported: true },
    supportsAudio: true,
    creditRules: {
      baseCredits: input.prices720[5],
      pricingVersion: PRICING_VERSION,
      table,
    },
    tupleCapabilities: durations.flatMap((duration) => resolutions.map((resolution) => ({
      allowedAspectRatios: ["16:9"],
      audio: { default: false, supported: resolution === "720p" || (input.id === "seedance_2_0" && resolution === "1080p") },
      duration,
      pricing: {
        currentCustomerCredits: table[String(duration)][resolution],
        pricingVersion: PRICING_VERSION,
        status: "READY",
      },
      resolution,
    }))),
  });
}

function scaledPrices(max: number, rate: number) {
  return Object.fromEntries(integerRange(5, max).map((duration) => [duration, Math.ceil(duration * rate)]));
}

const mini = continuousModel({
  id: "seedance_2_0_mini",
  max: 15,
  prices720: scaledPrices(15, 4.6),
  prices1080: scaledPrices(15, 9.2),
});

const seedance20 = continuousModel({
  id: "seedance_2_0",
  max: 15,
  prices720: scaledPrices(15, 4.5),
  prices1080: scaledPrices(15, 9),
  prices4K: scaledPrices(15, 18),
});

const seedance25 = continuousModel({
  id: "seedance_2_5",
  max: 30,
  prices720: scaledPrices(30, 4.5),
  prices1080: scaledPrices(30, 9),
});

function contractFor(model: ReturnType<typeof continuousModel>) {
  const rule = getVideoModelRuleFromRegistry(model);
  const contract = resolveVideoDurationSliderContract(rule.durationPolicy, rule.durations);
  expect(contract).not.toBeNull();
  return { contract: contract!, rule };
}

describe("Public Video V2.1 continuous duration interaction", () => {
  it("binds the controlled range to the native input event and synchronized accessibility values", () => {
    const source = readFileSync("src/components/video/VideoParamsPanel.tsx", "utf8");

    expect(source).toContain("onInput={(event) => updateSliderDuration(event.currentTarget.valueAsNumber)}");
    expect(source).toContain("onKeyDown={handleSliderKeyDown}");
    expect(source).toContain("onPointerDown={handleSliderPointerDown}");
    expect(source).toContain("onPointerMove={handleSliderPointerMove}");
    expect(source).toContain("onPointerUp={handleSliderPointerEnd}");
    expect(source).toContain("activeSliderPointerRef.current !== event.pointerId");
    expect(source).not.toContain("onChange={(event) => updateSliderDuration(event.currentTarget.valueAsNumber)}");
    expect(source).toContain("aria-valuemin={activeDurationSliderContract.min}");
    expect(source).toContain("aria-valuemax={activeDurationSliderContract.max}");
    expect(source).toContain("aria-valuenow={value.duration}");
  });

  it.each([
    [mini, [5, 6, 7, 10, 15]],
    [seedance20, [5, 10, 15]],
    [seedance25, [5, 20, 30]],
  ])("accepts every exact slider value without rounding, clamping, or fallback", (model, values) => {
    const { contract } = contractFor(model);

    for (const value of values) {
      expect(readVideoDurationSliderValue(value, contract)).toBe(value);
    }
    expect(readVideoDurationSliderValue(5.5, contract)).toBeNull();
    expect(readVideoDurationSliderValue(contract.max + 1, contract)).toBeNull();
  });

  it("maps track clicks and pointer drag positions to exact catalog values", () => {
    const { contract } = contractFor(mini);

    expect(readVideoDurationSliderPointerValue(0, 0, 100, contract)).toBe(5);
    expect(readVideoDurationSliderPointerValue(50, 0, 100, contract)).toBe(10);
    expect(readVideoDurationSliderPointerValue(100, 0, 100, contract)).toBe(15);
    expect(readVideoDurationSliderPointerValue(0, 0, 0, contract)).toBeNull();
  });

  it("moves by exact steps for arrows and uses catalog bounds for Home and End", () => {
    const { contract } = contractFor(mini);

    expect(readVideoDurationSliderKeyValue("ArrowRight", 5, contract)).toBe(6);
    expect(readVideoDurationSliderKeyValue("ArrowRight", 6, contract)).toBe(7);
    expect(readVideoDurationSliderKeyValue("ArrowLeft", 7, contract)).toBe(6);
    expect(readVideoDurationSliderKeyValue("Home", 12, contract)).toBe(5);
    expect(readVideoDurationSliderKeyValue("End", 12, contract)).toBe(15);
    expect(readVideoDurationSliderKeyValue("ArrowLeft", 5, contract)).toBeNull();
    expect(readVideoDurationSliderKeyValue("ArrowRight", 15, contract)).toBeNull();
  });

  it("keeps canonical Pricing V2 previews synchronized with Mini selections", () => {
    expect(getVideoTupleCredits(mini, { duration: 5, resolution: "720p", generateAudio: false })).toBe(23);
    expect(getVideoTupleCredits(mini, { duration: 6, resolution: "720p", generateAudio: false })).toBe(28);
    expect(getVideoTupleCredits(mini, { duration: 10, resolution: "720p", generateAudio: false })).toBe(46);
    expect(getVideoTupleCredits(mini, { duration: 15, resolution: "720p", generateAudio: false })).toBe(69);
    expect(getVideoTupleCredits(mini, { duration: 10, resolution: "1080p", generateAudio: false })).toBe(92);
  });

  it("keeps canonical Pricing V2 previews synchronized with Seedance 2.0 selections", () => {
    expect(getVideoTupleCredits(seedance20, { duration: 5, resolution: "720p", generateAudio: false })).toBe(23);
    expect(getVideoTupleCredits(seedance20, { duration: 10, resolution: "720p", generateAudio: false })).toBe(45);
    expect(getVideoTupleCredits(seedance20, { duration: 15, resolution: "720p", generateAudio: false })).toBe(68);
    expect(getVideoTupleCredits(seedance20, { duration: 10, resolution: "1080p", generateAudio: false })).toBe(90);
    expect(getVideoTupleCredits(seedance20, { duration: 10, resolution: "4K", generateAudio: false })).toBe(180);
  });

  it("keeps canonical Pricing V2 previews synchronized with Seedance 2.5 selections", () => {
    expect(getVideoTupleCredits(seedance25, { duration: 5, resolution: "720p", generateAudio: false })).toBe(23);
    expect(getVideoTupleCredits(seedance25, { duration: 10, resolution: "720p", generateAudio: false })).toBe(45);
    expect(getVideoTupleCredits(seedance25, { duration: 20, resolution: "720p", generateAudio: false })).toBe(90);
    expect(getVideoTupleCredits(seedance25, { duration: 30, resolution: "720p", generateAudio: false })).toBe(135);
    expect(getVideoTupleCredits(seedance25, { duration: 30, resolution: "1080p", generateAudio: false })).toBe(270);
  });

  it("preserves a valid duration across resolution and audio state changes", () => {
    const { rule } = contractFor(mini);
    const selected = { duration: 12, quality: "720p", ratio: "16:9", generateAudio: true };
    const withResolution = normalizeVideoParamsForRule(rule, { ...selected, quality: "1080p" });
    const withAudio = normalizeVideoParamsForRule(rule, { ...selected, generateAudio: false });

    expect(withResolution.duration).toBe(12);
    expect(withAudio.duration).toBe(12);
  });

  it("reconciles only model-incompatible durations and preserves compatible selections", () => {
    const miniRule = getVideoModelRuleFromRegistry(mini);
    const seedance20Rule = getVideoModelRuleFromRegistry(seedance20);

    expect(normalizeVideoParamsForRule(miniRule, { duration: 20, quality: "720p", ratio: "16:9" }).duration).toBe(5);
    expect(normalizeVideoParamsForRule(seedance20Rule, { duration: 10, quality: "720p", ratio: "16:9" }).duration).toBe(10);
  });

  it("keeps Fast discrete and rejects public duration 8", () => {
    const fast = normalizeVideoModel({
      id: "seedance_2_0_fast",
      name: "Seedance 2.0 Fast",
      credits: 12,
      duration: { default: 5, selection: "discrete", type: "values", values: [5, 6, 7, 15] },
      durations: [5, 6, 7, 15],
      ratios: ["16:9"],
      resolutions: ["720p", "1080p"],
    });
    const rule = getVideoModelRuleFromRegistry(fast);

    expect(rule.durations).toEqual([5, 6, 7, 15]);
    expect(resolveVideoDurationSliderContract(rule.durationPolicy, rule.durations)).toBeNull();
    expect(normalizeVideoParamsForRule(rule, { duration: 8, quality: "720p", ratio: "16:9" }).duration).toBe(5);
  });
});
