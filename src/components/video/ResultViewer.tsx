import { formatTime, getVideoOutputUrl, isVideoActiveStatus, isVideoFailedStatus } from "@/lib/utils";
import { getSafeHistoryOutputUrl, getSafeVideoHistoryErrorMessage, getVideoLongRunningMessage, isVideoStaleActiveRecord } from "@/lib/video/historyUtils";
import type { VideoTaskRecord } from "@/types/video";

export function ResultViewer({ task }: { task: VideoTaskRecord | null }) {
  const videoUrl = getSafeHistoryOutputUrl(task) || getVideoOutputUrl(task);
  const isStaleActive = Boolean(task && isVideoStaleActiveRecord(task));
  const isActive = isVideoActiveStatus(task?.status) && !isStaleActive;
  const isFailed = isVideoFailedStatus(task?.status);
  const longRunningMessage = task && !isStaleActive ? getVideoLongRunningMessage(task) : "";

  return (
    <section className="flex h-full min-h-[420px] flex-col overflow-hidden rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_50%_0%,rgba(255,180,77,.14),transparent_35%),rgba(255,255,255,.045)] p-4 shadow-2xl shadow-black/24">
      <div className="mb-3 flex flex-none items-center justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[.2em] text-[#ffcf83]">Preview canvas</p>
          <h2 className="mt-1 text-base font-black text-white">Latest output</h2>
        </div>
        <span className="rounded-full border border-white/10 bg-black/24 px-3 py-1 text-xs font-bold text-white/56">
          {isStaleActive ? "stale" : longRunningMessage ? "long-running" : task?.status || "idle"}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-[28px] border border-white/10 bg-black/36 p-3">
        <div className="grid h-full min-h-[320px] place-items-center overflow-hidden rounded-[22px] bg-[linear-gradient(135deg,rgba(255,255,255,.045),rgba(255,255,255,.015)),#05070b]">
          {videoUrl ? (
            <video className="h-full max-h-full w-full rounded-[18px] object-contain" controls playsInline src={videoUrl} />
          ) : isFailed || isStaleActive ? (
            <div className="px-6 text-center">
              <div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl border border-red-300/25 bg-red-400/10 text-lg font-black text-red-100">
                !
              </div>
              <p className="text-lg font-black text-red-100">{isStaleActive ? "Status check stopped" : "Generation failed"}</p>
              <p className="mt-2 text-sm text-red-100/62">
                {isStaleActive ? "This job is too old to keep polling. Check History or retry it." : task ? getSafeVideoHistoryErrorMessage(task) : "Please try again."}
              </p>
            </div>
          ) : isActive ? (
            <div className="px-6 text-center">
              <span className="mx-auto mb-5 block size-12 animate-pulse rounded-3xl border border-[#ffb44d]/30 bg-[#ffb44d]/20 shadow-[0_0_40px_rgba(255,180,77,.18)]" />
              <p className="text-lg font-black text-white">Generating video...</p>
              <p className="mt-2 text-sm text-white/50">Job {task?.jobId}</p>
              {longRunningMessage ? (
                <p className="mx-auto mt-4 max-w-md rounded-2xl border border-[#ffb44d]/20 bg-[#ffb44d]/10 px-4 py-3 text-sm leading-6 text-[#ffd08a]/82">
                  {longRunningMessage}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="max-w-sm px-6 text-center">
              <p className="text-lg font-black text-white">Start a cinematic generation</p>
              <p className="mt-2 text-sm leading-6 text-white/46">
                Add reference media, describe the scene, and your output will land in this canvas.
              </p>
            </div>
          )}
        </div>
      </div>

      {task ? (
        <div className="mt-3 grid flex-none gap-2 rounded-2xl border border-white/10 bg-black/18 p-3 text-xs text-white/48 md:grid-cols-3">
          <div>Created: {formatTime(task.createdAt)}</div>
          <div>Model: {task.model || "--"}</div>
          <div>Job ID: {task.jobId}</div>
        </div>
      ) : null}
    </section>
  );
}
