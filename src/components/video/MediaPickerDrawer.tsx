"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, DragEvent, RefObject } from "react";
import type { UploadMediaItem, UploadMediaType } from "@/types/video";

type MediaFilter = "uploads" | UploadMediaType;

type DrawerPosition = {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
};

const drawerWidth = 640;
const drawerMinWidth = 560;
const drawerMaxHeight = 560;

const filters: Array<{ key: MediaFilter; label: string }> = [
  { key: "uploads", label: "Uploads" },
  { key: "image", label: "Images" },
  { key: "video", label: "Videos" },
  { key: "audio", label: "Audios" },
];

function mediaTypeLabel(type: UploadMediaItem["type"]) {
  if (type === "audio") return "Audio";
  if (type === "video") return "Video";
  return "Image";
}

function statusLabel(status: UploadMediaItem["uploadStatus"]) {
  if (status === "uploading") return "Uploading";
  if (status === "failed") return "Failed";
  if (status === "ready") return "Ready";
  return "Local";
}

function mediaFallback(type: UploadMediaItem["type"]) {
  if (type === "audio") return "AUD";
  if (type === "video") return "VID";
  return "IMG";
}

function getDrawerPosition(anchor: HTMLElement | null): DrawerPosition {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const gap = 12;
  const edge = 14;
  const isMobile = viewportWidth < 768;
  const width = Math.min(drawerWidth, Math.max(320, viewportWidth - edge * 2));
  const maxHeight = Math.min(drawerMaxHeight, Math.max(360, viewportHeight - 120));

  if (!anchor || isMobile) {
    return {
      left: Math.max(edge, (viewportWidth - width) / 2),
      maxHeight,
      top: Math.max(edge, (viewportHeight - maxHeight) / 2),
      width,
    };
  }

  const rect = anchor.getBoundingClientRect();
  const preferredWidth = Math.min(drawerWidth, Math.max(drawerMinWidth, viewportWidth - rect.right - gap - edge));
  let widthForPosition = preferredWidth;
  let left = rect.right + gap;
  let top = rect.top;

  if (left + widthForPosition > viewportWidth - edge) {
    widthForPosition = Math.min(drawerWidth, Math.max(drawerMinWidth, viewportWidth - rect.left - edge));
    left = rect.left;
    top = rect.bottom + gap;
  }

  if (left + widthForPosition > viewportWidth - edge) {
    widthForPosition = Math.min(drawerWidth, viewportWidth - edge * 2);
    left = edge;
  }

  if (top + maxHeight > viewportHeight - edge) {
    top = viewportHeight - maxHeight - edge;
  }

  return {
    left: Math.max(edge, left),
    maxHeight,
    top: Math.max(edge, top),
    width: widthForPosition,
  };
}

