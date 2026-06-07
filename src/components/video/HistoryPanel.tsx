import { formatTime, getVideoOutputUrl, isVideoFailedStatus } from "@/lib/utils";
import type { VideoTaskRecord } from "@/types/video";

export function HistoryPanel({ history }: { history: VideoTaskRecord[] }) {
  return (
    <section className="rounded-[24px] border border-white/10 bg-white/[.055] p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-black text-white">Saved history</h2>
        <span className="text-xs text-white/42">{history.length} items</span>
      </div>
      <div className="grid gap-3">
        {history.length ? (
          history.map((item) => {
            const url = getVideoOutputUrl(item);
            return (
              <article className="rounded-3xl border border-white/10 bg-black/20 p-3" key={item.jobId}>
                <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3">
                  <div className="grid aspect-video place-items-center overflow-hidden rounded-2xl bg-white/[.045]">
                    {url ? (
                      <video className="h-full w-full object-cover" muted playsInline src={url} />
                    ) : (
                      <span className="text-xs text-white/40">{isVideoFailedStatus(item.status) ? "Failed" : "Task"}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-white">{item.prompt || "Untitled video"}</p>
                    <p className="mt-1 text-xs text-white/42">{formatTime(item.createdAt)}</p>
                    <p className="mt-2 text-xs font-bold text-[#ffd08a]">{item.status}</p>
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <div className="rounded-3xl border border-dashed border-white/12 p-8 text-center text-sm text-white/42">
            No saved videos yet.
          </div>
        )}
      </div>
    </section>
  );
}
