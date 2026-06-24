"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/i18n/useI18n";
import { collectHistoryInputMediaAssets } from "@/lib/media-assets";
import { getVideoUserFacingError } from "@/lib/video/videoErrorDisplay";
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
  onRetryAsDraft?: (record: VideoTaskRecord) => void;
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
  return "video.history.empty";
}

function safeDownloadFilename(view: ReturnType<typeof getSafeVideoHistoryView>) {
  const id = view.jobLabel && view.jobLabel !== "--" ? view.jobLabel : view.key || Date.now();
  return `shadowedge-video-${String(id).replace(/[^\w.-]+/g, "-")}.mp4`;
}

function actionButtonClass(tone: "danger" | "normal" | "primary" = "normal") {
  if (tone === "danger") {
    return "se-button-danger rounded-full px-2 py-1 text-[10px] font-bold";
  }
  if (tone === "primary") {
    return "se-button-secondary rounded-full px-2 py-1 text-[10px] font-bold";
  }
  return "se-button-ghost rounded-full px-2 py-1 text-[10px] font-bold";
}

function getRecordMeta(record: VideoTaskRecord) {
  return record.meta && typeof record.meta === "object" && !Array.isArray(record.meta) ? (record.meta as Record<string, unknown>) : {};
}

function getOutputSourceLabel(record: VideoTaskRecord, t: ReturnType<typeof useI18n>["t"]) {
  const meta = getRecordMeta(record);
  if (meta.source === "remake" || meta.remake === true || meta.remake_source === "storyboard_shot") {
    return t("video.generation.remakeOutput");
  }

  return t("video.generation.createOutput");
}

