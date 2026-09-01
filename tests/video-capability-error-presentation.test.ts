import { describe, expect, it } from "vitest";

import { getVideoCapabilityCustomerErrorMessage } from "@/lib/video/videoErrorDisplay";
import { ApiError } from "@/types/api";

const copy: Record<string, string> = {
  "video.capability.error.unverified": "This option combination is awaiting compatibility certification.",
  "video.capability.error.unsupported": "This option combination is not available for the selected model.",
};
const t = (key: keyof typeof copy) => copy[key];

describe("video capability error presentation", () => {
  it.each([
    "VIDEO_CAPABILITY_COMBINATION_UNVERIFIED",
    "XINHANKR_ARTSDANCE_IMAGE_GENERATE_AUDIO_UNVERIFIED",
    "XINHANKR_ARTSDANCE_VIDEO_GENERATE_AUDIO_UNVERIFIED",
  ])("presents %s as unverified without exposing the internal code", (code) => {
    const value = getVideoCapabilityCustomerErrorMessage(new ApiError(code, { code }), t as never);
    expect(value).toContain("awaiting compatibility certification");
    expect(value).not.toContain(code);
    expect(value).not.toMatch(/provider|Xinhankr|ArtsDance/i);
  });

  it("keeps unsupported distinct from unverified", () => {
    const unverified = getVideoCapabilityCustomerErrorMessage(
      new ApiError("unverified", { code: "VIDEO_CAPABILITY_COMBINATION_UNVERIFIED" }),
      t as never,
    );
    const unsupported = getVideoCapabilityCustomerErrorMessage(
      new ApiError("unsupported", { code: "VIDEO_CAPABILITY_COMBINATION_UNSUPPORTED" }),
      t as never,
    );
    expect(unverified).not.toBe(unsupported);
    expect(unsupported).toContain("not available");
  });

  it("does not swallow unrelated validation errors", () => {
    expect(getVideoCapabilityCustomerErrorMessage(
      new ApiError("other", { code: "VIDEO_DURATION_UNSUPPORTED" }),
      t as never,
    )).toBe("");
  });
});
