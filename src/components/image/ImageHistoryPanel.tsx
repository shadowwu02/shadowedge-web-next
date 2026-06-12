"use client";

import { useMemo, useState } from "react";
import { isImageActiveStatus, isImageCompletedStatus, isImageFailedStatus } from "@/lib/image/imageHistoryUtils";
import { formatTime } from "@/lib/utils";
import type { ImageHistoryItem } from "@/types/image";

type ImageHistoryFilter = "all" | "completed" | "failed";

function statusClass(status: string) {
  if (isImageFailedStatus(status)) return "se-status-failed";
  if (isImageCompletedStatus(status)) return "se-status-completed";
  if (isImageActiveStatus(status)) return "se-status-processing";
  return "se-status-neutral";
}

export function ImageHistoryPanel({
  currentJobId,
  error,
  history,
  isLoading,
  onRefreshHistory,
  onRefreshStatus,
  onSelect,
}: {
  currentJobId?: string;
  error?: string;
  history: ImageHistoryItem[];
  isLoading?: boolean;
  onRefreshHistory: () => void;
  onRefreshStatus: (jobId: string) => void;
  onSelect: (item: ImageHistoryItem) => void;
}) {
  const [filter, setFilter] = useState<ImageHistoryFilter>("all");
  const counts = useMemo(() => ({
    all: history.length,
    completed: history.filter((item) => isImageCompletedStatus(item.status)).length,
    failed: history.filter((item) => isImageFailedStatus(item.status)).length,
  }), [history]);
  const visibleHistory = useMemo(() => {
    if (filter === "completed") return history.filter((item) => isImageCompletedStatus(item.status));
    if (filter === "failed") return history.filter((item) => isImageFailedStatus(item.status));
    return history;
  }, [filter, history]);

  return (
    <section className="se-card-quiet flex min-h-[260px] flex-col overflow-hidden rounded-[26px]">
      <div className="flex flex-none items-center justify-between gap-3 border-b border-white/10 p-4">
        <div>
          <p className="se-eyebrow">History</p>
          <p className="mt-1 text-xs text-[#b9b9b9]/48">{isLoading ? "Loading image jobs..." : `${visibleHistory.length}/${history.length} image jobs`}</p>
        </div>
        <button
          className="se-button-secondary rounded-full px-3 py-1.5 text-[11px] font-semibold"
          disabled={isLoading}
          onClick={onRefreshHistory}
          type="button"
        >
          Refresh
        </button>
      </div>

      <div className="flex flex-none flex-wrap gap-1.5 border-b border-white/8 px-3 py-2">
        {(["all", "completed", "failed"] as const).map((item) => (
          <button
            className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
              filter === item
                ? "border-[#ffb44d]/35 bg-[#ffb44d]/18 text-[#ffd08a]"
                : "border-white/8 bg-white/[.035] text-[#b9b9b9]/56 hover:border-[#ffb44d]/22 hover:text-[#f4f4f4]"
            }`}
            key={item}
            onClick={() => setFilter(item)}
            type="button"
          >
            {item === "all" ? "All" : item === "completed" ? "Completed" : "Failed"}
            <span className="ml-1.5 text-[10px] opacity-60">{counts[item]}</span>
          </button>
        ))}
      </div>

      <div className="se-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {error ? (
          <div className="rounded-[18px] border border-[#8c4632]/42 bg-[#2a1012]/72 px-3 py-2 text-xs leading-5 text-[#f2b3a1]">{error}</div>
        ) : null}
        {isLoading && !visibleHistory.length ? (
          <div className="grid min-h-[180px] place-items-center rounded-[20px] border border-dashed border-white/10 text-center">
            <div>
              <p className="text-sm font-semibold text-[#f4f4f4]/80">Loading image history</p>
              <p className="mt-1 text-xs text-[#b9b9b9]/48">Fetching your latest image jobs.</p>
            </div>
          </div>
        ) : visibleHistory.length ? (
          visibleHistory.map((item) => {
            const status = String(item.status || "");
            const isSelected = [item.jobId, item.dbJobId, item.id].filter(Boolean).some((value) => String(value) === String(currentJobId || ""));
            const isActive = isImageActiveStatus(status);
            const isCompleted = isImageCompletedStatus(status);
            const isFailed = isImageFailedStatus(status);

            return (
              <article
                className={`rounded-[20px] border bg-[#111318]/66 p-2.5 transition-colors ${
                  isSelected ? "border-[#ffb44d]/34" : "border-white/8 hover:border-[#ffb44d]/22"
                }`}
                key={item.jobId || item.id}
              >
                <button className="grid w-full grid-cols-[56px_minmax(0,1fr)] gap-3 text-left" onClick={() => onSelect(item)} type="button">
                  <span className="grid aspect-square place-items-center overflow-hidden rounded-[16px] bg-black/52">
                    {item.outputUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img alt="" className="h-full w-full object-cover" src={item.outputUrl} />
                    ) : (
                      <span className="text-[10px] font-semibold text-[#b9b9b9]/42">{isActive ? "..." : "IMG"}</span>
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className={`se-status rounded-full px-2 py-0.5 text-[9px] font-semibold ${statusClass(status)}`}>{status || "unknown"}</span>
                      <span className="truncate text-[10px] text-[#b9b9b9]/42">{formatTime(item.createdAt)}</span>
                    </span>
                    <span className="mt-1.5 block truncate text-xs font-semibold text-[#f4f4f4]/82">{item.prompt || "Untitled image job"}</span>
                    <span className="mt-1 block truncate text-[10px] text-[#b9b9b9]/45">
                      {item.model || "image"} · {item.ratio || "auto"} {item.resolution ? `· ${item.resolution}` : ""} {item.quality ? `· ${item.quality}` : ""}
                    </span>
                    {isCompleted ? (
                      <span className="mt-1 block text-[10px] font-semibold text-[#b8e7ee]/68">
                        {item.outputUrls.length || 1} output{(item.outputUrls.length || 1) > 1 ? "s" : ""}
                      </span>
                    ) : null}
                    {isFailed && item.errorMessage ? (
                      <span className="mt-1 block truncate text-[10px] font-semibold text-[#f2b3a1]/72">{item.errorMessage}</span>
                    ) : null}
                  </span>
                </button>
                {isActive ? (
                  <button
                    className="se-button-ghost mt-2 min-h-8 rounded-full px-3 text-[11px] font-semibold"
                    onClick={() => onRefreshStatus(item.dbJobId || item.jobId)}
                    type="button"
                  >
                    Continue polling
                  </button>
                ) : null}
              </article>
            );
          })
        ) : (
          <div className="grid min-h-[180px] place-items-center rounded-[20px] border border-dashed border-white/10 text-center">
            <div>
              <p className="text-sm font-semibold text-[#f4f4f4]/80">{filter === "all" ? "No image history yet" : `No ${filter} image jobs`}</p>
              <p className="mt-1 text-xs text-[#b9b9b9]/48">Your generated image jobs will appear here.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
