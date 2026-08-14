import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { normalizeApiError } from "../src/lib/api";

const root = process.cwd();

describe("Legacy membership review-required UX", () => {
  it("classifies membership review separately from credits", () => {
    const error = normalizeApiError(403, {
      ok: false,
      code: "TENANT_MEMBERSHIP_REVIEW_REQUIRED",
      message: "Account ownership is not yet assigned. Please contact an administrator.",
    });

    expect(error.kind).toBe("membership");
    expect(error.code).toBe("TENANT_MEMBERSHIP_REVIEW_REQUIRED");
    expect(error.message).toContain("contact an administrator");
  });

  it("disables Video generation while preserving a signed-in restricted session", () => {
    const source = fs.readFileSync(path.join(root, "src/components/video/VideoWorkspace.tsx"), "utf8");
    expect(source).toContain('profile?.tenantMembershipStatus === "REVIEW_REQUIRED"');
    expect(source).toMatch(/canGenerate[\s\S]*!tenantMembershipReviewRequired/);
    expect(source).toContain('t("account.tenantMembershipReviewRequired")');
  });

  it("ships clear English and Chinese messages", () => {
    const dictionary = fs.readFileSync(path.join(root, "src/i18n/dictionary.ts"), "utf8");
    expect(dictionary).toContain("Account ownership has not been completed. Please contact an administrator.");
    expect(dictionary).toContain("账号归属尚未完成，请联系管理员。");
  });
});
