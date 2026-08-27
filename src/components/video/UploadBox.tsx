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
  getReferenceAccept,
  validateFilesForReferenceRule,
  validateReferenceSelectionForRule,
} from "@/lib/video/videoReferenceRules";
import { uploadMedia } from "@/lib/video-api";
import { getCanonicalReferenceStatus } from "@/lib/video/canonicalReferenceAssets";
import { refreshPrivateMediaAssetPreview } from "@/lib/assets-api";
import {
  applyCurrentPrivateReferencePresentation,
  mergeSelectedReferenceMedia,
  resolveCurrentReferenceProjections,
} from "@/lib/video/videoReferenceSelection";
import type { UploadMediaItem } from "@/types/video";
import type { VideoModelRule } from "@/lib/video/videoModelRules";
import { useI18n } from "@/i18n/useI18n";

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

function sumAudioDuration(items: UploadMediaItem[]) {
  return items.reduce((total, item) => {
    if (item.type !== "audio") return total;
    return total + (Number(item.duration || 0) || 0);
  }, 0);
}

export function UploadBox({
  media,
  modelRule,
  onBusyChange,
  onChange,
  referenceBindingProfileId = "",
  reusableMedia = [],
}: {
  media: UploadMediaItem[];
  modelRule: VideoModelRule;
  onBusyChange?: (isBusy: boolean) => void;
  onChange: Dispatch<SetStateAction<UploadMediaItem[]>>;
  referenceBindingProfileId?: string;
  reusableMedia?: UploadMediaItem[];
}) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [currentUploadMedia, setCurrentUploadMedia] = useState<UploadMediaItem[]>([]);
  const [localStoredMedia, setLocalStoredMedia] = useState<UploadMediaItem[]>([]);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [drawerAnchorEl, setDrawerAnchorEl] = useState<HTMLElement | null>(null);
  const [pickerNotice, setPickerNotice] = useState("");
  const mediaRef = useRef(media);

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
      setLocalStoredMedia(collectLocalMediaAssets());
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

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
    const ruleError = validateFilesForReferenceRule(modelRule, files, media);
    if (ruleError) {
      setPickerNotice(ruleError);
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

    const currentAudioDuration = sumAudioDuration(media);
    let nextAudioDuration = currentAudioDuration;
    const audioCapability = modelRule.audioReference;

    const items = await Promise.all(
      typeLimitResult.files.map(async (file, index) => {
        const isAudio = file.type.startsWith("audio/");
        const sizeLimit = isAudio && audioCapability?.enabled && audioCapability.maxFileBytes
          ? audioCapability.maxFileBytes
          : maxFileSizeBytes;
        const sizeError = validateFileSize(file, sizeLimit, isAudio ? t("video.upload.audioFileTooLarge") : t("video.upload.fileTooLarge"));
        const duration = isAudio ? await getAudioDuration(file) : 0;

        if (sizeError) {
          return createLocalMediaItem(file, index, duration, sizeError);
        }

        if (isAudio && audioCapability?.enabled && (
          !duration ||
          duration < audioCapability.minDurationSeconds ||
          duration > audioCapability.maxDurationSeconds ||
          nextAudioDuration + duration > audioCapability.maxDurationSeconds
        )) {
          return createLocalMediaItem(file, index, duration, t("video.upload.maxAudioDuration"));
        }

        if (duration) nextAudioDuration += duration;
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
          const uploadedItem: UploadMediaItem = {
            ...item,
            duration: uploaded.duration || item.duration,
            errorMessage: "",
            file: undefined,
            assetId: uploaded.assetId,
            canonicalReferenceStatus: getCanonicalReferenceStatus({ assetId: uploaded.assetId }),
            filename: uploaded.filename,
            id: uploaded.id || item.id,
            mimeType: uploaded.mimeType || item.mimeType,
            name: uploaded.name || item.name,
            originalName: uploaded.originalName,
            previewUrl:
              uploaded.type === "image"
                ? uploaded.previewUrl || uploaded.url || item.previewUrl
                : item.previewUrl || uploaded.previewUrl,
            size: uploaded.size || item.size,
            source: "current_upload",
            type: uploaded.type || item.type,
            uploadStatus: "ready",
            url: uploaded.url,
          };

          setCurrentUploadMedia((currentItems) =>
            currentItems.map((current) => (current.id === item.id ? uploadedItem : current)),
          );
          setLocalStoredMedia(appendLocalMediaAssets([uploadedItem]));
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
    setLocalStoredMedia(removeLocalMediaAsset(url || id));
    onChange((currentItems) => currentItems.filter((current) => current.id !== id && current.url !== url));
  }

  async function addSelectedToReferences(ids: string[], availableMedia = allPickerMedia) {
    setPickerNotice("");

    const selectedItems = mergeMediaAssets(availableMedia.filter((item) => ids.includes(item.id) && item.uploadStatus === "ready" && item.url));
    let selectedRemoteItems = selectedItems.filter((item) => item.url && isRemoteMediaUrl(item.url) && !isTransientMediaUrl(item.url));

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
    const modelLimitMessage = validateReferenceSelectionForRule(modelRule, currentMedia, selectedNewItems);

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

    return true;
  }

  return (
    <>
      <input
        accept={getReferenceAccept(modelRule)}
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
        currentMedia={currentMedia}
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
      />
    </>
  );
}
