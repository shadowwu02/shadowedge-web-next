"use client";

import { useRef } from "react";
import type { UploadMediaItem } from "@/types/video";

function inferMediaType(file: File): UploadMediaItem["type"] {
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "image";
}

export function UploadBox({
  media,
  onChange,
}: {
  media: UploadMediaItem[];
  onChange: (items: UploadMediaItem[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

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
          const next = files.map((file, index) => ({
            id: `${file.name}-${file.lastModified}-${index}`,
            type: inferMediaType(file),
            file,
            name: file.name,
            previewUrl: URL.createObjectURL(file),
          }));
          onChange([...media, ...next].slice(0, 12));
          event.target.value = "";
        }}
        ref={inputRef}
        type="file"
      />

      {media.length ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
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
                <span className="truncate text-xs text-white/62">{item.name}</span>
                <button
                  className="rounded-full border border-white/10 px-2 py-1 text-xs text-white/52 hover:border-red-300/40 hover:text-red-100"
                  onClick={() => onChange(media.filter((current) => current.id !== item.id))}
                  type="button"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <button
          className="grid min-h-40 w-full place-items-center rounded-3xl border border-white/10 bg-black/18 text-center text-sm text-white/50 transition hover:border-[#ffb44d]/40 hover:text-[#ffd08a]"
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          Drop or choose reference media
        </button>
      )}
    </section>
  );
}
