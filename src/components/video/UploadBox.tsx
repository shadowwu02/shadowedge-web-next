"use client";

import { useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
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

  return (
    <section className="rounded-[24px] border border-dashed border-white/14 bg-white/[.045] p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-black text-white">Reference media</h2>
          <p className="mt-1 text-xs text-white/45">Images, video, and audio upload UI for phase 1.</p>
        </div>
        <button
          className="rounded-full border border-[#ffb44d]/35 bg-[#ffb44d]/10 px-4 py-2 text-sm font-bold text-[#ffd08a] transition hover:bg-[#ffb44d]/16"
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          Add media
        </button>
      </div>

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

      {media.length ? (
        <div className="grid grid-cols-2 gap-3">
          {media.map((item) => (
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/24" key={item.id}>
              <div className="grid aspect-video place-items-center bg-white/[.04]">
                {item.type === "image" && item.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt="" className="h-full w-full object-cover" src={item.previewUrl} />
                ) : (
                  <span className="text-xs font-black uppercase tracking-[.18em] text-white/45">{item.type}</span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 p-3">
                <span className="min-w-0">
                  <span className="block truncate text-xs text-white/62">{item.name}</span>
                  <span className="mt-1 block text-[11px] font-bold uppercase tracking-[.12em] text-white/34">
                    {item.uploadStatus === "uploading"
                      ? "Uploading"
                      : item.uploadStatus === "failed"
                        ? "Failed"
                        : item.url
                          ? "Ready"
                          : "Local"}
                  </span>
                </span>
                <button
                  className="rounded-full border border-white/10 px-2 py-1 text-xs text-white/52 hover:border-red-300/40 hover:text-red-100"
                  onClick={() => onChange((currentItems) => currentItems.filter((current) => current.id !== item.id))}
                  type="button"
                >
                  Remove
                </button>
              </div>
              {item.errorMessage ? (
                <div className="border-t border-red-300/15 bg-red-400/10 px-3 py-2 text-xs text-red-100/80">
                  {item.errorMessage}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <button
          className="grid min-h-28 w-full place-items-center rounded-3xl border border-white/10 bg-black/18 px-4 text-center text-sm text-white/50 transition hover:border-[#ffb44d]/40 hover:text-[#ffd08a]"
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          Drop or choose reference media
        </button>
      )}
    </section>
  );
}
