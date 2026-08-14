import { describe, expect, it } from "vitest";
import { getReverseAnalyzeProxyReadinessFromEnv } from "@/lib/server/reverseAnalyzeProxyReadiness";
import { collectStudioCanonicalImageReferences } from "@/features/studio/runtime/executors/imageGenerateExecutor";
import { collectStudioCanonicalReferenceMedia } from "@/features/studio/runtime/executors/videoGenerateExecutor";

const ASSET_ID = "dce629ad-7df4-483c-99d9-a35f3d116f39";

function context(value: Record<string, unknown>) {
  return {
    config: {},
    inputs: { source: value },
  } as never;
}

describe("Candidate B Short Remake and Studio contracts", () => {
  it("fails Short Remake readiness closed when the server-only key is missing", () => {
    expect(getReverseAnalyzeProxyReadinessFromEnv({})).toEqual({
      ready: false,
      status: "CONFIGURATION_MISSING",
      code: "INTERNAL_SITE_KEY_MISSING",
    });
    expect(getReverseAnalyzeProxyReadinessFromEnv({ INTERNAL_VIDEO_SITE_KEY: "server-secret" }).ready).toBe(true);
  });

  it("accepts a Canonical Studio Video Asset and preserves its assetId", () => {
    const result = collectStudioCanonicalReferenceMedia(context({
      executor: "asset",
      assetType: "video",
      assetId: ASSET_ID,
      url: "https://assets.shadowedgeai.com/video.mp4",
    }));
    expect(result.invalid).toBe(false);
    expect(result.media[0].id).toBe(ASSET_ID);
    expect(result.media[0].assetId).toBe(ASSET_ID);
  });

  it("rejects URL-only and studio-reference placeholders", () => {
    const urlOnly = collectStudioCanonicalReferenceMedia(context({
      executor: "asset",
      assetType: "video",
      url: "https://assets.shadowedgeai.com/video.mp4",
    }));
    const placeholder = collectStudioCanonicalReferenceMedia(context({
      executor: "asset",
      assetType: "video",
      assetId: "studio-reference-1",
      url: "https://assets.shadowedgeai.com/video.mp4",
    }));
    expect(urlOnly.invalid).toBe(true);
    expect(placeholder.invalid).toBe(true);
    expect(urlOnly.media).toEqual([]);
  });

  it("requires Canonical UUIDs for Studio Image references", () => {
    const canonical = collectStudioCanonicalImageReferences(context({
      executor: "asset",
      assetType: "image",
      assetId: ASSET_ID,
      url: "https://assets.shadowedgeai.com/image.png",
    }));
    const legacy = collectStudioCanonicalImageReferences(context({
      executor: "asset",
      assetType: "image",
      url: "https://assets.shadowedgeai.com/image.png",
    }));
    expect(canonical).toEqual({ assetIds: [ASSET_ID], invalid: false });
    expect(legacy.invalid).toBe(true);
  });
});
