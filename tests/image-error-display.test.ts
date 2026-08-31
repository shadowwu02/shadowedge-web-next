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

  it("keeps a structured reference-capability rejection and correlation receipt customer-safe", () => {
    const display = getImageGenerationErrorDisplay(new ApiError("internal provider payload", {
      code: "IMAGE_REFERENCES_UNSUPPORTED",
      correlationId: "56dd4f1a-4d2c-4cdc-aee7-9faf94a14a98",
    }));
    expect(display.category).toBe("REFERENCE");
    expect(display.message).toContain("当前模型暂不支持此参考图请求。");
    expect(display.message).not.toContain("IMAGE_REFERENCES_UNSUPPORTED");
    expect(display.message).toContain("Correlation ID: 56dd4f1a-4d2c-4cdc-aee7-9faf94a14a98");
    expect(display.message).not.toContain("internal provider payload");
  });

  it("productizes unsafe reference failures without exposing the internal code", () => {
    const display = getImageGenerationErrorDisplay(new ApiError("Reference Image URL validation failed.", {
      code: "IMAGE_REFERENCE_ASSET_URL_UNSAFE",
      kind: "unknown",
    }));
    expect(display.category).toBe("REFERENCE");
    expect(display.message).toBe("参考图片不可用，请重新选择或重新上传图片。");
    expect(display.message).not.toContain("IMAGE_REFERENCE_ASSET_URL_UNSAFE");
    expect(display.message).not.toContain("积分不足");
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
