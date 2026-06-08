"use client";

import { useMemo } from "react";
import { useI18n } from "@/i18n/useI18n";
import { collectHistoryInputMediaAssets } from "@/lib/media-assets";
import {
  getSafeVideoHistoryView,
  getVideoHistoryStableKey,
  getVideoHistoryTime,
  isVideoStaleActiveRecord,
  preferLatestVideoTask,
} from "@/lib/video/historyUtils";
import { isVideoActiveStatus, isVideoCompletedStatus, isVideoFailedStatus } from "@/lib/utils";
import type { UploadMediaItem, VideoTaskRecord } from "@/types/video";

type VideoGenerationStreamProps = {
  getAddReferenceIssue?: (asset: UploadMediaItem) => string;
  getUseResultAsReferenceIssue?: (record: VideoTaskRecord) => string;
  history: VideoTaskRecord[];
  isLoading?: boolean;
  onAddReference?: (asset: UploadMediaItem) => void;
  onFill?: (record: VideoTaskRecord) => void;
  onHide?: (record: VideoTaskRecord) => void;
  onRetry?: (record: VideoTaskRecord) => void;
  onUseResultAsReference?: (record: VideoTaskRecord) => void;
  task: VideoTaskRecord | null;
};

const streamLimit = 20;

function safeDownloadFilename(view: ReturnType<typeof getSafeVideoHistoryView>) {
  const id = view.jobLabel && view.jobLabel !== "--" ? view.jobLabel : view.key || Date.now();
  return `shadowedge-video-${String(id).replace(/[^\w.-]+/g, "-")}.mp4`;
}

function isSensitiveFailure(message: string) {
  return /nsfw|sensitive|policy|content|moderation|copyright/i.test(message);
}

function statusClass(status: string, hasOutput: boolean, isStale = false) {
  if (isStale) return "border-[#ffb44d]/22 bg-[#ffb44d]/10 text-[#ffd08a]";
  if (isVideoFailedStatus(status)) return "border-red-300/25 bg-red-400/10 text-red-100";
  if (isVideoCompletedStatus(status) && hasOutput) return "border-emerald-300/20 bg-emerald-400/10 text-emerald-100";
  if (isVideoActiveStatus(status)) return "border-[#ffb44d]/24 bg-[#ffb44d]/10 text-[#ffd08a]";
  return "border-white/10 bg-white/[.045] text-white/58";
}

function actionButtonClass(tone: "danger" | "normal" | "primary" = "normal") {
  if (tone === "danger") {
    return "rounded-full border border-red-300/25 bg-red-400/10 px-2.5 py-1 text-[11px] font-bold text-red-100 transition hover:bg-red-400/16 disabled:cursor-not-allowed disabled:opacity-45";
  }

  if (tone === "primary") {
    return "rounded-full border border-[#ffb44d]/35 bg-[#ffb44d]/10 px-2.5 py-1 text-[11px] font-bold text-[#ffd08a] transition hover:bg-[#ffb44d]/20 disabled:cursor-not-allowed disabled:opacity-45";
  }

  return "rounded-full border border-white/10 bg-white/[.045] px-2.5 py-1 text-[11px] font-bold text-white/70 transition hover:border-[#ffb44d]/35 hover:text-[#ffd08a] disabled:cursor-not-allowed disabled:opacity-45";
}

function canvasActionClass() {
  return "grid size-10 place-items-center rounded-full border border-white/12 bg-black/66 text-sm font-black text-white/74 shadow-2xl shadow-black/30 backdrop-blur transition hover:border-[#ffb44d]/45 hover:bg-[#ffb44d]/16 hover:text-[#ffd08a] disabled:cursor-not-allowed disabled:opacity-45";
}

