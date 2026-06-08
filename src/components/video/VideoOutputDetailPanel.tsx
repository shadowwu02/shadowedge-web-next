"use client";

import { useMemo } from "react";
import { useI18n } from "@/i18n/useI18n";
import { collectHistoryInputMediaAssets } from "@/lib/media-assets";
import { getSafeVideoHistoryView, isVideoStaleActiveRecord } from "@/lib/video/historyUtils";
import { isVideoActiveStatus, isVideoCompletedStatus, isVideoFailedStatus } from "@/lib/utils";
import type { UploadMediaItem, VideoTaskRecord } from "@/types/video";

type VideoOutputDetailPanelProps = {
  getAddReferenceIssue?: (asset: UploadMediaItem) => string;
  getUseResultAsReferenceIssue?: (record: VideoTaskRecord) => string;
  onAddReference?: (asset: UploadMediaItem) => void;
  onFill?: (record: VideoTaskRecord) => void;
  onHide?: (record: VideoTaskRecord) => void;
  onRetry?: (record: VideoTaskRecord) => void;
  onUseResultAsReference?: (record: VideoTaskRecord) => void;
  record: VideoTaskRecord | null;
};

function safeDownloadFilename(view: ReturnType<typeof getSafeVideoHistoryView>) {
  const id = view.jobLabel && view.jobLabel !== "--" ? view.jobLabel : view.key || Date.now();
  return `shadowedge-video-${String(id).replace(/[^\w.-]+/g, "-")}.mp4`;
}

function actionIconClass(tone: "danger" | "normal" | "primary" = "normal") {
  if (tone === "danger") {
    return "grid size-9 place-items-center rounded-full border border-red-300/25 bg-red-400/10 text-red-100 transition hover:bg-red-400/16 disabled:cursor-not-allowed disabled:opacity-45";
  }

  if (tone === "primary") {
    return "grid size-9 place-items-center rounded-full border border-[#ffb44d]/35 bg-[#ffb44d]/10 text-[#ffd08a] transition hover:bg-[#ffb44d]/18 disabled:cursor-not-allowed disabled:opacity-45";
  }

  return "grid size-9 place-items-center rounded-full border border-white/10 bg-white/[.045] text-white/68 transition hover:border-[#ffb44d]/35 hover:text-[#ffd08a] disabled:cursor-not-allowed disabled:opacity-45";
}

function FillIcon() {
  return (
    <svg aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10a6 6 0 0 1 6 6v4" />
    </svg>
  );
}

