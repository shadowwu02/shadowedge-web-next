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
  onRetry?: (record: VideoTaskRecord) => void;
  onUseResultAsReference?: (record: VideoTaskRecord) => void;
  record: VideoTaskRecord | null;
};

function safeDownloadFilename(view: ReturnType<typeof getSafeVideoHistoryView>) {
  const id = view.jobLabel && view.jobLabel !== "--" ? view.jobLabel : view.key || Date.now();
  return `shadowedge-video-${String(id).replace(/[^\w.-]+/g, "-")}.mp4`;
}

function actionIconClass(tone: "normal" | "primary" = "normal") {
  if (tone === "primary") {
    return "grid size-8 place-items-center rounded-full border border-[#ffb44d]/45 bg-[#ffb44d]/14 text-[#ffb44d] transition hover:bg-[#ffb44d]/22 disabled:cursor-not-allowed disabled:opacity-45";
  }

  return "grid size-8 place-items-center rounded-full border border-[#33323a]/70 bg-[#1a1c22] text-[#b9b9b9] transition hover:border-[#ffb44d]/50 hover:bg-[#ffb44d]/12 hover:text-[#ffb44d] disabled:cursor-not-allowed disabled:opacity-45";
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

function statusClass(status: string, hasOutput: boolean, isStale = false) {
  if (isStale) return "border-[#ffb44d]/30 bg-[#ffb44d]/10 text-[#ffb44d]";
  if (isVideoFailedStatus(status)) return "border-[#7f2d2d]/70 bg-[#2a1012] text-red-100";
  if (isVideoCompletedStatus(status) && hasOutput) return "border-emerald-300/18 bg-emerald-400/8 text-emerald-100";
  if (isVideoActiveStatus(status)) return "border-[#ffb44d]/30 bg-[#ffb44d]/10 text-[#ffb44d]";
  return "border-[#33323a]/65 bg-[#1a1c22] text-[#b9b9b9]";
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
      <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-[26px] border border-[#33323a]/60 bg-[#111318] p-4 shadow-2xl shadow-black/20">
        <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#ffb44d]">{t("video.history.selectedDetail")}</p>
        <div className="grid min-h-0 flex-1 place-items-center text-center">
          <div>
            <p className="text-sm font-black text-[#f4f4f4]">{t("video.generation.empty.title")}</p>
            <p className="mt-2 text-xs leading-5 text-[#b9b9b9]/55">{t("video.generation.empty.body")}</p>
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
    <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-[26px] border border-[#33323a]/60 bg-[#111318] shadow-2xl shadow-black/20">
      <div className="flex flex-none items-start justify-between gap-3 border-b border-[#33323a]/55 p-3.5">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#ffb44d]">{t("video.history.selectedDetail")}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${statusClass(view.status, hasOutput, isStaleActive)}`}>
              {statusLabel}
            </span>
            <span className="truncate rounded-full border border-[#33323a]/65 bg-[#1a1c22] px-2.5 py-1 text-[10px] font-black text-[#f4f4f4]/78">
              {view.modelLabel}
            </span>
          </div>
        </div>
        <span className="shrink-0 text-[11px] text-[#b9b9b9]/45">{view.createdAtLabel}</span>
      </div>

      <div className="se-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto p-3.5">
        <button
          className="group/prompt w-full rounded-[20px] border border-[#33323a]/65 bg-[#1a1c22]/70 p-3 text-left transition hover:border-[#ffb44d]/38 hover:bg-[#ffb44d]/10 disabled:cursor-default disabled:hover:border-[#33323a]/65 disabled:hover:bg-[#1a1c22]/70"
          disabled={!onFill}
          onClick={() => onFill?.(record)}
          title={onFill ? t("video.generation.fillPrompt") : undefined}
          type="button"
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-[10px] font-black uppercase tracking-[.18em] text-[#ffb44d]">{t("video.generation.prompt")}</span>
            {onFill ? <span className="text-[10px] font-black text-[#b9b9b9]/45 opacity-0 transition group-hover/prompt:opacity-100">{t("video.generation.fillPrompt")}</span> : null}
          </div>
          <p className="line-clamp-6 text-[13px] font-bold leading-5 text-[#f4f4f4]/82">{view.title}</p>
        </button>

        <div className="rounded-[20px] border border-[#33323a]/60 bg-[#1a1c22]/55 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[.16em] text-[#ffb44d]">{t("video.generation.references")}</span>
            <span className="text-[10px] text-[#b9b9b9]/45">{referenceAssets.length}</span>
          </div>
          {mappedReferences.length ? (
            <div className="space-y-2">
              {mappedReferences.map(({ asset, label, readable }) => {
                const issue = getAddReferenceIssue?.(asset) || "";
                const isBlocked = Boolean(issue);
                return (
                  <button
                    className="group/ref grid w-full grid-cols-[42px_minmax(0,1fr)] items-center gap-2 rounded-2xl border border-[#33323a]/60 bg-[#111318]/65 p-1.5 text-left transition hover:border-[#ffb44d]/38 hover:bg-[#ffb44d]/10 disabled:cursor-not-allowed disabled:opacity-45"
                    disabled={isBlocked || !onAddReference}
                    key={`${asset.id}-${asset.url}-${label}`}
                    onClick={() => onAddReference?.(asset)}
                    title={issue || t("video.generation.addReference")}
                    type="button"
                  >
                    <span className="grid aspect-square place-items-center overflow-hidden rounded-xl bg-[#05070b] text-[10px] font-black text-[#b9b9b9]/65">
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
                      <span className="block truncate text-[11px] font-black text-[#f4f4f4]/80">{readable}</span>
                      <span className="block truncate text-[10px] text-[#b9b9b9]/45">
                        {isBlocked ? issue : t("video.generation.addReference")}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-xs leading-5 text-[#b9b9b9]/48">{t("video.drawer.empty.history")}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px] font-bold text-[#b9b9b9]/70">
          <span className="truncate rounded-xl border border-[#33323a]/60 bg-[#1a1c22]/60 px-2.5 py-1.5">{view.quality}</span>
          <span className="truncate rounded-xl border border-[#33323a]/60 bg-[#1a1c22]/60 px-2.5 py-1.5">{view.duration}</span>
          <span className="truncate rounded-xl border border-[#33323a]/60 bg-[#1a1c22]/60 px-2.5 py-1.5">{view.ratio}</span>
          <span className="truncate rounded-xl border border-[#33323a]/60 bg-[#1a1c22]/60 px-2.5 py-1.5">{tf("video.history.job", { job: view.jobLabel })}</span>
        </div>

        {isFailed || isStaleActive ? (
          <div className="line-clamp-6 rounded-[20px] border border-[#7f2d2d]/70 bg-[#2a1012] p-3 text-xs leading-5 text-red-100/70">
            {view.errorMessage}
            {view.refundNotice ? ` ${view.refundNotice}` : ""}
          </div>
        ) : null}
      </div>

      <div className="flex flex-none flex-wrap gap-1.5 border-t border-[#33323a]/55 p-3.5">
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
        {hasOutput && useResultIssue ? <span className="w-full text-[11px] leading-4 text-[#b9b9b9]/45">{useResultIssue}</span> : null}
      </div>
    </aside>
  );
}
