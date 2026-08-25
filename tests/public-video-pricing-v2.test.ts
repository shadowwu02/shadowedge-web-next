import { describe, expect, it } from "vitest";

import { estimateStudioVideoModelCredits } from "@/features/studio/capabilities/studioVideoModelResolver";
import { projectStudioPublicVideoCatalog } from "@/lib/studio-provider-models-api";
import { normalizeVideoModel } from "@/lib/video-api";
import { buildVideoGenerationRequest } from "@/lib/video/videoGenerationRequest";

const VERSION = "VIDEO_PUBLIC_PRICING_V2_20260825";

function model(input: {
  id: string;
  durations: number[];
  resolutions: string[];
  tuples: Array<[number, string, boolean, number]>;
}) {
  return normalizeVideoModel({
    id: input.id,
    name: input.id,
    credits: input.tuples[0][3],
    duration: {
      type: input.id === "seedance_2_0_fast" ? "values" : "range",
      selection: input.id === "seedance_2_0_fast" ? "discrete" : "discrete_range",
      min: input.durations[0],
      max: input.durations.at(-1),
      step: 1,
      values: input.durations,
      default: input.durations[0],
    },
    durations: input.durations,
    ratios: ["16:9"],
    resolutions: input.resolutions,
    audio: { supported: true, default: false },
    supportsAudio: true,
    tupleCapabilities: input.tuples.map(([duration, resolution, audio, credits]) => ({
      duration,
      resolution,
      allowedAspectRatios: ["16:9"],
      audio: { supported: audio, default: false },
      pricing: {
        status: "READY",
        pricingVersion: VERSION,
        currentCustomerCredits: credits,
      },
    })),
    creditRules: {
      pricingVersion: VERSION,
      baseCredits: input.tuples[0][3],
      table: Object.fromEntries(input.tuples.map(([duration, resolution, , credits]) => [
        String(duration), { [resolution]: credits }
      ])),
    },
  });
}

function request(videoModel: ReturnType<typeof model>, duration: number, resolution: string, audio: boolean) {
  return buildVideoGenerationRequest({
    duration,
    generateAudio: audio,
    estimatedCredits: 999,
    media: [],
    model: videoModel,
    prompt: "Canonical public pricing fixture",
    quality: resolution,
    ratio: "16:9",
  });
}

describe("Public Video Pricing V2 frontend authority", () => {
  it("uses canonical Mini and Fast prices and never fills Fast 8 through 14", () => {
    const mini = model({
      id: "seedance_2_0_mini",
      durations: [5, 10, 15],
      resolutions: ["720p", "1080p"],
      tuples: [[10, "720p", true, 46], [10, "1080p", false, 92]],
    });
    expect(request(mini, 10, "720p", false).clientCost).toBe(46);
    expect(request(mini, 10, "720p", true).clientCost).toBe(46);
    expect(request(mini, 10, "1080p", false).clientCost).toBe(92);
    expect(() => request(mini, 10, "1080p", true)).toThrowError(expect.objectContaining({ code: "VIDEO_AUDIO_UNSUPPORTED" }));

    const fast = model({
      id: "seedance_2_0_fast",
      durations: [5, 6, 7, 15],
      resolutions: ["720p", "1080p"],
      tuples: [[5, "720p", true, 12], [6, "720p", true, 15], [7, "720p", true, 17], [15, "1080p", false, 72]],
    });
    expect(request(fast, 6, "720p", false).clientCost).toBe(15);
    expect(request(fast, 15, "1080p", false).clientCost).toBe(72);
    expect(() => request(fast, 10, "720p", false)).toThrow();
  });

  it("uses exact 4K/1080 prices and preserves unsupported audio fail-closed", () => {
    const seedance20 = model({
      id: "seedance_2_0",
      durations: [10],
      resolutions: ["720p", "1080p", "4K"],
      tuples: [[10, "720p", true, 45], [10, "1080p", true, 90], [10, "4K", false, 180]],
    });
    expect(request(seedance20, 10, "4K", false).clientCost).toBe(180);
    expect(() => request(seedance20, 10, "4K", true)).toThrowError(expect.objectContaining({ code: "VIDEO_AUDIO_UNSUPPORTED" }));

    const seedance25 = model({
      id: "seedance_2_5",
      durations: [20],
      resolutions: ["720p", "1080p"],
      tuples: [[20, "720p", true, 90], [20, "1080p", false, 180]],
    });
    expect(request(seedance25, 20, "1080p", false).clientCost).toBe(180);
    expect(() => request(seedance25, 20, "1080p", true)).toThrowError(expect.objectContaining({ code: "VIDEO_AUDIO_UNSUPPORTED" }));
  });

  it("shares the same versioned exact decision across Workspace, Studio, and Remake handoff", () => {
    const seedance20 = model({
      id: "seedance_2_0",
      durations: [10],
      resolutions: ["4K"],
      tuples: [[10, "4K", false, 180]],
    });
    const workspace = request(seedance20, 10, "4K", false);
    const remake = buildVideoGenerationRequest({
      duration: 10,
      generateAudio: false,
      media: [],
      model: seedance20,
      prompt: "Canonical Remake shot fixture",
      quality: "4K",
      ratio: "16:9",
      meta: { source: "remake_single_shot" },
    });
    const inventory = projectStudioPublicVideoCatalog([seedance20]);
    const studioCredits = estimateStudioVideoModelCredits(inventory.models[0], {
      duration: 10,
      quality: "4K",
      resolution: "4K",
      audio: false,
    });
    expect([workspace.clientCost, remake.clientCost, studioCredits]).toEqual([180, 180, 180]);
    expect(workspace.pricingVersion).toBe(VERSION);
    expect(remake.pricingVersion).toBe(VERSION);
  });

  it("fails closed when a versioned catalog loses tuple pricing instead of using local formulas", () => {
    const incomplete = normalizeVideoModel({
      id: "seedance_2_0",
      name: "Seedance 2.0",
      credits: 23,
      duration: { type: "range", selection: "discrete_range", min: 5, max: 15, step: 1, default: 5 },
      durations: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      ratios: ["16:9"],
      resolutions: ["720p"],
      tupleCapabilities: [],
      creditRules: {
        pricingVersion: VERSION,
        baseCredits: 23,
        table: { "5": { "720p": 23 } },
      },
    });
    expect(() => request(incomplete, 5, "720p", false)).toThrowError(expect.objectContaining({
      code: "VIDEO_CATALOG_TUPLE_AUTHORITY_MISSING",
    }));
  });
});
