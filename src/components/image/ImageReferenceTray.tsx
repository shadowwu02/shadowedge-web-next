"use client";

import { useRef } from "react";
import { useI18n } from "@/i18n/useI18n";
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

function formatBytes(value?: number) {
  if (!value) return "";
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function ImageReferenceTray({
  model,
  references,
  onRemove,
  onUploadFile,
}: {
  model: ImageModel | null;
  references: ImageReferenceItem[];
  onRemove: (referenceId: string) => void;
  onUploadFile: (file: File) => void;
}) {
  const { t, tf } = useI18n();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const maxReferences = model?.capabilities.maxReferences || 0;
  const canUpload = references.length < maxReferences;
  const uploadTitle = !maxReferences
    ? t("image.references.unsupportedTitleAttr")
    : !canUpload
      ? t("image.references.limitTitle")
      : t("image.references.addTitle");
  const getUploadStatusLabel = (reference: ImageReferenceItem) => {
    if (reference.uploadStatus === "uploading") return t("image.status.uploading");
    if (reference.uploadStatus === "failed") return t("image.status.failed");
    return reference.url ? t("image.status.ready") : t("image.status.local");
  };

  return (
    <section className="se-card rounded-[24px] p-3.5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="se-eyebrow">{t("image.workspace.referenceImages")}</p>
          <p className="mt-1 text-xs text-[#b9b9b9]/55">
            {maxReferences ? tf("image.references.count", { current: references.length, max: maxReferences }) : t("image.references.textOnly")}
          </p>
        </div>
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
          {references.map((reference) => (
            <article className="group overflow-hidden rounded-[18px] border border-white/10 bg-[#05070b]/62" key={reference.id}>
              <div className="relative aspect-square bg-black/40">
                {reference.previewUrl || reference.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt={reference.name} className="h-full w-full object-cover" src={reference.previewUrl || reference.url} />
                ) : (
                  <div className="grid h-full place-items-center text-[#ffd08a]/70">
                    <ImageIcon />
                  </div>
                )}
                <button
                  aria-label={tf("image.references.remove", { name: reference.name })}
                  className="se-icon-button-danger absolute right-2 top-2 grid size-7 place-items-center rounded-full opacity-100 shadow-lg shadow-black/30 sm:opacity-0 sm:group-hover:opacity-100"
                  onClick={() => onRemove(reference.id)}
                  type="button"
                >
                  <TrashIcon />
                </button>
              </div>
              <div className="p-2">
                <p className="truncate text-[11px] font-semibold text-[#f4f4f4]/78">{reference.name}</p>
                <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-[#b9b9b9]/45">
                  <span>{formatBytes(reference.size) || t("image.references.generic")}</span>
                  <span className={reference.uploadStatus === "failed" ? "text-[#f2b3a1]" : reference.uploadStatus === "uploading" ? "text-[#ffd08a]" : "text-[#b8e7ee]"}>
                    {getUploadStatusLabel(reference)}
                  </span>
                </div>
                {reference.errorMessage ? <p className="mt-1 line-clamp-2 text-[10px] text-[#f2b3a1]/78">{reference.errorMessage}</p> : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <button
          className="grid min-h-[148px] w-full place-items-center rounded-[22px] border border-dashed border-white/12 bg-white/[.025] text-center transition-colors hover:border-[#ffb44d]/28 hover:bg-[#ffb44d]/7 disabled:hover:border-white/12 disabled:hover:bg-white/[.025]"
          disabled={!canUpload}
          onClick={() => inputRef.current?.click()}
          type="button"
        >
            <span>
            <span className="mx-auto grid size-11 place-items-center rounded-2xl border border-[#ffb44d]/20 bg-[#ffb44d]/10 text-[#ffd08a]">
              <ImageIcon />
            </span>
            <span className="mt-3 block text-sm font-semibold text-[#f4f4f4]">{maxReferences ? t("image.references.uploadTitle") : t("image.references.unsupportedTitle")}</span>
            <span className="mt-1 block text-xs text-[#b9b9b9]/52">
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
    </section>
  );
}
