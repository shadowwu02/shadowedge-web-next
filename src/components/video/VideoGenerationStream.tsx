"use client";

import { useMemo } from "react";
import { VideoOutputDetailPanel } from "@/components/video/VideoOutputDetailPanel";
import { VideoModelLogo } from "@/components/video/VideoModelLogo";
import { useI18n } from "@/i18n/useI18n";
import {
  getSafeVideoHistoryView,
  getVideoHistoryStableKey,
  getVideoHistoryTime,
  isVideoStaleActiveRecord,
  preferLatestVideoTask,
} from "@/lib/video/historyUtils";
import { isVideoActiveStatus, isVideoCompletedStatus, isVideoFailedStatus } from "@/lib/utils";
import type { UploadMediaItem, VideoTaskRecord } from "@/types/video";

export type VideoHistoryFilter = "all" | "success" | "failed" | "processing";

type VideoGenerationStreamProps = {
  filter: VideoHistoryFilter;
  getAddReferenceIssue?: (asset: UploadMediaItem) => string;
  getUseResultAsReferenceIssue?: (record: VideoTaskRecord) => string;
  history: VideoTaskRecord[];
  isLoading?: boolean;
  onAddReference?: (asset: UploadMediaItem) => void;
  onFill?: (record: VideoTaskRecord) => void;
  onFilterChange: (filter: VideoHistoryFilter) => void;
  onRetry?: (record: VideoTaskRecord) => void;
  onUseResultAsReference?: (record: VideoTaskRecord) => void;
  task: VideoTaskRecord | null;
};

const streamLimit = 36;
const filters: VideoHistoryFilter[] = ["all", "success", "failed", "processing"];

function safeDownloadFilename(view: ReturnType<typeof getSafeVideoHistoryView>) {
  const id = view.jobLabel && view.jobLabel !== "--" ? view.jobLabel : view.key || Date.now();
  return `shadowedge-video-${String(id).replace(/[^\w.-]+/g, "-")}.mp4`;
}

function isSensitiveFailure(message: string) {
  return /nsfw|sensitive|policy|content|moderation|copyright/i.test(message);
}

function statusClass(status: string, hasOutput: boolean, isStale = false) {
  if (isStale) return "se-status-paused";
  if (isVideoFailedStatus(status)) return "se-status-failed";
  if (isVideoCompletedStatus(status) && hasOutput) return "se-status-completed";
  if (isVideoActiveStatus(status)) return "se-status-processing";
  return "se-status-neutral";
}

function canvasActionClass(tone: "normal" | "primary" = "normal") {
  if (tone === "primary") {
    return "se-icon-button-primary size-9 backdrop-blur-md";
  }

  return "se-icon-button size-9 backdrop-blur-md";
}

function outputActionClass(tone: "primary" | "normal" = "normal") {
  if (tone === "primary") {
    return "se-button-secondary inline-flex min-h-9 items-center justify-center rounded-[15px] px-3 text-xs font-semibold";
  }

  return "se-button-ghost inline-flex min-h-9 items-center justify-center rounded-[15px] px-3 text-xs font-semibold";
}

