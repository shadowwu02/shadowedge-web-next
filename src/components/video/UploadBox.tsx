"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { MediaPickerDrawer } from "@/components/video/MediaPickerDrawer";
import { appendLocalMediaAssets, collectCurrentMediaAssets, collectLocalMediaAssets, mergeMediaAssets, removeLocalMediaAsset } from "@/lib/media-assets";
import { getAudioDuration } from "@/lib/media-duration";
import {
  filterFilesByUploadTypeLimits,
  getFileTypeFromFile,
  getSlotAccept,
  isRemoteMediaUrl,
  isTransientMediaUrl,
  validateFilesForSlot,
  validateSelectedMediaForSlot,
} from "@/lib/upload-rules";
import { uploadMedia } from "@/lib/video-api";
import type { UploadMediaItem } from "@/types/video";

const uploadSlot = "media";
const maxFileSizeBytes = 250 * 1024 * 1024;
const maxAudioDurationSeconds = 15.05;

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
    uploadStatus: errorMessage ? "failed" : "uploading",
    errorMessage,
  };
}

function validateFileSize(file: File) {
  if (file.size > maxFileSizeBytes) {
    return "File is too large. Please upload a file under 250MB.";
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
  onBusyChange,
  onChange,
}: {
  media: UploadMediaItem[];
  onBusyChange?: (isBusy: boolean) => void;
  onChange: Dispatch<SetStateAction<UploadMediaItem[]>>;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [currentUploadMedia, setCurrentUploadMedia] = useState<UploadMediaItem[]>([]);
  const [localStoredMedia, setLocalStoredMedia] = useState<UploadMediaItem[]>([]);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [drawerAnchorEl, setDrawerAnchorEl] = useState<HTMLElement | null>(null);
  const [pickerNotice, setPickerNotice] = useState("");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setLocalStoredMedia(collectLocalMediaAssets());
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  const currentMedia = useMemo(
    () => mergeMediaAssets(collectCurrentMediaAssets(currentUploadMedia), collectCurrentMediaAssets(media)),
    [currentUploadMedia, media],
  );
  const allPickerMedia = useMemo(() => mergeMediaAssets(currentMedia, localStoredMedia), [currentMedia, localStoredMedia]);

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

    const items = await Promise.all(
      typeLimitResult.files.map(async (file, index) => {
        const sizeError = validateFileSize(file);
        const duration = file.type.startsWith("audio/") ? await getAudioDuration(file) : 0;

        if (sizeError) {
          return createLocalMediaItem(file, index, duration, sizeError);
        }

        if (duration && nextAudioDuration + duration > maxAudioDurationSeconds) {
          return createLocalMediaItem(file, index, duration, "Reference audio can be up to 15 seconds total.");
        }

        if (duration) nextAudioDuration += duration;
        return createLocalMediaItem(file, index, duration);
      }),
    );

    if (!items.length && files.length) {
      setPickerNotice((current) => current || "No uploadable files were selected.");
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
            type: uploaded.type || item.type,
            uploadStatus: "ready",
            url: uploaded.url,
          };

          setCurrentUploadMedia((currentItems) =>
            currentItems.map((current) => (current.id === item.id ? uploadedItem : current)),
          );
          setLocalStoredMedia(appendLocalMediaAssets([uploadedItem]));
        } catch (error) {
          const message = error instanceof Error ? error.message : "Upload failed.";
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

  function addSelectedToReferences(ids: string[]) {
    setPickerNotice("");

    const selectedItems = allPickerMedia.filter((item) => ids.includes(item.id) && item.uploadStatus === "ready" && item.url);
    const selectedRemoteItems = selectedItems.filter((item) => item.url && isRemoteMediaUrl(item.url) && !isTransientMediaUrl(item.url));

    if (!selectedRemoteItems.length) {
      setPickerNotice("Select ready media first.");
      return false;
    }

    const selectedNewItems = selectedRemoteItems.filter(
      (item) => !media.some((current) => current.id === item.id || (current.url && current.url === item.url)),
    );
    const limitMessage = validateSelectedMediaForSlot(uploadSlot, media, selectedNewItems);

    if (limitMessage) {
      setPickerNotice(limitMessage);
      return false;
    }

    onChange((currentItems) =>
      mergeMediaAssets(
        currentItems,
        selectedRemoteItems.map((item) => ({ ...item, role: item.role || "reference" })),
      ).slice(0, 12),
    );

    return true;
  }

  return (
    <>
      <input
        accept={getSlotAccept(uploadSlot)}
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
        Upload media
      </button>

      <MediaPickerDrawer
        anchorElement={drawerAnchorEl}
        currentMedia={currentMedia}
        inputRef={inputRef}
        isOpen={isPickerOpen}
        localMedia={localStoredMedia}
        notice={pickerNotice}
        onAddSelected={addSelectedToReferences}
        onClearNotice={() => setPickerNotice("")}
        onClose={() => {
          setIsPickerOpen(false);
          setDrawerAnchorEl(null);
        }}
        onFiles={(files) => void handleFiles(files)}
        onRemove={removeMedia}
        slot={uploadSlot}
      />
    </>
  );
}
