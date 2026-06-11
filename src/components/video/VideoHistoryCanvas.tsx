"use client";

import { useMemo } from "react";
import { useI18n } from "@/i18n/useI18n";
import { getSafeVideoHistoryView, isVideoStaleActiveRecord } from "@/lib/video/historyUtils";
import { isVideoActiveStatus, isVideoCompletedStatus, isVideoFailedStatus } from "@/lib/utils";
import type { VideoTaskRecord } from "@/types/video";
import type { HistoryFilter } from "@/components/video/HistoryPanel";

type VideoHistoryCanvasProps = {
  error?: string;
  filter: HistoryFilter;
  getUseResultAsReferenceIssue?: (record: VideoTaskRecord) => string;
  history: VideoTaskRecord[];
  isLoading?: boolean;
  onFill?: (record: VideoTaskRecord) => void;
  onFilterChange: (filter: HistoryFilter) => void;
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
  if (isVideoFailedStatus(status)) return "se-status-failed";
  if (isVideoCompletedStatus(status) && hasOutput) return "se-status-completed";
  if (isVideoActiveStatus(status)) return "se-status-processing";
  return "se-status-neutral";
}

function emptyMessageKey(filter: HistoryFilter) {
  if (filter === "success") return "video.history.noSuccessful";
  if (filter === "failed") return "video.history.noFailed";
  if (filter === "processing") return "video.history.noProcessing";
  return "video.history.canvas.empty";
}

function safeDownloadFilename(view: ReturnType<typeof getSafeVideoHistoryView>) {
  const id = view.jobLabel && view.jobLabel !== "--" ? view.jobLabel : view.key || Date.now();
  return `shadowedge-video-${String(id).replace(/[^\w.-]+/g, "-")}.mp4`;
}

function actionButtonClass(tone: "danger" | "normal" | "primary" = "normal") {
  if (tone === "danger") {
    return "se-button-danger rounded-full px-3 py-1.5 text-xs font-bold";
  }
  if (tone === "primary") {
    return "se-button-secondary rounded-full px-3 py-1.5 text-xs font-bold";
  }
  return "se-button-ghost rounded-full px-3 py-1.5 text-xs font-bold";
}

function isSensitiveFailure(message: string) {
  return /nsfw|sensitive|policy|content|moderation|copyright/i.test(message);
}

