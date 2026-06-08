"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, DragEvent, RefObject } from "react";
import { getMediaAssetSourceLabel, mergeMediaAssets } from "@/lib/media-assets";
import { slotAllowsAssetType } from "@/lib/upload-rules";
import {
  getAllowedReferenceTypes,
  getReferenceLimitSummary,
  getUnsupportedReferenceTypeReason,
  isReferenceTypeSupported,
  validateReferenceSelectionForRule,
} from "@/lib/video/videoReferenceRules";
import type { UploadMediaItem, UploadMediaType } from "@/types/video";
import type { VideoModelRule } from "@/lib/video/videoModelRules";

type MediaFilter = "uploads" | "history" | "generated" | UploadMediaType | "elements" | "liked";

type DrawerPosition = {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
};

const drawerWidth = 600;
const drawerMinWidth = 520;
const drawerMaxHeight = 520;

const filters: Array<{ key: MediaFilter; label: string }> = [
  { key: "uploads", label: "Uploads" },
  { key: "history", label: "History" },
  { key: "generated", label: "Generated" },
  { key: "image", label: "Images" },
  { key: "video", label: "Videos" },
  { key: "audio", label: "Audios" },
  { key: "elements", label: "Elements" },
  { key: "liked", label: "Liked" },
];

function mediaTypeLabel(type: UploadMediaItem["type"]) {
  if (type === "audio") return "Audio";
  if (type === "video") return "Video";
  return "Image";
}

function statusLabel(status: UploadMediaItem["uploadStatus"], issue: string) {
  if (status === "uploading") return "Uploading";
  if (status === "failed") return "Failed";
  if (issue === "Already added to references.") return "Added";
  if (issue) return "Blocked";
  if (status === "ready") return "Ready";
  return "Local";
}

function mediaFallback(type: UploadMediaItem["type"]) {
  if (type === "audio") return "AUD";
  if (type === "video") return "VID";
  return "IMG";
}

function emptyStateText(filter: MediaFilter) {
  if (filter === "history") return "Reusable history inputs will appear here.";
  if (filter === "generated") return "Generated videos will appear here when reusable.";
  if (filter === "elements") return "No elements yet.";
  if (filter === "liked") return "Liked assets will appear here.";
  if (filter === "image") return "No uploaded images yet.";
  if (filter === "video") return "No uploaded videos yet.";
  if (filter === "audio") return "No uploaded audios yet.";
  return "Uploaded references will appear here.";
}

