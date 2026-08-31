import { describe, expect, it } from "vitest";
import { normalizeApiError } from "@/lib/api";

describe("API credit error classification", () => {
  it("does not classify a 403 unsafe reference as insufficient credits", () => {
    const error = normalizeApiError(403, {
      ok: false,
      code: "IMAGE_REFERENCE_ASSET_URL_UNSAFE",
      message: "Reference Image URL validation failed.",
    });
    expect(error.kind).toBe("unknown");
    expect(error.code).toBe("IMAGE_REFERENCE_ASSET_URL_UNSAFE");
  });

  it.each([
    [402, "INSUFFICIENT_CREDITS"],
    [403, "INSUFFICIENT_BALANCE"],
    [409, "CREDIT_ADMISSION_REJECTED"],
  ])("classifies genuine credit failures (%s, %s)", (status, code) => {
    expect(normalizeApiError(status, { ok: false, code, message: "Credit admission failed." }).kind).toBe("credits");
  });

  it("does not treat an unrelated insufficient error as credits", () => {
    expect(normalizeApiError(403, { ok: false, code: "INSUFFICIENT_PERMISSION", message: "Denied." }).kind).toBe("unknown");
  });
});