export function MediaPickerDrawer({
  anchorRef,
  inputRef,
  isOpen,
  media,
  notice,
  onAddSelected,
  onClearNotice,
  onClose,
  onFiles,
  onRemove,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  inputRef: RefObject<HTMLInputElement | null>;
  isOpen: boolean;
  media: UploadMediaItem[];
  notice?: string;
  onAddSelected: (ids: string[]) => boolean;
  onClearNotice?: () => void;
  onClose: () => void;
  onFiles: (files: File[]) => void;
  onRemove: (id: string) => void;
}) {
  const [activeFilter, setActiveFilter] = useState<MediaFilter>("uploads");
  const [position, setPosition] = useState<DrawerPosition>({ left: 16, maxHeight: 520, top: 72, width: 640 });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const previousStatusesRef = useRef<Map<string, UploadMediaItem["uploadStatus"]>>(new Map());
  const rafRef = useRef<number | null>(null);

  const visibleMedia = useMemo(() => {
    if (activeFilter === "uploads") return media;
    return media.filter((item) => item.type === activeFilter);
  }, [activeFilter, media]);

  const selectedCount = selectedIds.size;

  useEffect(() => {
    if (!isOpen) return;

    previousStatusesRef.current = new Map();
    const frame = window.requestAnimationFrame(() => {
      setActiveFilter("uploads");
      setSelectedIds(new Set());
      setPosition(getDrawerPosition(anchorRef.current));
    });

    return () => window.cancelAnimationFrame(frame);
  }, [anchorRef, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const previousStatuses = previousStatusesRef.current;
    if (!previousStatuses.size) {
      previousStatusesRef.current = new Map(media.map((item) => [item.id, item.uploadStatus]));
      return;
    }
    const newlyReadyIds: string[] = [];
    media.forEach((item) => {
      if (item.uploadStatus === "ready" && previousStatuses.get(item.id) !== "ready") {
        newlyReadyIds.push(item.id);
      }
    });

    if (newlyReadyIds.length) {
      setSelectedIds((current) => {
        const next = new Set(current);
        newlyReadyIds.forEach((id) => next.add(id));
        return next;
      });
    }

    previousStatusesRef.current = new Map(media.map((item) => [item.id, item.uploadStatus]));
  }, [isOpen, media]);

  useEffect(() => {
    if (!isOpen) return;

    function reposition() {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        setPosition(getDrawerPosition(anchorRef.current));
      });
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
  }, [anchorRef, isOpen, onClose]);

  if (!isOpen) return null;

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files || []);
    if (files.length) {
      onClearNotice?.();
      onFiles(files);
    }
  }

  function toggleSelected(item: UploadMediaItem) {
    if (item.uploadStatus !== "ready" || !item.url) return;
    onClearNotice?.();
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
  }

  function removeAsset(id: string) {
    onClearNotice?.();
    setSelectedIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
    onRemove(id);
  }

  function addSelected() {
    const didAdd = onAddSelected(Array.from(selectedIds));
    if (didAdd) {
      setSelectedIds(new Set());
      onClose();
    }
  }

  const drawerStyle: CSSProperties = {
    left: position.left,
    maxHeight: position.maxHeight,
    top: position.top,
    width: position.width,
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/18" onClick={onClose}>
      <section
        className="fixed flex flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#0d1119]/98 shadow-2xl shadow-black/55"
        onClick={(event) => event.stopPropagation()}
        style={drawerStyle}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#ffcf83]">Media picker</p>
            <h2 className="mt-1 text-lg font-black text-white">Reference media</h2>
          </div>
          <button
            aria-label="Close media picker"
            className="grid size-9 place-items-center rounded-full border border-white/10 bg-white/[.055] text-base font-black text-white/68 transition hover:border-[#ffb44d]/35 hover:text-[#ffd08a]"
            onClick={onClose}
            type="button"
          >
            x
          </button>
        </header>

        <div className="se-subtle-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
          <button
            className="grid min-h-28 w-full place-items-center rounded-3xl border border-dashed border-[#ffb44d]/32 bg-[#ffb44d]/8 px-5 text-center transition hover:bg-[#ffb44d]/12"
            onClick={() => {
              onClearNotice?.();
              inputRef.current?.click();
            }}
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

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {filters.map((filter) => (
              <button
                className={`rounded-full border px-3 py-1.5 text-xs font-black transition ${
                  activeFilter === filter.key
                    ? "border-[#ffb44d]/60 bg-[#ffb44d]/18 text-[#ffd08a]"
                    : "border-white/10 bg-white/[.045] text-white/52 hover:border-[#ffb44d]/30 hover:text-white"
                }`}
                key={filter.key}
                onClick={() => {
                  onClearNotice?.();
                  setActiveFilter(filter.key);
                }}
                type="button"
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <h3 className="text-sm font-black text-white">Assets</h3>
            <span className="text-xs font-bold text-white/38">{media.length}/12 items</span>
          </div>

          {notice ? (
            <div className="mt-3 rounded-2xl border border-[#ffb44d]/25 bg-[#ffb44d]/10 px-3 py-2 text-xs font-bold text-[#ffd08a]">
              {notice}
            </div>
          ) : null}

          {visibleMedia.length ? (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {visibleMedia.map((item) => {
                const isSelected = selectedIds.has(item.id);
                const isSelectable = item.uploadStatus === "ready" && Boolean(item.url);
                const isFailed = item.uploadStatus === "failed";

                return (
                  <article
                    className={`group relative overflow-hidden rounded-2xl border transition ${
                      isFailed
                        ? "border-red-300/30 bg-red-400/10"
                        : isSelected
                          ? "border-[#ffb44d]/70 bg-[#ffb44d]/12"
                          : "border-white/10 bg-black/24 hover:border-[#ffb44d]/35"
                    }`}
                    key={item.id}
                  >
                    <button
                      className={`block w-full text-left ${isSelectable ? "cursor-pointer" : "cursor-default"}`}
                      disabled={!isSelectable}
                      onClick={() => toggleSelected(item)}
                      type="button"
                    >
                      <span className="relative grid aspect-video place-items-center overflow-hidden bg-white/[.045]">
                        {item.type === "image" && item.previewUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img alt="" className="h-full w-full object-cover" src={item.previewUrl} />
                        ) : (
                          <span className="grid size-11 place-items-center rounded-2xl bg-white/[.06] text-[11px] font-black uppercase tracking-[.14em] text-white/52">
                            {mediaFallback(item.type)}
                          </span>
                        )}
                        <span className="absolute left-2 top-2 rounded-full border border-white/10 bg-black/55 px-2 py-1 text-[10px] font-black uppercase tracking-[.12em] text-white/72 backdrop-blur">
                          {mediaTypeLabel(item.type)}
                        </span>
                        {isSelected ? (
                          <span className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-[#ffb44d] text-xs font-black text-[#1f2027]">
                            ✓
                          </span>
                        ) : null}
                      </span>
                      <span className="grid gap-1.5 p-2">
                        <span className="truncate text-xs font-bold text-white/72">{item.name}</span>
                        <span className={`text-[10px] font-black uppercase tracking-[.12em] ${isFailed ? "text-red-100/75" : "text-white/38"}`}>
                          {statusLabel(item.uploadStatus)}
                        </span>
                        {item.errorMessage ? <span className="line-clamp-2 text-xs leading-5 text-red-100/78">{item.errorMessage}</span> : null}
                      </span>
                    </button>
                    <button
                      aria-label={`Remove ${item.name}`}
                      className="absolute bottom-2 right-2 rounded-full border border-white/10 bg-black/70 px-2 py-1 text-[10px] font-bold text-white/58 opacity-0 transition hover:border-red-300/45 hover:text-red-100 group-hover:opacity-100"
                      onClick={(event) => {
                        event.stopPropagation();
                        removeAsset(item.id);
                      }}
                      type="button"
                    >
                      Remove
                    </button>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-3 rounded-3xl border border-dashed border-white/12 p-8 text-center text-sm text-white/42">
              Uploaded references will appear here.
            </div>
          )}
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-white/10 px-4 py-3">
          <span className="text-xs font-bold text-white/45">{selectedCount} selected</span>
          <div className="flex gap-2">
            <button
              className="rounded-full border border-white/10 px-4 py-2 text-xs font-black text-white/58 transition hover:border-[#ffb44d]/35 hover:text-[#ffd08a]"
              disabled={!selectedCount}
              onClick={() => {
                onClearNotice?.();
                setSelectedIds(new Set());
              }}
              type="button"
            >
              Clear
            </button>
            <button
              className="rounded-full bg-[#ffb44d] px-4 py-2 text-xs font-black text-[#1f2027] transition hover:bg-[#ffc766] disabled:cursor-not-allowed disabled:bg-white/12 disabled:text-white/34"
              disabled={!selectedCount}
              onClick={addSelected}
              type="button"
            >
              Add selected
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