export function VideoHistoryCanvas({
  error,
  filter,
  getUseResultAsReferenceIssue,
  history,
  isLoading = false,
  onFill,
  onFilterChange,
  onHide,
  onRetry,
  onUseResultAsReference,
}: VideoHistoryCanvasProps) {
  const { t, tf } = useI18n();
  const visibleHistory = useMemo(() => history.filter((item) => filterHistoryItem(item, filter)), [filter, history]);
  const counts = useMemo(
    () =>
      filters.reduce<Record<HistoryFilter, number>>(
        (result, item) => {
          result[item] = history.filter((record) => filterHistoryItem(record, item)).length;
          return result;
        },
        { all: history.length, failed: 0, processing: 0, success: 0 },
      ),
    [history],
  );
  const filterLabel = (nextFilter: HistoryFilter) => t(`video.history.filter.${nextFilter}` as "video.history.filter.all");
  const statusLabel = (status: string, fallback: string, isStaleActive = false) => {
    if (isStaleActive) return t("video.history.status.stale");
    if (isVideoFailedStatus(status)) return t("video.status.failed");
    if (isVideoCompletedStatus(status)) return t("video.status.completed");
    if (isVideoActiveStatus(status)) return t("video.status.processing");
    return fallback || t("video.history.status.unknown");
  };

  return (
    <section className="flex h-full min-h-[420px] flex-col overflow-hidden rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_50%_0%,rgba(255,180,77,.12),transparent_35%),rgba(255,255,255,.04)] p-4 shadow-2xl shadow-black/24">
      <div className="mb-3 flex flex-none flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[.2em] text-[#ffcf83]">{t("video.history.outputs")}</p>
          <h2 className="mt-1 text-base font-black text-white">{t("video.main.history")}</h2>
          <span className="text-xs text-white/42">
            {isLoading ? t("video.history.loading") : tf("video.history.itemsCount", { visible: visibleHistory.length, total: history.length })}
          </span>
        </div>
        <div className="se-segmented flex max-w-full flex-wrap gap-1.5 rounded-2xl p-1.5">
          {filters.map((item) => {
            const isActive = item === filter;
            return (
              <button
                className={`se-segmented-item min-h-8 rounded-full px-3 text-[11px] font-black ${isActive ? "se-segmented-item-active" : ""}`}
                key={item}
                onClick={() => onFilterChange(item)}
                type="button"
              >
                {filterLabel(item)}
                <span className="se-segmented-count text-[9px]">{counts[item]}</span>
              </button>
            );
          })}
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
              const sensitiveFailure = isFailed && isSensitiveFailure(view.errorMessage);

              return (
                <article className="overflow-hidden rounded-[28px] border border-white/10 bg-black/22" key={view.key}>
                  <div className="grid gap-0 2xl:grid-cols-[minmax(0,1.3fr)_minmax(270px,0.7fr)]">
                    <div className="grid min-h-[280px] place-items-center bg-[#05070b] p-3">
                      {view.outputUrl ? (
                        <video className="max-h-[56vh] min-h-[280px] w-full rounded-[22px] object-contain" controls playsInline src={view.outputUrl} />
                      ) : view.thumbnailUrl && !isFailed ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img alt="" className="max-h-[56vh] min-h-[280px] w-full rounded-[22px] object-contain" src={view.thumbnailUrl} />
                      ) : isFailed ? (
                        <div className="grid min-h-[280px] w-full place-items-center rounded-[22px] border border-white/10 bg-black/70 px-6 text-center">
                          <div>
                            <div className="mx-auto mb-4 grid size-14 place-items-center rounded-3xl border border-[#8c4632]/42 bg-[#2a1012] text-xl font-black text-[#f2b3a1]">
                              !
                            </div>
                            <p className="text-lg font-black text-[#f2b3a1]">
                              {sensitiveFailure ? t("video.history.canvas.sensitive") : t("video.history.canvas.failed")}
                            </p>
                            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#f2b3a1]/58">{view.errorMessage}</p>
                            {view.refundNotice ? (
                              <span className="mt-4 inline-flex rounded-full border border-[#ffb44d]/20 bg-[#ffb44d]/10 px-3 py-1 text-xs font-black text-[#ffd08a]">
                                {t("video.history.canvas.refunded")}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      ) : isProcessing ? (
                        <div className="grid min-h-[280px] w-full place-items-center rounded-[22px] border border-[#ffb44d]/20 bg-[#ffb44d]/10 px-6 text-center">
                          <div>
                            <span className="mx-auto mb-5 block size-12 animate-pulse rounded-3xl border border-[#ffb44d]/30 bg-[#ffb44d]/20" />
                            <p className="text-lg font-black text-white">{t("video.result.processingTitle")}</p>
                            <p className="mt-2 text-sm text-white/46">{tf("video.result.job", { jobId: item.jobId || "--" })}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="grid min-h-[280px] w-full place-items-center rounded-[22px] border border-dashed border-white/12 text-sm text-white/42">
                          {t(emptyMessageKey(filter))}
                        </div>
                      )}
                    </div>

                    <div className="flex min-w-0 flex-col gap-3 border-t border-white/10 p-4 2xl:border-l 2xl:border-t-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`se-status rounded-full px-2.5 py-1 text-[10px] font-black ${statusClass(isStaleActive ? "unknown" : view.status, Boolean(view.outputUrl))}`}>
                          {statusLabel(view.status, view.statusLabel, isStaleActive)}
                        </span>
                        <span className="text-xs text-white/38">{view.createdAtLabel}</span>
                      </div>

                      <p className="line-clamp-4 text-base font-black leading-6 text-white">{view.title}</p>

                      <div className="grid grid-cols-2 gap-2 text-xs text-white/46">
                        <span className="truncate rounded-2xl border border-white/10 bg-white/[.035] px-3 py-2">
                          {tf("video.history.model", { model: view.modelLabel })}
                        </span>
                        <span className="truncate rounded-2xl border border-white/10 bg-white/[.035] px-3 py-2">
                          {view.duration}
                        </span>
                        <span className="truncate rounded-2xl border border-white/10 bg-white/[.035] px-3 py-2">
                          {view.ratio}
                        </span>
                        <span className="truncate rounded-2xl border border-white/10 bg-white/[.035] px-3 py-2">
                          {view.quality}
                        </span>
                      </div>

                      {isFailed ? (
                        <p className="rounded-2xl border border-[#8c4632]/30 bg-[#2a1012]/62 px-3 py-2 text-xs leading-5 text-[#f2b3a1]/62">
                          {view.errorMessage}
                        </p>
                      ) : null}

                      <div className="mt-auto flex flex-wrap gap-2">
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

                      <span className="text-[11px] text-white/30">{tf("video.history.job", { job: view.jobLabel })}</span>
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="grid min-h-[360px] place-items-center rounded-[28px] border border-dashed border-white/12 bg-black/20 p-8 text-center">
              <div>
                <p className="text-base font-black text-white">{t(emptyMessageKey(filter))}</p>
                <p className="mt-2 text-sm text-white/42">{t("video.history.subtitle")}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
