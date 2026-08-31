import { getApiBaseUrl } from "@/lib/api";
import { getStoredAuthToken } from "@/lib/auth";
import { downloadBrowserFile } from "@/lib/browserDownload";
import type { VideoTaskRecord } from "@/types/video";

const canonicalAssetIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function getVideoResultAssetId(record: VideoTaskRecord) {
  const meta = record.meta && typeof record.meta === "object" && !Array.isArray(record.meta)
    ? record.meta as Record<string, unknown>
    : {};
  return String(record.resultAssetId || meta.resultAssetId || meta.materializedAssetId || "").trim();
}

export async function downloadVideoResult(
  record: VideoTaskRecord,
  { fallbackUrl, filename }: { fallbackUrl: string; filename: string },
) {
  const assetId = getVideoResultAssetId(record);
  const token = getStoredAuthToken();
  if (canonicalAssetIdPattern.test(assetId)) {
    if (!token) throw new Error("VIDEO_DOWNLOAD_AUTH_REQUIRED");
    return downloadBrowserFile({
      filename,
      headers: { Authorization: `Bearer ${token}` },
      url: `${getApiBaseUrl().replace(/\/$/, "")}/api/assets/${encodeURIComponent(assetId)}/download`,
    });
  }
  if (!fallbackUrl) throw new Error("VIDEO_DOWNLOAD_UNAVAILABLE");
  return downloadBrowserFile({ filename, url: fallbackUrl });
}

export async function downloadCanonicalVideoAsset(assetId: string, filename: string) {
  const canonicalAssetId = String(assetId || "").trim();
  const token = getStoredAuthToken();
  if (!canonicalAssetIdPattern.test(canonicalAssetId)) throw new Error("VIDEO_DOWNLOAD_CANONICAL_ASSET_REQUIRED");
  if (!token) throw new Error("VIDEO_DOWNLOAD_AUTH_REQUIRED");
  return downloadBrowserFile({
    filename,
    headers: { Authorization: `Bearer ${token}` },
    url: `${getApiBaseUrl().replace(/\/$/, "")}/api/assets/${encodeURIComponent(canonicalAssetId)}/download`,
  });
}
