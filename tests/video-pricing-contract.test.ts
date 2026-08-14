import { describe, expect, test } from "vitest";

import { normalizeVideoModel } from "../src/lib/video-api";
import { buildVideoGenerationRequest } from "../src/lib/video/videoGenerationRequest";
import {
  estimateVideoCreditsForParams,
  getVideoModelRuleFromRegistry,
} from "../src/lib/video/videoModelRules";

const seedance20Table = {
  "5": { "720p": 23, "1080p": 45 },
  "10": { "720p": 45, "1080p": 90 },
  "15": { "720p": 68, "1080p": 135 },
};

function seedance20Model() {
  return normalizeVideoModel({
    id: "seedance_2_0",
    name: "Seedance 2.0",
    provider: "seedance",
    providerModel: "seedance_2_0",
    credits: 23,
    creditBase: 23,
    durations: [5, 10, 15],
    duration: { values: [5, 10, 15], default: 5 },
    ratios: ["16:9"],
    resolutions: ["720p", "1080p"],
    creditRules: {
      schemaVersion: "video_credits_v1",
      baseCredits: 23,
      table: seedance20Table,
      referenceSurchargeCredits: 0,
    },
  });
}

function seedance25Model() {
  return normalizeVideoModel({
    id: "seedance_2_5",
    name: "Seedance 2.5",
    provider: "seedance",
    providerModel: "seedance_2_5",
    credits: 23,
    creditBase: 23,
    durations: [5],
    duration: { values: [5], default: 5 },
    ratios: ["16:9"],
    resolutions: ["720p"],
    creditRules: {
      schemaVersion: "video_credits_v1",
      baseCredits: 23,
      table: { "5": { "720p": 23 } },
      referenceSurchargeCredits: 0,
    },
  });
}

describe("runtime video pricing contract", () => {
  test("Seedance 2.0 estimate follows backend resolution and duration tiers", () => {
    const rule = getVideoModelRuleFromRegistry(seedance20Model());
    expect(estimateVideoCreditsForParams(rule, { duration: 5, quality: "720p" })).toBe(23);
    expect(estimateVideoCreditsForParams(rule, { duration: 5, quality: "1080p" })).toBe(45);
    expect(estimateVideoCreditsForParams(rule, { duration: 10, quality: "720p" })).toBe(45);
    expect(estimateVideoCreditsForParams(rule, { duration: 15, quality: "720p" })).toBe(68);
  });

  test("Seedance 2.5 selector and generation request use 23 credits", () => {
    const model = seedance25Model();
    const rule = getVideoModelRuleFromRegistry(model);
    expect(model.credits).toBe(23);
    expect(estimateVideoCreditsForParams(rule, { duration: 5, quality: "720p" })).toBe(23);
    expect(buildVideoGenerationRequest({
      prompt: "A production pricing contract test",
      model,
      duration: 5,
      ratio: "16:9",
      quality: "720p",
      generateAudio: false,
      media: [],
    }).clientCost).toBe(23);
  });

  test("generation request uses the selected Seedance 2.0 runtime tier", () => {
    const request = buildVideoGenerationRequest({
      prompt: "A dynamic estimate contract test",
      model: seedance20Model(),
      duration: 15,
      ratio: "16:9",
      quality: "720p",
      generateAudio: false,
      media: [],
    });
    expect(request.clientCost).toBe(68);
  });
});
