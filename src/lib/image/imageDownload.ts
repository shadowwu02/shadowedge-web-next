import { getApiBaseUrl } from "@/lib/api";
import { getStoredAuthToken } from "@/lib/auth";
import { downloadBrowserFile } from "@/lib/browserDownload";

const canonicalAssetIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type CanonicalImageDownloadOptions = {
  apiBaseUrl?: string;
  assetId?: string;
  downloadFile?: typeof downloadBrowserFile;
  filename: string;
  token?: string;
};

export async function downloadCanonicalImageAsset({
  apiBaseUrl = getApiBaseUrl(),
  assetId,
  downloadFile = downloadBrowserFile,
  filename,
  token = getStoredAuthToken(),
}: CanonicalImageDownloadOptions) {
  const canonicalAssetId = String(assetId || "").trim();
  if (!canonicalAssetIdPattern.test(canonicalAssetId)) throw new Error("IMAGE_DOWNLOAD_CANONICAL_ASSET_REQUIRED");
  if (!token) throw new Error("IMAGE_DOWNLOAD_AUTH_REQUIRED");

  await downloadFile({
    filename,
    headers: { Authorization: `Bearer ${token}` },
    url: `${apiBaseUrl.replace(/\/$/, "")}/api/assets/${encodeURIComponent(canonicalAssetId)}/download`,
  });
}
