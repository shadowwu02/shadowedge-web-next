"use client";

import { RemakeSettingsPanel } from "@/components/video/remake/RemakeSettingsPanel";
import { RemakeSourceUpload } from "@/components/video/remake/RemakeSourceUpload";
import { type DictionaryKey, useI18n } from "@/i18n/useI18n";
import type { RemakeMode, RemakeSourceVideo, RemakeTargetRegion } from "@/components/video/remake/remakeTypes";

type VideoRemakeWorkspaceProps = {
  analyzeLabel?: string;
  analysisError?: string;
  analysisNotice?: string;
  characterRules: string;
  estimateOnlyError?: string;
  estimateOnlySummary?: string;
  isAnalyzing?: boolean;
  isEstimateOnlyLoading?: boolean;
  isLongVideoCreating?: boolean;
  isLongVideoEstimating?: boolean;
  guardedLongVideoUx?: boolean;
  longVideoEstimate?: {
    balance: number | null;
    billableNow: boolean;
    chargeCreditsNow: number;
    estimatedCredits: number;
  } | null;
  longVideoCostNotice?: string;
  mode: RemakeMode;
  onAnalyze: () => void;
  onCharacterRulesChange: (value: string) => void;
  onEstimateLongVideoCost?: () => void;
  onCancelLongVideoConfirmation?: () => void;
  onClearSourceVideo: () => void;
  onConfirmLongVideoAnalysis?: () => void;
  onModeChange: (mode: RemakeMode) => void;
  onSceneStyleChange: (value: string) => void;
  onSourceVideoChange: (source: RemakeSourceVideo | null) => void;
  onTargetRegionChange: (targetRegion: RemakeTargetRegion) => void;
  onTranslateDialogueChange: (value: boolean) => void;
  sceneStyle: string;
  sourceVideo: RemakeSourceVideo | null;
  targetRegion: RemakeTargetRegion;
  translateDialogue: boolean;
};

function getAnalyzeBlockedReasonKey(mode: RemakeMode, duration?: number): DictionaryKey | "" {
  if (!Number.isFinite(duration || 0) || !duration) return "";
  if (duration < 3) return "video.remake.sourceTooShort";
  if (mode === "long_video") {
    if (duration <= 120) return "video.remake.longVideo.tooShort";
    if (duration > 600) return "video.remake.longVideo.tooLong";
    return "";
  }
  if (mode === "full_film") {
    if (duration > 600) return "video.remake.fullEpisode.tooLong";
    return "";
  }
  if (duration > 120) return "video.remake.analysisTooLong";
  if (mode === "single_clip" && duration > 60) return "video.remake.singleClipTooLong";
  return "";
}

