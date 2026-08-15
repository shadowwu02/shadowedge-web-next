import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { getReverseAnalyzeProxyReadinessFromEnv } from "@/lib/server/reverseAnalyzeProxyReadiness";
import { classifyReverseAnalyzeBackendError } from "@/lib/server/reverseAnalyzeProxyContract";
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
      code: "PROXY_CONFIGURATION_MISSING",
    });
    expect(getReverseAnalyzeProxyReadinessFromEnv({ INTERNAL_VIDEO_SITE_KEY: "server-secret" }).ready).toBe(true);
  });

  it("classifies proxy, membership, Canonical Asset, admission, and Provider failures", () => {
    expect(classifyReverseAnalyzeBackendError({ code: "TENANT_MEMBERSHIP_REVIEW_REQUIRED" }, 403))
      .toBe("TENANT_MEMBERSHIP_REVIEW_REQUIRED");
    expect(classifyReverseAnalyzeBackendError({ code: "CANONICAL_ASSET_REQUIRED" }, 400))
      .toBe("CANONICAL_ASSET_REQUIRED");
    expect(classifyReverseAnalyzeBackendError({ code: "INVALID_INTERNAL_SITE_KEY" }, 403))
      .toBe("BACKEND_ADMISSION_DENIED");
    expect(classifyReverseAnalyzeBackendError({ code: "VLM_FAILED" }, 502))
      .toBe("PROVIDER_FAILURE");
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

  it("preserves the Canonical sourceAssetId in Workspace and Studio Short Remake", () => {
    const workspace = fs.readFileSync(path.join(process.cwd(), "src/components/video/VideoWorkspace.tsx"), "utf8");
    const studio = fs.readFileSync(
      path.join(process.cwd(), "src/features/studio/runtime/executors/remakeAnalysisExecutor.ts"),
      "utf8",
    );
    expect(workspace).toContain("sourceAssetId: sourceVideoForAnalyze?.assetId");
    expect(workspace).toContain("runShortRemakeAfterAdmission(request");
    expect(studio).toContain("sourceAssetId,");
    expect(studio).toContain("runShortRemakeAfterAdmission(request");
    expect(studio).toContain("CANONICAL_ASSET_REQUIRED");
  });
});