function isRemakeRecord(record: VideoTaskRecord) {
  const meta = getRecordMeta(record);
  return meta.source === "remake" || meta.remake === true || meta.remake_source === "storyboard_shot";
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
  onRetryAsDraft,
  onUseResultAsReference,
}: HistoryPanelProps) {
  const { t, tf } = useI18n();
  const [localFilter, setLocalFilter] = useState<HistoryFilter>("all");
  const [expandedKey, setExpandedKey] = useState<string>("");
  const currentFilter = filter ?? localFilter;
  const setNextFilter = (nextFilter: HistoryFilter) => {
    if (filter === undefined) setLocalFilter(nextFilter);
    onFilterChange?.(nextFilter);
  };

  const visibleHistory = useMemo(() => history.filter((item) => filterHistoryItem(item, currentFilter)), [currentFilter, history]);
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
  const localizeHistoryMessage = (message: string, record: VideoTaskRecord) => {
    if (message === "Video generation failed. Please try again later or change the media.") return t("video.errors.generationFailed");
    if (message === "Unable to check this job status. It may be expired. Please check History or retry.") return t("video.result.statusExpired");
    const view = getSafeVideoHistoryView(record);
    return getVideoUserFacingError(message, t, {
      context: isRemakeRecord(record) ? "remake" : "video",
      errorCode: view.errorCode,
      refunded: view.refunded,
      refundStatus: view.refundStatus,
    });
  };
  const localizeRefundNotice = (notice: string) => {
    const amount = notice.match(/^Refunded\s+(.+?)\s+credits\.$/i)?.[1];
    if (amount) return tf("video.credits.refundedAmount", { amount });
    if (notice === "Credits were refunded for this failed task.") return t("video.credits.refunded");
    return notice;
  };

  return (
    <section className="se-card-quiet flex h-full min-h-0 flex-col overflow-hidden rounded-[26px] p-2.5 shadow-2xl shadow-black/18">
      <div className="mb-2.5 flex flex-none flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[.18em] text-[#ffcf83]">{t("video.history.outputs")}</p>
          <h2 className="mt-1 text-sm font-black text-white">{t("video.history.saved")}</h2>
          <span className="text-xs text-white/42">
            {isLoading ? t("video.history.loading") : tf("video.history.itemsCount", { visible: visibleHistory.length, total: history.length })}
          </span>
        </div>
        <div className="se-segmented flex max-w-full flex-wrap gap-1.5 rounded-2xl p-1">
          {filters.map((item) => {
            const isActive = item === currentFilter;
            return (
              <button
                className={`se-segmented-item rounded-full px-2.5 py-1.5 text-[10px] font-black ${isActive ? "se-segmented-item-active" : ""}`}
                key={item}
                onClick={() => setNextFilter(item)}
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
        <div className="grid gap-2">
          {visibleHistory.length ? (
            visibleHistory.map((item) => {
              const view = getSafeVideoHistoryView(item);
              const hasOutput = Boolean(view.outputUrl);
              const isSuccess = isVideoCompletedStatus(view.status) && hasOutput;
              const isFailed = isVideoFailedStatus(view.status);
              const isStaleActive = isVideoStaleActiveRecord(item);
              const isProcessing = isVideoActiveStatus(view.status) && !isStaleActive;
              const useResultIssue = getUseResultAsReferenceIssue?.(item) || "";
              const referenceCount = collectHistoryInputMediaAssets([item]).length;
              const sourceLabel = getOutputSourceLabel(item, t);
              const isExpanded = expandedKey === view.key;
              const copyMetadata = () => {
                const metadata = {
                  createdAt: view.createdAtLabel,
                  duration: view.duration,
                  job: view.jobLabel,
                  model: view.modelLabel,
                  outputUrl: view.outputUrl,
                  prompt: view.title,
                  quality: view.quality,
                  ratio: view.ratio,
                  status: view.status,
                };
                void navigator.clipboard?.writeText(JSON.stringify(metadata, null, 2));
              };
              return (
                <article className="se-card-interactive group rounded-[18px] p-2" key={view.key}>
                  <div className="grid grid-cols-[68px_minmax(0,1fr)] gap-2">
                    <div className="relative grid aspect-square place-items-center overflow-hidden rounded-2xl bg-white/[.045]">
                      {view.outputUrl ? (
                        <video className="h-full w-full object-cover" muted playsInline preload="metadata" src={view.outputUrl} />
                      ) : view.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img alt="" className="h-full w-full object-cover" src={view.thumbnailUrl} />
                      ) : isVideoFailedStatus(view.status) ? (
                        <span className="text-xs font-black text-[#f2b3a1]/72">{t("video.status.failed")}</span>
                      ) : isProcessing ? (
                        <span className="text-xs font-black text-[#ffd08a]">{t("video.status.processing")}</span>
                      ) : isStaleActive ? (
                        <span className="text-center text-xs font-black text-white/45">{t("video.history.status.staleTask")}</span>
                      ) : (
                        <span className="text-xs text-white/40">{t("video.history.status.task")}</span>
                      )}
                      <span className="absolute inset-x-1.5 bottom-1.5 rounded-full border border-black/18 bg-black/58 px-2 py-0.5 text-center text-[9px] font-bold text-white/78 backdrop-blur-sm">
                        {sourceLabel}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span className={`se-status shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-black ${statusClass(isStaleActive ? "unknown" : view.status, Boolean(view.outputUrl))}`}>
                          {statusLabel(view.status, view.statusLabel, isStaleActive)}
                        </span>
                        {isFailed && view.refunded ? (
                          <span className="shrink-0 rounded-full border border-[#ffb44d]/20 bg-[#ffb44d]/10 px-1.5 py-0.5 text-[9px] font-bold text-[#ffd08a]">
                            {t("video.history.refundedChip")}
                          </span>
                        ) : null}
                        <span className="truncate text-[11px] text-white/34">{view.createdAtLabel}</span>
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-sm font-bold leading-5 text-white">{view.title}</p>
                      <div className="mt-1 grid gap-0.5 text-[10px] text-white/40">
                        <span className="truncate">{tf("video.history.model", { model: view.modelLabel })}</span>
                        <span className="truncate">{tf("video.history.job", { job: view.jobLabel })}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5 text-[9px] font-semibold text-white/45">
                        <span className="rounded-full border border-white/10 bg-white/[.035] px-2 py-0.5">{view.quality}</span>
                        <span className="rounded-full border border-white/10 bg-white/[.035] px-2 py-0.5">{view.duration}</span>
                        <span className="rounded-full border border-white/10 bg-white/[.035] px-2 py-0.5">{view.ratio}</span>
                        <span className="rounded-full border border-white/10 bg-white/[.035] px-2 py-0.5">
                          {tf("video.generation.referencesCount", { count: referenceCount })}
                        </span>
                      </div>
                      {isFailed ? (
                        <div className="mt-2">
                          <span className="line-clamp-2 w-full text-[11px] leading-4 text-[#f2b3a1]/62">
                            {localizeHistoryMessage(view.errorMessage, item)}
                            {view.refundNotice ? ` ${localizeRefundNotice(view.refundNotice)}` : ""}
                          </span>
                        </div>
                      ) : null}
                      <div className="mt-2 flex flex-wrap gap-1.5 border-t border-white/8 pt-2">
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
                        {(isSuccess || isFailed) ? (
                          <button className={actionButtonClass("normal")} disabled={!view.title} onClick={() => void navigator.clipboard?.writeText(view.title || "")} type="button">
                            {t("video.history.copyPrompt")}
                          </button>
                        ) : null}
                        {isSuccess && onFill ? (
                          <button className={actionButtonClass("normal")} onClick={() => onFill(item)} type="button">
                            {t("video.history.fill")}
                          </button>
                        ) : null}
                        {isFailed ? (
                          <button className={actionButtonClass("primary")} disabled={!onRetryAsDraft} onClick={() => onRetryAsDraft?.(item)} title={t("video.history.draftOnlyHint")} type="button">
                            {t("video.history.retryAsDraft")}
                          </button>
                        ) : null}
                        {isSuccess && onUseResultAsReference ? (
                          <button
                            className={actionButtonClass("normal")}
                            disabled={Boolean(useResultIssue)}
                            onClick={() => onUseResultAsReference(item)}
                            title={useResultIssue || t("video.history.reuseAsVideoDraftTitle")}
                            type="button"
                          >
                            {t("video.history.reuseAsVideoDraft")}
                          </button>
                        ) : null}
                        {(isSuccess || isFailed) ? (
                          <button className={actionButtonClass("normal")} onClick={() => setExpandedKey(isExpanded ? "" : view.key)} type="button">
                            {t("video.history.viewDetails")}
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
                      {isExpanded ? (
                        <div className="mt-2 rounded-2xl border border-white/8 bg-black/24 p-2.5 text-[11px] leading-5 text-white/46">
                          <div className="mb-1.5 flex items-center justify-between gap-2">
                            <span className="font-bold text-white/70">{t("video.history.viewDetails")}</span>
                            <button className={actionButtonClass("normal")} onClick={copyMetadata} type="button">
                              {t("video.history.copyMetadata")}
                            </button>
                          </div>
                          <p className="line-clamp-2 text-white/58">{view.title}</p>
                          <p className="mt-1 truncate">{view.modelLabel} · {view.duration} · {view.ratio} · {view.quality}</p>
                          {isFailed ? <p className="mt-1 line-clamp-2 text-[#f2b3a1]/70">{localizeHistoryMessage(view.errorMessage, item)}</p> : null}
                        </div>
                      ) : null}
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
