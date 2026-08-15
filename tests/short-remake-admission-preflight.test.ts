import { describe, expect, it, vi } from "vitest";
import {
  assertShortRemakeAdmissionReady,
  runShortRemakeAfterAdmission,
} from "@/lib/video/shortRemakeAdmission";
import { ApiError } from "@/types/api";

const ASSET_ID = "dce629ad-7df4-483c-99d9-a35f3d116f39";
const input = {
  aspectRatio: "16:9",
  characterRules: "preserve characters",
  mode: "single_clip" as const,
  sceneStyle: "preserve scene",
  sourceAssetId: ASSET_ID,
  sourceVideoUrl: "https://assets.shadowedgeai.com/video.mp4",
  targetLanguage: "en",
  targetRatio: "16:9",
  targetRegion: "US" as const,
  translateDialogue: true,
};

const admissionReady = {
  data: {
    ready: true,
    routeReached: true,
    sourceAssetId: ASSET_ID,
    tenantId: "8900dd56-1dcb-4a27-a3b3-353822f6cafd",
    providerCallMade: false,
    vlmCalled: false,
  },
};

describe("Short Remake admission-first orchestration", () => {
  it("allows the analysis request only after a verified no-provider admission", async () => {
    const events: string[] = [];
    const analyze = vi.fn(async () => ({ storyboard: { id: "storyboard", shots: [] } }));

    await runShortRemakeAfterAdmission(input, {
      preflight: async () => {
        events.push("put");
        return admissionReady;
      },
      onAdmissionReady: () => events.push("admission-ready"),
      analyze: async (request) => {
        events.push("post");
        return analyze(request);
      },
    });

    expect(events).toEqual(["put", "admission-ready", "post"]);
    expect(analyze).toHaveBeenCalledTimes(1);
  });

  it.each([
    "TENANT_MEMBERSHIP_REVIEW_REQUIRED",
    "OWNER_MISMATCH",
    "TENANT_MISMATCH",
    "ASSET_NOT_READY",
    "MIME_MISMATCH",
    "UNSAFE_URL",
    "HEAD_FAILED",
    "NETWORK",
  ])("stops before POST when preflight returns %s", async (code) => {
    const analyze = vi.fn();

    await expect(
      runShortRemakeAfterAdmission(input, {
        preflight: async () => {
          throw new ApiError("Short Remake request blocked.", { code, kind: code === "NETWORK" ? "network" : "unknown" });
        },
        analyze,
      }),
    ).rejects.toMatchObject({ code });

    expect(analyze).not.toHaveBeenCalled();
  });

  it("fails closed when the preflight response is not the required no-provider contract", async () => {
    const analyze = vi.fn();

    await expect(
      runShortRemakeAfterAdmission(input, {
        preflight: async () => ({ data: { ...admissionReady.data, vlmCalled: true } }),
        analyze,
      }),
    ).rejects.toMatchObject({ code: "SHORT_REMAKE_PREFLIGHT_CONTRACT_INVALID" });

    expect(analyze).not.toHaveBeenCalled();
  });

  it("does not POST when the source changes while the admission request is in flight", async () => {
    const analyze = vi.fn();

    await expect(
      runShortRemakeAfterAdmission(input, {
        preflight: async () => admissionReady,
        shouldContinueAfterAdmission: () => false,
        analyze,
      }),
    ).rejects.toMatchObject({ code: "SHORT_REMAKE_ANALYSIS_SUPERSEDED" });

    expect(analyze).not.toHaveBeenCalled();
  });

  it("rejects URL-only and temporary source identifiers before PUT or POST", async () => {
    const preflight = vi.fn();
    const analyze = vi.fn();

    await expect(
      runShortRemakeAfterAdmission({ ...input, sourceAssetId: "https://assets.shadowedgeai.com/video.mp4" }, { preflight, analyze }),
    ).rejects.toMatchObject({ code: "CANONICAL_ASSET_REQUIRED" });
    await expect(
      runShortRemakeAfterAdmission({ ...input, sourceAssetId: "studio-reference-1" }, { preflight, analyze }),
    ).rejects.toMatchObject({ code: "CANONICAL_ASSET_REQUIRED" });

    expect(preflight).not.toHaveBeenCalled();
    expect(analyze).not.toHaveBeenCalled();
  });

  it("requires source identity, route reachability, tenant proof, and false provider flags", () => {
    expect(() => assertShortRemakeAdmissionReady(admissionReady, ASSET_ID)).not.toThrow();
    expect(() => assertShortRemakeAdmissionReady({ data: { ...admissionReady.data, routeReached: false } }, ASSET_ID))
      .toThrow(/verification/i);
    expect(() => assertShortRemakeAdmissionReady({ data: { ...admissionReady.data, tenantId: "" } }, ASSET_ID))
      .toThrow(/verification/i);
  });
});
