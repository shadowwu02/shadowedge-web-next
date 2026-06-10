"use client";

import { useId, useRef } from "react";
import { useI18n } from "@/i18n/useI18n";
import type { RemakeSourceVideo } from "@/components/video/remake/remakeTypes";

type RemakeSourceUploadProps = {
  durationWarning?: boolean;
  onClear: () => void;
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

function formatDuration(seconds?: number) {
  if (!Number.isFinite(seconds || 0) || !seconds) return "";
  return `${seconds.toFixed(seconds % 1 === 0 ? 0 : 1)}s`;
}

function readVideoDuration(file: File) {
  return new Promise<number>((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");

    function cleanup() {
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      video.load();
    }

    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const duration = Number(video.duration || 0);
      cleanup();
      resolve(Number.isFinite(duration) && duration > 0 ? duration : 0);
    };
    video.onerror = () => {
      cleanup();
      resolve(0);
    };
    video.src = url;
  });
}

function TrashIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-3.5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="m19 6-1 14H6L5 6" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>
  );
}

export function RemakeSourceUpload({ durationWarning = false, onChange, onClear, sourceVideo }: RemakeSourceUploadProps) {
  const { t } = useI18n();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const selectionVersionRef = useRef(0);

  function handleClear() {
    selectionVersionRef.current += 1;
    if (inputRef.current) inputRef.current.value = "";
    onClear();
  }

  return (
    <section className="rounded-[24px] border border-[rgba(244,244,244,0.08)] bg-[#111318]/70 p-4 shadow-inner shadow-black/10">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="se-eyebrow">{t("video.remake.sourceVideo")}</p>
          <h2 className="mt-1 text-sm font-semibold text-[#f4f4f4]">{t("video.remake.uploadSource")}</h2>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full border border-[rgba(244,244,244,0.10)] bg-[#1a1c22]/70 px-2.5 py-1 text-[10px] font-semibold text-[#b9b9b9]/72">
            {t("video.remake.sourceVideo")}
          </span>
          {sourceVideo ? (
            <span className="rounded-full border border-[#ffb44d]/28 bg-[#ffb44d]/10 px-2.5 py-1 text-[10px] font-semibold text-[#ffb44d]">
              {t("video.remake.readyToAnalyze")}
            </span>
          ) : null}
          {sourceVideo ? (
            <button
              aria-label={t("video.remake.removeSourceVideo")}
              className="inline-flex min-h-8 items-center gap-1.5 rounded-[12px] border border-[rgba(244,244,244,0.10)] bg-[#1a1c22]/70 px-2.5 text-xs font-semibold text-[#f4f4f4]/78 transition-colors hover:border-[#ffb44d]/32 hover:text-[#ffb44d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffb44d]/50"
              onClick={handleClear}
              title={t("video.remake.clearSourceVideo")}
              type="button"
            >
              <TrashIcon />
              <span>{t("video.remake.removeSourceVideo")}</span>
            </button>
          ) : null}
        </div>
      </div>

      <label
        className="group grid min-h-32 cursor-pointer place-items-center rounded-[22px] border border-dashed border-[rgba(244,244,244,0.14)] bg-[#05070b]/40 p-4 text-center transition-colors hover:border-[#ffb44d]/34 hover:bg-[#ffb44d]/8"
        htmlFor={inputId}
      >
        <input
          accept="video/*"
          className="sr-only"
          id={inputId}
          ref={inputRef}
          onChange={(event) => {
            const file = event.target.files?.[0] || null;
            if (!file) return;

            selectionVersionRef.current += 1;
            const selectionVersion = selectionVersionRef.current;
            const nextSource = {
              file,
              lastModified: file.lastModified,
              name: file.name,
              size: file.size,
              type: file.type || "video/*",
            };

            onChange(nextSource);
            void readVideoDuration(file).then((duration) => {
              if (selectionVersionRef.current === selectionVersion && duration > 0) onChange({ ...nextSource, duration });
            });
            event.currentTarget.value = "";
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
          {sourceVideo
            ? [formatBytes(sourceVideo.size), sourceVideo.type || "video", formatDuration(sourceVideo.duration), sourceVideo.url ? t("common.status.ready") : ""]
                .filter(Boolean)
                .join(" · ")
            : t("video.remake.sourceHint")}
        </span>
        {sourceVideo ? <span className="mt-2 block text-xs font-semibold text-[#ffb44d]">{t("video.remake.sourceReady")}</span> : null}
        {sourceVideo ? <span className="mt-1 block text-[11px] font-semibold text-[#ffb44d]/80">{t("video.remake.replaceSourceVideo")}</span> : null}
      </label>

      <div className="mt-3 grid gap-2 text-xs leading-5 text-[#b9b9b9]/62">
        {durationWarning ? (
          <p className="rounded-[14px] border border-[#ffb44d]/24 bg-[#ffb44d]/10 p-2 text-[#ffd08a]/86">
            {t("video.remake.durationWarning")}
          </p>
        ) : null}
        <p>{t("video.remake.singleClipDuration")}</p>
        <p>{t("video.remake.fullFilmDuration")}</p>
        <p>{t("video.remake.batchDuration")}</p>
      </div>
    </section>
  );
}
