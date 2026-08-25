import { describe, expect, it } from "vitest";

import { normalizeVideoModel } from "@/lib/video-api";
import { projectStudioPublicVideoCatalog } from "@/lib/studio-provider-models-api";
import { buildVideoGenerationRequest } from "@/lib/video/videoGenerationRequest";
import { getVideoTupleCapability } from "@/lib/video/videoTupleAuthority";

const range = (min: number, max: number) => Array.from({ length: max - min + 1 }, (_value, index) => min + index);

function tuple(duration: number, resolution: string, audio: boolean, credits: number | null) {
  return {
    duration,
    resolution,
    allowedAspectRatios: ["16:9"],
    audio: { supported: audio, default: false },
    pricing: {
      status: credits === null ? "MISSING_REQUIRES_OWNER_DECISION" : "READY",
      pricingVersion: credits === null ? null : "VIDEO_PUBLIC_PRICING_V2_20260825",
      currentCustomerCredits: credits,
    },
  };
}

function publicModel(input: {
  id: string;
  duration: Record<string, unknown>;
  durations: number[];
  resolutions: string[];
  tuples: ReturnType<typeof tuple>[];
}) {
  return normalizeVideoModel({
    id: input.id,
    name: input.id,
    credits: input.id.includes("fast") ? 12 : 23,
    duration: input.duration,
    durations: input.durations,
    ratios: ["16:9"],
    resolutions: input.resolutions,
    audio: { supported: true, default: false },
    supportsAudio: true,
    tupleCapabilities: input.tuples,
    creditRules: {
      baseCredits: input.id.includes("fast") ? 12 : 23,
      table: { "5": { "720p": input.id.includes("fast") ? 12 : 23 } },
    },
  });
}

describe("Public Video Capability Catalog V2", () => {
  it("renders ranges as sliders and Fast as exact values", () => {
    const mini = publicModel({
      id: "seedance_2_0_mini",
      duration: { type: "range", selection: "discrete_range", min: 5, max: 15, step: 1, default: 5 },
      durations: range(5, 15),
      resolutions: ["720p", "1080p"],
      tuples: range(5, 15).flatMap((duration) => [tuple(duration, "720p", true, duration === 5 ? 23 : null), tuple(duration, "1080p", false, null)]),
    });
    const fast = publicModel({
      id: "seedance_2_0_fast",
      duration: { type: "values", selection: "discrete", values: [5, 6, 7, 15], default: 5 },
      durations: [5, 6, 7, 15],
      resolutions: ["720p", "1080p"],
      tuples: [5, 6, 7, 15].flatMap((duration) => [tuple(duration, "720p", true, duration === 5 ? 12 : null), tuple(duration, "1080p", false, null)]),
    });

    expect(mini.durationPolicy).toEqual({ type: "range", selection: "discrete_range", min: 5, max: 15, step: 1 });
    expect(fast.durationPolicy).toEqual({ type: "values", selection: "discrete", min: 5, max: 15, step: 1 });
    expect(fast.durations).toEqual([5, 6, 7, 15]);
    expect(fast.durations).not.toContain(8);
  });

  it("preserves audio=true and rejects unsupported audio without silently disabling it", () => {
    const model = publicModel({
      id: "seedance_2_0_mini",
      duration: { type: "range", selection: "discrete_range", min: 5, max: 15, step: 1, default: 5 },
      durations: range(5, 15),
      resolutions: ["720p", "1080p"],
      tuples: [tuple(5, "720p", true, 23), tuple(5, "1080p", false, null)],
    });
    const request = buildVideoGenerationRequest({
      duration: 5,
      generateAudio: true,
      media: [],
      model,
      prompt: "Safe catalog fixture",
      quality: "720p",
      ratio: "16:9",
    });
    expect(request.generate_audio).toBe(true);
    expect(() => buildVideoGenerationRequest({
      duration: 5,
      generateAudio: true,
      media: [],
      model,
      prompt: "Safe catalog fixture",
      quality: "1080p",
      ratio: "16:9",
    })).toThrowError(expect.objectContaining({ code: "VIDEO_AUDIO_UNSUPPORTED" }));
  });

  it("uses the exact versioned tuple price without a local estimate override", () => {
    const model = publicModel({
      id: "seedance_2_0",
      duration: { type: "range", selection: "discrete_range", min: 5, max: 15, step: 1, default: 5 },
      durations: range(5, 15),
      resolutions: ["720p", "1080p", "4K"],
      tuples: [tuple(5, "720p", true, 23), tuple(5, "4K", false, 90)],
    });
    expect(getVideoTupleCapability(model, { duration: 5, resolution: "4K" })).not.toBeNull();
    const request = buildVideoGenerationRequest({
      duration: 5,
      generateAudio: false,
      estimatedCredits: 999,
      media: [],
      model,
      prompt: "Safe catalog fixture",
      quality: "4K",
      ratio: "16:9",
    });
    expect(request.clientCost).toBe(90);
    expect(request.pricingVersion).toBe("VIDEO_PUBLIC_PRICING_V2_20260825");
    expect(request.creditAmount).toBe(90);
  });

  it("projects the same canonical model into Studio without local capability rules", () => {
    const model = publicModel({
      id: "seedance_2_0_fast",
      duration: { type: "values", selection: "discrete", values: [5, 6, 7, 15], default: 5 },
      durations: [5, 6, 7, 15],
      resolutions: ["720p", "1080p"],
      tuples: [tuple(5, "720p", true, 12), tuple(5, "1080p", false, null)],
    });
    const inventory = projectStudioPublicVideoCatalog([model], new Date("2026-08-25T00:00:00.000Z"));
    expect(inventory.models[0].catalogModel).toBe(model);
    expect(inventory.models[0].limits.durations).toEqual([5, 6, 7, 15]);
    expect(inventory.models[0].limits.resolutions).toEqual(["720p", "1080p"]);
  });
});
