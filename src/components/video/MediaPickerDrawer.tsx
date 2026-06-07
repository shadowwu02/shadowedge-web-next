import type { DragEvent, RefObject } from "react";
import { MediaCard } from "@/components/video/MediaCard";
import type { UploadMediaItem } from "@/types/video";

export function MediaPickerDrawer({
  inputRef,
  isOpen,
  media,
  onClose,
  onFiles,
  onRemove,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  isOpen: boolean;
  media: UploadMediaItem[];
  onClose: () => void;
  onFiles: (files: File[]) => void;
  onRemove: (id: string) => void;
}) {
  if (!isOpen) return null;

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files || []);
    if (files.length) onFiles(files);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/34 backdrop-blur-[2px]" onClick={onClose}>
      <section
        className="se-scrollbar absolute left-1/2 top-[72px] flex max-h-[calc(100vh-130px)] w-[min(740px,calc(100vw-32px))] -translate-x-1/2 flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[#0d1119]/96 shadow-2xl shadow-black/50"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[.18em] text-[#ffcf83]">Media picker</p>
            <h2 className="mt-1 text-lg font-black text-white">Reference media</h2>
          </div>
          <button
            aria-label="Close media picker"
            className="grid size-10 place-items-center rounded-full border border-white/10 bg-white/[.055] text-lg font-black text-white/68 transition hover:border-[#ffb44d]/35 hover:text-[#ffd08a]"
            onClick={onClose}
            type="button"
          >
            x
          </button>
        </header>

        <div className="se-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
          <button
            className="grid min-h-32 w-full place-items-center rounded-3xl border border-dashed border-[#ffb44d]/32 bg-[#ffb44d]/8 px-5 text-center transition hover:bg-[#ffb44d]/12"
            onClick={() => inputRef.current?.click()}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            type="button"
          >
            <span>
              <span className="mx-auto mb-3 flex justify-center gap-2">
                {["Image", "Video", "Audio"].map((item) => (
                  <span className="rounded-full border border-white/10 bg-black/24 px-3 py-1 text-[11px] font-black uppercase tracking-[.12em] text-white/58" key={item}>
                    {item}
                  </span>
                ))}
              </span>
              <span className="block text-base font-black text-white">Upload media</span>
              <span className="mt-2 block text-sm text-white/48">Drop files here or choose image, video, and audio references.</span>
            </span>
          </button>

          <div className="mt-5 flex items-center justify-between">
            <h3 className="text-sm font-black text-white">Ready and uploading media</h3>
            <span className="text-xs font-bold text-white/38">{media.length}/12 items</span>
          </div>

          {media.length ? (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {media.map((item) => (
                <MediaCard item={item} key={item.id} onRemove={onRemove} />
              ))}
            </div>
          ) : (
            <div className="mt-3 rounded-3xl border border-dashed border-white/12 p-8 text-center text-sm text-white/42">
              Uploaded references will appear here.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
