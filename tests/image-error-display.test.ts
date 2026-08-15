import { describe, expect, it } from "vitest";
import { ApiError } from "@/types/api";
import { getImageGenerationErrorDisplay } from "@/lib/image/imageErrorDisplay";

describe("image error display", () => {
  it("classifies policy failures without exposing provider details", () => {
    const display = getImageGenerationErrorDisplay(new ApiError("upstream payload", { code: "CONTENT_POLICY_REJECTED", correlationId: "corr-123" }));
    expect(display.category).toBe("CONTENT_POLICY");
    expect(display.message).toContain("Correlation ID: corr-123");
    expect(display.message).not.toContain("upstream payload");
  });

  it("classifies canonical reference failures", () => {
    expect(getImageGenerationErrorDisplay(new ApiError("", { code: "REFERENCE_ASSET_NOT_READY" })).category).toBe("REFERENCE");
  });
});
