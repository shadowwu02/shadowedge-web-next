"use client";

import { useI18n } from "@/i18n/useI18n";
import { getRemakeShotGenerationKey } from "@/components/video/remake/remakeTypes";
import type {
  RemakeKeyframe,
  RemakeSegment,
  RemakeSettings,
  RemakeShot,
  RemakeShotGenerationState,
  RemakeShotQueueIntent,
  RemakeShotQueueStatus,
  RemakeSourceVideoMetadata,
  RemakeStoryboard,
} from "@/components/video/remake/remakeTypes";

type RemakeStoryboardPanelProps = {
  analysisNotice?: string;
  canGenerateAllShots?: boolean;
  canRetryAllFailedShots?: boolean;
  disableGenerationActions?: boolean;
  draftNotice?: string;
  metadata?: {
    segments?: RemakeSegment[];
    sourceVideo?: RemakeSourceVideoMetadata;
  };
  onCancelQueue?: () => void;
  onClearDraft?: () => void;
  onContinueQueue?: () => void;
  onGenerateAllShots?: () => void;
  onGenerateShot: (shot: RemakeShot) => void;
  onRetryAllFailedShots?: () => void;
  onSkipFailedShot?: () => void;
  onUsePrompt: (prompt: string) => void;
  queueCompletedCount?: number;
  queueError?: string;
  queueIntent?: RemakeShotQueueIntent;
  queueStatus?: RemakeShotQueueStatus;
  queueTotal?: number;
  queueWasInterrupted?: boolean;
  settings: RemakeSettings;
  shotGenerations?: Record<string, RemakeShotGenerationState>;
  storyboard: RemakeStoryboard | null;
};

function formatTime(seconds: number) {
  return `${seconds.toFixed(seconds % 1 === 0 ? 0 : 1)}s`;
}

function formatTimeRange(shot: RemakeShot) {
  return `${formatTime(shot.sourceTimeRange.start)} - ${formatTime(shot.sourceTimeRange.end)}`;
}

function getShotKeyframes(shot: RemakeShot, segments: RemakeSegment[]) {
  if (shot.keyframes?.length) return shot.keyframes;
  return segments.find((segment) => segment.id === shot.shotGroupId)?.keyframes || [];
}

