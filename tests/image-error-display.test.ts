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

  it("shows a safe network message and the client correlation ID", () => {
    const display = getImageGenerationErrorDisplay(new ApiError("Failed to fetch provider URL", {
      code: "NETWORK_REQUEST_FAILED",
      correlationId: "client-correlation-123",
      kind: "network",
    }));
    expect(display.category).toBe("NETWORK");
    expect(display.message).toContain("网络请求未能完成，请检查连接后重试。");
    expect(display.message).toContain("Correlation ID: client-correlation-123");
    expect(display.message).not.toContain("provider");
  });

  it.each([
    ["CONTENT_POLICY_REJECTED", "CONTENT_POLICY"],
    ["CUSTOMER_TENANT_MEMBERSHIP_DENIED", "TENANT"],
    ["REFERENCE_ASSET_NOT_READY", "REFERENCE"],
    ["INSUFFICIENT_CREDITS", "CREDITS"],
    ["GENERATION_CONCURRENCY_LIMIT", "CONCURRENCY"],
    ["IMAGE_MATERIALIZATION_FAILED", "MATERIALIZATION"],
    ["PROVIDER_TEMPORARILY_UNAVAILABLE", "PROVIDER"],
  ])("preserves the structured %s mapping", (code, category) => {
    expect(getImageGenerationErrorDisplay(new ApiError("safe backend failure", { code })).category).toBe(category);
  });
});
