"use client";

import { formatTime, getVideoOutputUrl, isVideoActiveStatus, isVideoFailedStatus } from "@/lib/utils";
import { getSafeHistoryOutputUrl, getSafeVideoHistoryErrorMessage, getVideoLongRunningMessage, isVideoStaleActiveRecord } from "@/lib/video/historyUtils";
import { useI18n } from "@/i18n/useI18n";
import type { VideoTaskRecord } from "@/types/video";

function localizeResultError(message: string, t: ReturnType<typeof useI18n>["t"]) {
  const exactMessages: Record<string, string> = {
    "Failed to refresh video status.": t("video.errors.statusRefreshFailed"),
    "Unable to check this job status. It may be expired. Please check History or retry.": t("video.result.statusExpired"),
    "Video generation failed.": t("video.errors.generationFailed"),
    "Video generation failed. Please try again later or change the media.": t("video.errors.generationFailed"),
  };

  return exactMessages[message] || message;
}

export function ResultViewer({ task }: { task: VideoTaskRecord | null }) {
  const { t, tf } = useI18n();
  const videoUrl = getSafeHistoryOutputUrl(task) || getVideoOutputUrl(task);
  const isStaleActive = Boolean(task && isVideoStaleActiveRecord(task));
  const isActive = isVideoActiveStatus(task?.status) && !isStaleActive;
  const isFailed = isVideoFailedStatus(task?.status);
  const longRunningMessage = task && !isStaleActive ? getVideoLongRunningMessage(task) : "";
  const statusLabel = isStaleActive
    ? t("video.status.stale")
    : longRunningMessage
      ? t("video.status.longRunning")
      : isActive
        ? t("video.status.processing")
        : isFailed
          ? t("video.status.failed")
          : task?.status || t("video.status.idle");
  const statusToneClass = isFailed || isStaleActive
    ? "se-status-failed"
    : isActive
      ? "se-status-processing"
      : videoUrl
        ? "se-status-completed"
        : "se-status-neutral";

  return (
    <section className="flex h-full min-h-[420px] flex-col overflow-hidden rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_50%_0%,rgba(255,180,77,.14),transparent_35%),rgba(255,255,255,.045)] p-4 shadow-2xl shadow-black/24">
      <div className="mb-3 flex flex-none items-center justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[.2em] text-[#ffcf83]">{t("video.workspace.previewCanvas")}</p>
          <h2 className="mt-1 text-base font-black text-white">{t("video.result.latest")}</h2>
        </div>
        <span className={`se-status rounded-full px-3 py-1 text-xs font-bold ${statusToneClass}`}>
          {statusLabel}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-[28px] border border-white/10 bg-black/36 p-3">
        <div className="grid h-full min-h-[320px] place-items-center overflow-hidden rounded-[22px] bg-[linear-gradient(135deg,rgba(255,255,255,.045),rgba(255,255,255,.015)),#05070b]">
          {videoUrl ? (
            <video className="h-full max-h-full w-full rounded-[18px] object-contain" controls playsInline src={videoUrl} />
          ) : isFailed || isStaleActive ? (
            <div className="px-6 text-center">
              <div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl border border-[#8c4632]/42 bg-[#2a1012] text-lg font-black text-[#f2b3a1]">
                !
              </div>
              <p className="text-lg font-black text-[#f2b3a1]">{isStaleActive ? t("video.result.statusCheckStopped") : t("video.result.failedTitle")}</p>
              <p className="mt-2 text-sm text-[#f2b3a1]/62">
                {isStaleActive
                  ? t("video.result.staleBody")
                  : task
                    ? localizeResultError(getSafeVideoHistoryErrorMessage(task), t)
                    : t("video.result.tryAgain")}
              </p>
            </div>
          ) : isActive ? (
            <div className="px-6 text-center">
              <span className="mx-auto mb-5 block size-12 animate-pulse rounded-3xl border border-[#ffb44d]/30 bg-[#ffb44d]/20 shadow-[0_0_40px_rgba(255,180,77,.18)]" />
              <p className="text-lg font-black text-white">{t("video.result.processingTitle")}</p>
              <p className="mt-2 text-sm text-white/50">{tf("video.result.job", { jobId: task?.jobId || "--" })}</p>
              {longRunningMessage ? (
                <p className="mx-auto mt-4 max-w-md rounded-2xl border border-[#ffb44d]/20 bg-[#ffb44d]/10 px-4 py-3 text-sm leading-6 text-[#ffd08a]/82">
                  {t("video.result.longRunning")}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="max-w-sm px-6 text-center">
              <p className="text-lg font-black text-white">{t("video.result.idleTitle")}</p>
              <p className="mt-2 text-sm leading-6 text-white/46">
                {t("video.result.idleBody")}
              </p>
            </div>
          )}
        </div>
      </div>

      {task ? (
        <div className="mt-3 grid flex-none gap-2 rounded-2xl border border-white/10 bg-black/18 p-3 text-xs text-white/48 md:grid-cols-3">
          <div>{tf("video.result.created", { time: formatTime(task.createdAt) })}</div>
          <div>{tf("video.result.model", { model: task.model || "--" })}</div>
          <div>{tf("video.result.jobId", { jobId: task.jobId || "--" })}</div>
        </div>
      ) : null}
    </section>
  );
}
