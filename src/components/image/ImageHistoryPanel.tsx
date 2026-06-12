"use client";

import { isImageActiveStatus, isImageCompletedStatus, isImageFailedStatus } from "@/lib/image/imageHistoryUtils";
import { formatTime } from "@/lib/utils";
import type { ImageHistoryItem } from "@/types/image";

function statusClass(status: string) {
  if (isImageFailedStatus(status)) return "se-status-failed";
  if (isImageCompletedStatus(status)) return "se-status-completed";
  if (isImageActiveStatus(status)) return "se-status-processing";
  return "se-status-neutral";
}

export function ImageHistoryPanel({
  currentJobId,
  history,
  isLoading,
  onRefreshStatus,
  onSelect,
}: {
  currentJobId?: string;
  history: ImageHistoryItem[];
  isLoading?: boolean;
  onRefreshStatus: (jobId: string) => void;
  onSelect: (item: ImageHistoryItem) => void;
}) {
  return (
    <section className="se-card-quiet flex min-h-[260px] flex-col overflow-hidden rounded-[26px]">
      <div className="flex flex-none items-center justify-between gap-3 border-b border-white/10 p-4">
        <div>
          <p className="se-eyebrow">History</p>
          <p className="mt-1 text-xs text-[#b9b9b9]/48">{isLoading ? "Loading image jobs..." : `${history.length} image jobs`}</p>
        </div>
        <span className="se-pill rounded-full px-2.5 py-1 text-[10px] font-semibold text-[#b9b9b9]/58">Image only</span>
      </div>

      <div className="se-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {history.length ? (
          history.map((item) => {
            const status = String(item.status || "");
            const isSelected = [item.jobId, item.dbJobId, item.id].filter(Boolean).some((value) => String(value) === String(currentJobId || ""));
            const isActive = isImageActiveStatus(status);

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
              <p className="text-sm font-semibold text-[#f4f4f4]/80">No image history yet</p>
              <p className="mt-1 text-xs text-[#b9b9b9]/48">Your generated image jobs will appear here.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