function getRecordModelLogoLookup(record: VideoTaskRecord, modelLabel: string) {
  return [record.modelId, record.model, record.frontendModel, record.providerModel, record.provider, modelLabel].filter(Boolean).join(" ");
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

function AddReferenceIcon() {
  return (
    <svg aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function FillPromptIcon() {
  return (
    <svg aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10a6 6 0 0 1 6 6v4" />
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

export function buildVideoGenerationRecords(task: VideoTaskRecord | null, history: VideoTaskRecord[]) {
  const records = new Map<string, VideoTaskRecord>();

  history.forEach((record, index) => {
    const key = getVideoHistoryStableKey(record, `history:${index}`) || `history:${index}`;
    records.set(key, preferLatestVideoTask(records.get(key) || null, record) || record);
  });

  let taskKey = "";
  if (task) {
    taskKey = getVideoHistoryStableKey(task, "current") || "current";
    records.set(taskKey, preferLatestVideoTask(records.get(taskKey) || null, task) || task);
  }

  const ordered = Array.from(records.entries()).sort((a, b) => getVideoHistoryTime(b[1]) - getVideoHistoryTime(a[1]));
  if (taskKey) {
    const taskIndex = ordered.findIndex(([key]) => key === taskKey);
    if (taskIndex > 0) {
      const [taskEntry] = ordered.splice(taskIndex, 1);
      ordered.unshift(taskEntry);
    }
  }

  return ordered.slice(0, streamLimit).map(([, record]) => record);
}

function filterGenerationRecord(record: VideoTaskRecord, filter: VideoHistoryFilter) {
  const view = getSafeVideoHistoryView(record);

  if (filter === "success") return isVideoCompletedStatus(view.status) && Boolean(view.outputUrl);
  if (filter === "failed") return isVideoFailedStatus(view.status);
  if (filter === "processing") return isVideoActiveStatus(view.status) && !isVideoStaleActiveRecord(record);
  return true;
}

function VideoGenerationCard({
  getAddReferenceIssue,
  getUseResultAsReferenceIssue,
  onAddReference,
  onFill,
  onRetry,
  onUseResultAsReference,
  record,
}: {
  getAddReferenceIssue?: (asset: UploadMediaItem) => string;
  getUseResultAsReferenceIssue?: (record: VideoTaskRecord) => string;
  onAddReference?: (asset: UploadMediaItem) => void;
  onFill?: (record: VideoTaskRecord) => void;
  onRetry?: (record: VideoTaskRecord) => void;
  onUseResultAsReference?: (record: VideoTaskRecord) => void;
  record: VideoTaskRecord;
}) {
  const { t, tf } = useI18n();
  const view = getSafeVideoHistoryView(record);
  const hasOutput = Boolean(view.outputUrl);
  const isSuccess = isVideoCompletedStatus(view.status) && hasOutput;
  const isFailed = isVideoFailedStatus(view.status);
  const isStaleActive = isVideoStaleActiveRecord(record);
  const isProcessing = isVideoActiveStatus(view.status) && !isStaleActive;
  const sensitiveFailure = isFailed && isSensitiveFailure(view.errorMessage);
  const useResultIssue = getUseResultAsReferenceIssue?.(record) || "";
  const modelLogoLookup = getRecordModelLogoLookup(record, view.modelLabel);
  const sourceLabel = getOutputSourceLabel(record, t);
  const statusLabel = isStaleActive
    ? t("video.generation.stale")
    : isFailed
      ? t("video.generation.failed")
      : isSuccess
        ? t("video.status.completed")
        : isProcessing
          ? t("video.status.processing")
          : view.statusLabel;

  return (
    <article className="group grid gap-3.5 rounded-[32px] border border-[rgba(244,244,244,0.08)] bg-[linear-gradient(180deg,rgba(17,19,24,0.90),rgba(8,10,14,0.94))] p-3 shadow-[0_28px_70px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(244,244,244,0.035)] transition-colors hover:border-[#ffb44d]/24 xl:grid-cols-[minmax(0,2.35fr)_minmax(300px,0.85fr)] 2xl:grid-cols-[minmax(0,2.55fr)_minmax(330px,0.8fr)]">
      <div className="min-w-0">
        <div className="mb-3 flex items-center justify-between gap-3 px-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className="rounded-full border border-[#ffb44d]/20 bg-[#ffb44d]/8 px-2.5 py-1 text-[10px] font-semibold text-[#ffd08a]/86">
              {sourceLabel}
            </span>
            <span className={`se-status rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusClass(view.status, hasOutput, isStaleActive)}`}>
              {statusLabel}
            </span>
            <span className="inline-flex min-w-0 items-center gap-1.5 truncate text-xs font-semibold text-[#b9b9b9]/72">
              <VideoModelLogo label={view.modelLabel} lookup={modelLogoLookup} size="sm" />
              <span className="truncate">{view.modelLabel}</span>
            </span>
          </div>
          <span className="shrink-0 text-[11px] text-[#b9b9b9]/45">{view.createdAtLabel}</span>
        </div>

        <div className="relative grid min-h-[460px] place-items-center overflow-hidden rounded-[28px] border border-[rgba(244,244,244,0.08)] bg-[#05070b] shadow-inner shadow-black/35 transition-colors xl:min-h-[520px] 2xl:min-h-[600px]">
          {view.outputUrl ? (
            <>
              <video className="max-h-[74vh] min-h-[460px] w-full object-contain xl:min-h-[520px] 2xl:min-h-[600px]" controls playsInline src={view.outputUrl} />
              <div className="absolute right-4 top-4 flex flex-col gap-2 opacity-0 transition group-hover:opacity-100">
                {onUseResultAsReference ? (
                  <button
                    aria-label={t("video.generation.useAsReference")}
                    className={canvasActionClass()}
                    disabled={Boolean(useResultIssue)}
                    onClick={(event) => {
                      event.stopPropagation();
                      onUseResultAsReference(record);
                    }}
                    title={useResultIssue || t("video.generation.useAsReference")}
                    type="button"
                  >
                    <AddReferenceIcon />
                  </button>
                ) : null}
                {onFill ? (
                  <button
                    aria-label={t("video.generation.fillPrompt")}
                    className={canvasActionClass()}
                    onClick={(event) => {
                      event.stopPropagation();
                      onFill(record);
                    }}
                    title={t("video.generation.fillPrompt")}
                    type="button"
                  >
                    <FillPromptIcon />
                  </button>
                ) : null}
                <a
                  aria-label={t("video.history.downloadOpen")}
                  className={canvasActionClass()}
                  download={safeDownloadFilename(view)}
                  href={view.outputUrl}
                  onClick={(event) => event.stopPropagation()}
                  rel="noreferrer"
                  target="_blank"
                  title={t("video.history.downloadOpen")}
                >
                  <DownloadIcon />
                </a>
              </div>
            </>
          ) : view.thumbnailUrl && !isFailed && !isStaleActive ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="" className="max-h-[74vh] min-h-[460px] w-full object-contain xl:min-h-[520px] 2xl:min-h-[600px]" src={view.thumbnailUrl} />
          ) : isFailed || isStaleActive ? (
            <div className="grid min-h-[460px] w-full place-items-center bg-[#05070b] px-6 text-center xl:min-h-[520px] 2xl:min-h-[600px]">
              <div>
                <div className="mx-auto mb-4 grid size-14 place-items-center rounded-[20px] border border-[#8c4632]/42 bg-[#2a1012] text-xl font-semibold text-[#f2b3a1]">
                  !
                </div>
                <div className="mb-4 flex flex-wrap justify-center gap-2">
                  <span className={`se-status rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusClass(view.status, false, isStaleActive)}`}>
                    {statusLabel}
                  </span>
                  {sensitiveFailure ? (
                    <span className="se-status se-status-failed rounded-full px-2.5 py-1 text-[10px] font-semibold">
                      {t("video.generation.sensitive")}
                    </span>
                  ) : null}
                  {view.refundNotice ? (
                    <span className="rounded-full border border-[#ffb44d]/30 bg-[#ffb44d]/10 px-2.5 py-1 text-[10px] font-semibold text-[#ffb44d]">
                      {t("video.generation.refunded")}
                    </span>
                  ) : null}
                </div>
                <p className="text-lg font-semibold text-[#f2b3a1]">
                  {isStaleActive ? t("video.generation.stale") : sensitiveFailure ? t("video.generation.sensitive") : t("video.generation.failed")}
                </p>
                <p className="mx-auto mt-2 line-clamp-2 max-w-lg text-sm leading-6 text-[#f2b3a1]/54">{view.errorMessage}</p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {onFill ? (
                    <button
                      className={canvasActionClass()}
                      onClick={(event) => {
                        event.stopPropagation();
                        onFill(record);
                      }}
                      title={t("video.generation.fillPrompt")}
                      type="button"
                    >
                      <FillPromptIcon />
                    </button>
                  ) : null}
                  {(isFailed || isStaleActive) && onRetry ? (
                    <button
                      className={canvasActionClass("primary")}
                      onClick={(event) => {
                        event.stopPropagation();
                        onRetry(record);
                      }}
                      title={t("video.history.retry")}
                      type="button"
                    >
                      <RetryIcon />
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ) : isProcessing ? (
            <div className="grid min-h-[460px] w-full place-items-center bg-[#111318] px-6 text-center xl:min-h-[520px] 2xl:min-h-[600px]">
              <div>
                <span className="mx-auto mb-5 block size-12 animate-pulse rounded-3xl border border-[#ffb44d]/32 bg-[#ffb44d]/16" />
                <p className="text-lg font-semibold text-[#f4f4f4]">{t("video.result.processingTitle")}</p>
                <p className="mt-2 text-sm text-[#b9b9b9]/55">{tf("video.result.job", { jobId: record.jobId || "--" })}</p>
              </div>
            </div>
          ) : (
            <div className="grid min-h-[460px] w-full place-items-center text-sm text-[#b9b9b9]/55 xl:min-h-[520px] 2xl:min-h-[600px]">
              {t("video.generation.empty.title")}
            </div>
          )}

          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#05070b]/78 via-[#05070b]/18 to-transparent p-4 opacity-0 transition group-hover:opacity-100">
            <p className="line-clamp-2 max-w-3xl text-sm font-medium leading-6 text-[#f4f4f4]/82">{view.title}</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-[22px] border border-[rgba(244,244,244,0.08)] bg-[#111318]/58 p-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2 text-[11px] font-medium text-[#b9b9b9]/58">
            <span className="se-pill rounded-full px-2.5 py-1">{view.quality}</span>
            <span className="se-pill rounded-full px-2.5 py-1">{view.duration}</span>
            <span className="se-pill rounded-full px-2.5 py-1">{view.ratio}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {hasOutput ? (
              <>
                <a className={outputActionClass("primary")} href={view.outputUrl} rel="noreferrer" target="_blank">
                  {t("video.generation.openResult")}
                </a>
                <a className={outputActionClass()} download={safeDownloadFilename(view)} href={view.outputUrl} rel="noreferrer" target="_blank">
                  {t("video.generation.downloadResult")}
                </a>
              </>
            ) : null}
            {(isSuccess || isFailed || isStaleActive) && onFill ? (
              <button className={outputActionClass()} onClick={() => onFill(record)} type="button">
                {t("video.generation.reusePrompt")}
              </button>
            ) : null}
            {hasOutput && onUseResultAsReference ? (
              <button
                className={outputActionClass()}
                disabled={Boolean(useResultIssue)}
                onClick={() => onUseResultAsReference(record)}
                title={useResultIssue || t("video.history.useResultTitle")}
                type="button"
              >
                {t("video.generation.useAsReference")}
              </button>
            ) : null}
            {(isFailed || isStaleActive) && onRetry ? (
              <button className={outputActionClass("primary")} onClick={() => onRetry(record)} type="button">
                {t("video.history.retry")}
              </button>
            ) : null}
          </div>
          {hasOutput && useResultIssue ? <p className="w-full text-[11px] leading-4 text-[#b9b9b9]/45">{useResultIssue}</p> : null}
        </div>
      </div>

      <VideoOutputDetailPanel
        getAddReferenceIssue={getAddReferenceIssue}
        getUseResultAsReferenceIssue={getUseResultAsReferenceIssue}
        onAddReference={onAddReference}
        onFill={onFill}
        onRetry={onRetry}
        onUseResultAsReference={onUseResultAsReference}
        record={record}
      />
    </article>
  );
}

export function VideoGenerationStream({
  filter,
  getAddReferenceIssue,
  getUseResultAsReferenceIssue,
  history,
  isLoading = false,
  onAddReference,
  onFill,
  onFilterChange,
  onRetry,
  onUseResultAsReference,
  task,
}: VideoGenerationStreamProps) {
  const { t, tf } = useI18n();
  const records = useMemo(() => buildVideoGenerationRecords(task, history), [history, task]);
  const visibleRecords = useMemo(() => records.filter((record) => filterGenerationRecord(record, filter)), [filter, records]);
  const counts = useMemo(
    () =>
      filters.reduce<Record<VideoHistoryFilter, number>>(
        (result, item) => {
          result[item] = records.filter((record) => filterGenerationRecord(record, item)).length;
          return result;
        },
        { all: records.length, failed: 0, processing: 0, success: 0 },
      ),
    [records],
  );

  return (
    <section className="flex h-full min-h-[420px] flex-col overflow-hidden">
      <div className="se-segmented mb-3 flex flex-none flex-wrap items-center justify-between gap-2 rounded-[24px] p-2">
        <div className="flex flex-wrap gap-1.5">
          {filters.map((item) => {
            const isActive = item === filter;
            return (
              <button
                className={`se-segmented-item rounded-full px-3 py-1.5 text-xs font-semibold ${isActive ? "se-segmented-item-active" : ""}`}
                key={item}
                onClick={() => onFilterChange(item)}
                type="button"
              >
                {t(`video.history.filter.${item}` as "video.history.filter.all")}
                <span className="se-segmented-count">{counts[item]}</span>
              </button>
            );
          })}
        </div>
        <span className="text-xs font-medium text-[#b9b9b9]/48">
          {isLoading ? t("video.history.loading") : tf("video.history.itemsCount", { total: records.length, visible: visibleRecords.length })}
        </span>
      </div>

      <div className="se-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1.5">
        <div className="grid gap-5">
          {visibleRecords.length ? (
            visibleRecords.map((record, index) => {
              const key = getVideoHistoryStableKey(record, `generation:${index}`) || `generation:${index}`;
              return (
                <VideoGenerationCard
                  getAddReferenceIssue={getAddReferenceIssue}
                  getUseResultAsReferenceIssue={getUseResultAsReferenceIssue}
                  key={key}
                  onAddReference={onAddReference}
                  onFill={onFill}
                  onRetry={onRetry}
                  onUseResultAsReference={onUseResultAsReference}
                  record={record}
                />
              );
            })
          ) : (
            <div className="grid min-h-[520px] place-items-center rounded-[28px] border border-dashed border-[rgba(244,244,244,0.10)] bg-[#111318]/66 p-8 text-center">
              <div className="max-w-md">
                <p className="text-lg font-semibold text-[#f4f4f4]">{t("video.generation.empty.title")}</p>
                <p className="mt-2 text-sm leading-6 text-[#b9b9b9]/55">{t("video.generation.empty.body")}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
