import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { mapMediaAssetToUserAsset, mediaAssetToImageReferenceItem } from "../src/lib/assets-api";
import { normalizeImageHistoryItem } from "../src/lib/image/imageHistoryUtils";

const root = path.resolve(__dirname, "..");
const resultStack = fs.readFileSync(path.join(root, "src/components/image/ImageResultStack.tsx"), "utf8");
const historyPanel = fs.readFileSync(path.join(root, "src/components/image/ImageHistoryPanel.tsx"), "utf8");
const detailPanel = fs.readFileSync(path.join(root, "src/components/image/ImageOutputDetailPanel.tsx"), "utf8");

describe("canonical private Image storage V1", () => {
  it("renders a URL-less canonical Asset through its authorized ephemeral preview", () => {
    const asset = {
      id: "33333333-3333-4333-8333-333333333333",
      type: "image" as const,
      status: "ready" as const,
      publicUrl: null,
      url: null,
      previewUrl: "https://api.shadowedge.test/api/internal/image-assets/signed",
      previewExpiresAt: "2026-08-30T20:00:00.000Z",
      privateReference: true,
    };
    const mapped = mapMediaAssetToUserAsset(asset);
    const reference = mediaAssetToImageReferenceItem(asset);
    expect(mapped?.previewUrl).toBe(asset.previewUrl);
    expect(mapped?.publicUrl).toBe(asset.previewUrl);
    expect(reference?.assetId).toBe(asset.id);
    expect(reference?.previewUrl).toBe(asset.previewUrl);
  });

  it("keeps canonical Asset ID authoritative while render URL remains ephemeral", () => {
    const item = normalizeImageHistoryItem({
      assetId: "33333333-3333-4333-8333-333333333333",
      id: "job-1",
      status: "completed",
      outputUrls: ["https://api.shadowedge.test/api/internal/image-assets/signed"],
      previewExpiresAt: "2026-08-30T20:00:00.000Z",
    });
    expect(item.assetId).toBe("33333333-3333-4333-8333-333333333333");
    expect(item.previewExpiresAt).toBe("2026-08-30T20:00:00.000Z");
  });

  it("uses canonical Asset download in every Image result surface", () => {
    for (const source of [resultStack, historyPanel, detailPanel]) {
      expect(source).toContain("downloadCanonicalImageAsset");
      expect(source).not.toContain("downloadBrowserFile");
    }
  });
});
