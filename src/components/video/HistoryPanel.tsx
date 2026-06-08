"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/i18n/useI18n";
import { getSafeVideoHistoryView, isVideoStaleActiveRecord } from "@/lib/video/historyUtils";
import { isVideoActiveStatus, isVideoCompletedStatus, isVideoFailedStatus } from "@/lib/utils";
import type { VideoTaskRecord } from "@/types/video";

export type HistoryFilter = "all" | "success" | "failed" | "processing";

type HistoryPanelProps = {
  filter?: HistoryFilter;
  history: VideoTaskRecord[];
  isLoading?: boolean;
  error?: string;
  getUseResultAsReferenceIssue?: (record: VideoTaskRecord) => string;
  onFilterChange?: (filter: HistoryFilter) => void;
  onFill?: (record: VideoTaskRecord) => void;
  onHide?: (record: VideoTaskRecord) => void;
  onRetry?: (record: VideoTaskRecord) => void;
  onUseResultAsReference?: (record: VideoTaskRecord) => void;
};

const filters: HistoryFilter[] = ["all", "success", "failed", "processing"];

function filterHistoryItem(item: VideoTaskRecord, filter: HistoryFilter) {
  const view = getSafeVideoHistoryView(item);

  if (filter === "success") return isVideoCompletedStatus(view.status) && Boolean(view.outputUrl);
  if (filter === "failed") return isVideoFailedStatus(view.status);
  if (filter === "processing") return isVideoActiveStatus(view.status) && !isVideoStaleActiveRecord(item);
  return true;
}

function statusClass(status: string, hasOutput: boolean) {
  if (isVideoFailedStatus(status)) return "border-red-300/25 bg-red-400/10 text-red-100";
  if (isVideoCompletedStatus(status) && hasOutput) return "border-emerald-300/20 bg-emerald-400/10 text-emerald-100";
  if (isVideoActiveStatus(status)) return "border-[#ffb44d]/24 bg-[#ffb44d]/10 text-[#ffd08a]";
  return "border-white/10 bg-white/[.045] text-white/55";
}

function emptyMessageKey(filter: HistoryFilter) {
  if (filter === "success") return "video.history.noSuccessful";
  if (filter === "failed") return "video.history.noFailed";
  if (filter === "processing") return "video.history.noProcessing";
  return "video.history.empty";
}

function safeDownloadFilename(view: ReturnType<typeof getSafeVideoHistoryView>) {
  const id = view.jobLabel && view.jobLabel !== "--" ? view.jobLabel : view.key || Date.now();
  return `shadowedge-video-${String(id).replace(/[^\w.-]+/g, "-")}.mp4`;
}

function actionButtonClass(tone: "danger" | "normal" | "primary" = "normal") {
  if (tone === "danger") {
    return "rounded-full border border-red-300/25 bg-red-400/10 px-3 py-1 text-xs font-bold text-red-100 transition hover:bg-red-400/16 disabled:cursor-not-allowed disabled:opacity-45";
  }
  if (tone === "primary") {
    return "rounded-full border border-[#ffb44d]/35 bg-[#ffb44d]/10 px-3 py-1 text-xs font-bold text-[#ffd08a] transition hover:bg-[#ffb44d]/16 disabled:cursor-not-allowed disabled:opacity-45";
  }
  return "rounded-full border border-white/10 bg-white/[.045] px-3 py-1 text-xs font-bold text-white/68 transition hover:border-[#ffb44d]/35 hover:text-[#ffd08a] disabled:cursor-not-allowed disabled:opacity-45";
}

