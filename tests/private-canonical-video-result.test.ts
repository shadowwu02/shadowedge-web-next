import { describe, expect, it } from "vitest";
import { mapMediaAssetToUserAsset } from "@/lib/assets-api";
import { normalizeVideoHistoryItem } from "@/lib/video-api";
import { buildVideoDraftFromVideoResult } from "@/lib/video/videoResultDrafts";
import { getVideoResultAssetId } from "@/lib/video/videoDownload";

const assetId = "44444444-4444-4444-8444-444444444444";
const playbackUrl = "https://api.shadowedge.test/api/internal/video-reference/signed";

describe("private canonical Video Result", () => {
  it("renders URL-less My Assets rows from a response-only signed preview", () => {
    const asset = mapMediaAssetToUserAsset({
      id: assetId,
      type: "video",
      source: "generated",
      status: "ready",
      publicUrl: null,
      url: null,
      previewUrl: playbackUrl,
      previewExpiresAt: "2026-08-31T20:00:00.000Z",
      privateReference: true,
    });
    expect(asset?.publicUrl).toBe(playbackUrl);
    expect(asset?.kind).toBe("video");
  });

  it("preserves canonical Asset identity through History and Result-to-Reference reuse", () => {
    const history = normalizeVideoHistoryItem({
      dbJobId: "33333333-3333-4333-8333-333333333333",
      status: "completed",
      resultAssetId: assetId,
      privateCanonicalResult: true,
      videoUrl: playbackUrl,
      outputUrls: [playbackUrl],
      meta: { materializedAssetId: assetId, privateCanonicalResult: true },
    });
    expect(getVideoResultAssetId(history)).toBe(assetId);
    const draft = buildVideoDraftFromVideoResult({ video: history });
    expect(draft?.media.assetId).toBe(assetId);
    expect(draft?.media.privateReference).toBe(true);
    expect(draft?.media.url).toBe(playbackUrl);
  });
});
