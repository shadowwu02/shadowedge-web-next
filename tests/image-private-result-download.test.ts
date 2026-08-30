import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { downloadCanonicalImageAsset } from "../src/lib/image/imageDownload";
import { normalizeImageHistoryItem } from "../src/lib/image/imageHistoryUtils";

const ASSET = "11111111-1111-4111-8111-111111111111";

describe("private canonical Image result download", () => {
  it("uses canonical Asset ID and authenticated API transport", async () => {
    const downloadFile = vi.fn(async () => undefined);
    await downloadCanonicalImageAsset({
      apiBaseUrl: "https://api.shadowedgeai.com",
      assetId: ASSET,
      downloadFile,
      filename: "shadowedge-image-safe.png",
      token: "test-session-token",
    });
    expect(downloadFile).toHaveBeenCalledOnce();
    expect(downloadFile).toHaveBeenCalledWith({
      filename: "shadowedge-image-safe.png",
      headers: { Authorization: "Bearer test-session-token" },
      url: `https://api.shadowedgeai.com/api/assets/${ASSET}/download`,
    });
  });

  it("fails closed for legacy URL-only history without guessing an Asset", async () => {
    const downloadFile = vi.fn(async () => undefined);
    await expect(downloadCanonicalImageAsset({
      apiBaseUrl: "https://api.shadowedgeai.com",
      assetId: "",
      downloadFile,
      filename: "legacy.png",
      token: "test-session-token",
    })).rejects.toThrow("IMAGE_DOWNLOAD_CANONICAL_ASSET_REQUIRED");
    expect(downloadFile).not.toHaveBeenCalled();
  });

  it("preserves the canonical download identity from History normalization", () => {
    const item = normalizeImageHistoryItem({
      id: "job-1",
      status: "completed",
      assetId: ASSET,
      outputUrls: ["https://assets.shadowedgeai.com/render-only.png"],
    });
    expect(item.assetId).toBe(ASSET);
    expect(item.outputUrls).toEqual(["https://assets.shadowedgeai.com/render-only.png"]);
  });

  it("binds every Image Workspace Download button to the canonical helper", () => {
    const root = path.join(__dirname, "..", "src", "components", "image");
    for (const file of ["ImageResultStack.tsx", "ImageHistoryPanel.tsx", "ImageOutputDetailPanel.tsx"]) {
      const source = fs.readFileSync(path.join(root, file), "utf8");
      expect(source).toContain("downloadCanonicalImageAsset");
      expect(source).not.toContain("downloadBrowserFile");
      expect(source).toContain("assetId");
      expect(source).toContain("downloadUnavailable");
    }
  });
});
