import { describe, expect, it } from "vitest";

import { getVideoProviderCustomerErrorMessage } from "@/lib/video/videoErrorDisplay";
import { ApiError } from "@/types/api";

const copy: Record<string, string> = {
  "video.errorDisplay.material.title": "Media could not be processed",
  "video.errorDisplay.material.message": "The generated result could not be verified.",
  "video.errorDisplay.material.suggestion": "Replace the media.",
  "video.errorDisplay.parameter.title": "Settings are not supported",
  "video.errorDisplay.parameter.message": "Settings are not supported.",
  "video.errorDisplay.parameter.suggestion": "Adjust settings.",
  "video.errorDisplay.policy.title": "Content could not be generated",
  "video.errorDisplay.policy.message": "This request could not be processed due to content policy checks.",
  "video.errorDisplay.policy.suggestion": "Adjust the prompt or reference media.",
  "video.errorDisplay.temporary.title": "Generation service is temporarily unavailable",
  "video.errorDisplay.temporary.message": "The generation service is temporarily unavailable.",
  "video.errorDisplay.temporary.suggestion": "Try again later.",
  "video.errorDisplay.notFound.title": "Task status could not be found",
  "video.errorDisplay.notFound.message": "Task status could not be found.",
  "video.errorDisplay.notFound.suggestion": "Check History.",
  "video.errorDisplay.unknown.title": "Generation failed",
  "video.errorDisplay.unknown.message": "This request could not be processed.",
  "video.errorDisplay.unknown.suggestion": "Adjust the request.",
};
const t = (key: keyof typeof copy) => copy[key];

function apiError(code: string, publicMessage = "") {
  return new ApiError(`${code}: ArtsDance Provider rejected the request.`, {
    code,
    payload: publicMessage ? { public_message: publicMessage } : {},
  });
}

describe("video provider error presentation", () => {
  it.each([
    ["XINHANKR_ARTSDANCE_PROVIDER_REJECTED", "This request could not be processed."],
    ["VIDEO_REQUEST_NOT_PROCESSED", "This request could not be processed."],
    ["POLICY_OR_COPYRIGHT", "content policy checks"],
    ["VIDEO_CONTENT_POLICY_REJECTED", "content policy checks"],
    ["VIDEO_CONTENT_REVIEW_FAILED", "content policy checks"],
    ["PROVIDER_TEMPORARY", "temporarily unavailable"],
    ["AUTH", "temporarily unavailable"],
    ["ENTITLEMENT", "temporarily unavailable"],
    ["RESULT_INVALID", "could not be verified"],
    ["TIMEOUT_UNKNOWN", "temporarily unavailable"],
  ])("maps %s to product copy", (code, expected) => {
    const message = getVideoProviderCustomerErrorMessage(apiError(code), t as never);
    expect(message).toContain(expected);
    expect(message).not.toContain(code);
    expect(message).not.toMatch(/Xinhankr|ArtsDance|provider/i);
  });

  it("uses a safe backend public message but rejects internal provider text", () => {
    expect(getVideoProviderCustomerErrorMessage(
      apiError("VIDEO_CONTENT_POLICY_REJECTED", "Please adjust the prompt or reference media."),
      t as never,
    )).toBe("Please adjust the prompt or reference media.");

    expect(getVideoProviderCustomerErrorMessage(
      apiError("VIDEO_CONTENT_POLICY_REJECTED", "ArtsDance provider code 400"),
      t as never,
    )).toContain("content policy checks");
  });

  it("does not swallow unrelated validation errors", () => {
    expect(getVideoProviderCustomerErrorMessage(apiError("VIDEO_DURATION_UNSUPPORTED"), t as never)).toBe("");
  });
});
