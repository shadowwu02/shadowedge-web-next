"use client";

import { useI18n } from "@/i18n/useI18n";
import { getRemakeShotGenerationKey } from "@/components/video/remake/remakeTypes";
import { getVideoUserFacingError } from "@/lib/video/videoErrorDisplay";
import type {
  RemakeAnalysisSource,
  RemakeEpisodeResult,
  RemakeKeyframe,
  RemakeMode,
  RemakeSegment,
  RemakeSettings,
  RemakeShot,
  RemakeShotGenerationState,
  RemakeShotQueueIntent,
  RemakeShotQueueStatus,
  RemakeSourceVideoMetadata,
  RemakeStoryboard,
  VideoAnalysisCanonicalResult,
} from "@/components/video/remake/remakeTypes";

type RemakeStoryboardPanelProps = {
  analysisNotice?: string;
  draftNotice?: string;
  hasSourceVideo?: boolean;
  isAnalyzing?: boolean;
  metadata?: {
    analysisSource?: RemakeAnalysisSource;
    canonicalResult?: VideoAnalysisCanonicalResult | null;
    fallbackReason?: string;
    fullEpisode?: RemakeEpisodeResult;
    mock?: boolean;
    providerCallMade?: boolean;
    sandboxVlm?: boolean;
    segments?: RemakeSegment[];
    sourceVideo?: RemakeSourceVideoMetadata;
    vlmCalled?: boolean;
    vlmProvider?: string;
  };
  onCancelQueue?: () => void;
  onClearDraft?: () => void;
  onUsePrompt: (prompt: string) => void;
  outputs?: RemakeOutputItem[];
  outputsScope?: RemakeOutputScope;
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

export type RemakeOutputScope = "current" | "recent";

export type RemakeOutputItem = {
  analysisId?: string;
  createdAtLabel: string;
  duration: string;
  errorMessage?: string;
  key: string;
  modelLabel: string;
  outputUrl: string;
  quality: string;
  ratio: string;
  shot?: RemakeShot;
  shotGroupId?: string;
  shotNumber?: number;
  status: string;
  statusKind: "completed" | "failed" | "processing" | "unknown";
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

function FullEpisodeCoveragePanel({ result }: { result: RemakeEpisodeResult }) {
  const { t, tf } = useI18n();
  const coverage = result.coverage;
  const chunks = result.chunks || [];
  const coveragePercent = coverage ? Math.round((coverage.coverageRatio || 0) * 100) : 0;

  return (
    <div className="mb-5 grid gap-3 rounded-[24px] border border-[#7dd3fc]/22 bg-[#0b2a3a]/42 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="se-eyebrow">{t("video.remake.fullEpisode.resultTitle")}</p>
          <h2 className="mt-1 text-lg font-semibold text-[#f4f4f4]">{t("video.remake.fullEpisode.coverageTitle")}</h2>
          <p className="mt-1 text-sm leading-6 text-[#b7e8ff]/78">{result.summary || t("video.remake.fullEpisode.betaWarning")}</p>
        </div>
        <span
          className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
            coverage?.ok
              ? "border-emerald-300/24 bg-emerald-400/10 text-emerald-200"
              : "border-[#ffb44d]/30 bg-[#ffb44d]/10 text-[#ffd08a]"
          }`}
        >
          {coverage?.ok ? t("video.remake.fullEpisode.coverageCovered") : t("video.remake.fullEpisode.coverageIncomplete")}
        </span>
      </div>

      <div className="grid gap-2 md:grid-cols-4">
        <ShotMeta label={t("video.remake.fullEpisode.coverageRatio")} value={`${coveragePercent}%`} />
        <ShotMeta label={t("video.remake.fullEpisode.actualShots")} value={coverage?.actualShotCount ?? "--"} />
        <ShotMeta label={t("video.remake.fullEpisode.recommendedShots")} value={coverage?.recommendedMinShotCount ?? "--"} />
        <ShotMeta
          label={t("video.remake.fullEpisode.timelineRange")}
          value={
            coverage
              ? `${formatTime(Number(coverage.firstTimestamp || 0))} - ${formatTime(Number(coverage.lastTimestamp || coverage.durationSeconds || 0))}`
              : "--"
          }
        />
      </div>

      {chunks.length ? (
        <div>
          <p className="se-eyebrow mb-2">{t("video.remake.fullEpisode.chunkPlan")}</p>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {chunks.map((chunk) => (
              <div className="rounded-[18px] border border-[rgba(244,244,244,0.08)] bg-[#05070b]/42 p-3" key={chunk.id || chunk.chunkIndex}>
                <p className="text-sm font-semibold text-[#f4f4f4]">
                  {tf("video.remake.fullEpisode.chunkLabel", { index: chunk.chunkIndex })}
                </p>
                <p className="mt-1 text-xs leading-5 text-[#b9b9b9]/70">
                  {formatTime(chunk.start)} - {formatTime(chunk.end)}
                </p>
                <p className="mt-1 text-xs leading-5 text-[#b7e8ff]/76">
                  {tf("video.remake.fullEpisode.chunkShotBeats", { count: chunk.shotBeatCount })}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {result.remakePlan?.length ? (
        <div className="rounded-[18px] border border-[rgba(244,244,244,0.08)] bg-[#05070b]/42 p-3">
          <p className="se-eyebrow">{t("video.remake.fullEpisode.mergedPlan")}</p>
          <ul className="mt-2 grid gap-1 text-sm leading-6 text-[#f4f4f4]/78">
            {result.remakePlan.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
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

function outputStatusClass(statusKind: RemakeOutputItem["statusKind"]) {
  if (statusKind === "completed") return "se-status-completed";
  if (statusKind === "failed") return "se-status-failed";
  if (statusKind === "processing") return "se-status-processing";
  return "se-status-neutral";
}

function getRemakeModeLabelKey(mode: RemakeMode) {
  if (mode === "single_clip") return "video.remake.mode.singleClip";
  if (mode === "long_video") return "video.remake.mode.longVideoAnalysis";
  return "video.remake.mode.fullFilm";
}

function RemakeOutputsPanel({
  outputs,
  scope,
}: {
  outputs: RemakeOutputItem[];
  scope: RemakeOutputScope;
}) {
  const { t } = useI18n();
  const scopeLabel = scope === "current" ? t("video.remake.currentStoryboardOutputs") : t("video.remake.recentOutputs");

  function statusLabel(output: RemakeOutputItem) {
    if (output.statusKind === "completed") return t("common.status.completed");
    if (output.statusKind === "failed") return t("video.status.failed");
    if (output.statusKind === "processing") return t("video.status.processing");
    return output.status || "--";
  }

  function outputErrorMessage(output: RemakeOutputItem) {
    return getVideoUserFacingError(output.errorMessage, t, { context: "remake" });
  }

  return (
    <section className="se-card-quiet mt-5 rounded-[28px] p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="se-eyebrow">{t("video.remake.outputsTitle")}</p>
          <h2 className="mt-1 text-lg font-semibold text-[#f4f4f4]">{t("video.remake.outputsTitle")}</h2>
          <p className="mt-1 text-sm leading-6 text-[#b9b9b9]/62">{t("video.remake.outputsDescription")}</p>
        </div>
        <span className="rounded-full border border-[#ffb44d]/24 bg-[#ffb44d]/8 px-3 py-1.5 text-xs font-semibold text-[#ffd08a]/86">
          {scopeLabel}
        </span>
      </div>

      {outputs.length ? (
        <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
          {outputs.map((output) => {
            return (
              <article
                className="se-card-interactive overflow-hidden rounded-[24px] shadow-inner shadow-black/10"
                key={output.key}
              >
                <div className="relative aspect-video bg-[#05070b]">
                  {output.outputUrl ? (
                    <video className="size-full object-contain" controls playsInline preload="metadata" src={output.outputUrl} />
                  ) : (
                    <div className="grid size-full place-items-center px-4 text-center">
                      <div>
                        <span className={`se-status rounded-full px-2.5 py-1 text-[11px] font-semibold ${outputStatusClass(output.statusKind)}`}>
                          {statusLabel(output)}
                        </span>
                        {output.statusKind === "processing" ? <span className="mx-auto mt-4 block size-9 animate-pulse rounded-2xl border border-[#ffb44d]/28 bg-[#ffb44d]/12" /> : null}
                        {output.statusKind === "failed" && output.errorMessage ? (
                          <p className="mx-auto mt-3 line-clamp-3 max-w-xs text-xs leading-5 text-[#f2b3a1]/70">{outputErrorMessage(output)}</p>
                        ) : null}
                      </div>
                    </div>
                  )}
                  <div className="pointer-events-none absolute inset-x-3 top-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-[#ffb44d]/20 bg-black/50 px-2.5 py-1 text-[10px] font-semibold text-[#ffd08a] backdrop-blur-sm">
                      {t("video.generation.remakeOutput")}
                    </span>
                    <span className={`se-status rounded-full px-2.5 py-1 text-[10px] font-semibold backdrop-blur-sm ${outputStatusClass(output.statusKind)}`}>
                      {statusLabel(output)}
                    </span>
                  </div>
                  {output.shotNumber ? (
                    <span className="pointer-events-none absolute bottom-3 left-3 rounded-full border border-black/24 bg-black/58 px-2.5 py-1 text-[10px] font-semibold text-white/82 backdrop-blur-sm">
                      {t("video.remake.shot")} {output.shotNumber}
                    </span>
                  ) : null}
                </div>
                <div className="grid gap-3 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-[#ffb44d]/20 bg-[#ffb44d]/8 px-2.5 py-1 text-[11px] font-semibold text-[#ffd08a]/86">
                      {t("video.generation.remakeOutput")}
                    </span>
                    {output.shotNumber ? (
                      <span className="rounded-full border border-[#ffb44d]/22 bg-[#ffb44d]/8 px-2.5 py-1 text-[11px] font-semibold text-[#ffb44d]">
                        {t("video.remake.shot")} {output.shotNumber}
                      </span>
                    ) : null}
                    {output.shotGroupId ? (
                      <span className="rounded-full border border-[rgba(244,244,244,0.08)] bg-[#1a1c22]/66 px-2.5 py-1 text-[11px] font-medium text-[#b9b9b9]/66">
                        {output.shotGroupId}
                      </span>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-[#b9b9b9]/68">
                    <span className="se-pill truncate rounded-[14px] px-2.5 py-2">{output.modelLabel || "--"}</span>
                    <span className="se-pill truncate rounded-[14px] px-2.5 py-2 text-right">{output.createdAtLabel}</span>
                    <span className="se-pill truncate rounded-[14px] px-2.5 py-2">{output.quality || "--"}</span>
                    <span className="se-pill truncate rounded-[14px] px-2.5 py-2 text-right">{[output.duration, output.ratio].filter(Boolean).join(" / ") || "--"}</span>
                  </div>

                  {output.statusKind === "failed" && output.errorMessage ? (
                    <p className="se-status se-status-failed break-words rounded-[14px] p-2 text-xs leading-5">
                      {outputErrorMessage(output)}
                    </p>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    {output.outputUrl ? (
                      <a
                        className="se-button-secondary inline-flex min-h-9 items-center justify-center rounded-[15px] px-3 text-xs font-semibold"
                        href={output.outputUrl}
                        rel="noreferrer"
                        target="_blank"
                    >
                      {t("video.remake.openOutput")}
                    </a>
                  ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[22px] border border-dashed border-[rgba(244,244,244,0.10)] bg-[#111318]/48 p-6 text-center">
          <h3 className="text-sm font-semibold text-[#f4f4f4]">{t("video.remake.noOutputs")}</h3>
          <p className="mt-2 text-sm leading-6 text-[#b9b9b9]/60">{t("video.remake.noOutputsHint")}</p>
        </div>
      )}
    </section>
  );
}

export function RemakeStoryboardPanel({
  analysisNotice = "",
  draftNotice = "",
  hasSourceVideo = false,
  isAnalyzing = false,
  metadata,
  onCancelQueue,
  onClearDraft,
  onUsePrompt,
  outputs = [],
  outputsScope = "recent",
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
  const canonicalResult = metadata?.canonicalResult;
  const canonicalVisual = canonicalResult?.visualUnderstanding;
  const fullEpisodeResult = metadata?.fullEpisode;
  const isQueueRunning = queueStatus === "running";
  const isQueuePaused = queueStatus === "paused";
  const isQueueInterrupted = isQueuePaused && queueWasInterrupted;
  const isRetryQueue = queueIntent === "retry_failed" || queueIntent === "retry_single";
  const hasQueueStatus = queueStatus === "running" || queueStatus === "paused" || queueStatus === "completed" || queueStatus === "cancelled";
  const canonicalSource =
    canonicalResult?.analysisSource === "vlm" ? "vlm" : canonicalResult?.analysisSource === "sandbox" ? "sandbox_vlm" : undefined;
  const analysisSource = canonicalSource || metadata?.analysisSource || storyboard?.analysisSource || (metadata?.mock || storyboard?.mock ? "fallback" : "");
  const vlmCalled =
    canonicalVisual?.vlmCalled === true ||
    metadata?.vlmCalled === true ||
    storyboard?.vlmCalled === true ||
    analysisSource === "vlm" ||
    analysisSource === "real_vlm";
  const providerCallMade = canonicalVisual?.providerCallMade === true || metadata?.providerCallMade === true || storyboard?.providerCallMade === true || vlmCalled;
  const isSandboxStoryboard =
    canonicalVisual?.sandbox === true ||
    metadata?.sandboxVlm === true ||
    storyboard?.sandboxVlm === true ||
    analysisSource === "sandbox_vlm";
  const canonicalFallback = Boolean(
    canonicalResult?.badges?.some((badge) => badge === "fallback_storyboard" || badge === "not_real_visual_reverse" || badge === "no_vision_model"),
  );
  const isFallbackStoryboard = Boolean(
    storyboard &&
      (canonicalFallback ||
        analysisSource === "fallback" ||
        metadata?.mock ||
        storyboard?.mock ||
        isSandboxStoryboard ||
        canonicalVisual?.realVisualUnderstanding === false ||
        !vlmCalled ||
        !providerCallMade),
  );
  const analysisSourceLabel =
    analysisSource === "vlm" || analysisSource === "real_vlm"
      ? t("video.remake.analysisSource.vlm")
      : analysisSource === "fallback" || analysisSource === "sandbox_vlm"
        ? t("video.remake.analysisSource.fallback")
        : "";
  const displayedAnalysisSourceLabel = analysisSourceLabel || (isFallbackStoryboard ? t("video.remake.analysisSource.fallback") : "");
  const emptyStateTitle = isAnalyzing
    ? t("video.remake.analyzingSourceVideoTitle")
    : hasSourceVideo
      ? t("video.remake.sourceReady")
      : t("video.remake.noStoryboardTitle");
  const emptyStateBody = isAnalyzing
    ? t("video.remake.analyzingStoryboardHint")
    : hasSourceVideo
      ? t("video.remake.sourceReadyStoryboardHint")
      : t("video.remake.noSourceStoryboardHint");
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
          {displayedAnalysisSourceLabel ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  analysisSource === "vlm" || analysisSource === "real_vlm"
                    ? "border-emerald-300/24 bg-emerald-400/10 text-emerald-200"
                    : "border-[#ffb44d]/28 bg-[#ffb44d]/10 text-[#ffd08a]"
                }`}
              >
                {displayedAnalysisSourceLabel}
              </span>
              {isFallbackStoryboard ? (
                <>
                  <span className="rounded-full border border-[#ffb44d]/28 bg-[#ffb44d]/10 px-3 py-1.5 text-xs font-semibold text-[#ffd08a]">
                    {t("video.remake.resultBadge.fallbackStoryboard")}
                  </span>
                  <span className="rounded-full border border-[#f2b3a1]/24 bg-[#2a1012]/62 px-3 py-1.5 text-xs font-semibold text-[#f2b3a1]">
                    {t("video.remake.resultBadge.notRealVisualReverse")}
                  </span>
                  {!vlmCalled && !providerCallMade ? (
                    <span className="rounded-full border border-[#7dd3fc]/24 bg-[#0b2a3a]/60 px-3 py-1.5 text-xs font-semibold text-[#b7e8ff]">
                      {t("video.remake.resultBadge.noVisionModel")}
                    </span>
                  ) : null}
                </>
              ) : null}
              {isFallbackStoryboard ? (
                <span className="text-xs font-medium leading-5 text-[#b9b9b9]/68">{t("video.remake.analysisFallbackHint")}</span>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="grid gap-2 text-right text-xs text-[#b9b9b9]/58">
          <span className="rounded-full border border-[#ffb44d]/28 bg-[#ffb44d]/10 px-3 py-1.5 font-semibold text-[#ffb44d]">
            {t(getRemakeModeLabelKey(settings.mode))}
          </span>
          <span>{settings.targetRegion}</span>
          {storyboard && onClearDraft ? (
            <button
              className="se-button-secondary min-h-9 rounded-[14px] px-3 text-xs font-semibold"
              onClick={onClearDraft}
              type="button"
            >
              {t("video.remake.clearDraft")}
            </button>
          ) : null}
          {isQueueRunning ? (
            <button
              className="se-button-danger min-h-9 rounded-[14px] px-3 text-xs font-semibold"
              onClick={onCancelQueue}
              type="button"
            >
              {t("video.remake.cancelQueue")}
            </button>
          ) : null}
          {isQueuePaused ? (
            <div className="grid gap-1.5">
              <button
                className="se-button-danger min-h-9 rounded-[14px] px-3 text-xs font-semibold"
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
          {isFallbackStoryboard ? <p className="font-semibold text-[#ffd08a]/88">{t("video.remake.resultFallbackBoundaryNotice")}</p> : null}
          {hasQueueStatus ? (
            <p className="font-semibold text-[#f4f4f4]/82">
              {queueStatusLabel}
              {queueTotal ? ` ${queueCompletedCount}/${queueTotal}` : ""}
            </p>
          ) : null}
          {isQueuePaused ? (
            <div className="grid gap-1 text-[#ffd08a]/86">
              <p>{isQueueInterrupted ? t("video.remake.queueDraftRestored") : t("video.remake.queueFailedNotice")}</p>
              {queueError ? <p className="break-words font-semibold text-[#f2b3a1]/82">{queueError}</p> : null}
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

      {fullEpisodeResult ? <FullEpisodeCoveragePanel result={fullEpisodeResult} /> : null}

      {shots.length ? (
        <div className="grid gap-4">
          {shots.map((shot) => {
            const keyframes = getShotKeyframes(shot, segments);
            const generation = shotGenerations[getRemakeShotGenerationKey(storyboard?.id, shot)];
            const isQueued = generation?.status === "queued";
            const isSkipped = generation?.status === "skipped";
            const hasGeneratedOutput = generation?.status === "success" && Boolean(generation.outputUrl);

            return (
            <article
              className="se-card-interactive grid gap-4 rounded-[28px] p-4 shadow-inner shadow-black/12 xl:grid-cols-[minmax(0,1fr)_280px]"
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
                    <span className="se-status se-status-processing rounded-full px-3 py-1.5 text-xs font-semibold">
                      {t("video.remake.queued")}
                    </span>
                  ) : null}
                  {isSkipped ? (
                    <span className="se-status se-status-neutral rounded-full px-3 py-1.5 text-xs font-semibold">
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
                    className="se-button-secondary min-h-10 rounded-[16px] px-3 text-sm font-semibold"
                    onClick={() => onUsePrompt(shot.prompt)}
                    type="button"
                  >
                    {t("video.remake.usePrompt")}
                  </button>
                  {hasGeneratedOutput ? (
                    <a
                      className="se-button-secondary inline-flex min-h-10 items-center justify-center rounded-[16px] px-3 text-sm font-semibold"
                      href={generation.outputUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {t("video.remake.openResult")}
                    </a>
                  ) : null}
                  {generation?.status === "success" ? (
                    <p className="se-status se-status-completed rounded-[16px] p-2 text-xs leading-5">
                      {t("video.remake.shotGenerated")}
                    </p>
                  ) : null}
                  {generation?.status === "failed" ? (
                    <p className="se-status se-status-failed break-words rounded-[16px] p-2 text-xs leading-5">
                      {getVideoUserFacingError(generation.error, t, { context: "remake" }) || t("video.remake.shotGenerationFailed")}
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
            <h2 className="mt-4 text-lg font-semibold text-[#f4f4f4]">{emptyStateTitle}</h2>
            <p className="mt-2 text-sm leading-6 text-[#b9b9b9]/62">{emptyStateBody}</p>
          </div>
        </div>
      )}
      <RemakeOutputsPanel
        outputs={outputs}
        scope={outputsScope}
      />
    </section>
  );
}