function AddReferenceIcon() {
  return (
    <svg aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

function RetryIcon() {
  return (
    <svg aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

function HideIcon() {
  return (
    <svg aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="m3 3 18 18" />
      <path d="M10.58 10.58a2 2 0 0 0 2.83 2.83" />
      <path d="M9.88 4.24A9.77 9.77 0 0 1 12 4c5 0 8.27 3.11 10 8a12.37 12.37 0 0 1-2.28 3.88" />
      <path d="M6.61 6.61A12.31 12.31 0 0 0 2 12c1.73 4.89 5 8 10 8a9.77 9.77 0 0 0 4.39-1.03" />
    </svg>
  );
}

function statusClass(status: string, hasOutput: boolean, isStale = false) {
  if (isStale) return "border-[#ffb44d]/22 bg-[#ffb44d]/10 text-[#ffd08a]";
  if (isVideoFailedStatus(status)) return "border-red-300/25 bg-red-400/10 text-red-100";
  if (isVideoCompletedStatus(status) && hasOutput) return "border-emerald-300/20 bg-emerald-400/10 text-emerald-100";
  if (isVideoActiveStatus(status)) return "border-[#ffb44d]/24 bg-[#ffb44d]/10 text-[#ffd08a]";
  return "border-white/10 bg-white/[.045] text-white/58";
}

function mediaTokenLabel(asset: UploadMediaItem, counts: Record<UploadMediaItem["type"], number>) {
  counts[asset.type] += 1;
  if (asset.type === "audio") return `@音频${counts.audio}`;
  if (asset.type === "video") return `@视频${counts.video}`;
  return `@图${counts.image}`;
}

function mediaTypeLabel(type: UploadMediaItem["type"], index: number, t: ReturnType<typeof useI18n>["t"]) {
  if (type === "audio") return `${t("video.media.audio")} ${index}`;
  if (type === "video") return `${t("video.media.video")} ${index}`;
  return `${t("video.media.image")} ${index}`;
}

function mediaFallback(type: UploadMediaItem["type"]) {
  if (type === "audio") return "AUD";
  if (type === "video") return "VID";
  return "IMG";
}

export function VideoOutputDetailPanel({
  getAddReferenceIssue,
  getUseResultAsReferenceIssue,
  onAddReference,
  onFill,
  onHide,
  onRetry,
  onUseResultAsReference,
  record,
}: VideoOutputDetailPanelProps) {
  const { t, tf } = useI18n();
  const view = record ? getSafeVideoHistoryView(record) : null;
  const referenceAssets = useMemo(() => (record ? collectHistoryInputMediaAssets([record]).slice(0, 12) : []), [record]);
  const mappedReferences = useMemo(() => {
    const counts: Record<UploadMediaItem["type"], number> = { audio: 0, image: 0, video: 0 };
    return referenceAssets.map((asset) => {
      const label = mediaTokenLabel(asset, counts);
      return {
        asset,
        label,
        readable: `${label} = ${mediaTypeLabel(asset.type, counts[asset.type], t)}`,
      };
    });
  }, [referenceAssets, t]);

  if (!record || !view) {
    return (
      <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-[26px] border border-white/10 bg-white/[.035] p-4 shadow-2xl shadow-black/18">
        <p className="text-[11px] font-black uppercase tracking-[.18em] text-[#ffcf83]">{t("video.history.selectedDetail")}</p>
        <div className="grid min-h-0 flex-1 place-items-center text-center">
          <div>
            <p className="text-sm font-black text-white">{t("video.generation.empty.title")}</p>
            <p className="mt-2 text-xs leading-5 text-white/42">{t("video.generation.empty.body")}</p>
          </div>
        </div>
      </aside>
    );
  }

  const hasOutput = Boolean(view.outputUrl);
  const isFailed = isVideoFailedStatus(view.status);
  const isSuccess = isVideoCompletedStatus(view.status) && hasOutput;
  const isStaleActive = isVideoStaleActiveRecord(record);
  const isProcessing = isVideoActiveStatus(view.status) && !isStaleActive;
  const useResultIssue = getUseResultAsReferenceIssue?.(record) || "";
  const statusLabel = isStaleActive
    ? t("video.generation.stale")
    : isFailed
      ? t("video.status.failed")
      : isSuccess
        ? t("video.status.completed")
        : isProcessing
          ? t("video.status.processing")
          : view.statusLabel;

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-[26px] border border-white/10 bg-white/[.035] shadow-2xl shadow-black/18">
      <div className="flex flex-none items-start justify-between gap-3 border-b border-white/10 p-4">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[.18em] text-[#ffcf83]">{t("video.history.selectedDetail")}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${statusClass(view.status, hasOutput, isStaleActive)}`}>
              {statusLabel}
            </span>
            <span className="truncate rounded-full border border-white/10 bg-black/24 px-2.5 py-1 text-[10px] font-black text-white/76">
              {view.modelLabel}
            </span>
          </div>
        </div>
        <span className="shrink-0 text-[11px] text-white/36">{view.createdAtLabel}</span>
      </div>

      <div className="se-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        <button
          className="group/prompt w-full rounded-[22px] border border-white/10 bg-black/20 p-3 text-left transition hover:border-[#ffb44d]/35 hover:bg-[#ffb44d]/10 disabled:cursor-default disabled:hover:border-white/10 disabled:hover:bg-black/20"
          disabled={!onFill}
          onClick={() => onFill?.(record)}
          title={onFill ? t("video.generation.fillPrompt") : undefined}
          type="button"
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-[10px] font-black uppercase tracking-[.18em] text-[#ffcf83]">{t("video.generation.prompt")}</span>
            {onFill ? <span className="text-[10px] font-black text-white/32 opacity-0 transition group-hover/prompt:opacity-100">{t("video.generation.fillPrompt")}</span> : null}
          </div>
          <p className="text-sm font-bold leading-6 text-white/78">{view.title}</p>
        </button>

        <div className="rounded-[22px] border border-white/10 bg-black/18 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[.16em] text-[#ffcf83]">{t("video.generation.references")}</span>
            <span className="text-[10px] text-white/32">{referenceAssets.length}</span>
          </div>
          {mappedReferences.length ? (
            <div className="space-y-2">
              {mappedReferences.map(({ asset, label, readable }) => {
                const issue = getAddReferenceIssue?.(asset) || "";
                const isBlocked = Boolean(issue);
                return (
                  <button
                    className="group/ref grid w-full grid-cols-[44px_minmax(0,1fr)] items-center gap-2 rounded-2xl border border-white/10 bg-white/[.035] p-1.5 text-left transition hover:border-[#ffb44d]/35 hover:bg-[#ffb44d]/10 disabled:cursor-not-allowed disabled:opacity-45"
                    disabled={isBlocked || !onAddReference}
                    key={`${asset.id}-${asset.url}-${label}`}
                    onClick={() => onAddReference?.(asset)}
                    title={issue || t("video.generation.addReference")}
                    type="button"
                  >
                    <span className="grid aspect-square place-items-center overflow-hidden rounded-xl bg-black/36 text-[10px] font-black text-white/54">
                      {asset.type === "image" && (asset.previewUrl || asset.url) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img alt="" className="h-full w-full object-cover" src={asset.previewUrl || asset.url} />
                      ) : asset.type === "video" && asset.previewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img alt="" className="h-full w-full object-cover" src={asset.previewUrl} />
                      ) : (
                        mediaFallback(asset.type)
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[11px] font-black text-white/78">{readable}</span>
                      <span className="block truncate text-[10px] text-white/34">
                        {isBlocked ? issue : t("video.generation.addReference")}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-xs leading-5 text-white/38">{t("video.drawer.empty.history")}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px] text-white/54">
          <span className="truncate rounded-2xl border border-white/10 bg-black/18 px-3 py-2">{view.quality}</span>
          <span className="truncate rounded-2xl border border-white/10 bg-black/18 px-3 py-2">{view.duration}</span>
          <span className="truncate rounded-2xl border border-white/10 bg-black/18 px-3 py-2">{view.ratio}</span>
          <span className="truncate rounded-2xl border border-white/10 bg-black/18 px-3 py-2">{tf("video.history.job", { job: view.jobLabel })}</span>
        </div>

        {isFailed || isStaleActive ? (
          <div className="rounded-[22px] border border-red-300/20 bg-red-400/10 p-3 text-xs leading-5 text-red-100/70">
            {view.errorMessage}
            {view.refundNotice ? ` ${view.refundNotice}` : ""}
          </div>
        ) : null}
      </div>

      <div className="flex flex-none flex-wrap gap-2 border-t border-white/10 p-4">
        {onFill ? (
          <button aria-label={t("video.history.fill")} className={actionIconClass("normal")} onClick={() => onFill(record)} title={t("video.history.fill")} type="button">
            <FillIcon />
          </button>
        ) : null}
        {hasOutput && onUseResultAsReference ? (
          <button
            aria-label={t("video.history.useAsReference")}
            className={actionIconClass("normal")}
            disabled={Boolean(useResultIssue)}
            onClick={() => onUseResultAsReference(record)}
            title={useResultIssue || t("video.history.useResultTitle")}
            type="button"
          >
            <AddReferenceIcon />
          </button>
        ) : null}
        {hasOutput ? (
          <a
            aria-label={t("video.history.downloadOpen")}
            className={actionIconClass("normal")}
            download={safeDownloadFilename(view)}
            href={view.outputUrl}
            rel="noreferrer"
            target="_blank"
            title={t("video.history.downloadOpen")}
          >
            <DownloadIcon />
          </a>
        ) : null}
        {(isFailed || isStaleActive) && onRetry ? (
          <button aria-label={t("video.history.retry")} className={actionIconClass("primary")} onClick={() => onRetry(record)} title={t("video.history.retry")} type="button">
            <RetryIcon />
          </button>
        ) : null}
        {!isProcessing && onHide ? (
          <button aria-label={t("video.history.hide")} className={actionIconClass("danger")} onClick={() => onHide(record)} title={t("video.history.hideTitle")} type="button">
            <HideIcon />
          </button>
        ) : null}
        {hasOutput && useResultIssue ? <span className="w-full text-[11px] leading-4 text-white/36">{useResultIssue}</span> : null}
      </div>
    </aside>
  );
}
