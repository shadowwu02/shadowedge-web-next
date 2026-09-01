"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { MediaPickerDrawer } from "@/components/video/MediaPickerDrawer";
import {
  appendLocalMediaAssets,
  collectCurrentMediaAssets,
  collectLocalMediaAssets,
  collectReferenceMediaAssets,
  getMediaUploadErrorDisplayKeys,
  mergeMediaAssets,
  removeLocalMediaAsset,
} from "@/lib/media-assets";
import { getAudioDuration } from "@/lib/media-duration";
import {
  filterFilesByUploadTypeLimits,
  getFileTypeFromFile,
  isRemoteMediaUrl,
  isTransientMediaUrl,
  validateFilesForSlot,
  validateSelectedMediaForSlot,
} from "@/lib/upload-rules";
import {
  validateReferenceSelectionForRule,
} from "@/lib/video/videoReferenceRules";
import { getMediaLibraryUploadAccept, validateAudioUploadFile } from "@/lib/video/audioUploadContract";
import { uploadMedia } from "@/lib/video-api";
import { createCanonicalUploadedMediaItem } from "@/lib/video/videoAudioUploadPersistence";
import { refreshPrivateMediaAssetPreview } from "@/lib/assets-api";
import {
  applyCurrentPrivateReferencePresentation,
  mergeSelectedReferenceMedia,
  resolveCurrentReferenceProjections,
} from "@/lib/video/videoReferenceSelection";
import type { UploadMediaItem } from "@/types/video";
import type { VideoModelRule } from "@/lib/video/videoModelRules";
import { useI18n } from "@/i18n/useI18n";
import type { VideoWorkspaceAuthority } from "@/lib/video/videoWorkspaceAuthority";

const uploadSlot = "media";
const maxFileSizeBytes = 250 * 1024 * 1024;

function createLocalMediaItem(file: File, index: number, duration = 0, errorMessage = ""): UploadMediaItem {
  return {
    id: `${file.name}-${file.lastModified}-${index}-${crypto.randomUUID?.() || Date.now()}`,
    type: getFileTypeFromFile(file, uploadSlot),
    file,
    name: file.name,
    size: file.size,
    mimeType: file.type,
    duration: duration || undefined,
    previewUrl: URL.createObjectURL(file),
    source: "current_upload",
    uploadStatus: errorMessage ? "failed" : "uploading",
    errorMessage,
  };
}

function validateFileSize(file: File, maximum: number, message: string) {
  if (file.size > maximum) {
    return message;
  }

  return "";
}

