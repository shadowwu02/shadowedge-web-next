import { describe, expect, it } from "vitest";

import { classifyLongVideoAnalysisError } from "@/hooks/useLongVideoRemakeAnalysis";
import { normalizeLongAnalysisJob } from "@/lib/video-api";

describe("failed Real VLM status mapping", () => {
  it("keeps failed real_vlm provenance and never synthesizes a mock storyboard", () => {
    const job = normalizeLongAnalysisJob({
      analysisEngine: "real_vlm",
      canonicalResult: null,
      errorCode: "REAL_VLM_RESULT_REVIEW_REQUIRED",
      errorMessage: "The provider response failed semantic quality validation and requires review.",
      job: {
        analysisJobId: "8cb406a6-2978-430f-a6a6-8c08c22d994c",
        metadata: {
          analysisEngine: "real_vlm",
          mock: false,
          provider: "real_vlm",
          providerCallMade: true,
          reviewRequired: true,
          schemaValid: false,
          vlmCalled: true,
        },
        result: null,
        stage: "failed",
        status: "failed",
      },
      providerCallMade: true,
      result: null,
      reviewRequired: true,
      schemaValid: false,
      stage: "failed",
      status: "failed",
      vlmCalled: true,
    });

    expect(job.status).toBe("failed");
    expect(job.canonicalResult).toBeNull();
    expect(job.result).toBeNull();
    expect(job.metadata).toMatchObject({
      analysisEngine: "real_vlm",
      providerCallMade: true,
      reviewRequired: true,
      schemaValid: false,
      vlmCalled: true,
    });
  });

  it("maps quality review failure to explicit user-facing copy", () => {
    expect(classifyLongVideoAnalysisError(new Error(
      "REAL_VLM_RESULT_REVIEW_REQUIRED The provider response failed semantic quality validation",
    ))).toBe("quality_review_required");
  });
});
