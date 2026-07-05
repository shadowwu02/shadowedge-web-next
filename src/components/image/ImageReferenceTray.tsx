"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/i18n/useI18n";
import { listMediaAssets, mediaAssetToImageReferenceItem } from "@/lib/assets-api";
import { getMediaUploadErrorDisplayKeys, getSafeMediaItemDisplayName, normalizeMediaAssetUrl } from "@/lib/media-assets";
import { ApiError } from "@/types/api";
import type { ImageModel, ImageReferenceItem } from "@/types/image";

function ImageIcon() {
  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
      <rect height="16" rx="3" stroke="currentColor" strokeWidth="2" width="18" x="3" y="4" />
      <path d="m7 16 3-3 2 2 3-4 2 5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <circle cx="8" cy="9" fill="currentColor" r="1.2" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" className="size-3.5" fill="none" viewBox="0 0 24 24">
      <path d="M4 7h16" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
      <path d="M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" className="size-3.5" fill="none" viewBox="0 0 24 24">
      <path d="m5 12 4.2 4.2L19 6.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
    </svg>
  );
}

function formatBytes(value?: number) {
  if (!value) return "";
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function isSameReference(left: ImageReferenceItem, right: ImageReferenceItem) {
  return (
    left.id === right.id ||
    Boolean(left.url && right.url && left.url === right.url) ||
    Boolean(left.assetId && right.assetId && left.assetId === right.assetId)
  );
}

function getReferencePreviewUrl(reference: ImageReferenceItem) {
  return normalizeMediaAssetUrl(reference.previewUrl) || normalizeMediaAssetUrl(reference.url);
}

export function ImageReferenceTray({
  model,
  onAddReferences,
  references,
  onRemove,
  onUploadFile,
}: {
  model: ImageModel | null;
  onAddReferences: (references: ImageReferenceItem[]) => boolean;
  references: ImageReferenceItem[];
  onRemove: (referenceId: string) => void;
  onUploadFile: (file: File) => void;
}) {
  const { locale, t, tf } = useI18n();
  const displayLocale = locale === "zh" ? "zh" : "en";
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isAssetPickerOpen, setIsAssetPickerOpen] = useState(false);
  const [assetReferences, setAssetReferences] = useState<ImageReferenceItem[]>([]);
  const [assetStatus, setAssetStatus] = useState<"idle" | "loading" | "auth" | "error">("idle");
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const maxReferences = model?.capabilities.maxReferences || 0;
  const canUpload = references.length < maxReferences;
  const remainingSlots = Math.max(0, maxReferences - references.length);
  const uploadTitle = !maxReferences
    ? t("image.references.unsupportedTitleAttr")
    : !canUpload
      ? t("image.references.limitTitle")
      : t("image.references.addTitle");
  const getUploadStatusLabel = (reference: ImageReferenceItem) => {
    if (reference.uploadStatus === "uploading") return t("image.status.uploading");
    if (reference.uploadStatus === "failed") return t("media.upload.unavailableTitle");
    return reference.url ? t("image.status.ready") : t("image.status.local");
  };
  const selectedAssetReferences = useMemo(
    () => assetReferences.filter((reference) => selectedAssetIds.has(reference.id) && !references.some((current) => isSameReference(current, reference))),
    [assetReferences, references, selectedAssetIds],
  );
  const assetNotice = useMemo(() => {
    if (assetStatus === "loading") return t("image.assets.loading");
    if (assetStatus === "auth") return t("image.assets.authRequired");
    if (assetStatus === "error") return t("image.assets.loadError");
    return "";
  }, [assetStatus, t]);

  useEffect(() => {
    if (!isAssetPickerOpen) return;

    let cancelled = false;

    async function loadAssets() {
      try {
        const result = await listMediaAssets({ limit: 100, status: "ready", type: "image" });
        if (cancelled) return;
        setAssetReferences(
          result.assets
            .map(mediaAssetToImageReferenceItem)
            .filter((item): item is ImageReferenceItem => Boolean(item))
            .filter((item) => item.uploadStatus === "ready" && Boolean(item.url)),
        );
        setAssetStatus("idle");
      } catch (error) {
        if (cancelled) return;
        setAssetReferences([]);
        setAssetStatus(error instanceof ApiError && error.kind === "auth" ? "auth" : "error");
      }
    }

    void loadAssets();

    return () => {
      cancelled = true;
    };
  }, [isAssetPickerOpen]);

  function getAssetSourceLabel(reference: ImageReferenceItem) {
    const raw = reference.raw && typeof reference.raw === "object" ? (reference.raw as Record<string, unknown>) : {};
    const source = String(raw.source || reference.source || "").toLowerCase();
    if (source === "generated") return t("image.assets.source.generated");
    if (source === "prompt_studio") return t("image.assets.source.promptStudio");
    if (source === "imported") return t("image.assets.source.imported");
    return t("image.assets.source.uploaded");
  }

  function toggleAsset(reference: ImageReferenceItem) {
    const isAlreadyAdded = references.some((current) => isSameReference(current, reference));
    if (isAlreadyAdded) return;

    setSelectedAssetIds((current) => {
      const next = new Set(current);
      if (next.has(reference.id)) {
        next.delete(reference.id);
        return next;
      }

      const validSelectedCount = assetReferences.filter((item) => next.has(item.id) && !references.some((currentItem) => isSameReference(currentItem, item))).length;
      if (validSelectedCount >= remainingSlots) return next;

      next.add(reference.id);
      return next;
    });
  }

  function addSelectedAssets() {
    if (!selectedAssetReferences.length) return;
    const didAdd = onAddReferences(selectedAssetReferences);
    if (!didAdd) return;
    setSelectedAssetIds(new Set());
    setIsAssetPickerOpen(false);
  }

  function openAssetPicker() {
    setSelectedAssetIds(new Set());
    setAssetStatus("loading");
    setIsAssetPickerOpen(true);
  }

  return (
    <section className="se-card rounded-[24px] p-3.5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="se-eyebrow">{t("image.workspace.referenceImages")}</p>
          <p className="mt-1 text-xs text-[#b9b9b9]/55">
            {maxReferences ? tf("image.references.count", { current: references.length, max: maxReferences }) : t("image.references.textOnly")}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <button
            className="se-button-secondary inline-flex min-h-9 items-center justify-center gap-2 rounded-[15px] px-3 text-xs font-semibold"
            disabled={!canUpload}
            onClick={openAssetPicker}
            title={maxReferences ? t("image.assets.choose") : t("image.references.unsupportedTitleAttr")}
            type="button"
          >
            <ImageIcon />
            {t("image.assets.choose")}
          </button>
          <button
            className="se-button-secondary inline-flex min-h-9 items-center justify-center gap-2 rounded-[15px] px-3 text-xs font-semibold"
            disabled={!canUpload}
            onClick={() => inputRef.current?.click()}
            title={uploadTitle}
            type="button"
          >
            <ImageIcon />
            {t("image.references.add")}
          </button>
        </div>
        <input
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          multiple
          onChange={(event) => {
            const files = Array.from(event.target.files || []);
            files.slice(0, Math.max(0, maxReferences - references.length)).forEach(onUploadFile);
            event.target.value = "";
          }}
          ref={inputRef}
          type="file"
        />
      </div>

      {references.length ? (
        <div className="grid grid-cols-2 gap-2">
          {references.map((reference, referenceIndex) => {
            const displayName = getSafeMediaItemDisplayName(
              { ...reference, source: "reference_selected", type: "image" },
              referenceIndex,
              displayLocale,
            );
            const previewUrl = getReferencePreviewUrl(reference);
            const failedDisplay =
              reference.uploadStatus === "failed" ? getMediaUploadErrorDisplayKeys(reference.errorMessage, { fallbackKind: "unavailable" }) : null;

            return (
              <article className="group overflow-hidden rounded-[18px] border border-white/10 bg-[#05070b]/62" key={reference.id}>
                <div className="relative aspect-square bg-black/40">
                  {previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt={displayName} className="h-full w-full object-cover" src={previewUrl} />
                  ) : (
                    <div className="grid h-full place-items-center text-[#ffd08a]/70">
                      <ImageIcon />
                    </div>
                  )}
                  <button
                    aria-label={tf("image.references.remove", { name: displayName })}
                    className="se-icon-button-danger absolute right-2 top-2 grid size-7 place-items-center rounded-full opacity-100 shadow-lg shadow-black/30 sm:opacity-0 sm:group-hover:opacity-100"
                    onClick={() => onRemove(reference.id)}
                    type="button"
                  >
                    <TrashIcon />
                  </button>
                </div>
                <div className="p-2">
                  <p className="truncate text-[11px] font-semibold text-[#f4f4f4]/78">{displayName}</p>
                  <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-[#b9b9b9]/45">
                    <span>{formatBytes(reference.size) || t("image.references.generic")}</span>
                    <span className={reference.uploadStatus === "failed" ? "text-[#f2b3a1]" : reference.uploadStatus === "uploading" ? "text-[#ffd08a]" : "text-[#b8e7ee]"}>
                      {getUploadStatusLabel(reference)}
                    </span>
                  </div>
                  {failedDisplay ? (
                    <p className="mt-1 line-clamp-2 text-[10px] text-[#f2b3a1]/78">
                      {t(failedDisplay.messageKey)} {t("media.upload.removeAndUploadAgain")}
                    </p>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <button
          className={`grid w-full place-items-center rounded-[22px] border border-dashed border-white/12 bg-white/[.025] text-center transition-colors hover:border-[#ffb44d]/28 hover:bg-[#ffb44d]/7 disabled:hover:border-white/12 disabled:hover:bg-white/[.025] ${maxReferences ? "min-h-[148px]" : "min-h-[92px]"}`}
          disabled={!canUpload}
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          <span>
            <span className={`mx-auto grid place-items-center border border-[#ffb44d]/20 bg-[#ffb44d]/10 text-[#ffd08a] ${maxReferences ? "size-11 rounded-2xl" : "size-8 rounded-xl"}`}>
              <ImageIcon />
            </span>
            <span className={`block font-semibold text-[#f4f4f4] ${maxReferences ? "mt-3 text-sm" : "mt-2 text-xs"}`}>{maxReferences ? t("image.references.uploadTitle") : t("image.references.unsupportedTitle")}</span>
            <span className="mt-0.5 block text-xs text-[#b9b9b9]/52">
              {maxReferences ? t("image.references.uploadHint") : t("image.references.unsupportedHint")}
            </span>
          </span>
        </button>
      )}
      {maxReferences && !canUpload ? (
        <p className="mt-2 rounded-full border border-[#ffb44d]/16 bg-[#ffb44d]/8 px-3 py-1.5 text-[11px] font-semibold text-[#ffd08a]/75">
          {t("image.references.limitReached")}
        </p>
      ) : null}
      {isAssetPickerOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 px-4 py-6 backdrop-blur-sm" onClick={() => setIsAssetPickerOpen(false)}>
          <section
            className="flex max-h-[min(720px,calc(100vh-48px))] w-full max-w-3xl flex-col overflow-hidden rounded-[26px] border border-white/10 bg-[#10141c]/98 shadow-2xl shadow-black/60"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#ffcf83]">{t("image.assets.eyebrow")}</p>
                <h2 className="mt-1 text-xl font-black text-white">{t("image.assets.title")}</h2>
                <p className="mt-1 text-xs font-medium text-white/45">{t("image.assets.description")}</p>
              </div>
              <button
                aria-label={t("image.assets.close")}
                className="grid size-9 place-items-center rounded-full border border-white/10 bg-white/[.055] text-base font-black text-white/68 transition hover:border-[#ffb44d]/35 hover:text-[#ffd08a]"
                onClick={() => setIsAssetPickerOpen(false)}
                type="button"
              >
                x
              </button>
            </header>

            <div className="se-subtle-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/18 px-3 py-2">
                <span className="text-xs font-bold text-white/58">{tf("image.assets.referenceSlots", { current: references.length, max: maxReferences })}</span>
                <span className="text-xs font-bold text-white/38">{tf("image.assets.shownCount", { count: assetReferences.length })}</span>
              </div>

              {assetNotice ? (
                <div className="mt-3 rounded-2xl border border-[#ffb44d]/25 bg-[#ffb44d]/10 px-3 py-2 text-xs font-bold text-[#ffd08a]">
                  {assetNotice}
                </div>
              ) : null}

              {assetReferences.length ? (
                <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {assetReferences.map((reference, assetIndex) => {
                    const isAlreadyAdded = references.some((current) => isSameReference(current, reference));
                    const isSelected = selectedAssetIds.has(reference.id);
                    const isLimitBlocked = !isSelected && !isAlreadyAdded && selectedAssetReferences.length >= remainingSlots;
                    const previewUrl = getReferencePreviewUrl(reference);
                    const displayName = getSafeMediaItemDisplayName(
                      { ...reference, source: "asset-library", type: "image" },
                      assetIndex,
                      displayLocale,
                    );
                    const disabled = isAlreadyAdded || isLimitBlocked;

                    return (
                      <article
                        className={`group overflow-hidden rounded-[18px] border transition ${
                          isAlreadyAdded
                            ? "border-[#ffb44d]/28 bg-[#ffb44d]/8"
                            : isSelected
                              ? "border-[#ffb44d]/70 bg-[#ffb44d]/12"
                              : isLimitBlocked
                                ? "border-white/10 bg-white/[.025] opacity-55"
                                : "border-white/10 bg-black/24 hover:border-[#ffb44d]/35"
                        }`}
                        key={reference.id}
                      >
                        <button
                          className={`block w-full text-left ${disabled ? "cursor-default" : "cursor-pointer"}`}
                          disabled={disabled}
                          onClick={() => toggleAsset(reference)}
                          type="button"
                        >
                          <span className="relative grid aspect-square place-items-center overflow-hidden bg-white/[.045]">
                            {previewUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img alt="" className="h-full w-full object-cover" src={previewUrl} />
                            ) : (
                              <span className="grid size-11 place-items-center rounded-2xl border border-white/10 bg-[#111318]/78 text-[#ffd08a]/78 shadow-inner shadow-black/20">
                                <ImageIcon />
                              </span>
                            )}
                            <span className="absolute left-2 top-2 rounded-full border border-white/10 bg-black/55 px-2 py-1 text-[10px] font-black uppercase tracking-[.12em] text-white/72 backdrop-blur">
                              {t("image.references.generic")}
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
                              <span className={isAlreadyAdded ? "text-[#ffd08a]/72" : isLimitBlocked ? "text-[#f2b3a1]/75" : "text-white/38"}>
                                {isAlreadyAdded ? t("image.assets.alreadyAdded") : isLimitBlocked ? t("image.references.limitTitle") : t("image.status.ready")}
                              </span>
                              <span className="text-white/22">/</span>
                              <span className="truncate text-white/34">{getAssetSourceLabel(reference)}</span>
                            </span>
                            <span className="text-[10px] font-medium text-white/34">{formatBytes(reference.size) || reference.mimeType || t("image.references.generic")}</span>
                          </span>
                        </button>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-3 rounded-[20px] border border-dashed border-white/12 p-8 text-center text-sm text-white/42">
                  {assetStatus === "loading" ? t("image.assets.loading") : t("image.assets.empty")}
                </div>
              )}
            </div>

            <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-white/10 px-4 py-3">
              <span className="text-xs font-bold text-white/45">{tf("image.assets.selectedCount", { count: selectedAssetReferences.length })}</span>
              <button
                className="se-button-primary rounded-full px-4 py-2 text-xs font-black"
                disabled={!selectedAssetReferences.length}
                onClick={addSelectedAssets}
                type="button"
              >
                {t("image.assets.addSelected")}
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </section>
  );
}
