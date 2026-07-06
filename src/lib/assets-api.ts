import { apiRequest } from "@/lib/api";
import { normalizeMediaAsset, normalizeMediaAssetUrl } from "@/lib/media-assets";
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

export type AssetKind = UploadMediaType;
export type AssetSource = "generated" | "imported" | "prompt_studio" | "unknown" | "uploaded";
export type AssetStatus = "deleted" | "failed" | "ready" | "unavailable" | "unknown";

export type AssetSourceTrace = {
  jobId?: string;
  model?: string;
  outputType?: string;
  originalName?: string;
  promptSummary?: string;
  provider?: string;
  providerJobId?: string;
  uploadType?: string;
};

export type UserAsset = {
  createdAt?: string;
  displayName: string;
  durationSeconds?: number;
  filename?: string;
  height?: number;
  id: string;
  kind: AssetKind;
  mimeType?: string;
  previewUrl: string;
  publicUrl: string;
  sizeBytes?: number;
  source: AssetSource;
  sourceTrace: AssetSourceTrace;
  status: AssetStatus;
  thumbnailUrl: string;
  width?: number;
};

function appendParam(params: URLSearchParams, key: string, value: unknown) {
  if (value === undefined || value === null || value === "") return;
  params.set(key, String(value));
}

function pickString(...values: unknown[]) {
  return values.find((value) => typeof value === "string" && value.trim()) as string | undefined;
}

function pickPositiveNumber(...values: unknown[]) {
  return values.map((value) => Number(value)).find((value) => Number.isFinite(value) && value > 0) || undefined;
}

function asMetadata(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function normalizeAssetKind(value: unknown): AssetKind | null {
  const raw = String(value || "").toLowerCase();
  if (raw === "image" || raw === "video" || raw === "audio") return raw;
  return null;
}

function normalizeAssetSource(value: unknown): AssetSource {
  const raw = String(value || "").toLowerCase();
  if (raw === "uploaded" || raw === "generated" || raw === "prompt_studio" || raw === "imported") return raw;
  return "unknown";
}

function normalizeAssetStatus(value: unknown): AssetStatus {
  const raw = String(value || "").toLowerCase();
  if (raw === "ready" || raw === "failed" || raw === "unavailable" || raw === "deleted") return raw;
  return "unknown";
}

function getSafeSourceTrace(metadata: Record<string, unknown>, asset: MediaAssetRecord): AssetSourceTrace {
  return {
    jobId: pickString(metadata.jobId, metadata.job_id),
    model: pickString(metadata.model),
    originalName: pickString(metadata.originalName, metadata.original_name, asset.filename),
    outputType: pickString(metadata.outputType, metadata.output_type),
    promptSummary: pickString(metadata.promptSummary, metadata.prompt_summary),
    provider: pickString(metadata.provider),
    providerJobId: pickString(metadata.providerJobId, metadata.provider_job_id),
    uploadType: pickString(metadata.uploadType, metadata.upload_type),
  };
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

export function mapMediaAssetToUserAsset(asset: MediaAssetRecord): UserAsset | null {
  const publicUrl = normalizeMediaAssetUrl(
    pickString(asset.publicUrl, asset.url) || "",
  );
  const kind = normalizeAssetKind(asset.type);
  if (!asset.id || !kind) return null;

  const metadata = asMetadata(asset.metadata);
  const displayName =
    pickString(asset.displayName, asset.filename, getSafeSourceTrace(metadata, asset).originalName) ||
    `${kind[0].toUpperCase()}${kind.slice(1)} asset`;
  const previewUrl = kind === "image" ? publicUrl : "";

  return {
    createdAt: asset.createdAt || undefined,
    displayName,
    durationSeconds: pickPositiveNumber(asset.durationSeconds, metadata.durationSeconds, metadata.duration_seconds),
    filename: asset.filename || undefined,
    height: pickPositiveNumber(asset.height, metadata.height),
    id: asset.id,
    kind,
    mimeType: asset.mimeType || undefined,
    previewUrl,
    publicUrl,
    sizeBytes: pickPositiveNumber(asset.sizeBytes),
    source: normalizeAssetSource(asset.source),
    sourceTrace: getSafeSourceTrace(metadata, asset),
    status: normalizeAssetStatus(asset.status),
    thumbnailUrl: previewUrl,
    width: pickPositiveNumber(asset.width, metadata.width),
  };
}

export function mapMediaAssetsToUserAssets(assets: MediaAssetRecord[]): UserAsset[] {
  return assets.map(mapMediaAssetToUserAsset).filter((asset): asset is UserAsset => Boolean(asset));
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
