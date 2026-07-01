import { apiRequest } from "@/lib/api";
import { normalizeMediaAsset } from "@/lib/media-assets";
import type { ImageReferenceItem } from "@/types/image";
import type { UploadMediaItem, UploadMediaType } from "@/types/video";

export type MediaAssetRecord = {
  id: string;
  type: UploadMediaType;
  source?: "uploaded" | "generated" | "prompt_studio" | "imported" | string;
  status?: "ready" | "failed" | "unavailable" | "deleted" | string;
  url?: string | null;
  publicUrl?: string | null;
  filename?: string | null;
  displayName?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  width?: number | null;
  height?: number | null;
  durationSeconds?: number | null;
  createdAt?: string | null;
  lastUsedAt?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type ListMediaAssetsParams = {
  cursor?: string | null;
  limit?: number;
  search?: string;
  source?: string;
  status?: string;
  type?: UploadMediaType;
};

export type ListMediaAssetsResult = {
  assets: MediaAssetRecord[];
  nextCursor: string | null;
};

export type SaveAssetFromJobInput = {
  displayName?: string;
  kind: "image" | "video";
  outputUrl?: string;
};

export type SaveAssetFromJobResult = {
  alreadyExists: boolean;
  asset: MediaAssetRecord | null;
};

function appendParam(params: URLSearchParams, key: string, value: unknown) {
  if (value === undefined || value === null || value === "") return;
  params.set(key, String(value));
}

export async function listMediaAssets(options: ListMediaAssetsParams = {}): Promise<ListMediaAssetsResult> {
  const params = new URLSearchParams();
  appendParam(params, "cursor", options.cursor);
  appendParam(params, "limit", options.limit);
  appendParam(params, "search", options.search);
  appendParam(params, "source", options.source);
  appendParam(params, "status", options.status);
  appendParam(params, "type", options.type);

  const query = params.toString();
  const envelope = await apiRequest<ListMediaAssetsResult>(`/api/assets${query ? `?${query}` : ""}`);
  const payload = (envelope.data || envelope || {}) as Partial<ListMediaAssetsResult>;

  return {
    assets: Array.isArray(payload.assets) ? payload.assets : [],
    nextCursor: payload.nextCursor || null,
  };
}

export async function saveAssetFromJob(jobId: string, input: SaveAssetFromJobInput): Promise<SaveAssetFromJobResult> {
  const cleanJobId = String(jobId || "").trim();
  if (!cleanJobId) {
    throw new Error("Missing job id");
  }

  const envelope = await apiRequest<SaveAssetFromJobResult>(`/api/assets/from-job/${encodeURIComponent(cleanJobId)}`, {
    method: "POST",
    body: JSON.stringify({
      displayName: input.displayName,
      kind: input.kind,
      outputUrl: input.outputUrl,
    }),
  });

  const payload = (envelope.data || envelope || {}) as Partial<SaveAssetFromJobResult>;

  return {
    alreadyExists: Boolean(payload.alreadyExists),
    asset: payload.asset || null,
  };
}

export function mediaAssetToUploadMediaItem(asset: MediaAssetRecord): UploadMediaItem | null {
  const publicUrl = String(asset.publicUrl || asset.url || "").trim();
  const normalized = normalizeMediaAsset(
    {
      assetId: asset.id,
      displayName: asset.displayName,
      durationSeconds: asset.durationSeconds,
      filename: asset.filename,
      id: publicUrl,
      mimeType: asset.mimeType,
      name: asset.displayName || asset.filename || "",
      publicUrl,
      size: asset.sizeBytes,
      status: asset.status,
      type: asset.type,
      url: publicUrl,
    },
    "asset-library",
  );

  if (!normalized) return null;

  return {
    ...normalized,
    assetId: asset.id,
    source: "asset-library",
    uploadStatus: asset.status === "ready" || !asset.status ? "ready" : "failed",
    errorMessage: asset.status === "ready" || !asset.status ? "" : "Media unavailable",
  };
}

export function mediaAssetToImageReferenceItem(asset: MediaAssetRecord): ImageReferenceItem | null {
  const publicUrl = String(asset.publicUrl || asset.url || "").trim();
  if (!publicUrl || asset.type !== "image") return null;

  return {
    assetId: asset.id,
    filename: asset.filename || undefined,
    height: typeof asset.height === "number" ? asset.height : undefined,
    id: publicUrl,
    mimeType: asset.mimeType || undefined,
    name: asset.displayName || asset.filename || "Image asset",
    previewUrl: publicUrl,
    raw: {
      assetId: asset.id,
      source: asset.source,
      status: asset.status,
    },
    size: typeof asset.sizeBytes === "number" ? asset.sizeBytes : undefined,
    source: "asset-library",
    type: "image",
    uploadedAt: asset.createdAt || undefined,
    uploadStatus: asset.status === "ready" || !asset.status ? "ready" : "failed",
    url: publicUrl,
    width: typeof asset.width === "number" ? asset.width : undefined,
  };
}
