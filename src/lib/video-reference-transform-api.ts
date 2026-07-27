import { apiRequest } from "@/lib/api";
import type {
  VideoReferenceTransformOperation,
  VideoReferenceTransformParams,
  VideoReferenceTransformPreview,
} from "@/types/video-reference-transform";

export async function createVideoReferenceTransformPreview(input: {
  sourceAssetId: string;
  sourceProviderMediaInputId?: string;
  prompt: string;
  params: VideoReferenceTransformParams;
}) {
  const envelope = await apiRequest<VideoReferenceTransformPreview>("/api/video/reference-transform/preview", {
    method: "POST",
    body: JSON.stringify({
      sourceAssetId: input.sourceAssetId,
      sourceProviderMediaInputId: input.sourceProviderMediaInputId || "",
      prompt: input.prompt,
      ...input.params,
    }),
  });
  if (!envelope.data?.previewId) throw new Error("Video Reference Transform Preview was not returned.");
  return envelope.data;
}

export async function confirmVideoReferenceTransform(previewId: string) {
  const envelope = await apiRequest<VideoReferenceTransformOperation>("/api/video/reference-transform/confirm", {
    method: "POST",
    body: JSON.stringify({ previewId, confirm: true }),
  });
  if (!envelope.data?.operationId) throw new Error("Video Reference Transform Operation was not returned.");
  return envelope.data;
}

export async function getVideoReferenceTransformStatus(operationId: string) {
  const envelope = await apiRequest<VideoReferenceTransformOperation>(
    `/api/video/reference-transform/status/${encodeURIComponent(operationId)}?t=${Date.now()}`,
  );
  if (!envelope.data?.operationId) throw new Error("Video Reference Transform status was not returned.");
  return envelope.data;
}

export async function getVideoReferenceTransformHistory(limit = 20) {
  const envelope = await apiRequest<{ items?: VideoReferenceTransformOperation[] }>(
    `/api/video/reference-transform/history?limit=${limit}&t=${Date.now()}`,
  );
  return Array.isArray(envelope.data?.items) ? envelope.data.items : [];
}
