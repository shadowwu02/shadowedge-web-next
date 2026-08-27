import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { normalizeVideoModel } from "@/lib/video-api";
import { getVideoWorkspaceModelState } from "@/lib/video/fluxproxyInternational";

const INTERNATIONAL_IDS = [
  "seedance_2_0_international",
  "seedance_2_0_fast_international",
  "seedance_2_0_mini_international",
  "seedance_2_5_international",
] as const;

function catalogModel(id: string, customerExecutionEnabled: boolean) {
  return normalizeVideoModel({
    id,
    name: id,
    provider: "fluxproxy",
    productLine: "international",
    available: customerExecutionEnabled,
    customerExecutionEnabled,
    customerPricingStatus: "READY",
    credits: 18,
    maxPromptLength: 10_000,
    duration: { selection: "discrete_range", min: 4, max: 30, step: 1, default: 4 },
    resolutions: ["720p"],
    ratios: ["16:9"],
    creditRules: {
      pricingVersion: "FLUXPROXY_INTERNATIONAL_PRICING_V1_20260826",
      baseCredits: 18,
      table: { "4": { "720p": 18 } },
    },
    tupleCapabilities: [{
      duration: 4,
      resolution: "720p",
      allowedAspectRatios: ["16:9"],
      audio: { supported: false, default: false },
      pricing: {
        status: "READY",
        pricingVersion: "FLUXPROXY_INTERNATIONAL_PRICING_V1_20260826",
        currentCustomerCredits: 18,
      },
    }],
  });
}

describe("International Workspace catalog and execution gate separation", () => {
  it("keeps all four International cards visible, selectable, and configurable while Gate is OFF", () => {
    for (const id of INTERNATIONAL_IDS) {
      const model = catalogModel(id, false);
      expect(model.available).toBe(false);
      expect(getVideoWorkspaceModelState(model)).toEqual({
        catalogVisible: true,
        catalogSelectable: true,
        configurationEnabled: true,
        executionEnabled: false,
        executionBlockedReason: "INTERNATIONAL_BETA_GATE_OFF",
      });
    }
  });

  it("keeps the existing Gate-ON execution state available", () => {
    expect(getVideoWorkspaceModelState(catalogModel("seedance_2_5_international", true))).toMatchObject({
      catalogVisible: true,
      catalogSelectable: true,
      configurationEnabled: true,
      executionEnabled: true,
      executionBlockedReason: null,
    });
  });

  it("does not turn an unavailable Xinhankr model into a selectable preview", () => {
    const existing = normalizeVideoModel({
      id: "seedance_2_0",
      provider: "xinhankr",
      available: false,
      durations: [5],
      resolutions: ["720p"],
      ratios: ["16:9"],
      credits: 23,
    });
    expect(getVideoWorkspaceModelState(existing)).toMatchObject({
      catalogSelectable: false,
      configurationEnabled: false,
      executionEnabled: false,
    });
  });

  it("uses separate Workspace selection and execution decisions with an explicit closed-state reason", () => {
    const selector = fs.readFileSync(path.join(process.cwd(), "src/components/video/ModelSelector.tsx"), "utf8");
    const workspace = fs.readFileSync(path.join(process.cwd(), "src/components/video/VideoWorkspace.tsx"), "utf8");
    expect(selector).toContain("getVideoWorkspaceModelState(model)");
    expect(selector).toContain("disabled={unavailable}");
    expect(selector).toContain("video.model.internationalPreviewOnly");
    expect(workspace).toContain('executionBlockedReason === "INTERNATIONAL_BETA_GATE_OFF"');
    expect(workspace).toMatch(/!modelUnavailable && !internationalExecutionUnavailable/);
    expect(workspace).toContain("video.model.internationalExecutionBlockedReason");
    expect(workspace).toContain("video.actions.internationalBetaDisabled");
  });
});
