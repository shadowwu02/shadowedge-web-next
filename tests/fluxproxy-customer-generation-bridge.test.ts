import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { normalizeVideoModel } from "@/lib/video-api";
import { buildVideoGenerationRequest } from "@/lib/video/videoGenerationRequest";
import type { VideoModel } from "@/types/video";

const model = {
  id: "seedance_2_0_international",
  label: "Seedance 2.0 International",
  provider: "fluxproxy",
  providerModel: "dreamina-seedance-2-0-260128-df",
  productLine: "international",
  customerPricingStatus: "READY",
  customerExecutionEnabled: true,
  available: true,
  credits: 23,
  maxPromptLength: 10_000,
  durations: [5],
  durationDefault: 5,
  ratios: ["16:9"],
  qualities: ["480p"],
  creditRules: {
    pricingVersion: "FLUXPROXY_INTERNATIONAL_PRICING_V1_20260826",
    baseCredits: 23,
    table: { "5": { "480p": 23 } },
  },
  tupleCapabilities: [{
    duration: 5,
    resolution: "480p",
    allowedAspectRatios: ["16:9"],
    audio: { supported: false, default: false },
    pricing: {
      status: "READY",
      pricingVersion: "FLUXPROXY_INTERNATIONAL_PRICING_V1_20260826",
      currentCustomerCredits: 23,
    },
  }],
} satisfies VideoModel;

describe("FluxProxy customer generation bridge", () => {
  it("preserves the server customer-execution gate in the normalized Catalog model", () => {
    const closed = normalizeVideoModel({ ...model, customerExecutionEnabled: false, available: false });
    const open = normalizeVideoModel(model);
    expect(closed.customerExecutionEnabled).toBe(false);
    expect(closed.available).toBe(false);
    expect(open.customerExecutionEnabled).toBe(true);
  });

  it("uses the one canonical /api/video/generate bridge with stable idempotency and exact pricing", () => {
    const request = buildVideoGenerationRequest({
      prompt: "A safe International landscape",
      model,
      duration: 5,
      ratio: "16:9",
      quality: "480p",
      generateAudio: false,
      media: [],
      clientRequestId: "VIDEO_fluxproxy_customer_bridge_001",
    });
    expect(request.model).toBe("seedance_2_0_international");
    expect(request.clientRequestId).toBe("VIDEO_fluxproxy_customer_bridge_001");
    expect(request.pricingVersion).toBe("FLUXPROXY_INTERNATIONAL_PRICING_V1_20260826");
    expect(request.creditAmount).toBe(23);
    const api = fs.readFileSync(path.join(process.cwd(), "src/lib/video-api.ts"), "utf8");
    expect(api).toMatch(/apiRequest<[^]*>\("\/api\/video\/generate"/);
    expect(api).not.toMatch(/fluxproxy\.org|FLUXPROXY_API_KEY/);
  });

  it("keeps Workspace, Studio, and Remake on the same backend generation/status path", () => {
    const workspace = fs.readFileSync(path.join(process.cwd(), "src/components/video/VideoWorkspace.tsx"), "utf8");
    const studio = fs.readFileSync(path.join(process.cwd(), "src/features/studio/runtime/executors/videoGenerateExecutor.ts"), "utf8");
    const hook = fs.readFileSync(path.join(process.cwd(), "src/hooks/useVideoGeneration.ts"), "utf8");
    expect(workspace).toMatch(/internationalExecutionUnavailable/);
    expect(studio).toMatch(/generateVideo|createVideoTask/);
    expect(hook).toMatch(/createVideoTask/);
    expect(hook).toMatch(/getVideoStatus/);
    expect(workspace).not.toMatch(/fluxproxy\.org/);
    expect(studio).not.toMatch(/fluxproxy\.org/);
  });
});
