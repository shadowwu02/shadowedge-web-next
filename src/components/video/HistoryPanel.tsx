"use client";

import { useMemo, useState } from "react";
import { getSafeVideoHistoryView } from "@/lib/video/historyUtils";
import { isVideoActiveStatus, isVideoCompletedStatus, isVideoFailedStatus } from "@/lib/utils";
import type { VideoTaskRecord } from "@/types/video";

type HistoryFilter = "all" | "success" | "failed" | "processing";

type HistoryPanelProps = {
  history: VideoTaskRecord[];
  isLoading?: boolean;
  error?: string;
  getUseResultAsReferenceIssue?: (record: VideoTaskRecord) => string;
  onFill?: (record: VideoTaskRecord) => void;
  onHide?: (record: VideoTaskRecord) => void;
  onRetry?: (record: VideoTaskRecord) => void;
  onUseResultAsReference?: (record: VideoTaskRecord) => void;
};

const filters: Array<{ id: HistoryFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "success", label: "Success" },
  { id: "failed", label: "Failed" },
  { id: "processing", label: "Processing" },
];

function filterHistoryItem(item: VideoTaskRecord, filter: HistoryFilter) {
  const view = getSafeVideoHistoryView(item);

  if (filter === "success") return isVideoCompletedStatus(view.status) && Boolean(view.outputUrl);
  if (filter === "failed") return isVideoFailedStatus(view.status);
  if (filter === "processing") return isVideoActiveStatus(view.status);
  return true;
}

function statusClass(status: string, hasOutput: boolean) {
  if (isVideoFailedStatus(status)) return "border-red-300/25 bg-red-400/10 text-red-100";
  if (isVideoCompletedStatus(status) && hasOutput) return "border-emerald-300/20 bg-emerald-400/10 text-emerald-100";
  if (isVideoActiveStatus(status)) return "border-[#ffb44d]/24 bg-[#ffb44d]/10 text-[#ffd08a]";
  return "border-white/10 bg-white/[.045] text-white/55";
}

function emptyMessage(filter: HistoryFilter) {
  if (filter === "success") return "No successful videos yet.";
  if (filter === "failed") return "No failed videos.";
  if (filter === "processing") return "No processing videos.";
  return "No saved videos yet.";
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
  getUseResultAsReferenceIssue,
  history,
  isLoading = false,
  onFill,
  onHide,
  onRetry,
  onUseResultAsReference,
}: HistoryPanelProps) {
  const [filter, setFilter] = useState<HistoryFilter>("all");

  const visibleHistory = useMemo(() => history.filter((item) => filterHistoryItem(item, filter)), [filter, history]);

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[30px] border border-white/10 bg-white/[.04] p-3 shadow-2xl shadow-black/18">
      <div className="mb-3 flex flex-none flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[.18em] text-[#ffcf83]">Outputs</p>
          <h2 className="mt-1 text-sm font-black text-white">Saved history</h2>
          <span className="text-xs text-white/42">
            {isLoading ? "Loading server history..." : `${visibleHistory.length} of ${history.length} items`}
          </span>
        </div>
        <div className="flex max-w-full flex-wrap gap-1.5">
          {filters.map((item) => (
            <button
              className={`rounded-full border px-2.5 py-1.5 text-[11px] font-black transition ${
                item.id === filter
                  ? "border-[#ffb44d]/55 bg-[#ffb44d]/16 text-[#ffd08a]"
                  : "border-white/10 bg-white/[.045] text-white/52 hover:border-[#ffb44d]/28 hover:text-[#ffd08a]"
              }`}
              key={item.id}
              onClick={() => setFilter(item.id)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="mb-3 flex-none rounded-2xl border border-[#ffb44d]/20 bg-[#ffb44d]/10 px-3 py-2 text-xs text-[#ffd08a]">
          Server history could not load: {error}
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
              const isProcessing = isVideoActiveStatus(view.status);
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
                        <span className="text-xs font-black text-red-100/72">Failed</span>
                      ) : isVideoActiveStatus(view.status) ? (
                        <span className="text-xs font-black text-[#ffd08a]">Processing</span>
                      ) : (
                        <span className="text-xs text-white/40">Task</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${statusClass(view.status, Boolean(view.outputUrl))}`}>
                          {view.statusLabel}
                        </span>
                        <span className="truncate text-[11px] text-white/34">{view.createdAtLabel}</span>
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-sm font-bold leading-5 text-white">{view.title}</p>
                      <div className="mt-1.5 grid gap-1 text-[11px] text-white/42">
                        <span className="truncate">Model: {view.modelLabel}</span>
                        <span className="truncate">Job: {view.jobLabel}</span>
                      </div>
                      {isFailed ? (
                        <div className="mt-2">
                          <span className="line-clamp-2 w-full text-[11px] leading-4 text-red-100/62">
                            {view.errorMessage}
                            {view.refundNotice ? ` ${view.refundNotice}` : ""}
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
                          >
                            Download
                          </a>
                        ) : null}
                        {(isSuccess || isFailed) && onFill ? (
                          <button className={actionButtonClass("normal")} onClick={() => onFill(item)} type="button">
                            Fill
                          </button>
                        ) : null}
                        {isFailed ? (
                          <button className={actionButtonClass("primary")} disabled={!onRetry} onClick={() => onRetry?.(item)} type="button">
                            Retry
                          </button>
                        ) : null}
                        {isSuccess && onUseResultAsReference ? (
                          <button
                            className={actionButtonClass("normal")}
                            disabled={Boolean(useResultIssue)}
                            onClick={() => onUseResultAsReference(item)}
                            title={useResultIssue || "Use generated result as reference"}
                            type="button"
                          >
                            Use as reference
                          </button>
                        ) : null}
                        {!isProcessing && onHide ? (
                          <button className={actionButtonClass("danger")} onClick={() => onHide(item)} title="Hide locally. This does not delete server history." type="button">
                            Hide
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
              {emptyMessage(filter)}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
