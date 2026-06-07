"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { MediaPickerDrawer } from "@/components/video/MediaPickerDrawer";
import { uploadMedia } from "@/lib/video-api";
import type { UploadMediaItem } from "@/types/video";

function inferMediaType(file: File): UploadMediaItem["type"] {
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "image";
}

const maxFileSizeBytes = 250 * 1024 * 1024;
const acceptedPrefixes = ["image/", "video/", "audio/"];

function createLocalMediaItem(file: File, index: number): UploadMediaItem {
  return {
    id: `${file.name}-${file.lastModified}-${index}-${crypto.randomUUID?.() || Date.now()}`,
    type: inferMediaType(file),
    file,
    name: file.name,
    size: file.size,
    mimeType: file.type,
    previewUrl: URL.createObjectURL(file),
    uploadStatus: "uploading",
  };
}

function validateFile(file: File) {
  if (!acceptedPrefixes.some((prefix) => file.type.startsWith(prefix))) {
    return "Only image, video, and audio files are supported.";
  }

  if (file.size > maxFileSizeBytes) {
    return "File is too large. Please upload a file under 250MB.";
  }

  return "";
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
  const [localAssetMedia, setLocalAssetMedia] = useState<UploadMediaItem[]>([]);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerNotice, setPickerNotice] = useState("");

  const assetMedia = useMemo(() => {
    const nextAssets = [...localAssetMedia];
    media.forEach((item) => {
      const exists = nextAssets.some((asset) => asset.id === item.id || (asset.url && item.url && asset.url === item.url));
      if (!exists) nextAssets.push(item);
    });
    return nextAssets.slice(0, 12);
  }, [localAssetMedia, media]);

  useEffect(() => {
    onBusyChange?.(assetMedia.some((item) => item.uploadStatus === "uploading"));
  }, [assetMedia, onBusyChange]);

  async function handleFiles(files: File[]) {
    setPickerNotice("");

    const availableSlots = Math.max(0, 12 - assetMedia.length);
    const localItems = files.slice(0, availableSlots).map(createLocalMediaItem);

    if (!localItems.length) {
      if (files.length) setPickerNotice("You can keep up to 12 media assets in this picker.");
      return;
    }

    setLocalAssetMedia((current) => [...current, ...localItems].slice(0, 12));

    await Promise.all(
      localItems.map(async (item) => {
        const file = item.file;
        if (!file) return;

        const validationMessage = validateFile(file);
        if (validationMessage) {
          setLocalAssetMedia((currentItems) =>
            currentItems.map((current) =>
              current.id === item.id
                ? {
                    ...current,
                    errorMessage: validationMessage,
                    uploadStatus: "failed",
                  }
                : current,
            ),
          );
          return;
        }

        try {
          const uploaded = await uploadMedia(file);
          setLocalAssetMedia((currentItems) =>
            currentItems.map((current) =>
              current.id === item.id
                ? {
                    ...current,
                    duration: uploaded.duration || current.duration,
                    errorMessage: "",
                    file: undefined,
                    filename: uploaded.filename,
                    id: uploaded.id || current.id,
                    mimeType: uploaded.mimeType || current.mimeType,
                    name: uploaded.name || current.name,
                    originalName: uploaded.originalName,
                    previewUrl:
                      uploaded.type === "image"
                        ? uploaded.previewUrl || uploaded.url || current.previewUrl
                        : current.previewUrl || uploaded.previewUrl,
                    size: uploaded.size || current.size,
                    type: uploaded.type || current.type,
                    uploadStatus: "ready",
                    url: uploaded.url,
                  }
                : current,
            ),
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : "Upload failed.";
          setLocalAssetMedia((currentItems) =>
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

  const readyCount = assetMedia.filter((item) => item.uploadStatus === "ready").length;
  const uploadingCount = assetMedia.filter((item) => item.uploadStatus === "uploading").length;
  const failedCount = assetMedia.filter((item) => item.uploadStatus === "failed").length;

  function removeMedia(id: string) {
    setLocalAssetMedia((currentItems) => currentItems.filter((current) => current.id !== id));
    onChange((currentItems) => currentItems.filter((current) => current.id !== id));
  }

  function addSelectedToReferences(ids: string[]) {
    setPickerNotice("");

    const selectedItems = assetMedia.filter((item) => ids.includes(item.id) && item.uploadStatus === "ready" && item.url);

    if (!selectedItems.length) {
      setPickerNotice("Select ready media first.");
      return false;
    }

    const selectedNewItems = selectedItems.filter(
      (item) => !media.some((current) => current.id === item.id || (current.url && current.url === item.url)),
    );
    const availableSlots = Math.max(0, 12 - media.length);

    if (selectedNewItems.length > availableSlots) {
      setPickerNotice("You can add up to 12 reference media items.");
      return false;
    }

    onChange((currentItems) => {
      const nextItems = [...currentItems];
      selectedItems.forEach((item) => {
        if (!nextItems.some((current) => current.id === item.id || (current.url && current.url === item.url))) {
          nextItems.push(item);
        }
      });
      return nextItems.slice(0, 12);
    });

    return true;
  }

  return (
    <section className="rounded-[22px] border border-dashed border-white/14 bg-white/[.045] p-3">
      <input
        accept="image/*,video/*,audio/*"
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
        className="grid min-h-28 w-full place-items-center rounded-3xl border border-white/10 bg-black/18 px-4 text-center transition hover:border-[#ffb44d]/40 hover:bg-[#ffb44d]/8"
        onClick={() => setIsPickerOpen(true)}
        ref={triggerRef}
        type="button"
      >
        <span>
          <span className="mx-auto mb-3 flex justify-center gap-2">
            {["IMG", "VID", "AUD"].map((item) => (
              <span className="grid size-9 place-items-center rounded-full border border-white/10 bg-white/[.06] text-[10px] font-black text-white/48" key={item}>
                {item}
              </span>
            ))}
          </span>
          <span className="block text-sm font-black text-white">Upload media</span>
          <span className="mt-1 block text-xs text-white/45">Image, video, or audio</span>
          <span className="mt-3 block text-[11px] font-bold text-white/38">
            {readyCount} ready / {uploadingCount} uploading / {failedCount} failed
          </span>
        </span>
      </button>

      <MediaPickerDrawer
        anchorRef={triggerRef}
        inputRef={inputRef}
        isOpen={isPickerOpen}
        media={assetMedia}
        notice={pickerNotice}
        onAddSelected={addSelectedToReferences}
        onClearNotice={() => setPickerNotice("")}
        onClose={() => setIsPickerOpen(false)}
        onFiles={(files) => void handleFiles(files)}
        onRemove={removeMedia}
      />
    </section>
  );
}
