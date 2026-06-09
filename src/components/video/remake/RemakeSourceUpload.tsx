"use client";

import { useId } from "react";
import { useI18n } from "@/i18n/useI18n";
import type { RemakeSourceVideo } from "@/components/video/remake/remakeTypes";

type RemakeSourceUploadProps = {
  onChange: (source: RemakeSourceVideo | null) => void;
  sourceVideo: RemakeSourceVideo | null;
};

function formatBytes(size: number) {
  if (!Number.isFinite(size) || size <= 0) return "--";
  const units = ["B", "KB", "MB", "GB"];
  let value = size;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export function RemakeSourceUpload({ onChange, sourceVideo }: RemakeSourceUploadProps) {
  const { t } = useI18n();
  const inputId = useId();

  return (
    <section className="rounded-[24px] border border-[rgba(244,244,244,0.08)] bg-[#111318]/70 p-4 shadow-inner shadow-black/10">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="se-eyebrow">{t("video.remake.sourceVideo")}</p>
          <h2 className="mt-1 text-sm font-semibold text-[#f4f4f4]">{t("video.remake.uploadSource")}</h2>
        </div>
        <span className="rounded-full border border-[#ffb44d]/28 bg-[#ffb44d]/10 px-2.5 py-1 text-[10px] font-semibold text-[#ffb44d]">
          {t("video.remake.noBackendNotice")}
        </span>
      </div>

      <label
        className="group grid min-h-32 cursor-pointer place-items-center rounded-[22px] border border-dashed border-[rgba(244,244,244,0.14)] bg-[#05070b]/40 p-4 text-center transition-colors hover:border-[#ffb44d]/34 hover:bg-[#ffb44d]/8"
        htmlFor={inputId}
      >
        <input
          accept="video/*"
          className="sr-only"
          id={inputId}
          onChange={(event) => {
            const file = event.target.files?.[0] || null;
            if (!file) {
              onChange(null);
              return;
            }

            onChange({
              lastModified: file.lastModified,
              name: file.name,
              size: file.size,
              type: file.type || "video/*",
            });
          }}
          type="file"
        />
        <span className="grid size-12 place-items-center rounded-2xl border border-[rgba(244,244,244,0.10)] bg-[#1a1c22] text-[#ffb44d] transition-colors group-hover:border-[#ffb44d]/34">
          <svg aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
            <path d="m16 13 5-3-5-3v6Z" />
            <rect height="14" rx="2" width="14" x="3" y="5" />
          </svg>
        </span>
        <span className="mt-3 block text-sm font-semibold text-[#f4f4f4]">
          {sourceVideo ? sourceVideo.name : t("video.remake.chooseSource")}
        </span>
        <span className="mt-1 block text-xs leading-5 text-[#b9b9b9]/58">
          {sourceVideo ? `${formatBytes(sourceVideo.size)} · ${sourceVideo.type || "video"}` : t("video.remake.sourceHint")}
        </span>
      </label>

      <div className="mt-3 grid gap-2 text-xs leading-5 text-[#b9b9b9]/62">
        <p>{t("video.remake.singleClipDuration")}</p>
        <p>{t("video.remake.fullFilmDuration")}</p>
        <p>{t("video.remake.batchDuration")}</p>
      </div>
    </section>
  );
}
