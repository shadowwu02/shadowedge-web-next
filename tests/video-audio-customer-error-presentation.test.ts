import { describe, expect, it } from "vitest";

import { getAudioReferenceCustomerErrorMessage } from "@/lib/video/videoErrorDisplay";
import { ApiError } from "@/types/api";

const copy: Record<string, string> = {
  "video.audioReference.error.reupload": "This audio asset cannot be used for generation yet.",
  "video.audioReference.error.notReady": "This audio asset is still being prepared.",
  "video.audioReference.error.access": "This audio asset is not available in the current workspace.",
  "video.audioReference.error.unsupportedFormat": "Audio references currently require a WAV file.",
  "video.audioReference.error.probeFailed": "This audio file could not be verified.",
  "video.audioReference.error.unsupportedCombination": "This reference combination is not supported.",
};
const t = (key: keyof typeof copy) => copy[key];

describe("audio reference customer error presentation", () => {
  it.each([
    ["AUDIO_REFERENCE_ASSET_NOT_CANONICAL", "cannot be used"],
    ["AUDIO_REFERENCE_NOT_READY", "prepared"],
    ["AUDIO_REFERENCE_OWNER_MISMATCH", "workspace"],
    ["AUDIO_REFERENCE_TENANT_MISMATCH", "workspace"],
    ["AUDIO_REFERENCE_UNSUPPORTED_FORMAT", "WAV"],
    ["AUDIO_REFERENCE_FORMAT_UNSUPPORTED", "WAV"],
    ["AUDIO_REFERENCE_PROBE_FAILED", "verified"],
    ["VIDEO_AUDIO_REFERENCE_REUPLOAD_REQUIRED", "cannot be used"],
    ["VIDEO_AUDIO_REFERENCE_NOT_READY", "prepared"],
    ["VIDEO_AUDIO_REFERENCE_ACCESS_DENIED", "workspace"],
    ["VIDEO_AUDIO_REFERENCE_UNSUPPORTED_FORMAT", "WAV"],
    ["VIDEO_AUDIO_REFERENCE_VERIFICATION_FAILED", "verified"],
    ["XINHANKR_ARTSDANCE_AUDIO_REFERENCE_COMBINATION_UNVERIFIED", "combination"],
  ])("maps %s without exposing the raw code", (code, expected) => {
    const value = getAudioReferenceCustomerErrorMessage(new ApiError(code, { code }), t as never);
    expect(value).toContain(expected);
    expect(value).not.toContain(code);
  });

  it("does not swallow unrelated internal classification", () => {
    expect(getAudioReferenceCustomerErrorMessage(new ApiError("other", { code: "OTHER" }), t as never)).toBe("");
  });
});