export function VideoRemakeWorkspace({
  analyzeLabel,
  analysisError = "",
  analysisNotice = "",
  characterRules,
  estimateOnlyError = "",
  estimateOnlySummary = "",
  isAnalyzing = false,
  isEstimateOnlyLoading = false,
  isLongVideoCreating = false,
  isLongVideoEstimating = false,
  guardedLongVideoUx = false,
  longVideoEstimate = null,
  longVideoCostNotice = "",
  mode,
  onAnalyze,
  onCharacterRulesChange,
  onEstimateLongVideoCost,
  onCancelLongVideoConfirmation,
  onClearSourceVideo,
  onConfirmLongVideoAnalysis,
  onModeChange,
  onSceneStyleChange,
  onSourceVideoChange,
  onTargetRegionChange,
  onTranslateDialogueChange,
  sceneStyle,
  sourceVideo,
  targetRegion,
  translateDialogue,
}: VideoRemakeWorkspaceProps) {
  const { t, tf } = useI18n();
  const isGuardedLongVideoBusy =
    guardedLongVideoUx && (isLongVideoCreating || isLongVideoEstimating || Boolean(longVideoEstimate));
  const analyzeBlockedReasonKey = getAnalyzeBlockedReasonKey(mode, sourceVideo?.duration);
  const canEstimateLongVideoCost =
    mode === "long_video" &&
    Boolean(sourceVideo?.assetId) &&
    Boolean(onEstimateLongVideoCost) &&
    !isAnalyzing &&
    !isEstimateOnlyLoading;

  return (
    <div className="grid content-start gap-3">
      <section className="se-card rounded-[24px] p-4">
        <p className="se-eyebrow">{t("video.remake.title")}</p>
        <h1 className="mt-2 text-lg font-semibold tracking-[-0.02em] text-[#f4f4f4]">{t("video.remake.subtitle")}</h1>
        <p className="mt-2 text-sm leading-6 text-[#b9b9b9]/68">{t("video.remake.workflowDescription")}</p>
        {mode === "long_video" ? (
          <p className="mt-3 rounded-[18px] border border-[#ffb44d]/24 bg-[#ffb44d]/9 p-3 text-xs leading-5 text-[#ffd08a]/86">
            {t("video.remake.longVideo.betaStructureNotice")}
          </p>
        ) : null}
        {mode === "full_film" ? (
          <div className="mt-3 grid gap-2 rounded-[18px] border border-[#7dd3fc]/24 bg-[#0b2a3a]/60 p-3 text-xs leading-5 text-[#b7e8ff]/90">
            <p>{t("video.remake.fullEpisode.betaWarning")}</p>
            <p>{t("video.remake.fullEpisodeLimit")}</p>
          </div>
        ) : null}
      </section>

      <RemakeSourceUpload
        mode={mode}
        onClear={onClearSourceVideo}
        onChange={onSourceVideoChange}
        sourceVideo={sourceVideo}
      />
      {mode === "long_video" && !guardedLongVideoUx && longVideoCostNotice ? (
        <p className="rounded-[18px] border border-[#ffb44d]/24 bg-[#ffb44d]/9 p-3 text-xs leading-5 text-[#ffd08a]/86">
          {longVideoCostNotice}
        </p>
      ) : null}
      {mode === "long_video" && guardedLongVideoUx && longVideoEstimate ? (
        <section className="se-card grid gap-3 rounded-[24px] p-4">
          <div>
            <p className="se-eyebrow">{t("video.remake.longVideo.cost.confirmTitle")}</p>
            <p className="mt-1 text-xs leading-5 text-[#b9b9b9]/68">
              {t("video.remake.longVideo.cost.confirmHelp")}
            </p>
          </div>
          <p className="rounded-[16px] border border-[#ffb44d]/24 bg-[#ffb44d]/9 p-3 text-xs leading-5 text-[#ffd08a]/86">
            {tf("video.remake.longVideo.cost.confirmDetails", {
              balance: longVideoEstimate.balance ?? t("video.remake.longVideo.cost.unknownBalance"),
              chargeNow: longVideoEstimate.billableNow ? longVideoEstimate.chargeCreditsNow : 0,
              credits: longVideoEstimate.estimatedCredits,
            })}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              aria-busy={isLongVideoCreating}
              className="se-button-primary min-h-10 rounded-[16px] px-4 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isLongVideoCreating}
              onClick={onConfirmLongVideoAnalysis}
              type="button"
            >
              {isLongVideoCreating
                ? t("video.remake.longVideo.cost.creating")
                : t("video.remake.longVideo.cost.confirmAnalysis")}
            </button>
            <button
              className="se-button-secondary min-h-10 rounded-[16px] px-4 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isLongVideoCreating}
              onClick={onCancelLongVideoConfirmation}
              type="button"
            >
              {t("video.remake.longVideo.cost.cancelAnalysis")}
            </button>
          </div>
        </section>
      ) : null}
      {mode === "long_video" && !guardedLongVideoUx ? (
        <section className="se-card grid gap-2 rounded-[24px] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="se-eyebrow">{t("video.remake.longVideo.cost.estimateOnlyTitle")}</p>
              <p className="mt-1 text-xs leading-5 text-[#b9b9b9]/62">{t("video.remake.longVideo.cost.estimateOnlyHelp")}</p>
            </div>
            <button
              aria-busy={isEstimateOnlyLoading}
              className="se-button-secondary min-h-10 rounded-[16px] px-3 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!canEstimateLongVideoCost}
              onClick={onEstimateLongVideoCost}
              type="button"
            >
              {isEstimateOnlyLoading ? t("video.remake.longVideo.cost.estimateOnlyLoading") : t("video.remake.longVideo.cost.estimateOnly")}
            </button>
          </div>
          {estimateOnlySummary ? (
            <p className="rounded-[16px] border border-[#ffb44d]/24 bg-[#ffb44d]/9 p-3 text-xs leading-5 text-[#ffd08a]/86">
              {estimateOnlySummary}
            </p>
          ) : null}
          {estimateOnlyError ? (
            <p className="rounded-[16px] border border-[#7f2d2d]/42 bg-[#2a1012]/70 p-3 text-xs leading-5 text-[#f1b4b4]/86">
              {estimateOnlyError}
            </p>
          ) : null}
        </section>
      ) : null}
      <RemakeSettingsPanel
        analyzeLabel={analyzeLabel}
        analyzeBlockedReason={analyzeBlockedReasonKey ? t(analyzeBlockedReasonKey) : ""}
        analysisError={analysisError}
        analysisNotice={analysisNotice}
        characterRules={characterRules}
        isAnalyzing={isAnalyzing || isGuardedLongVideoBusy}
        mode={mode}
        onAnalyze={onAnalyze}
        onCharacterRulesChange={onCharacterRulesChange}
        onModeChange={onModeChange}
        onSceneStyleChange={onSceneStyleChange}
        onTargetRegionChange={onTargetRegionChange}
        onTranslateDialogueChange={onTranslateDialogueChange}
        sceneStyle={sceneStyle}
        targetRegion={targetRegion}
        translateDialogue={translateDialogue}
      />
    </div>
  );
}
