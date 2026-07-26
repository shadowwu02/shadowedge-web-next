import { apiRequest } from "@/lib/api";
import type { ImageUpscaleJob, ImageUpscalePreview, ImageUpscaleSource } from "@/types/image-upscale";

export async function createImageUpscalePreview(source: ImageUpscaleSource, scale: 2 | 4) {
  const envelope = await apiRequest<ImageUpscalePreview>("/api/image/upscale/preview", {
    method: "POST",
    body: JSON.stringify({
      sourceAssetId: source.sourceAssetId,
      sourceJobId: source.sourceJobId,
      sourceUrl: source.url,
      width: source.width,
      height: source.height,
      scale,
    }),
  });
  if (!envelope.data?.previewId) throw new Error("Image Upscale Preview was not returned.");
  return envelope.data;
}

export async function confirmImageUpscale(previewId: string) {
  const envelope = await apiRequest<ImageUpscaleJob>("/api/image/upscale/confirm", {
    method: "POST",
    body: JSON.stringify({ previewId, confirm: true }),
  });
  if (!envelope.data?.operationId) throw new Error("Image Upscale Job was not returned.");
  return envelope.data;
}

export async function getImageUpscaleStatus(operationId: string) {
  const envelope = await apiRequest<ImageUpscaleJob>(`/api/image/upscale/status/${encodeURIComponent(operationId)}?t=${Date.now()}`);
  if (!envelope.data?.operationId) throw new Error("Image Upscale status was not returned.");
  return envelope.data;
}

export async function getImageUpscaleHistory(limit = 50) {
  const envelope = await apiRequest<{ items?: ImageUpscaleJob[] }>(`/api/image/upscale/history?limit=${limit}&t=${Date.now()}`);
  return Array.isArray(envelope.data?.items) ? envelope.data.items : [];
}
