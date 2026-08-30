import { mergeMediaAssets } from "@/lib/media-assets";
import { getCanonicalReferenceStatus } from "@/lib/video/canonicalReferenceAssets";
import { reconcileVideoWorkspaceMedia, type VideoWorkspaceAuthority } from "@/lib/video/videoWorkspaceAuthority";
import type { UploadedMediaResponse, UploadMediaItem } from "@/types/video";

export function createCanonicalUploadedMediaItem(
  transientItem: UploadMediaItem,
  uploaded: UploadedMediaResponse,
): UploadMediaItem {
  return {
    ...transientItem,
    assetId: uploaded.assetId,
    canonicalReferenceStatus: getCanonicalReferenceStatus({ assetId: uploaded.assetId }),
    duration: uploaded.duration || transientItem.duration,
    errorMessage: "",
    file: undefined,
    filename: uploaded.filename,
    id: uploaded.id || transientItem.id,
    mimeType: uploaded.mimeType || transientItem.mimeType,
    name: uploaded.name || transientItem.name,
    originalName: uploaded.originalName,
    privateReference: uploaded.privateReference,
    previewUrl:
      uploaded.type === "image"
        ? uploaded.previewUrl || uploaded.url || transientItem.previewUrl
        : transientItem.previewUrl || uploaded.previewUrl,
    size: uploaded.size || transientItem.size,
    source: "current_upload",
    type: uploaded.type || transientItem.type,
    uploadStatus: "ready",
    url: uploaded.url,
  };
}

export function reconcileUploadPickerMedia({
  currentMedia,
  localMedia,
  reusableMedia,
  workspaceAuthority,
}: {
  currentMedia: UploadMediaItem[];
  localMedia: UploadMediaItem[];
  reusableMedia: UploadMediaItem[];
  workspaceAuthority: VideoWorkspaceAuthority;
}) {
  const candidates = mergeMediaAssets(currentMedia, localMedia, reusableMedia);
  const authenticatedCurrentUploads = candidates.filter((item) => item.source === "current_upload");
  const storedCandidates = candidates.filter(
    (item) => item.source !== "current_upload" && item.uploadStatus === "ready",
  );
  const authorizedStoredMedia = reconcileVideoWorkspaceMedia(storedCandidates, workspaceAuthority).authorized;

  return mergeMediaAssets(authenticatedCurrentUploads, authorizedStoredMedia);
}
