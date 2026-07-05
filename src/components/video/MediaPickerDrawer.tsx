"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, DragEvent, RefObject } from "react";
import { listMediaAssets, mediaAssetToUploadMediaItem } from "@/lib/assets-api";
import { getMediaUploadErrorDisplayKeys, getSafeMediaItemDisplayName, mergeMediaAssets, normalizeMediaAssetUrl } from "@/lib/media-assets";
import { MediaTypeIcon } from "@/components/video/MediaTypeIcon";
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
import { ApiError } from "@/types/api";
import { useI18n } from "@/i18n/useI18n";

type MediaFilter = "uploads" | "assets" | "history" | "generated" | UploadMediaType | "elements" | "liked";

type DrawerPosition = {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
};

const drawerWidth = 600;
const drawerMinWidth = 520;
const drawerMaxHeight = 520;

const filters: MediaFilter[] = ["uploads", "assets", "history", "generated", "image", "video", "audio", "elements", "liked"];

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
  onAddSelected: (ids: string[], availableMedia?: UploadMediaItem[]) => boolean;
  onClearNotice?: () => void;
  onClose: () => void;
  onFiles: (files: File[]) => void;
  onNotice?: (notice: string) => void;
  onRemove: (id: string) => void;
  referenceMedia: UploadMediaItem[];
  reusableMedia?: UploadMediaItem[];
  slot: string;
}) {
  const { locale, t, tf } = useI18n();
  const displayLocale = locale === "zh" ? "zh" : "en";
  const [activeFilter, setActiveFilter] = useState<MediaFilter>("uploads");
  const [position, setPosition] = useState<DrawerPosition>({ left: 16, maxHeight: 520, top: 72, width: 600 });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [assetLibraryMedia, setAssetLibraryMedia] = useState<UploadMediaItem[]>([]);
  const [assetLibraryStatus, setAssetLibraryStatus] = useState<"idle" | "loading" | "auth" | "error">("idle");
  const previousStatusesRef = useRef<Map<string, UploadMediaItem["uploadStatus"]>>(new Map());
  const rafRef = useRef<number | null>(null);

  function localizedMediaTypeLabel(type: UploadMediaItem["type"]) {
    if (type === "audio") return t("video.media.audio");
    if (type === "video") return t("video.media.video");
    return t("video.media.image");
  }

  function filterLabel(filter: MediaFilter) {
    if (filter === "assets") return t("video.drawer.tabs.assetsLibrary");
    if (filter === "history") return t("video.drawer.tabs.history");
    if (filter === "generated") return t("video.drawer.tabs.generated");
    if (filter === "image") return t("video.drawer.tabs.images");
    if (filter === "video") return t("video.drawer.tabs.videos");
    if (filter === "audio") return t("video.drawer.tabs.audios");
    if (filter === "elements") return t("video.drawer.tabs.elements");
    if (filter === "liked") return t("video.drawer.tabs.liked");
    return t("video.drawer.tabs.uploads");
  }

  function emptyLabel(filter: MediaFilter) {
    if (filter === "assets") return t("video.drawer.empty.assetsLibrary");
    if (filter === "history") return t("video.drawer.empty.history");
    if (filter === "generated") return t("video.drawer.empty.generated");
    if (filter === "elements") return t("video.drawer.empty.elements");
    if (filter === "liked") return t("video.drawer.empty.liked");
    if (filter === "image") return t("video.drawer.empty.images");
    if (filter === "video") return t("video.drawer.empty.videos");
    if (filter === "audio") return t("video.drawer.empty.audios");
    return t("video.drawer.empty.uploads");
  }

  function sourceLabel(source: UploadMediaItem["source"]) {
    if (source === "current_upload") return t("video.drawer.source.current");
    if (source === "reference_selected") return t("video.drawer.source.added");
    if (source === "asset-library") return t("video.drawer.source.assetLibrary");
    if (source === "generated_result") return t("video.drawer.source.generated");
    if (source === "history") return t("video.drawer.source.history");
    return t("video.drawer.source.uploads");
  }

  function localizeIssue(issue: string) {
    if (!issue) return "";
    const uploadDisplay = getMediaUploadErrorDisplayKeys(issue, { fallbackKind: "upload" });
    if (uploadDisplay.kind === "auth") return t(uploadDisplay.messageKey);
    if (issue === "Already added to references.") return t("video.drawer.alreadyAdded");
    if (issue === "Upload failed.") return t(uploadDisplay.messageKey);
    if (issue === "Upload still in progress.") return t("video.drawer.uploading");
    if (issue === "Media URL is not ready yet.") return t("video.drawer.urlNotReady");
    if (issue === "Unsupported file type for this slot.") return t("video.upload.unsupportedType");
    if (issue === "Generated results cannot be used as references for this model.") return t("video.drawer.generatedUnsupported");
    if (issue === "Media is not ready yet.") return t("video.drawer.urlNotReady");
    if (issue === "This model does not accept reference media.") return t("video.references.modelDoesNotAccept");
    if (issue.includes("does not support image references")) return t("video.errors.unsupportedImageReference");
    if (issue.includes("does not support video references")) return t("video.errors.unsupportedVideoReference");
    if (issue.includes("does not support audio references")) return t("video.errors.unsupportedAudioReference");
    if (issue.includes("Reference limit reached")) return t("video.drawer.referenceLimitReached");
    if (issue.includes("supports up to")) return t("video.drawer.typeLimitReached");
    return issue;
  }

  function localizedStatusLabel(status: UploadMediaItem["uploadStatus"], issue: string) {
    if (status === "uploading") return t("common.status.uploading");
    if (status === "failed") return t("media.upload.unavailableTitle");
    if (issue === "Already added to references.") return t("video.drawer.status.added");
    if (issue) return t("video.drawer.status.blocked");
    if (status === "ready") return t("common.status.ready");
    return t("video.drawer.status.local");
  }

  function localizedFailedMediaMessage(errorMessage?: string) {
    const display = getMediaUploadErrorDisplayKeys(errorMessage, { fallbackKind: "unavailable" });
    return `${t(display.messageKey)} ${t("media.upload.removeAndUploadAgain")}`;
  }

  function localizedFailedMediaTitle(errorMessage?: string) {
    const display = getMediaUploadErrorDisplayKeys(errorMessage, { fallbackKind: "unavailable" });
    return t(display.titleKey);
  }

  const nonAssetMedia = useMemo(() => mergeMediaAssets(currentMedia, localMedia, reusableMedia), [currentMedia, localMedia, reusableMedia]);
  const allMedia = useMemo(() => mergeMediaAssets(nonAssetMedia, assetLibraryMedia), [assetLibraryMedia, nonAssetMedia]);
  const selectionMedia = useMemo(() => [...assetLibraryMedia, ...allMedia], [allMedia, assetLibraryMedia]);
  const allowedTypes = useMemo(() => getAllowedReferenceTypes(modelRule), [modelRule]);
  const limitSummary = useMemo(() => getReferenceLimitSummary(modelRule), [modelRule]);
  const visibleMedia = useMemo(() => {
    if (activeFilter === "uploads") return nonAssetMedia;
    if (activeFilter === "assets") return assetLibraryMedia;
    if (activeFilter === "history") return allMedia.filter((item) => item.source === "history");
    if (activeFilter === "generated") return allMedia.filter((item) => item.source === "generated_result");
    if (activeFilter === "elements" || activeFilter === "liked") return [];
    return allMedia.filter((item) => item.type === activeFilter);
  }, [activeFilter, allMedia, assetLibraryMedia, nonAssetMedia]);

  const allowedTypeLabel = allowedTypes.length ? allowedTypes.map((type) => localizedMediaTypeLabel(type).toLowerCase()).join(", ") : "";
  const selectionIssueById = useMemo(() => {
    const issues = new Map<string, string>();
    const selectedItems = selectionMedia.filter((item) => selectedIds.has(item.id));

    selectionMedia.forEach((item) => {
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
  }, [modelRule, referenceMedia, selectedIds, selectionMedia, slot]);
  const unavailableNotice = useMemo(() => {
    if (notice || !visibleMedia.length) return "";
    const failedCount = visibleMedia.filter((item) => item.uploadStatus === "failed").length;
    return failedCount > 0 && failedCount === visibleMedia.length ? t("media.upload.unavailableNotice") : "";
  }, [notice, t, visibleMedia]);
  const assetLibraryNotice = useMemo(() => {
    if (activeFilter !== "assets") return "";
    if (assetLibraryStatus === "loading") return t("video.drawer.assetsLoading");
    if (assetLibraryStatus === "auth") return t("video.drawer.assetsAuthRequired");
    if (assetLibraryStatus === "error") return t("video.drawer.assetsLoadError");
    return "";
  }, [activeFilter, assetLibraryStatus, t]);
  const validSelectedIds = useMemo(() => {
    const next = new Set<string>();
    const selectedItems = selectionMedia.filter((item) => selectedIds.has(item.id));

    selectedItems.forEach((item) => {
      if (!selectionIssueById.has(item.id)) next.add(item.id);
    });

    return next;
  }, [selectedIds, selectionIssueById, selectionMedia]);
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

    let cancelled = false;

    async function loadAssets() {
      setAssetLibraryStatus("loading");

      try {
        const result = await listMediaAssets({ limit: 100, status: "ready" });
        if (cancelled) return;
        setAssetLibraryMedia(
          result.assets
            .map(mediaAssetToUploadMediaItem)
            .filter((item): item is UploadMediaItem => Boolean(item))
            .filter((item) => item.type === "image" || item.type === "video" || item.type === "audio"),
        );
        setAssetLibraryStatus("idle");
      } catch (error) {
        if (cancelled) return;
        setAssetLibraryMedia([]);
        setAssetLibraryStatus(error instanceof ApiError && error.kind === "auth" ? "auth" : "error");
      }
    }

    void loadAssets();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const previousStatuses = previousStatusesRef.current;
    if (!previousStatuses.size) {
      previousStatusesRef.current = new Map(selectionMedia.map((item) => [item.id, item.uploadStatus]));
      return;
    }
    const newlyReadyIds: string[] = [];
    selectionMedia.forEach((item) => {
      if (item.source === "asset-library") return;
      if (item.uploadStatus !== "ready" || previousStatuses.get(item.id) === "ready") return;
      if (!slotAllowsAssetType(slot, item.type) || !isReferenceTypeSupported(modelRule, item.type)) return;
      newlyReadyIds.push(item.id);
    });

    if (newlyReadyIds.length) {
      setSelectedIds((current) => {
        const next = new Set(current);
        newlyReadyIds.forEach((id) => {
          const item = selectionMedia.find((candidate) => candidate.id === id);
          if (!item) return;
          const selectedItems = selectionMedia.filter((candidate) => next.has(candidate.id) || candidate.id === id);
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

    previousStatusesRef.current = new Map(selectionMedia.map((item) => [item.id, item.uploadStatus]));
  }, [isOpen, modelRule, referenceMedia, selectionMedia, slot]);

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
      onNotice?.(t("video.references.modelDoesNotAccept"));
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
      onNotice?.(
        item.uploadStatus === "failed"
          ? localizedFailedMediaMessage(item.errorMessage)
          : localizeIssue(selectionIssueById.get(item.id) || "Media is not ready yet."),
      );
      return;
    }

    onClearNotice?.();
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(item.id)) next.delete(item.id);
      else {
        const issue = selectionIssueById.get(item.id);
        if (issue) {
          onNotice?.(localizeIssue(issue));
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
    const didAdd = onAddSelected(Array.from(validSelectedIds), selectionMedia);
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
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#ffcf83]">{t("video.drawer.headerEyebrow")}</p>
            <h2 className="mt-1 text-xl font-black text-white">{t("video.drawer.myAssets")}</h2>
            <p className="mt-1 text-xs font-medium text-white/42">{t("video.drawer.description")}</p>
          </div>
          <button
            aria-label={t("video.drawer.close")}
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
                onNotice?.(t("video.references.modelDoesNotAccept"));
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
                    {localizedMediaTypeLabel(item)}
                  </span>
                ))}
              </span>
              <span className="block text-sm font-black text-white">{t("video.upload.new")}</span>
              <span className="mt-1 block text-xs text-white/48">
                {allowedTypes.length ? tf("video.drawer.allowedTypes", { types: allowedTypeLabel }) : t("video.references.modelDoesNotAccept")}
              </span>
            </span>
          </button>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {filters.map((filter) => (
              <button
                className={`rounded-full border px-3 py-1.5 text-[11px] font-black transition ${
                  activeFilter === filter
                    ? "border-[#ffb44d]/60 bg-[#ffb44d]/18 text-[#ffd08a]"
                    : "border-white/10 bg-white/[.045] text-white/52 hover:border-[#ffb44d]/30 hover:text-white"
                }`}
                key={filter}
                onClick={() => {
                  onClearNotice?.();
                  setActiveFilter(filter);
                }}
                type="button"
              >
                {filterLabel(filter)}
              </button>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/18 px-3 py-2">
            <span className="min-w-0 truncate text-xs font-bold text-white/58">
              {tf("video.drawer.targetModel", { model: modelRule.label })}
            </span>
            <span className="hidden min-w-0 truncate text-xs font-bold text-white/38 sm:block">
              {tf("video.drawer.limitSummary", { audio: limitSummary.audio, image: limitSummary.image, total: limitSummary.total, video: limitSummary.video })}
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
              {t("video.drawer.clearSelected")}
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <h3 className="text-sm font-black text-white">{t("video.drawer.assets")}</h3>
            <span className="text-xs font-bold text-white/38">{tf("video.drawer.shownCount", { count: visibleMedia.length })}</span>
          </div>

          {notice || unavailableNotice || assetLibraryNotice ? (
            <div className="mt-3 rounded-2xl border border-[#ffb44d]/25 bg-[#ffb44d]/10 px-3 py-2 text-xs font-bold text-[#ffd08a]">
              {notice ? localizeIssue(notice) : unavailableNotice || assetLibraryNotice}
            </div>
          ) : null}

          {visibleMedia.length ? (
            <div className="mt-3 grid grid-cols-3 gap-2.5">
              {visibleMedia.map((item, itemIndex) => {
                const selectIssue = selectionIssueById.get(item.id) || "";
                const isRawSelected = selectedIds.has(item.id);
                const isSelected = validSelectedIds.has(item.id);
                const isSelectable = item.uploadStatus === "ready" && Boolean(item.url) && !selectIssue;
                const isFailed = item.uploadStatus === "failed";
                const isAlreadyAdded = selectIssue === "Already added to references.";
                const isUnsupported = Boolean(selectIssue) && !isAlreadyAdded && !isFailed && item.uploadStatus !== "uploading";
                const canRemove = item.source !== "history" && item.source !== "generated_result" && item.source !== "asset-library";
                const displayName = getSafeMediaItemDisplayName(item, itemIndex, displayLocale);
                const failedMediaMessage = isFailed ? localizedFailedMediaMessage(item.errorMessage) : "";
                const previewUrl = normalizeMediaAssetUrl(item.previewUrl) || normalizeMediaAssetUrl(item.url);

                return (
                  <article
                    className={`group relative overflow-hidden rounded-[18px] border transition ${
                      isFailed
                        ? "border-[#8c4632]/42 bg-[#2a1012]/72"
                        : isAlreadyAdded
                          ? "border-[#ffb44d]/28 bg-[#ffb44d]/8"
                        : isUnsupported
                          ? "border-white/10 bg-white/[.025] opacity-50"
                          : isSelected
                            ? "border-[#ffb44d]/70 bg-[#ffb44d]/12"
                            : "border-white/10 bg-black/24 hover:border-[#ffb44d]/35"
                    }`}
                    key={item.id}
                    title={isFailed ? localizedFailedMediaTitle(item.errorMessage) : selectIssue || displayName}
                  >
                    <button
                      className={`block w-full text-left ${isSelectable ? "cursor-pointer" : "cursor-default"}`}
                      disabled={!isSelectable && !isRawSelected}
                      onClick={() => toggleSelected(item)}
                      type="button"
                    >
                      <span className="relative grid aspect-square place-items-center overflow-hidden bg-white/[.045]">
                        {item.type === "image" && previewUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img alt="" className="h-full w-full object-cover" src={previewUrl} />
                        ) : item.type === "video" && item.url ? (
                          <video className="h-full w-full object-cover" muted playsInline preload="metadata" src={item.url} />
                        ) : (
                          <span className="grid size-11 place-items-center rounded-2xl border border-white/10 bg-[#111318]/78 text-[#ffd08a]/78 shadow-inner shadow-black/20">
                            <MediaTypeIcon type={item.type} />
                          </span>
                        )}
                        <span className="absolute left-2 top-2 rounded-full border border-white/10 bg-black/55 px-2 py-1 text-[10px] font-black uppercase tracking-[.12em] text-white/72 backdrop-blur">
                          {localizedMediaTypeLabel(item.type)}
                        </span>
                        {isSelected ? (
                          <span className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-[#ffb44d] text-xs font-black text-[#1f2027]">
                            <CheckIcon />
                          </span>
                        ) : null}
                      </span>
                      <span className="grid gap-1.5 p-2">
                        <span className="truncate text-xs font-bold text-white/72">{displayName}</span>
                        <span className="flex min-w-0 items-center gap-1.5 text-[10px] font-black uppercase tracking-[.12em]">
                          <span className={isFailed || isUnsupported ? "text-[#f2b3a1]/75" : isAlreadyAdded ? "text-[#ffd08a]/72" : "text-white/38"}>
                            {localizedStatusLabel(item.uploadStatus, selectIssue)}
                          </span>
                          <span className="text-white/22">·</span>
                          <span className="truncate text-white/34">{sourceLabel(item.source)}</span>
                        </span>
                        {isUnsupported ? <span className="line-clamp-2 text-xs leading-5 text-[#f2b3a1]/78">{localizeIssue(selectIssue)}</span> : null}
                        {isFailed ? <span className="line-clamp-2 text-xs leading-5 text-[#f2b3a1]/78">{failedMediaMessage}</span> : null}
                      </span>
                    </button>
                    {canRemove ? (
                      <button
                        aria-label={tf("video.drawer.removeAsset", { name: displayName })}
                        className="se-button-danger absolute bottom-2 right-2 rounded-full px-2 py-1 text-[10px] font-bold opacity-0 group-hover:opacity-100"
                        onClick={(event) => {
                          event.stopPropagation();
                          removeAsset(item.id);
                        }}
                        type="button"
                      >
                        {t("video.references.remove")}
                      </button>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-3 rounded-[20px] border border-dashed border-white/12 p-8 text-center text-sm text-white/42">
              {activeFilter === "assets" && assetLibraryStatus === "loading" ? t("video.drawer.assetsLoading") : emptyLabel(activeFilter)}
            </div>
          )}
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-white/10 px-4 py-3">
          <span className="text-xs font-bold text-white/45">
            {rawSelectedCount !== selectedCount ? tf("video.drawer.validSelectedCount", { total: rawSelectedCount, valid: selectedCount }) : tf("video.drawer.validCount", { count: selectedCount })}{invalidSelectedCount ? ` · ${tf("video.drawer.blockedCount", { count: invalidSelectedCount })}` : ""}
          </span>
          <div className="flex gap-2">
            <button
              className="se-button-primary rounded-full px-4 py-2 text-xs font-black"
              disabled={!selectedCount}
              onClick={addSelected}
              type="button"
            >
              {t("video.drawer.addSelected")}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