function isSameMediaAsset(left: UploadMediaItem, right: UploadMediaItem) {
  return left.id === right.id || Boolean(left.url && right.url && left.url === right.url);
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" className="size-3.5" fill="none" viewBox="0 0 24 24">
      <path d="m5 12 4.2 4.2L19 6.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
    </svg>
  );
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
  let left = rect.right + 10;
  let top = rect.top - 4;

  if (left + widthForPosition > viewportWidth - edge) {
    widthForPosition = Math.min(drawerWidth, Math.max(drawerMinWidth, viewportWidth - edge * 2));
    left = Math.max(edge, rect.left - widthForPosition - gap);
    top = rect.top - 4;
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
  anchorElement,
  currentMedia,
  inputRef,
  isOpen,
  localMedia,
  modelRule,
  notice,
  onAddSelected,
  onClearNotice,
  onClose,
  onFiles,
  onNotice,
  onRemove,
  referenceMedia,
  reusableMedia = [],
  slot,
}: {
  anchorElement: HTMLElement | null;
  currentMedia: UploadMediaItem[];
  inputRef: RefObject<HTMLInputElement | null>;
  isOpen: boolean;
  localMedia: UploadMediaItem[];
  modelRule: VideoModelRule;
  notice?: string;
  onAddSelected: (ids: string[]) => boolean;
  onClearNotice?: () => void;
  onClose: () => void;
  onFiles: (files: File[]) => void;
  onNotice?: (notice: string) => void;
  onRemove: (id: string) => void;
  referenceMedia: UploadMediaItem[];
  reusableMedia?: UploadMediaItem[];
  slot: string;
}) {
  const [activeFilter, setActiveFilter] = useState<MediaFilter>("uploads");
  const [position, setPosition] = useState<DrawerPosition>({ left: 16, maxHeight: 520, top: 72, width: 600 });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const previousStatusesRef = useRef<Map<string, UploadMediaItem["uploadStatus"]>>(new Map());
  const rafRef = useRef<number | null>(null);

  const allMedia = useMemo(() => mergeMediaAssets(currentMedia, localMedia, reusableMedia), [currentMedia, localMedia, reusableMedia]);
  const allowedTypes = useMemo(() => getAllowedReferenceTypes(modelRule), [modelRule]);
  const limitSummary = useMemo(() => getReferenceLimitSummary(modelRule), [modelRule]);
  const visibleMedia = useMemo(() => {
    if (activeFilter === "uploads") return allMedia;
    if (activeFilter === "history") return allMedia.filter((item) => item.source === "history");
    if (activeFilter === "generated") return allMedia.filter((item) => item.source === "generated_result");
    if (activeFilter === "elements" || activeFilter === "liked") return [];
    return allMedia.filter((item) => item.type === activeFilter);
  }, [activeFilter, allMedia]);

  const allowedTypeLabel = allowedTypes.length ? allowedTypes.map((type) => mediaTypeLabel(type).toLowerCase()).join(", ") : "no reference media";
  const selectionIssueById = useMemo(() => {
    const issues = new Map<string, string>();
    const selectedItems = allMedia.filter((item) => selectedIds.has(item.id));

    allMedia.forEach((item) => {
      if (item.uploadStatus === "failed") {
        issues.set(item.id, item.errorMessage || "Upload failed.");
        return;
      }

      if (item.uploadStatus === "uploading") {
        issues.set(item.id, "Upload still in progress.");
        return;
      }

      if (!item.url) {
        issues.set(item.id, "Media URL is not ready yet.");
        return;
      }

      if (!slotAllowsAssetType(slot, item.type)) {
        issues.set(item.id, "Unsupported file type for this slot.");
        return;
      }

      if (item.source === "generated_result" && !modelRule.supportsGeneratedResultAsReference) {
        issues.set(item.id, "Generated results cannot be used as references for this model.");
        return;
      }

      const unsupportedReason = getUnsupportedReferenceTypeReason(modelRule, item.type);
      if (unsupportedReason) {
        issues.set(item.id, unsupportedReason);
        return;
      }

      if (referenceMedia.some((currentItem) => isSameMediaAsset(currentItem, item))) {
        issues.set(item.id, "Already added to references.");
        return;
      }

      const candidateItems = [
        ...selectedItems.filter((selectedItem) => selectedItem.id !== item.id),
        item,
      ];
      const newItems = candidateItems.filter(
        (candidate) =>
          !referenceMedia.some((currentItem) => currentItem.id === candidate.id || (currentItem.url && currentItem.url === candidate.url)),
      );

      const limitMessage = validateReferenceSelectionForRule(modelRule, referenceMedia, newItems);
      if (limitMessage) issues.set(item.id, limitMessage);
    });

    return issues;
  }, [allMedia, modelRule, referenceMedia, selectedIds, slot]);
  const validSelectedIds = useMemo(() => {
    const next = new Set<string>();
    const selectedItems = allMedia.filter((item) => selectedIds.has(item.id));

    selectedItems.forEach((item) => {
      if (!selectionIssueById.has(item.id)) next.add(item.id);
    });

    return next;
  }, [allMedia, selectedIds, selectionIssueById]);
  const selectedCount = validSelectedIds.size;
  const rawSelectedCount = selectedIds.size;
  const invalidSelectedCount = Math.max(0, rawSelectedCount - selectedCount);

  useEffect(() => {
    if (!isOpen) return;

    previousStatusesRef.current = new Map();
    const frame = window.requestAnimationFrame(() => {
      setActiveFilter("uploads");
      setSelectedIds(new Set());
      setPosition(getDrawerPosition(anchorElement));
    });

    return () => window.cancelAnimationFrame(frame);
  }, [anchorElement, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const previousStatuses = previousStatusesRef.current;
    if (!previousStatuses.size) {
      previousStatusesRef.current = new Map(allMedia.map((item) => [item.id, item.uploadStatus]));
      return;
    }
    const newlyReadyIds: string[] = [];
    allMedia.forEach((item) => {
      if (item.uploadStatus !== "ready" || previousStatuses.get(item.id) === "ready") return;
      if (!slotAllowsAssetType(slot, item.type) || !isReferenceTypeSupported(modelRule, item.type)) return;
      newlyReadyIds.push(item.id);
    });

    if (newlyReadyIds.length) {
      setSelectedIds((current) => {
        const next = new Set(current);
        newlyReadyIds.forEach((id) => {
          const item = allMedia.find((candidate) => candidate.id === id);
          if (!item) return;
          const selectedItems = allMedia.filter((candidate) => next.has(candidate.id) || candidate.id === id);
          const newItems = selectedItems.filter(
            (candidate) =>
              !referenceMedia.some((currentItem) => currentItem.id === candidate.id || (currentItem.url && currentItem.url === candidate.url)),
          );
          if (validateReferenceSelectionForRule(modelRule, referenceMedia, newItems)) return;
          next.add(id);
        });
        return next;
      });
    }

    previousStatusesRef.current = new Map(allMedia.map((item) => [item.id, item.uploadStatus]));
  }, [allMedia, isOpen, modelRule, referenceMedia, slot]);

  useEffect(() => {
    if (!isOpen) return;

    function reposition() {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        setPosition(getDrawerPosition(anchorElement));
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
  }, [anchorElement, isOpen, onClose]);

  if (!isOpen) return null;

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    if (!allowedTypes.length) {
      onNotice?.("This model does not accept reference media.");
      return;
    }
    const files = Array.from(event.dataTransfer.files || []);
    if (files.length) {
      onClearNotice?.();
      onFiles(files);
    }
  }

  function toggleSelected(item: UploadMediaItem) {
    if (!selectedIds.has(item.id) && (item.uploadStatus !== "ready" || !item.url)) {
      onNotice?.(selectionIssueById.get(item.id) || "Media is not ready yet.");
      return;
    }

    onClearNotice?.();
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(item.id)) next.delete(item.id);
      else {
        const issue = selectionIssueById.get(item.id);
        if (issue) {
          onNotice?.(issue);
          return next;
        }
        next.add(item.id);
      }
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
    const didAdd = onAddSelected(Array.from(validSelectedIds));
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
    <div className="fixed inset-0 z-50 bg-black/8" onClick={onClose}>
      <section
        className="fixed flex flex-col overflow-visible rounded-[22px] border border-white/10 bg-[#10141c]/98 shadow-2xl shadow-black/55"
        onClick={(event) => event.stopPropagation()}
        style={drawerStyle}
      >
        <span className="pointer-events-none absolute -left-2 top-12 h-4 w-4 rotate-45 border-b border-l border-white/10 bg-[#10141c]" />

        <header className="flex shrink-0 items-start justify-between border-b border-white/10 px-4 py-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#ffcf83]">ShadowEdge Assets</p>
            <h2 className="mt-1 text-xl font-black text-white">My Assets</h2>
            <p className="mt-1 text-xs font-medium text-white/42">Upload or select existing media for this generation.</p>
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

        <div className="se-subtle-scrollbar min-h-0 flex-1 overflow-y-auto p-3.5">
          <button
            className="grid min-h-[94px] w-full place-items-center rounded-[20px] border border-dashed border-[#ffb44d]/32 bg-[#ffb44d]/8 px-4 text-center transition hover:bg-[#ffb44d]/12"
            onClick={() => {
              if (!allowedTypes.length) {
                onNotice?.("This model does not accept reference media.");
                return;
              }
              onClearNotice?.();
              inputRef.current?.click();
            }}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            type="button"
          >
            <span>
              <span className="mx-auto mb-2 grid size-8 place-items-center rounded-full border border-white/10 bg-black/32 text-xl font-black text-white/58">
                +
              </span>
              <span className="mb-2 flex justify-center gap-1.5">
                {(allowedTypes.length ? allowedTypes : (["image", "video", "audio"] as UploadMediaType[])).map((item) => (
                  <span className="rounded-full border border-white/10 bg-black/24 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[.12em] text-white/54" key={item}>
                    {mediaTypeLabel(item)}
                  </span>
                ))}
              </span>
              <span className="block text-sm font-black text-white">Upload new media</span>
              <span className="mt-1 block text-xs text-white/48">
                {allowedTypes.length ? `Allowed: ${allowedTypeLabel}` : "This model does not accept reference media."}
              </span>
            </span>
          </button>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {filters.map((filter) => (
              <button
                className={`rounded-full border px-3 py-1.5 text-[11px] font-black transition ${
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

          <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/18 px-3 py-2">
            <span className="min-w-0 truncate text-xs font-bold text-white/58">
              Target: <span className="text-white">{modelRule.label}</span>
            </span>
            <span className="hidden min-w-0 truncate text-xs font-bold text-white/38 sm:block">
              {limitSummary.total} max · {limitSummary.image} img · {limitSummary.video} vid · {limitSummary.audio} aud
            </span>
            <button
              className="shrink-0 rounded-full border border-white/10 px-3 py-1 text-[11px] font-black text-white/52 transition hover:border-[#ffb44d]/35 hover:text-[#ffd08a] disabled:cursor-not-allowed disabled:opacity-45"
              disabled={!rawSelectedCount}
              onClick={() => {
                onClearNotice?.();
                setSelectedIds(new Set());
              }}
              type="button"
            >
              Clear selected
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <h3 className="text-sm font-black text-white">Assets</h3>
            <span className="text-xs font-bold text-white/38">{visibleMedia.length} shown</span>
          </div>

          {notice ? (
            <div className="mt-3 rounded-2xl border border-[#ffb44d]/25 bg-[#ffb44d]/10 px-3 py-2 text-xs font-bold text-[#ffd08a]">
              {notice}
            </div>
          ) : null}

          {visibleMedia.length ? (
            <div className="mt-3 grid grid-cols-3 gap-2.5">
              {visibleMedia.map((item) => {
                const selectIssue = selectionIssueById.get(item.id) || "";
                const isRawSelected = selectedIds.has(item.id);
                const isSelected = validSelectedIds.has(item.id);
                const isSelectable = item.uploadStatus === "ready" && Boolean(item.url) && !selectIssue;
                const isFailed = item.uploadStatus === "failed";
                const isAlreadyAdded = selectIssue === "Already added to references.";
                const isUnsupported = Boolean(selectIssue) && !isAlreadyAdded && !isFailed && item.uploadStatus !== "uploading";
                const canRemove = item.source !== "history" && item.source !== "generated_result";

                return (
                  <article
                    className={`group relative overflow-hidden rounded-[18px] border transition ${
                      isFailed
                        ? "border-red-300/30 bg-red-400/10"
                        : isAlreadyAdded
                          ? "border-[#ffb44d]/28 bg-[#ffb44d]/8"
                        : isUnsupported
                          ? "border-white/10 bg-white/[.025] opacity-50"
                          : isSelected
                            ? "border-[#ffb44d]/70 bg-[#ffb44d]/12"
                            : "border-white/10 bg-black/24 hover:border-[#ffb44d]/35"
                    }`}
                    key={item.id}
                    title={selectIssue || item.name}
                  >
                    <button
                      className={`block w-full text-left ${isSelectable ? "cursor-pointer" : "cursor-default"}`}
                      disabled={!isSelectable && !isRawSelected}
                      onClick={() => toggleSelected(item)}
                      type="button"
                    >
                      <span className="relative grid aspect-square place-items-center overflow-hidden bg-white/[.045]">
                        {item.type === "image" && item.previewUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img alt="" className="h-full w-full object-cover" src={item.previewUrl} />
                        ) : item.type === "video" && item.url ? (
                          <video className="h-full w-full object-cover" muted playsInline preload="metadata" src={item.url} />
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
                            <CheckIcon />
                          </span>
                        ) : null}
                      </span>
                      <span className="grid gap-1.5 p-2">
                        <span className="truncate text-xs font-bold text-white/72">{item.name}</span>
                        <span className="flex min-w-0 items-center gap-1.5 text-[10px] font-black uppercase tracking-[.12em]">
                          <span className={isFailed || isUnsupported ? "text-red-100/75" : isAlreadyAdded ? "text-[#ffd08a]/72" : "text-white/38"}>
                            {statusLabel(item.uploadStatus, selectIssue)}
                          </span>
                          <span className="text-white/22">·</span>
                          <span className="truncate text-white/34">{getMediaAssetSourceLabel(item.source)}</span>
                        </span>
                        {isUnsupported ? <span className="line-clamp-2 text-xs leading-5 text-red-100/78">{selectIssue}</span> : null}
                        {item.errorMessage ? <span className="line-clamp-2 text-xs leading-5 text-red-100/78">{item.errorMessage}</span> : null}
                      </span>
                    </button>
                    {canRemove ? (
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
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-3 rounded-[20px] border border-dashed border-white/12 p-8 text-center text-sm text-white/42">
              {emptyStateText(activeFilter)}
            </div>
          )}
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-white/10 px-4 py-3">
          <span className="text-xs font-bold text-white/45">
            {selectedCount} valid{rawSelectedCount !== selectedCount ? ` · ${rawSelectedCount} selected` : ""}
            {invalidSelectedCount ? ` · ${invalidSelectedCount} blocked` : ""}
          </span>
          <div className="flex gap-2">
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
