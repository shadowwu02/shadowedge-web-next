"use client";

import { useRef, useState } from "react";
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
  onChange,
}: {
  media: UploadMediaItem[];
  onChange: Dispatch<SetStateAction<UploadMediaItem[]>>;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  async function handleFiles(files: File[]) {
    const availableSlots = Math.max(0, 12 - media.length);
    const localItems = files.slice(0, availableSlots).map(createLocalMediaItem);
    if (!localItems.length) return;

    onChange((current) => [...current, ...localItems].slice(0, 12));

    await Promise.all(
      localItems.map(async (item) => {
        const file = item.file;
        if (!file) return;

        const validationMessage = validateFile(file);
        if (validationMessage) {
          onChange(
            (currentItems) =>
              currentItems.map((current) =>
                current.id === item.id
                ? {
                    ...current,
                    uploadStatus: "failed",
                    errorMessage: validationMessage,
                  }
                : current,
              ),
          );
          return;
        }

        try {
          const uploaded = await uploadMedia(file);
          onChange(
            (currentItems) =>
              currentItems.map((current) =>
                current.id === item.id
                ? {
                    ...current,
                    id: uploaded.id || current.id,
                    type: uploaded.type || current.type,
                    file: undefined,
                    name: uploaded.name || current.name,
                    url: uploaded.url,
                    size: uploaded.size || current.size,
                    mimeType: uploaded.mimeType || current.mimeType,
                    filename: uploaded.filename,
                    originalName: uploaded.originalName,
                    duration: uploaded.duration || current.duration,
                    previewUrl:
                      uploaded.type === "image"
                        ? uploaded.previewUrl || uploaded.url || current.previewUrl
                        : current.previewUrl || uploaded.previewUrl,
                    uploadStatus: "ready",
                    errorMessage: "",
                  }
                : current,
              ),
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : "Upload failed.";
          onChange(
            (currentItems) =>
              currentItems.map((current) =>
                current.id === item.id
                ? {
                    ...current,
                    uploadStatus: "failed",
                    errorMessage: message,
                  }
                : current,
              ),
          );
        }
      }),
    );
  }

  const readyCount = media.filter((item) => item.uploadStatus === "ready").length;
  const uploadingCount = media.filter((item) => item.uploadStatus === "uploading").length;
  const failedCount = media.filter((item) => item.uploadStatus === "failed").length;

  function removeMedia(id: string) {
    onChange((currentItems) => currentItems.filter((current) => current.id !== id));
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
            {readyCount} ready · {uploadingCount} uploading · {failedCount} failed
          </span>
        </span>
      </button>

      <MediaPickerDrawer
        inputRef={inputRef}
        isOpen={isPickerOpen}
        media={media}
        onClose={() => setIsPickerOpen(false)}
        onFiles={(files) => void handleFiles(files)}
        onRemove={removeMedia}
      />
    </section>
  );
}
