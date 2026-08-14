import { describe, expect, it } from "vitest";

import { normalizeMediaAsset } from "@/lib/media-assets";
import { sanitizeVideoDraftMedia } from "@/lib/video/videoDraft";
import { getVideoModelRule } from "@/lib/video/videoModelRules";
import { validateReferenceSelectionForRule } from "@/lib/video/videoReferenceRules";
import { LEGACY_REFERENCE_REUPLOAD_REQUIRED } from "@/lib/video/canonicalReferenceAssets";
import type { UploadMediaItem } from "@/types/video";

const canonicalId = "10000000-0000-4000-8000-000000000001";
const url = "https://assets.shadowedgeai.com/reference.png";

function item(assetId?: string): UploadMediaItem {
  return {
    id: url,
    assetId,
    type: "image",
    name: "Reference image",
    url,
    uploadStatus: "ready",
  };
}

describe("canonical-only Reference contract", () => {
  it("marks URL-only local cache entries as legacy without silently deleting them", () => {
    const restored = normalizeMediaAsset({ id: url, url, type: "image", status: "ready" }, "uploads");
    expect(restored).toMatchObject({
      id: url,
      canonicalReferenceStatus: LEGACY_REFERENCE_REUPLOAD_REQUIRED,
      uploadStatus: "ready",
    });
  });

  it("keeps canonical Draft references enabled", () => {
    const rule = getVideoModelRule("seedance_2_0");
    const restored = sanitizeVideoDraftMedia([item(canonicalId)]);
    expect(restored[0].canonicalReferenceStatus).toBe("CANONICAL");
    expect(validateReferenceSelectionForRule(rule, [], restored)).toBe("");
  });

  it("disables a URL-only Draft and an otherwise-canonical Mixed Draft containing one legacy item", () => {
    const rule = getVideoModelRule("seedance_2_0");
    const legacy = sanitizeVideoDraftMedia([item()]);
    const mixed = sanitizeVideoDraftMedia([
      item(canonicalId),
      { ...item(), id: "https://assets.shadowedgeai.com/legacy-video.mp4", url: "https://assets.shadowedgeai.com/legacy-video.mp4", type: "video", name: "Legacy video" },
    ]);
    expect(legacy[0].canonicalReferenceStatus).toBe(LEGACY_REFERENCE_REUPLOAD_REQUIRED);
    expect(validateReferenceSelectionForRule(rule, [], legacy)).toBe(LEGACY_REFERENCE_REUPLOAD_REQUIRED);
    expect(validateReferenceSelectionForRule(rule, [], mixed)).toBe(LEGACY_REFERENCE_REUPLOAD_REQUIRED);
  });
});
