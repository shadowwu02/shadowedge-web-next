import type { UserAsset } from "@/lib/assets-api";
import type { ImageUpscaleSource } from "@/types/image-upscale";

const storageKey = "shadowedge:image-upscale-source:v1";

export function saveImageUpscaleAssetHandoff(asset: UserAsset) {
  if (typeof window === "undefined" || asset.kind !== "image" || asset.status !== "ready" || !asset.publicUrl) return false;
  const source: ImageUpscaleSource = {
    sourceAssetId: asset.id,
    sourceJobId: asset.sourceTrace.jobId || null,
    url: asset.publicUrl,
    displayName: asset.displayName,
    width: asset.width,
    height: asset.height,
  };
  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify(source));
    return true;
  } catch {
    return false;
  }
}

export function consumeImageUpscaleAssetHandoff(): ImageUpscaleSource | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(storageKey);
    window.sessionStorage.removeItem(storageKey);
    if (!raw) return null;
    const source = JSON.parse(raw) as ImageUpscaleSource;
    return source.sourceAssetId && /^https?:\/\//i.test(source.url) ? source : null;
  } catch {
    return null;
  }
}