function ShotMeta({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-[18px] border border-[rgba(244,244,244,0.08)] bg-[#1a1c22]/58 p-3">
      <p className="se-eyebrow">{label}</p>
      <p className="mt-1 text-sm font-medium leading-6 text-[#f4f4f4]/84">{value}</p>
    </div>
  );
}

function formatSourceMetadata(metadata?: RemakeSourceVideoMetadata) {
  if (!metadata) return "--";
  return [
    formatTime(metadata.duration),
    metadata.width && metadata.height ? `${metadata.width}x${metadata.height}` : "",
    metadata.fps ? `${metadata.fps}fps` : "",
    metadata.codec || "",
  ]
    .filter(Boolean)
    .join(" · ");
}

function RemakeKeyframes({ keyframes }: { keyframes: RemakeKeyframe[] }) {
  const { t } = useI18n();

  if (!keyframes.length) return null;

  return (
    <div className="mt-3 rounded-[22px] border border-[rgba(244,244,244,0.08)] bg-[#05070b]/42 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="se-eyebrow">{t("video.remake.keyframes")}</p>
        <span className="rounded-full border border-[rgba(244,244,244,0.08)] bg-[#1a1c22]/66 px-2.5 py-1 text-[11px] font-semibold text-[#b9b9b9]/62">
          {keyframes.length}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {keyframes.map((frame, index) => (
          <a
            aria-label={`${t("video.remake.keyframe")} ${index + 1}`}
            className="group overflow-hidden rounded-[16px] border border-[rgba(244,244,244,0.08)] bg-[#111318]/70 transition-colors hover:border-[#ffb44d]/42"
            href={frame.url}
            key={`${frame.url}-${frame.time}`}
            rel="noreferrer"
            target="_blank"
          >
            <div className="aspect-video bg-[#05070b]">
              {/* eslint-disable-next-line @next/next/no-img-element -- backend-generated frame URLs are dynamic uploads */}
              <img
                alt={`${t("video.remake.keyframe")} ${index + 1}`}
                className="size-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                loading="lazy"
                src={frame.url}
              />
            </div>
            <div className="flex items-center justify-between px-2 py-1.5 text-[11px] font-semibold text-[#b9b9b9]/70">
              <span>{t("video.remake.keyframe")}</span>
              <span>{formatTime(frame.time)}</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

export function RemakeStoryboardPanel({
  analysisNotice = "",
  canGenerateAllShots = false,
  canRetryAllFailedShots = false,
  disableGenerationActions = false,
  draftNotice = "",
  metadata,
  onCancelQueue,
  onClearDraft,
  onContinueQueue,
  onGenerateAllShots,
  onGenerateShot,
  onRetryAllFailedShots,
  onSkipFailedShot,
  onUsePrompt,
  queueCompletedCount = 0,
  queueError = "",
  queueIntent = "generate_all",
  queueStatus = "idle",
  queueTotal = 0,
  queueWasInterrupted = false,
  settings,
  shotGenerations = {},
  storyboard,
}: RemakeStoryboardPanelProps) {
  const { t, tf } = useI18n();
  const shots = storyboard?.shots || [];
  const segments = metadata?.segments || [];
  const isQueueRunning = queueStatus === "running";
  const isQueuePaused = queueStatus === "paused";
  const isQueueInterrupted = isQueuePaused && queueWasInterrupted;
  const isRetryQueue = queueIntent === "retry_failed" || queueIntent === "retry_single";
  const hasQueueStatus = queueStatus === "running" || queueStatus === "paused" || queueStatus === "completed" || queueStatus === "cancelled";
  const queueStatusLabel =
    queueStatus === "running"
      ? isRetryQueue
        ? t("video.remake.retryingFailedShots")
        : t("video.remake.queueRunning")
      : queueStatus === "paused"
        ? isQueueInterrupted
          ? t("video.remake.queueInterrupted")
          : t("video.remake.queuePaused")
        : queueStatus === "completed"
          ? t("video.remake.queueCompleted")
          : queueStatus === "cancelled"
            ? t("video.remake.queueCancelled")
            : "";

  return (
    <section className="se-scrollbar h-full min-h-[520px] overflow-y-auto overflow-x-hidden rounded-[30px] border border-[rgba(244,244,244,0.08)] bg-[linear-gradient(180deg,rgba(17,19,24,0.88),rgba(5,7,11,0.95))] p-4 shadow-[0_28px_80px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(244,244,244,0.035)]">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4 rounded-[26px] border border-[rgba(244,244,244,0.08)] bg-[#05070b]/42 p-5">
        <div className="max-w-3xl">
          <p className="se-eyebrow">{t("video.remake.storyboard")}</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-[#f4f4f4]">{t("video.remake.aiStoryboard")}</h1>
          <p className="mt-2 text-sm leading-6 text-[#b9b9b9]/66">{t("video.remake.storyboardSubtitle")}</p>
        </div>
        <div className="grid gap-2 text-right text-xs text-[#b9b9b9]/58">
          <span className="rounded-full border border-[#ffb44d]/28 bg-[#ffb44d]/10 px-3 py-1.5 font-semibold text-[#ffb44d]">
            {settings.mode === "single_clip" ? t("video.remake.mode.singleClip") : t("video.remake.mode.fullFilm")}
          </span>
          <span>{settings.targetRegion}</span>
          {storyboard && onClearDraft ? (
            <button
              className="min-h-9 rounded-[14px] border border-[rgba(244,244,244,0.1)] bg-[#1a1c22]/64 px-3 text-xs font-semibold text-[#f4f4f4]/82 transition-colors hover:border-[#ffb44d]/34 hover:text-[#ffb44d]"
              onClick={onClearDraft}
              type="button"
            >
              {t("video.remake.clearDraft")}
            </button>
          ) : null}
          {canGenerateAllShots ? (
            <button
              className="min-h-9 rounded-[14px] border border-[#ffb44d]/34 bg-[#ffb44d] px-3 text-xs font-semibold text-[#05070b] transition-colors hover:bg-[#ffc766]"
              onClick={onGenerateAllShots}
              type="button"
            >
              {t("video.remake.generateAllShots")}
            </button>
          ) : null}
          {canRetryAllFailedShots ? (
            <button
              className="min-h-9 rounded-[14px] border border-[#ffb44d]/34 bg-[#ffb44d]/12 px-3 text-xs font-semibold text-[#ffb44d] transition-colors hover:bg-[#ffb44d]/18"
              onClick={onRetryAllFailedShots}
              type="button"
            >
              {t("video.remake.retryAllFailed")}
            </button>
          ) : null}
          {isQueueRunning ? (
            <button
              className="min-h-9 rounded-[14px] border border-red-300/24 bg-red-500/10 px-3 text-xs font-semibold text-red-100/82 transition-colors hover:bg-red-500/16"
              onClick={onCancelQueue}
              type="button"
            >
              {t("video.remake.cancelQueue")}
            </button>
          ) : null}
          {isQueuePaused ? (
            <div className="grid gap-1.5">
              <button
                className="min-h-9 rounded-[14px] border border-[#ffb44d]/34 bg-[#ffb44d] px-3 text-xs font-semibold text-[#05070b] transition-colors hover:bg-[#ffc766]"
                onClick={onContinueQueue}
                type="button"
              >
                {isQueueInterrupted ? t("video.remake.resumeQueue") : t("video.remake.continueQueue")}
              </button>
              {!isQueueInterrupted ? (
                <button
                  className="min-h-9 rounded-[14px] border border-[rgba(244,244,244,0.1)] bg-[#1a1c22]/64 px-3 text-xs font-semibold text-[#f4f4f4]/82 transition-colors hover:border-[#ffb44d]/34 hover:text-[#ffb44d]"
                  onClick={onSkipFailedShot}
                  type="button"
                >
                  {t("video.remake.skipShot")}
                </button>
              ) : null}
              <button
                className="min-h-9 rounded-[14px] border border-red-300/24 bg-red-500/10 px-3 text-xs font-semibold text-red-100/82 transition-colors hover:bg-red-500/16"
                onClick={onCancelQueue}
                type="button"
              >
                {t("video.remake.cancelQueue")}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {storyboard ? (
        <div className="mb-5 grid gap-2 rounded-[22px] border border-[rgba(244,244,244,0.08)] bg-[#111318]/58 p-3 text-sm leading-6 text-[#b9b9b9]/72">
          {draftNotice ? <p className="font-semibold text-[#ffd08a]/88">{draftNotice}</p> : null}
          <p>{t("video.remake.queueCreditNotice")}</p>
          {hasQueueStatus ? (
            <p className="font-semibold text-[#f4f4f4]/82">
              {queueStatusLabel}
              {queueTotal ? ` ${queueCompletedCount}/${queueTotal}` : ""}
            </p>
          ) : null}
          {isQueuePaused ? (
            <div className="grid gap-1 text-[#ffd08a]/86">
              <p>{isQueueInterrupted ? t("video.remake.queueDraftRestored") : t("video.remake.queueFailedNotice")}</p>
              {queueError ? <p className="break-words font-semibold text-red-100/82">{queueError}</p> : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {storyboard ? (
        <div className="mb-5 grid gap-3 lg:grid-cols-4">
          <ShotMeta label={t("video.remake.sourceVideo")} value={storyboard.sourceTitle || "--"} />
          <ShotMeta label={t("video.remake.metadata")} value={formatSourceMetadata(metadata?.sourceVideo)} />
          <ShotMeta label={t("video.remake.segments")} value={segments.length || "--"} />
          <ShotMeta label={t("video.remake.targetRegion")} value={storyboard.targetRegion} />
          <ShotMeta label={t("video.remake.characterRules")} value={storyboard.characterRules || "--"} />
          <ShotMeta label={t("video.remake.sceneStyle")} value={storyboard.sceneStyle || "--"} />
        </div>
      ) : null}

      {analysisNotice ? (
        <p className="mb-5 rounded-[20px] border border-[#ffb44d]/24 bg-[#ffb44d]/10 p-3 text-sm leading-6 text-[#ffd08a]/86">
          {analysisNotice}
        </p>
      ) : null}

      {shots.length ? (
        <div className="grid gap-4">
          {shots.map((shot) => {
            const keyframes = getShotKeyframes(shot, segments);
            const generation = shotGenerations[getRemakeShotGenerationKey(storyboard?.id, shot)];
            const isGenerating = generation?.status === "generating";
            const isQueued = generation?.status === "queued";
            const isSkipped = generation?.status === "skipped";
            const isGenerateDisabled = disableGenerationActions || isGenerating || isQueued || isQueueRunning;
            const hasGeneratedOutput = generation?.status === "success" && Boolean(generation.outputUrl);

            return (
            <article
              className="grid gap-4 rounded-[28px] border border-[rgba(244,244,244,0.08)] bg-[#111318]/78 p-4 shadow-inner shadow-black/12 xl:grid-cols-[minmax(0,1fr)_280px]"
              key={`${shot.shotGroupId}-${shot.shot}`}
            >
              <div className="min-w-0">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-[#ffb44d]/34 bg-[#ffb44d]/12 px-3 py-1.5 text-xs font-semibold text-[#ffb44d]">
                    {t("video.remake.shot")} {shot.shot}
                  </span>
                  <span className="rounded-full border border-[rgba(244,244,244,0.08)] bg-[#1a1c22]/70 px-3 py-1.5 text-xs font-medium text-[#b9b9b9]/72">
                    {shot.shotGroupId}
                  </span>
                  <span className="rounded-full border border-[rgba(244,244,244,0.08)] bg-[#1a1c22]/70 px-3 py-1.5 text-xs font-medium text-[#b9b9b9]/72">
                    {formatTimeRange(shot)}
                  </span>
                  {isQueued ? (
                    <span className="rounded-full border border-[#ffb44d]/28 bg-[#ffb44d]/10 px-3 py-1.5 text-xs font-semibold text-[#ffb44d]">
                      {t("video.remake.queued")}
                    </span>
                  ) : null}
                  {isSkipped ? (
                    <span className="rounded-full border border-[rgba(244,244,244,0.1)] bg-[#1a1c22]/66 px-3 py-1.5 text-xs font-semibold text-[#b9b9b9]/68">
                      {t("video.remake.skipped")}
                    </span>
                  ) : null}
                  {generation?.retryAttempt ? (
                    <span className="rounded-full border border-[#ffb44d]/24 bg-[#ffb44d]/8 px-3 py-1.5 text-xs font-semibold text-[#ffd08a]/84">
                      {tf("video.remake.retryAttempt", { attempt: generation.retryAttempt })}
                    </span>
                  ) : null}
                </div>

                <RemakeKeyframes keyframes={keyframes} />

                <div className="grid gap-3 md:grid-cols-2">
                  <ShotMeta label={t("video.remake.camera")} value={shot.camera} />
                  <ShotMeta label={t("video.remake.motion")} value={shot.motion} />
                  <ShotMeta label={t("video.remake.position")} value={shot.position} />
                  <ShotMeta label={t("video.remake.action")} value={shot.action} />
                  <ShotMeta label={t("video.remake.emotion")} value={shot.emotion} />
                  <ShotMeta label={t("video.remake.dialogue")} value={shot.dialogue || shot.audio} />
                </div>

                <div className="mt-3 rounded-[20px] border border-[rgba(244,244,244,0.08)] bg-[#05070b]/42 p-3">
                  <p className="se-eyebrow">{t("video.remake.prompt")}</p>
                  <p className="mt-2 text-sm leading-6 text-[#f4f4f4]/82">{shot.prompt}</p>
                </div>
              </div>

              <aside className="grid content-start gap-3 rounded-[24px] border border-[rgba(244,244,244,0.08)] bg-[#05070b]/32 p-3">
                <div>
                  <p className="se-eyebrow">{t("video.remake.referenceHints")}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {[...shot.referenceHints.characters, ...shot.referenceHints.images, ...shot.referenceHints.videos, ...shot.referenceHints.audios].slice(0, 8).map((hint) => (
                      <span className="rounded-full border border-[rgba(244,244,244,0.08)] bg-[#1a1c22]/70 px-2.5 py-1 text-[11px] font-medium text-[#b9b9b9]/72" key={hint}>
                        {hint}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="se-eyebrow">{t("video.remake.generationParams")}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs font-medium text-[#f4f4f4]/80">
                    <span className="se-pill rounded-[13px] px-2.5 py-1.5">{shot.generationParams.modelId}</span>
                    <span className="se-pill rounded-[13px] px-2.5 py-1.5">{shot.generationParams.quality}</span>
                    <span className="se-pill rounded-[13px] px-2.5 py-1.5">{formatTime(shot.generationParams.duration)}</span>
                    <span className="se-pill rounded-[13px] px-2.5 py-1.5">{shot.generationParams.ratio}</span>
                  </div>
                </div>

                <div className="grid gap-2 pt-1">
                  <button
                    className="min-h-10 rounded-[16px] border border-[#ffb44d]/34 bg-[#ffb44d]/12 px-3 text-sm font-semibold text-[#ffb44d] transition-colors hover:bg-[#ffb44d]/18"
                    onClick={() => onUsePrompt(shot.prompt)}
                    type="button"
                  >
                    {t("video.remake.usePrompt")}
                  </button>
                  {hasGeneratedOutput ? (
                    <a
                      className="inline-flex min-h-10 items-center justify-center rounded-[16px] border border-[rgba(244,244,244,0.1)] bg-[#1a1c22]/64 px-3 text-sm font-semibold text-[#f4f4f4]/82 transition-colors hover:border-[#ffb44d]/34 hover:text-[#ffb44d]"
                      href={generation.outputUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {t("video.remake.openResult")}
                    </a>
                  ) : null}
                  <button
                    className={`min-h-10 rounded-[16px] border px-3 text-sm font-semibold transition-colors ${
                      isGenerateDisabled
                        ? "cursor-wait border-[rgba(244,244,244,0.08)] bg-[#1a1c22]/56 text-[#b9b9b9]/54"
                        : "border-[#ffb44d]/34 bg-[#ffb44d] text-[#05070b] hover:bg-[#ffc766]"
                    }`}
                    disabled={isGenerateDisabled}
                    onClick={() => onGenerateShot(shot)}
                    type="button"
                  >
                    {isQueued
                      ? t("video.remake.queued")
                      : isGenerating
                      ? t("video.remake.generatingShot")
                      : generation?.status === "success" || generation?.status === "failed"
                        ? t("video.remake.retryShot")
                        : t("video.remake.generateShot")}
                  </button>
                  {generation?.status === "success" ? (
                    <p className="rounded-[16px] border border-emerald-400/18 bg-emerald-400/8 p-2 text-xs leading-5 text-emerald-100/76">
                      {t("video.remake.shotGenerated")}
                    </p>
                  ) : null}
                  {generation?.status === "failed" ? (
                    <p className="break-words rounded-[16px] border border-red-400/18 bg-red-500/8 p-2 text-xs leading-5 text-red-100/76">
                      {generation.error || t("video.remake.shotGenerationFailed")}
                    </p>
                  ) : null}
                </div>
              </aside>
            </article>
            );
          })}
        </div>
      ) : (
        <div className="grid min-h-[480px] place-items-center rounded-[28px] border border-dashed border-[rgba(244,244,244,0.11)] bg-[#111318]/52 p-8 text-center">
          <div className="max-w-lg">
            <span className="mx-auto grid size-14 place-items-center rounded-[22px] border border-[#ffb44d]/24 bg-[#ffb44d]/10 text-[#ffb44d]">
              <svg aria-hidden="true" className="size-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M4 4h16v16H4z" />
                <path d="M8 8h8" />
                <path d="M8 12h8" />
                <path d="M8 16h5" />
              </svg>
            </span>
            <h2 className="mt-4 text-lg font-semibold text-[#f4f4f4]">{t("video.remake.storyboardEmpty")}</h2>
            <p className="mt-2 text-sm leading-6 text-[#b9b9b9]/62">{t("video.remake.storyboardEmptyBody")}</p>
          </div>
        </div>
      )}
    </section>
  );
}
