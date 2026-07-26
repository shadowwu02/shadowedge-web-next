import { describe, expect, it } from "vitest";
import {
  buildBetaFeedbackInput,
  getSafeFeedbackPath,
  sanitizeBetaFeedbackText,
} from "../src/lib/beta-feedback-api";

describe("Beta feedback privacy boundary", () => {
  it("removes credentials from free-form feedback text", () => {
    const sanitized = sanitizeBetaFeedbackText(
      "Bearer abc123 token=token-value password=hunter2 secret=private-value",
    );
    expect(sanitized).not.toContain("abc123");
    expect(sanitized).not.toContain("token-value");
    expect(sanitized).not.toContain("hunter2");
    expect(sanitized).not.toContain("private-value");
    expect(sanitized).toContain("[REDACTED]");
  });

  it("keeps only a pathname and discards query parameters or fragments", () => {
    expect(getSafeFeedbackPath("/studio?token=hidden#canvas")).toBe("/studio");
    expect(getSafeFeedbackPath("https://example.com/studio?token=hidden")).toBe("/");
  });

  it("builds a bounded Bug Report context without browser credentials", () => {
    const payload = buildBetaFeedbackInput({
      category: "BUG_REPORT",
      title: "Canvas error",
      description: "The preview did not open.",
      locale: "zh",
      appVersion: "release beta/123",
      source: "/studio?project=private",
      errorReport: {
        errorType: "PAGE_ERROR",
        pageSource: "/studio?project=private",
        occurredAt: "2026-07-26T15:30:00.000Z",
        actionPath: "Dashboard > password=private > Canvas",
      },
    });

    expect(payload.source).toBe("/studio");
    expect(payload.appVersion).toBe("releasebeta123");
    expect(payload.errorReport?.pageSource).toBe("/studio");
    expect(payload.errorReport?.actionPath).not.toContain("private");
    expect(payload).not.toHaveProperty("token");
    expect(payload).not.toHaveProperty("cookie");
    expect(payload).not.toHaveProperty("password");
  });
});
