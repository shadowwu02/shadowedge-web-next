import { formatTime, getVideoOutputUrl, isVideoActiveStatus, isVideoFailedStatus } from "@/lib/utils";
import type { VideoTaskRecord } from "@/types/video";

export function ResultViewer({ task }: { task: VideoTaskRecord | null }) {
  const videoUrl = getVideoOutputUrl(task);
  const isActive = isVideoActiveStatus(task?.status);
  const isFailed = isVideoFailedStatus(task?.status);

  return (
    <section className="rounded-[24px] border border-white/10 bg-white/[.055] p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-black text-white">Latest output</h2>
        <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-white/52">
          {task?.status || "idle"}
        </span>
      </div>

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/28">
        <div className="grid aspect-video place-items-center bg-black/40">
          {videoUrl ? (
            <video className="h-full w-full object-cover" controls playsInline src={videoUrl} />
          ) : isFailed ? (
            <div className="px-6 text-center">
              <p className="text-lg font-black text-red-100">Generation failed</p>
              <p className="mt-2 text-sm text-red-100/62">{task?.error_message || task?.message || "Please try again."}</p>
            </div>
          ) : isActive ? (
            <div className="px-6 text-center">
              <span className="mx-auto mb-4 block size-8 animate-pulse rounded-full bg-[#ffb44d]" />
              <p className="text-lg font-black text-white">Generating video...</p>
              <p className="mt-2 text-sm text-white/50">Job {task?.jobId}</p>
            </div>
          ) : (
            <p className="text-sm text-white/42">Your latest output will appear here.</p>
          )}
        </div>
      </div>

      {task ? (
        <div className="mt-4 grid gap-2 text-xs text-white/48">
          <div>Created: {formatTime(task.createdAt)}</div>
          <div>Model: {task.model || "--"}</div>
          <div>Job ID: {task.jobId}</div>
        </div>
      ) : null}
    </section>
  );
}
