import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  normalizeRemakeShotReplacement,
  preferRemakeShotReplacement,
} from "@/lib/video/remakeShotReplacement";

function projection(status: "pending" | "processing" | "completed" | "failed", requestRef = "request-1") {
  return {
    contractVersion: "remake-shot-replacement-v1",
    original: {
      version: "v1",
      shotRef: "shot-1",
      analysisRef: "analysis-1",
      shotGroupRef: "group-1",
      shotNumber: 1,
    },
    edited: { version: "v2", draftRevision: 2 },
    generated: {
      version: "v3",
      generationRequestRef: requestRef,
      generationJobRef: `job-${requestRef}`,
      status,
      retryAttempt: requestRef === "request-1" ? 0 : 1,
      replacesGenerationRequestRef: requestRef === "request-1" ? null : "request-1",
      assetLineage: status === "completed" ? {
        assetRef: `asset-${requestRef}`,
        sourceGenerationJobRef: `job-${requestRef}`,
        generationRequestRef: requestRef,
        originalShotRef: "shot-1",
        status: "ready",
        mimeType: "video/mp4",
        url: `https://media.example.test/${requestRef}.mp4`,
      } : null,
    },
  };
}

describe("Remake single-shot replacement runtime", () => {
  it.each(["pending", "processing", "completed", "failed"] as const)("accepts the %s server state", (status) => {
    expect(normalizeRemakeShotReplacement(projection(status))?.generated.status).toBe(status);
  });

  it("fails closed when completed has no canonical asset lineage", () => {
    const invalid = projection("completed");
    invalid.generated.assetLineage = null;
    expect(normalizeRemakeShotReplacement(invalid)).toBeNull();
  });

  it("keeps a completed replacement active while a retry is pending", () => {
    const completed = normalizeRemakeShotReplacement(projection("completed"));
    const retry = normalizeRemakeShotReplacement(projection("pending", "request-2"));
    expect(preferRemakeShotReplacement(completed || undefined, retry || undefined)?.generated.generationRequestRef).toBe("request-1");
  });

  it("promotes a completed retry with its own asset lineage", () => {
    const completed = normalizeRemakeShotReplacement(projection("completed"));
    const retry = normalizeRemakeShotReplacement(projection("completed", "request-2"));
    expect(preferRemakeShotReplacement(completed || undefined, retry || undefined)?.generated.generationRequestRef).toBe("request-2");
  });

  it("renders v1/v2/v3 without full export or timeline composite controls", () => {
    const source = readFileSync(
      new URL("../src/components/video/remake/RemakeStoryboardTimeline.tsx", import.meta.url),
      "utf8",
    );
    expect(source).toContain("video.remake.timeline.originalV1");
    expect(source).toContain("video.remake.timeline.editedV2");
    expect(source).toContain("video.remake.timeline.generatedV3");
    expect(source).toContain("replacementAsset.url");
    expect(source).not.toMatch(/Full Video Export|Timeline Composite/);
  });
});