export function HistoryPanel({
  error,
  filter,
  getUseResultAsReferenceIssue,
  history,
  isLoading = false,
  onFilterChange,
  onFill,
  onHide,
  onRetry,
  onUseResultAsReference,
}: HistoryPanelProps) {
  const { t, tf } = useI18n();
  const [localFilter, setLocalFilter] = useState<HistoryFilter>("all");
  const currentFilter = filter ?? localFilter;
  const setNextFilter = (nextFilter: HistoryFilter) => {
    if (filter === undefined) setLocalFilter(nextFilter);
    onFilterChange?.(nextFilter);
  };

  const visibleHistory = useMemo(() => history.filter((item) => filterHistoryItem(item, currentFilter)), [currentFilter, history]);
  const filterLabel = (nextFilter: HistoryFilter) => t(`video.history.filter.${nextFilter}` as "video.history.filter.all");
  const statusLabel = (status: string, fallback: string, isStaleActive = false) => {
    if (isStaleActive) return t("video.history.status.stale");
    if (isVideoFailedStatus(status)) return t("video.status.failed");
    if (isVideoCompletedStatus(status)) return t("video.status.completed");
    if (isVideoActiveStatus(status)) return t("video.status.processing");
    return fallback || t("video.history.status.unknown");
  };
  const localizeHistoryMessage = (message: string) => {
    if (message === "Video generation failed. Please try again later or change the media.") return t("video.errors.generationFailed");
    if (message === "Unable to check this job status. It may be expired. Please check History or retry.") return t("video.result.statusExpired");
    return message;
  };
  const localizeRefundNotice = (notice: string) => {
    const amount = notice.match(/^Refunded\s+(.+?)\s+credits\.$/i)?.[1];
    if (amount) return tf("video.credits.refundedAmount", { amount });
    if (notice === "Credits were refunded for this failed task.") return t("video.credits.refunded");
    return notice;
  };

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[30px] border border-white/10 bg-white/[.04] p-3 shadow-2xl shadow-black/18">
      <div className="mb-3 flex flex-none flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[.18em] text-[#ffcf83]">{t("video.history.outputs")}</p>
          <h2 className="mt-1 text-sm font-black text-white">{t("video.history.saved")}</h2>
          <span className="text-xs text-white/42">
            {isLoading ? t("video.history.loading") : tf("video.history.itemsCount", { visible: visibleHistory.length, total: history.length })}
          </span>
        </div>
        <div className="flex max-w-full flex-wrap gap-1.5">
          {filters.map((item) => (
            <button
              className={`rounded-full border px-2.5 py-1.5 text-[11px] font-black transition ${
                item === currentFilter
                  ? "border-[#ffb44d]/55 bg-[#ffb44d]/16 text-[#ffd08a]"
                  : "border-white/10 bg-white/[.045] text-white/52 hover:border-[#ffb44d]/28 hover:text-[#ffd08a]"
              }`}
              key={item}
              onClick={() => setNextFilter(item)}
              type="button"
            >
              {filterLabel(item)}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="mb-3 flex-none rounded-2xl border border-[#ffb44d]/20 bg-[#ffb44d]/10 px-3 py-2 text-xs text-[#ffd08a]">
          {tf("video.history.serverLoadFailed", { error })}
        </div>
      ) : null}

      <div className="se-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1">
        <div className="grid gap-3">
          {visibleHistory.length ? (
            visibleHistory.map((item) => {
              const view = getSafeVideoHistoryView(item);
              const hasOutput = Boolean(view.outputUrl);
              const isSuccess = isVideoCompletedStatus(view.status) && hasOutput;
              const isFailed = isVideoFailedStatus(view.status);
              const isStaleActive = isVideoStaleActiveRecord(item);
              const isProcessing = isVideoActiveStatus(view.status) && !isStaleActive;
              const useResultIssue = getUseResultAsReferenceIssue?.(item) || "";
              return (
                <article className="rounded-[22px] border border-white/10 bg-black/20 p-2.5" key={view.key}>
                  <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-3">
                    <div className="grid aspect-video place-items-center overflow-hidden rounded-2xl bg-white/[.045]">
                      {view.outputUrl ? (
                        <video className="h-full w-full object-cover" muted playsInline preload="metadata" src={view.outputUrl} />
                      ) : view.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img alt="" className="h-full w-full object-cover" src={view.thumbnailUrl} />
                      ) : isVideoFailedStatus(view.status) ? (
                        <span className="text-xs font-black text-red-100/72">{t("video.status.failed")}</span>
                      ) : isProcessing ? (
                        <span className="text-xs font-black text-[#ffd08a]">{t("video.status.processing")}</span>
                      ) : isStaleActive ? (
                        <span className="text-center text-xs font-black text-white/45">{t("video.history.status.staleTask")}</span>
                      ) : (
                        <span className="text-xs text-white/40">{t("video.history.status.task")}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${statusClass(isStaleActive ? "unknown" : view.status, Boolean(view.outputUrl))}`}>
                          {statusLabel(view.status, view.statusLabel, isStaleActive)}
                        </span>
                        <span className="truncate text-[11px] text-white/34">{view.createdAtLabel}</span>
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-sm font-bold leading-5 text-white">{view.title}</p>
                      <div className="mt-1.5 grid gap-1 text-[11px] text-white/42">
                        <span className="truncate">{tf("video.history.model", { model: view.modelLabel })}</span>
                        <span className="truncate">{tf("video.history.job", { job: view.jobLabel })}</span>
                      </div>
                      {isFailed ? (
                        <div className="mt-2">
                          <span className="line-clamp-2 w-full text-[11px] leading-4 text-red-100/62">
                            {localizeHistoryMessage(view.errorMessage)}
                            {view.refundNotice ? ` ${localizeRefundNotice(view.refundNotice)}` : ""}
                          </span>
                        </div>
                      ) : null}
                      <div className="mt-2 flex flex-wrap gap-2">
                        {isSuccess ? (
                          <a
                            className={actionButtonClass("normal")}
                            download={safeDownloadFilename(view)}
                            href={view.outputUrl}
                            rel="noreferrer"
                            target="_blank"
                            title={t("video.history.downloadOpen")}
                          >
                            {t("video.history.downloadOpen")}
                          </a>
                        ) : null}
                        {(isSuccess || isFailed) && onFill ? (
                          <button className={actionButtonClass("normal")} onClick={() => onFill(item)} type="button">
                            {t("video.history.fill")}
                          </button>
                        ) : null}
                        {isFailed ? (
                          <button className={actionButtonClass("primary")} disabled={!onRetry} onClick={() => onRetry?.(item)} type="button">
                            {t("video.history.retry")}
                          </button>
                        ) : null}
                        {isSuccess && onUseResultAsReference ? (
                          <button
                            className={actionButtonClass("normal")}
                            disabled={Boolean(useResultIssue)}
                            onClick={() => onUseResultAsReference(item)}
                            title={useResultIssue || t("video.history.useResultTitle")}
                            type="button"
                          >
                            {t("video.history.useAsReference")}
                          </button>
                        ) : null}
                        {!isProcessing && onHide ? (
                          <button className={actionButtonClass("danger")} onClick={() => onHide(item)} title={t("video.history.hideTitle")} type="button">
                            {t("video.history.hide")}
                          </button>
                        ) : null}
                        {isSuccess && useResultIssue ? (
                          <span className="w-full text-[11px] leading-4 text-white/36">{useResultIssue}</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-3xl border border-dashed border-white/12 p-8 text-center text-sm text-white/42">
              {t(emptyMessageKey(currentFilter))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
