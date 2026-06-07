"use client";

import { useMemo, useState } from "react";
import { formatTime, getVideoOutputUrl, isVideoActiveStatus, isVideoCompletedStatus, isVideoFailedStatus } from "@/lib/utils";
import type { VideoTaskRecord } from "@/types/video";

type HistoryFilter = "all" | "success" | "failed" | "processing";

type HistoryPanelProps = {
  history: VideoTaskRecord[];
  isLoading?: boolean;
  error?: string;
};

const filters: Array<{ id: HistoryFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "success", label: "Success" },
  { id: "failed", label: "Failed" },
  { id: "processing", label: "Processing" },
];

function filterHistoryItem(item: VideoTaskRecord, filter: HistoryFilter) {
  const outputUrl = getVideoOutputUrl(item);

  if (filter === "success") return isVideoCompletedStatus(item.status) && Boolean(outputUrl);
  if (filter === "failed") return isVideoFailedStatus(item.status);
  if (filter === "processing") return isVideoActiveStatus(item.status);
  return true;
}

function statusClass(item: VideoTaskRecord) {
  if (isVideoFailedStatus(item.status)) return "border-red-300/25 bg-red-400/10 text-red-100";
  if (isVideoCompletedStatus(item.status) && getVideoOutputUrl(item)) return "border-emerald-300/20 bg-emerald-400/10 text-emerald-100";
  if (isVideoActiveStatus(item.status)) return "border-[#ffb44d]/24 bg-[#ffb44d]/10 text-[#ffd08a]";
  return "border-white/10 bg-white/[.045] text-white/55";
}

function emptyMessage(filter: HistoryFilter) {
  if (filter === "success") return "No successful videos yet.";
  if (filter === "failed") return "No failed videos.";
  if (filter === "processing") return "No processing videos.";
  return "No saved videos yet.";
}

export function HistoryPanel({ error, history, isLoading = false }: HistoryPanelProps) {
  const [filter, setFilter] = useState<HistoryFilter>("all");

  const visibleHistory = useMemo(() => history.filter((item) => filterHistoryItem(item, filter)), [filter, history]);

  return (
    <section className="rounded-[24px] border border-white/10 bg-white/[.055] p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-black text-white">Saved history</h2>
          <span className="text-xs text-white/42">
            {isLoading ? "Loading server history..." : `${visibleHistory.length} of ${history.length} items`}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {filters.map((item) => (
            <button
              className={`rounded-full border px-3 py-1.5 text-xs font-black transition ${
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
        <div className="mb-3 rounded-2xl border border-[#ffb44d]/20 bg-[#ffb44d]/10 px-3 py-2 text-xs text-[#ffd08a]">
          Server history could not load: {error}
        </div>
      ) : null}

      <div className="grid gap-3">
        {visibleHistory.length ? (
          visibleHistory.map((item) => {
            const url = getVideoOutputUrl(item);
            const thumb = item.thumbnailUrl || item.thumbnail || "";
            return (
              <article className="rounded-3xl border border-white/10 bg-black/20 p-3" key={item.jobId || `${item.createdAt}-${item.prompt}`}>
                <div className="grid grid-cols-[104px_minmax(0,1fr)] gap-3">
                  <div className="grid aspect-video place-items-center overflow-hidden rounded-2xl bg-white/[.045]">
                    {url ? (
                      <video className="h-full w-full object-cover" muted playsInline preload="metadata" src={url} />
                    ) : thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img alt="" className="h-full w-full object-cover" src={thumb} />
                    ) : isVideoFailedStatus(item.status) ? (
                      <span className="text-xs font-black text-red-100/72">Failed</span>
                    ) : isVideoActiveStatus(item.status) ? (
                      <span className="text-xs font-black text-[#ffd08a]">Processing</span>
                    ) : (
                      <span className="text-xs text-white/40">Task</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-black ${statusClass(item)}`}>
                        {String(item.status || "unknown")}
                      </span>
                      <span className="truncate text-[11px] text-white/34">{formatTime(item.createdAt)}</span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm font-bold leading-5 text-white">{item.prompt || "Untitled video"}</p>
                    <div className="mt-2 grid gap-1 text-xs text-white/42">
                      <span>Model: {item.model || item.frontendModel || "--"}</span>
                      <span>Job: {item.jobId || item.providerJobId || "--"}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-white/42"
                        disabled
                        type="button"
                      >
                        Retry soon
                      </button>
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
    </section>
  );
}