export function UploadBox({
  generateAudio = false,
  media,
  modelRule,
  onBusyChange,
  onChange,
  onReferencesBound,
  referenceBindingProfileId = "",
  reusableMedia = [],
  workspaceAuthority,
}: {
  generateAudio?: boolean;
  media: UploadMediaItem[];
  modelRule: VideoModelRule;
  onBusyChange?: (isBusy: boolean) => void;
  onChange: Dispatch<SetStateAction<UploadMediaItem[]>>;
  onReferencesBound?: (items: UploadMediaItem[]) => void;
  referenceBindingProfileId?: string;
  reusableMedia?: UploadMediaItem[];
  workspaceAuthority: VideoWorkspaceAuthority;
}) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [currentUploadMedia, setCurrentUploadMedia] = useState<UploadMediaItem[]>([]);
  const [localStoredMedia, setLocalStoredMedia] = useState<UploadMediaItem[]>([]);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [assetLibraryRefreshVersion, setAssetLibraryRefreshVersion] = useState(0);
  const [drawerAnchorEl, setDrawerAnchorEl] = useState<HTMLElement | null>(null);
  const [pickerNotice, setPickerNotice] = useState("");
  const mediaRef = useRef(media);
  const workspaceAuthorityTenantId = workspaceAuthority.scope.tenantId;
  const workspaceAuthorityUserId = workspaceAuthority.scope.userId;

  useEffect(() => {
    mediaRef.current = media;
  }, [media]);

  useEffect(() => {
    if (!modelRule.modelId.endsWith("_international")) return;
    let cancelled = false;
    const selectedPrivateAssets = mediaRef.current.filter((item) => item.privateReference && item.assetId);
    if (!selectedPrivateAssets.length) return;

    void Promise.all(selectedPrivateAssets.map(async (item) => {
      try {
        const presentation = await refreshPrivateMediaAssetPreview(item.assetId as string, {
          model: modelRule.modelId,
          type: item.type,
        });
        return { assetId: item.assetId, presentation };
      } catch {
        return null;
      }
    })).then((updates) => {
      if (cancelled) return;
      const byAssetId = new Map(updates.filter(Boolean).map((update) => [update!.assetId, update!.presentation]));
      if (!byAssetId.size) return;
      onChange((currentItems) => currentItems.map((item) => {
        const presentation = item.assetId ? byAssetId.get(item.assetId) : null;
        if (!presentation) return item;
        return applyCurrentPrivateReferencePresentation(item, presentation, referenceBindingProfileId);
      }));
    });

    return () => { cancelled = true; };
  }, [modelRule.modelId, onChange, referenceBindingProfileId]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setCurrentUploadMedia([]);
      setLocalStoredMedia(collectLocalMediaAssets({
        tenantId: workspaceAuthorityTenantId,
        userId: workspaceAuthorityUserId,
      }));
    });

    return () => window.cancelAnimationFrame(frame);
  }, [workspaceAuthorityTenantId, workspaceAuthorityUserId]);

  const currentMedia = useMemo(
    () => mergeMediaAssets(collectCurrentMediaAssets(currentUploadMedia), collectReferenceMediaAssets(media)),
    [currentUploadMedia, media],
  );
  const allPickerMedia = useMemo(
    () => mergeMediaAssets(currentMedia, localStoredMedia, reusableMedia),
    [currentMedia, localStoredMedia, reusableMedia],
  );

  useEffect(() => {
    onBusyChange?.(currentUploadMedia.some((item) => item.uploadStatus === "uploading"));
  }, [currentUploadMedia, onBusyChange]);

  useEffect(() => {
    function openPicker(event: Event) {
      const detail = (event as CustomEvent<{ anchorEl?: HTMLElement | null }>).detail;
      setDrawerAnchorEl(detail?.anchorEl || triggerRef.current);
      setIsPickerOpen(true);
    }

    window.addEventListener("shadowedge:open-video-media-picker", openPicker);
    return () => window.removeEventListener("shadowedge:open-video-media-picker", openPicker);
  }, []);

  async function buildUploadableItems(files: File[]) {
    const audioTypeError = files.map(validateAudioUploadFile).find(Boolean) || "";
    if (audioTypeError) {
      setPickerNotice(audioTypeError);
      return [];
    }

    const typeError = validateFilesForSlot(uploadSlot, files);
    if (typeError) {
      setPickerNotice(typeError);
      return [];
    }

    const typeLimitResult = filterFilesByUploadTypeLimits(uploadSlot, media, files);
    if (typeLimitResult.error) {
      setPickerNotice(typeLimitResult.error);
    }

    const items = await Promise.all(
      typeLimitResult.files.map(async (file, index) => {
        const isAudio = file.type.startsWith("audio/");
        const sizeError = validateFileSize(file, maxFileSizeBytes, isAudio ? t("video.upload.audioFileTooLarge") : t("video.upload.fileTooLarge"));
        const duration = isAudio ? await getAudioDuration(file) : 0;

        if (sizeError) {
          return createLocalMediaItem(file, index, duration, sizeError);
        }

        return createLocalMediaItem(file, index, duration);
      }),
    );

    if (!items.length && files.length) {
      setPickerNotice((current) => current || t("video.upload.noUploadableFiles"));
    }

    return items;
  }

  async function handleFiles(files: File[]) {
    setPickerNotice("");

    const localItems = await buildUploadableItems(files);
    if (!localItems.length) return;

    setCurrentUploadMedia((current) => mergeMediaAssets([...localItems, ...current]).slice(0, 40));

    await Promise.all(
      localItems.map(async (item) => {
        const file = item.file;
        if (!file || item.uploadStatus === "failed") return;

        try {
          const uploaded = await uploadMedia(file);
          const uploadedItem = createCanonicalUploadedMediaItem(item, uploaded);

          setCurrentUploadMedia((currentItems) =>
            currentItems.map((current) => (current.id === item.id ? uploadedItem : current)),
          );
          setLocalStoredMedia(appendLocalMediaAssets([uploadedItem], workspaceAuthority.scope));
          setAssetLibraryRefreshVersion((current) => current + 1);
        } catch (error) {
          const message = error instanceof Error ? error.message : t("video.upload.failed");
          const display = getMediaUploadErrorDisplayKeys(message, { fallbackKind: "upload" });
          setPickerNotice(t(display.messageKey));
          setCurrentUploadMedia((currentItems) =>
            currentItems.map((current) =>
              current.id === item.id
                ? {
                    ...current,
                    errorMessage: message,
                    uploadStatus: "failed",
                  }
                : current,
            ),
          );
        }
      }),
    );
  }

  function removeMedia(id: string) {
    const item = allPickerMedia.find((candidate) => candidate.id === id);
    const url = item?.url || "";

    setCurrentUploadMedia((currentItems) => currentItems.filter((current) => current.id !== id && current.url !== url));
    setLocalStoredMedia(removeLocalMediaAsset(url || id, workspaceAuthority.scope));
    onChange((currentItems) => currentItems.filter((current) => current.id !== id && current.url !== url));
  }

  async function addSelectedToReferences(ids: string[], availableMedia = allPickerMedia) {
    setPickerNotice("");

    const selectedItems = mergeMediaAssets(availableMedia.filter((item) =>
      ids.includes(item.id) && item.uploadStatus === "ready" &&
      (Boolean(item.url) || (item.privateReference === true && Boolean(item.assetId))),
    ));
    let selectedRemoteItems = selectedItems.filter((item) =>
      (item.url && isRemoteMediaUrl(item.url) && !isTransientMediaUrl(item.url)) ||
      (item.privateReference === true && Boolean(item.assetId)),
    );

    if (modelRule.modelId.endsWith("_international")) {
      selectedRemoteItems = resolveCurrentReferenceProjections(selectedRemoteItems, availableMedia, referenceBindingProfileId);
      try {
        selectedRemoteItems = await Promise.all(selectedRemoteItems.map(async (item) => {
          if (!item.privateReference || !item.assetId) return item;
          const presentation = await refreshPrivateMediaAssetPreview(item.assetId, {
            model: modelRule.modelId,
            type: item.type,
          });
          return applyCurrentPrivateReferencePresentation(item, presentation, referenceBindingProfileId);
        }));
        selectedRemoteItems = mergeSelectedReferenceMedia([], selectedRemoteItems);
      } catch {
        setPickerNotice(t("video.drawer.assetsLoadError"));
        return false;
      }
    }

    if (!selectedRemoteItems.length) {
      setPickerNotice(t("video.upload.selectReadyFirst"));
      return false;
    }

    const currentMedia = mediaRef.current;
    const selectedNewItems = selectedRemoteItems.filter(
      (item) => !currentMedia.some((current) =>
        current.id === item.id ||
        Boolean(current.assetId && item.assetId && current.assetId === item.assetId) ||
        Boolean(current.url && current.url === item.url)),
    );
    const modelLimitMessage = validateReferenceSelectionForRule(modelRule, currentMedia, selectedNewItems, generateAudio);

    if (modelLimitMessage) {
      setPickerNotice(modelLimitMessage);
      return false;
    }

    const limitMessage = validateSelectedMediaForSlot(uploadSlot, currentMedia, selectedNewItems);

    if (limitMessage) {
      setPickerNotice(limitMessage);
      return false;
    }

    onChange((currentItems) => mergeSelectedReferenceMedia(currentItems, selectedRemoteItems));
    onReferencesBound?.(selectedRemoteItems);

    return true;
  }

  return (
    <>
      <input
        accept={getMediaLibraryUploadAccept()}
        className="hidden"
        multiple
        onChange={(event) => {
          const files = Array.from(event.target.files || []);
          void handleFiles(files);
          event.target.value = "";
        }}
        ref={inputRef}
        type="file"
      />

      <button
        aria-hidden="true"
        className="sr-only"
        onClick={() => {
          setDrawerAnchorEl(triggerRef.current);
          setIsPickerOpen(true);
        }}
        ref={triggerRef}
        tabIndex={-1}
        type="button"
      >
        {t("video.upload.title")}
      </button>

      <MediaPickerDrawer
        anchorElement={drawerAnchorEl}
        assetLibraryRefreshVersion={assetLibraryRefreshVersion}
        currentMedia={currentMedia}
        generateAudio={generateAudio}
        inputRef={inputRef}
        isOpen={isPickerOpen}
        localMedia={localStoredMedia}
        modelRule={modelRule}
        notice={pickerNotice}
        onAddSelected={addSelectedToReferences}
        onClearNotice={() => setPickerNotice("")}
        onClose={() => {
          setIsPickerOpen(false);
          setDrawerAnchorEl(null);
        }}
        onFiles={(files) => void handleFiles(files)}
        onNotice={setPickerNotice}
        onRemove={removeMedia}
        referenceBindingProfileId={referenceBindingProfileId}
        referenceMedia={media}
        reusableMedia={reusableMedia}
        slot={uploadSlot}
        workspaceAuthority={workspaceAuthority}
      />
    </>
  );
}