function mediaIcon(type: UploadMediaItem["type"]) {
  if (type === "audio") return "AUD";
  if (type === "video") return "VID";
  return "IMG";
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

function buildStreamRecords(task: VideoTaskRecord | null, history: VideoTaskRecord[]) {
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

function VideoGenerationCard({
  getAddReferenceIssue,
  getUseResultAsReferenceIssue,
  onAddReference,
  onFill,
  onHide,
  onRetry,
  onUseResultAsReference,
  record,
}: {
  getAddReferenceIssue?: (asset: UploadMediaItem) => string;
  getUseResultAsReferenceIssue?: (record: VideoTaskRecord) => string;
  onAddReference?: (asset: UploadMediaItem) => void;
  onFill?: (record: VideoTaskRecord) => void;
  onHide?: (record: VideoTaskRecord) => void;
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
  const referenceAssets = useMemo(() => collectHistoryInputMediaAssets([record]).slice(0, 8), [record]);
  const useResultIssue = getUseResultAsReferenceIssue?.(record) || "";
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
    <article className="overflow-hidden rounded-[30px] border border-white/10 bg-black/24 shadow-2xl shadow-black/18">
      <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_240px] 2xl:grid-cols-[minmax(0,1fr)_260px]">
        <div className="group relative grid min-h-[420px] place-items-center bg-[#05070b] p-3">
          {view.outputUrl ? (
            <>
              <video className="max-h-[70vh] min-h-[410px] w-full rounded-[24px] object-contain" controls playsInline src={view.outputUrl} />
              <div className="absolute right-5 top-5 flex flex-col gap-2 opacity-0 transition group-hover:opacity-100">
                {onUseResultAsReference ? (
                  <button
                    aria-label={t("video.generation.useAsReference")}
                    className={canvasActionClass()}
                    disabled={Boolean(useResultIssue)}
                    onClick={() => onUseResultAsReference(record)}
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
                    onClick={() => onFill(record)}
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
            <img alt="" className="max-h-[70vh] min-h-[410px] w-full rounded-[24px] object-contain" src={view.thumbnailUrl} />
          ) : isFailed || isStaleActive ? (
            <div className="grid min-h-[410px] w-full place-items-center rounded-[24px] border border-white/10 bg-black/76 px-6 text-center">
              <div>
                <div className="mx-auto mb-4 grid size-16 place-items-center rounded-[28px] border border-red-300/25 bg-red-400/10 text-2xl font-black text-red-100">
                  !
                </div>
                <div className="mb-4 flex flex-wrap justify-center gap-2">
                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${statusClass(view.status, false, isStaleActive)}`}>
                    {statusLabel}
                  </span>
                  {sensitiveFailure ? (
                    <span className="rounded-full border border-red-300/20 bg-red-400/10 px-2.5 py-1 text-[10px] font-black text-red-100">
                      {t("video.generation.sensitive")}
                    </span>
                  ) : null}
                  {view.refundNotice ? (
                    <span className="rounded-full border border-[#ffb44d]/22 bg-[#ffb44d]/10 px-2.5 py-1 text-[10px] font-black text-[#ffd08a]">
                      {t("video.generation.refunded")}
                    </span>
                  ) : null}
                </div>
                <p className="text-lg font-black text-red-100">
                  {isStaleActive ? t("video.generation.stale") : sensitiveFailure ? t("video.generation.sensitive") : t("video.generation.failed")}
                </p>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-red-100/60">{view.errorMessage}</p>
              </div>
            </div>
          ) : isProcessing ? (
            <div className="grid min-h-[410px] w-full place-items-center rounded-[24px] border border-[#ffb44d]/20 bg-[#ffb44d]/10 px-6 text-center">
              <div>
                <span className="mx-auto mb-5 block size-12 animate-pulse rounded-3xl border border-[#ffb44d]/30 bg-[#ffb44d]/20" />
                <p className="text-lg font-black text-white">{t("video.result.processingTitle")}</p>
                <p className="mt-2 text-sm text-white/46">{tf("video.result.job", { jobId: record.jobId || "--" })}</p>
              </div>
            </div>
          ) : (
            <div className="grid min-h-[410px] w-full place-items-center rounded-[24px] border border-dashed border-white/12 text-sm text-white/42">
              {t("video.generation.empty.title")}
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-2.5 border-t border-white/10 p-3 xl:border-l xl:border-t-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${statusClass(view.status, hasOutput, isStaleActive)}`}>
              {statusLabel}
            </span>
            <span className="text-xs text-white/38">{view.createdAtLabel}</span>
          </div>

          <button
            className="group/prompt rounded-[22px] border border-white/10 bg-white/[.035] p-3 text-left transition hover:border-[#ffb44d]/30 hover:bg-[#ffb44d]/10 disabled:cursor-default disabled:hover:border-white/10 disabled:hover:bg-white/[.035]"
            disabled={!onFill}
            onClick={() => onFill?.(record)}
            title={onFill ? t("video.generation.fillPrompt") : undefined}
            type="button"
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-[10px] font-black uppercase tracking-[.18em] text-[#ffcf83]">{t("video.generation.prompt")}</span>
              {onFill ? (
                <span className="text-[10px] font-black text-white/34 opacity-0 transition group-hover/prompt:opacity-100">
                  {t("video.generation.fillPrompt")}
                </span>
              ) : null}
            </div>
            <p className="line-clamp-4 text-xs font-bold leading-5 text-white/78">{view.title}</p>
          </button>

          <div className="grid gap-1.5 text-[11px] text-white/46">
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

          <div className="rounded-[22px] border border-white/10 bg-white/[.025] p-2.5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-[.16em] text-[#ffcf83]">{t("video.generation.references")}</span>
              <span className="text-[10px] text-white/32">{referenceAssets.length}</span>
            </div>
            {referenceAssets.length ? (
              <div className="grid grid-cols-3 gap-1.5">
                {referenceAssets.map((asset) => {
                  const issue = getAddReferenceIssue?.(asset) || "";
                  const isBlocked = Boolean(issue);
                  return (
                    <button
                      className="group/ref relative aspect-square overflow-hidden rounded-2xl border border-white/10 bg-black/34 text-[10px] font-black text-white/54 transition hover:border-[#ffb44d]/35 disabled:cursor-not-allowed disabled:opacity-45"
                      disabled={isBlocked || !onAddReference}
                      key={`${asset.id}-${asset.url}`}
                      onClick={() => onAddReference?.(asset)}
                      title={issue || t("video.generation.addReference")}
                      type="button"
                    >
                      {asset.type === "image" && (asset.previewUrl || asset.url) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img alt="" className="h-full w-full object-cover" src={asset.previewUrl || asset.url} />
                      ) : asset.type === "video" && asset.previewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img alt="" className="h-full w-full object-cover" src={asset.previewUrl} />
                      ) : (
                        <span className="grid h-full w-full place-items-center">{mediaIcon(asset.type)}</span>
                      )}
                      <span className="absolute inset-x-1 bottom-1 rounded-full bg-black/72 py-1 text-[9px] text-[#ffd08a] opacity-0 transition group-hover/ref:opacity-100">
                        {isBlocked ? issue : t("video.generation.addReference")}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs leading-5 text-white/38">{t("video.drawer.empty.history")}</p>
            )}
          </div>

          <div className="mt-auto flex flex-wrap gap-1.5">
            {hasOutput ? (
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
            {(hasOutput || isFailed || isStaleActive) && onFill ? (
              <button className={actionButtonClass("normal")} onClick={() => onFill(record)} type="button">
                {t("video.history.fill")}
              </button>
            ) : null}
            {(isFailed || isStaleActive) && onRetry ? (
              <button className={actionButtonClass("primary")} onClick={() => onRetry(record)} type="button">
                {t("video.history.retry")}
              </button>
            ) : null}
            {hasOutput && onUseResultAsReference ? (
              <button
                className={actionButtonClass("normal")}
                disabled={Boolean(useResultIssue)}
                onClick={() => onUseResultAsReference(record)}
                title={useResultIssue || t("video.history.useResultTitle")}
                type="button"
              >
                {t("video.history.useAsReference")}
              </button>
            ) : null}
            {!isProcessing && onHide ? (
              <button className={actionButtonClass("danger")} onClick={() => onHide(record)} title={t("video.history.hideTitle")} type="button">
                {t("video.history.hide")}
              </button>
            ) : null}
            {hasOutput && useResultIssue ? (
              <span className="w-full text-[11px] leading-4 text-white/36">{useResultIssue}</span>
            ) : null}
          </div>

          <span className="text-[11px] text-white/30">{tf("video.history.job", { job: view.jobLabel })}</span>
        </div>
      </div>
    </article>
  );
}

export function VideoGenerationStream({
  getAddReferenceIssue,
  getUseResultAsReferenceIssue,
  history,
  isLoading = false,
  onAddReference,
  onFill,
  onHide,
  onRetry,
  onUseResultAsReference,
  task,
}: VideoGenerationStreamProps) {
  const { t, tf } = useI18n();
  const records = useMemo(() => buildStreamRecords(task, history), [history, task]);

  return (
    <section className="flex h-full min-h-[420px] flex-col overflow-hidden rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_50%_0%,rgba(255,180,77,.12),transparent_35%),rgba(255,255,255,.04)] p-4 shadow-2xl shadow-black/24">
      <div className="mb-3 flex flex-none flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[.2em] text-[#ffcf83]">{t("video.history.outputs")}</p>
          <h2 className="mt-1 text-base font-black text-white">{t("video.main.generation")}</h2>
          <span className="text-xs text-white/42">
            {isLoading ? t("video.history.loading") : tf("video.history.itemsCount", { visible: records.length, total: Math.max(records.length, history.length) })}
          </span>
        </div>
      </div>

      <div className="se-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1">
        <div className="grid gap-3">
          {records.length ? (
            records.map((record, index) => (
              <VideoGenerationCard
                getAddReferenceIssue={getAddReferenceIssue}
                getUseResultAsReferenceIssue={getUseResultAsReferenceIssue}
                key={getVideoHistoryStableKey(record, `generation:${index}`) || `generation:${index}`}
                onAddReference={onAddReference}
                onFill={onFill}
                onHide={onHide}
                onRetry={onRetry}
                onUseResultAsReference={onUseResultAsReference}
                record={record}
              />
            ))
          ) : (
            <div className="grid min-h-[460px] place-items-center rounded-[30px] border border-dashed border-white/12 bg-black/22 p-8 text-center">
              <div className="max-w-md">
                <p className="text-lg font-black text-white">{t("video.generation.empty.title")}</p>
                <p className="mt-2 text-sm leading-6 text-white/42">{t("video.generation.empty.body")}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
