"use client";

import { type DictionaryKey, useI18n } from "@/i18n/useI18n";
import {
  normalizeLongVideoAnalysisProgress,
  type LongVideoAnalysisErrorCategory,
  type LongVideoAnalysisState,
} from "@/lib/video/longVideoAnalysisState";

type LongVideoAnalysisProgressProps = {
  className?: string;
  errorCategory?: LongVideoAnalysisErrorCategory | null;
  progress?: number | null;
  sourceName?: string;
  state: LongVideoAnalysisState;
};

const stateCopy: Record<LongVideoAnalysisState, { body: DictionaryKey; title: DictionaryKey }> = {
  analyzing: {
    body: "video.remake.longVideo.progress.analyzing.body",
    title: "video.remake.longVideo.progress.analyzing.title",
  },
  building_storyboard: {
    body: "video.remake.longVideo.progress.buildingStoryboard.body",
    title: "video.remake.longVideo.progress.buildingStoryboard.title",
  },
  completed: {
    body: "video.remake.longVideo.progress.completed.body",
    title: "video.remake.longVideo.progress.completed.title",
  },
  extracting_frames: {
    body: "video.remake.longVideo.progress.extractingFrames.body",
    title: "video.remake.longVideo.progress.extractingFrames.title",
  },
  failed: {
    body: "video.remake.longVideo.progress.failed.body",
    title: "video.remake.longVideo.progress.failed.title",
  },
  preparing: {
    body: "video.remake.longVideo.progress.preparing.body",
    title: "video.remake.longVideo.progress.preparing.title",
  },
  queued: {
    body: "video.remake.longVideo.progress.queued.body",
    title: "video.remake.longVideo.progress.queued.title",
  },
};

const errorCopy: Record<LongVideoAnalysisErrorCategory, DictionaryKey> = {
  analysis_failed: "video.remake.longVideo.progress.error.analysisFailed",
  analysis_timeout: "video.remake.longVideo.progress.error.analysisTimeout",
  asset_unavailable: "video.remake.longVideo.progress.error.assetUnavailable",
  auth_required: "video.remake.longVideo.progress.error.authRequired",
  insufficient_credits: "video.remake.longVideo.progress.error.insufficientCredits",
  invalid_duration: "video.remake.longVideo.progress.error.invalidDuration",
  not_eligible: "video.remake.longVideo.progress.error.notEligible",
  result_unavailable: "video.remake.longVideo.progress.error.resultUnavailable",
  status_unavailable: "video.remake.longVideo.progress.error.statusUnavailable",
};

export function LongVideoAnalysisProgress({
  className = "",
  errorCategory,
  progress,
  sourceName = "",
  state,
}: LongVideoAnalysisProgressProps) {
  const { t, tf } = useI18n();
  const copy = stateCopy[state];
  const normalizedProgress = normalizeLongVideoAnalysisProgress(progress);
  const progressPercent = normalizedProgress === null ? null : Math.round(normalizedProgress * 100);
  const isFailed = state === "failed";
  const isCompleted = state === "completed";
  const statusClass = isFailed
    ? "border-[#7f2d2d]/42 bg-[#2a1012]/72"
    : isCompleted
      ? "border-emerald-300/24 bg-emerald-400/10"
      : "border-[#ffb44d]/24 bg-[#ffb44d]/8";

  return (
    <section
      aria-live="polite"
      className={`grid gap-4 rounded-[24px] border p-4 ${statusClass} ${className}`.trim()}
      role="status"
    >
      <div className="flex min-w-0 items-start gap-3">
        <span
          aria-hidden="true"
          className={`mt-1 size-3 shrink-0 rounded-full ${
            isFailed ? "bg-[#f2b3a1]" : isCompleted ? "bg-emerald-300" : "animate-pulse bg-[#ffb44d]"
          }`}
        />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#f4f4f4]">{t(copy.title)}</p>
          <p className="mt-1 text-sm leading-6 text-[#b9b9b9]/72">
            {errorCategory ? t(errorCopy[errorCategory]) : t(copy.body)}
          </p>
          {sourceName ? <p className="mt-1 truncate text-xs text-[#b9b9b9]/52">{sourceName}</p> : null}
        </div>
      </div>

      {!isFailed ? (
        <div className="grid gap-2">
          <div
            aria-label={t("video.remake.longVideo.progress.label")}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={progressPercent ?? undefined}
            className="h-2 overflow-hidden rounded-full bg-black/28"
            role="progressbar"
          >
            {progressPercent === null ? (
              <span className="block h-full w-full animate-pulse bg-[#ffb44d]/28" />
            ) : (
              <span
                className={`block h-full rounded-full transition-[width] duration-500 ${
                  isCompleted ? "bg-emerald-300" : "bg-[#ffb44d]"
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            )}
          </div>
          <p className="text-xs font-medium text-[#b9b9b9]/58">
            {progressPercent === null
              ? t("video.remake.longVideo.progress.indeterminate")
              : tf("video.remake.longVideo.progress.percent", { progress: progressPercent })}
          </p>
        </div>
      ) : null}
    </section>
  );
}
