import { mapMediaAssetsToUserAssets, type MediaAssetRecord } from "@/lib/assets-api";
import { isImageCompletedStatus } from "@/lib/image/imageHistoryUtils";
import { collectHistoryInputMediaAssets, normalizeMediaAssetUrl } from "@/lib/media-assets";
import {
  getSafeHistoryOutputUrl,
  getSafeHistoryThumbnailUrl,
} from "@/lib/video/historyUtils";
import { isVideoCompletedStatus } from "@/lib/utils";
import type { ImageHistoryItem } from "@/types/image";
import type { UploadedMediaResponse, VideoTaskRecord } from "@/types/video";
import type {
  StudioAssetItem,
  StudioAssetSource,
} from "@/features/studio/types/studioTypes";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function pickString(...values: unknown[]) {
  return values.find((value) => typeof value === "string" && value.trim()) as
    | string
    | undefined;
}

function assetName(value: unknown, fallback: string) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text ? text.slice(0, 160) : fallback;
}

function toIso(value: unknown) {
  const date = new Date(typeof value === "number" || typeof value === "string" ? value : 0);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function librarySource(source: string): StudioAssetSource {
  if (source === "generated" || source === "prompt_studio") return "generated";
  return "upload";
}

function isRemakeRecord(record: VideoTaskRecord) {
  const meta = asRecord(record.meta);
  return (
    meta.source === "remake" ||
    meta.remake === true ||
    meta.remake_source === "storyboard_shot" ||
    Boolean(meta.analysisId || meta.analysis_id)
  );
}

export function mapLibraryAssetsToStudioAssets(records: MediaAssetRecord[]) {
  return mapMediaAssetsToUserAssets(records)
    .filter((asset) => asset.status === "ready" && Boolean(asset.publicUrl))
    .map<StudioAssetItem>((asset) => ({
      id: asset.id,
      type: asset.kind,
      name: assetName(asset.displayName, "Media asset"),
      url: asset.publicUrl,
      thumbnail: asset.thumbnailUrl || undefined,
      source: librarySource(asset.source),
      createdAt: asset.createdAt,
      status: "ready",
      metadata: {
        filename: asset.filename,
        mimeType: asset.mimeType,
        sizeBytes: asset.sizeBytes,
        width: asset.width,
        height: asset.height,
        durationSeconds: asset.durationSeconds,
        sourceTrace: asset.sourceTrace,
        origin: "asset-library",
      },
    }));
}

export function mapImageHistoryToStudioAssets(records: ImageHistoryItem[]) {
  return records.flatMap<StudioAssetItem>((record) => {
    if (!isImageCompletedStatus(record.status)) return [];
    const urls = [...(record.outputUrls || []), record.outputUrl]
      .map(normalizeMediaAssetUrl)
      .filter((url, index, list) => Boolean(url) && list.indexOf(url) === index);
    const jobId = record.dbJobId || record.jobId || record.id;

    return urls.map((url, index) => ({
      id: "image-history:" + jobId + ":" + index,
      type: "image",
      name: assetName(record.prompt, "Generated image"),
      url,
      thumbnail: url,
      source: "history",
      createdAt: toIso(record.createdAt),
      status: "ready",
      metadata: {
        jobId,
        model: record.model,
        outputIndex: index,
        origin: "image-history",
      },
    }));
  });
}

export function mapVideoHistoryToStudioAssets(records: VideoTaskRecord[]) {
  return records.flatMap<StudioAssetItem>((record, recordIndex) => {
    const remake = isRemakeRecord(record);
    const source: StudioAssetSource = remake ? "remake" : "history";
    const jobId = record.dbJobId || record.jobId || record.providerJobId || "video-" + recordIndex;
    const createdAt = toIso(record.createdAt);
    const result: StudioAssetItem[] = [];

    if (isVideoCompletedStatus(String(record.status || ""))) {
      const outputUrls = [
        ...(record.outputUrls || []),
        getSafeHistoryOutputUrl(record),
      ]
        .map(normalizeMediaAssetUrl)
        .filter((url, index, list) => Boolean(url) && list.indexOf(url) === index);

      outputUrls.forEach((url, index) => {
        result.push({
          id: (remake ? "remake" : "video-history") + ":" + jobId + ":" + index,
          type: "video",
          name: assetName(record.prompt, remake ? "Remake result" : "Generated video"),
          url,
          thumbnail: getSafeHistoryThumbnailUrl(record) || undefined,
          source,
          createdAt,
          status: "ready",
          metadata: {
            jobId,
            model: pickString(record.model, record.frontendModel, record.providerModel),
            outputIndex: index,
            origin: remake ? "remake-history" : "video-history",
          },
        });
      });
    }

    collectHistoryInputMediaAssets([record]).forEach((asset, index) => {
      const url = normalizeMediaAssetUrl(asset.url || "");
      if (!url) return;
      result.push({
        id: (remake ? "remake-input" : "history-input") + ":" + jobId + ":" + index,
        type: asset.type,
        name: assetName(asset.name, remake ? "Remake reference" : "History reference"),
        url,
        thumbnail: asset.previewUrl || (asset.type === "image" ? url : undefined),
        source,
        createdAt,
        status: "ready",
        metadata: {
          jobId,
          role: asset.role,
          origin: remake ? "remake-history-input" : "video-history-input",
        },
      });
    });

    return result;
  });
}

export function mapUploadedMediaToStudioAsset(upload: UploadedMediaResponse): StudioAssetItem {
  return {
    id: upload.assetId || upload.id,
    type: upload.type,
    name: assetName(upload.originalName || upload.name, "Uploaded media"),
    url: normalizeMediaAssetUrl(upload.url),
    thumbnail: upload.previewUrl || (upload.type === "image" ? upload.url : undefined),
    source: "upload",
    createdAt: new Date().toISOString(),
    status: "ready",
    metadata: {
      assetId: upload.assetId,
      filename: upload.filename,
      mimeType: upload.mimeType,
      sizeBytes: upload.size,
      durationSeconds: upload.duration,
      origin: "studio-upload",
    },
  };
}

export function mergeStudioAssets(...groups: StudioAssetItem[][]) {
  const seenIds = new Set<string>();
  const seenUrls = new Set<string>();
  const result: StudioAssetItem[] = [];

  groups.flat().forEach((asset) => {
    const url = normalizeMediaAssetUrl(asset.url);
    if (!asset.id || !url || seenIds.has(asset.id) || seenUrls.has(url)) return;
    seenIds.add(asset.id);
    seenUrls.add(url);
    result.push({ ...asset, url });
  });

  return result.sort((left, right) => {
    const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
    const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
    return rightTime - leftTime;
  });
}
