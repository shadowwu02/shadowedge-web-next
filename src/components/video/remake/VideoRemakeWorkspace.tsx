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
  isSandboxEstimateLoading?: boolean;
  longVideoCostNotice?: string;
  mode: RemakeMode;
  onAnalyze: () => void;
  onCharacterRulesChange: (value: string) => void;
  onEstimateLongVideoCost?: () => void;
  onEstimateLongVideoSandbox?: () => void;
  onClearSourceVideo: () => void;
  onModeChange: (mode: RemakeMode) => void;
  onSceneStyleChange: (value: string) => void;
  onSourceVideoChange: (source: RemakeSourceVideo | null) => void;
  onTargetRegionChange: (targetRegion: RemakeTargetRegion) => void;
  onTranslateDialogueChange: (value: boolean) => void;
  sceneStyle: string;
  sourceVideo: RemakeSourceVideo | null;
  sandboxEstimateError?: string;
  sandboxEstimateSummary?: string;
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
  isSandboxEstimateLoading = false,
  longVideoCostNotice = "",
  mode,
  onAnalyze,
  onCharacterRulesChange,
  onEstimateLongVideoCost,
  onEstimateLongVideoSandbox,
  onClearSourceVideo,
  onModeChange,
  onSceneStyleChange,
  onSourceVideoChange,
  onTargetRegionChange,
  onTranslateDialogueChange,
  sceneStyle,
  sourceVideo,
  sandboxEstimateError = "",
  sandboxEstimateSummary = "",
  targetRegion,
  translateDialogue,
}: VideoRemakeWorkspaceProps) {
  const { t } = useI18n();
  const analyzeBlockedReasonKey = getAnalyzeBlockedReasonKey(mode, sourceVideo?.duration);
  const canEstimateLongVideoCost =
    mode === "long_video" &&
    Boolean(sourceVideo?.assetId) &&
    Boolean(onEstimateLongVideoCost) &&
    !isAnalyzing &&
    !isEstimateOnlyLoading &&
    !isSandboxEstimateLoading;
  const canEstimateSandbox =
    mode === "long_video" &&
    Boolean(sourceVideo?.assetId) &&
    Boolean(onEstimateLongVideoSandbox) &&
    !isAnalyzing &&
    !isEstimateOnlyLoading &&
    !isSandboxEstimateLoading;

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
          <p className="mt-3 rounded-[18px] border border-[#7dd3fc]/24 bg-[#0b2a3a]/60 p-3 text-xs leading-5 text-[#b7e8ff]/90">
            {t("video.remake.fullEpisodeLimit")}
          </p>
        ) : null}
      </section>

      <RemakeSourceUpload
        mode={mode}
        onClear={onClearSourceVideo}
        onChange={onSourceVideoChange}
        sourceVideo={sourceVideo}
      />
      {mode === "long_video" && longVideoCostNotice ? (
        <p className="rounded-[18px] border border-[#ffb44d]/24 bg-[#ffb44d]/9 p-3 text-xs leading-5 text-[#ffd08a]/86">
          {longVideoCostNotice}
        </p>
      ) : null}
      {mode === "long_video" ? (
        <section className="se-card grid gap-2 rounded-[24px] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="se-eyebrow">{t("video.remake.longVideo.cost.estimateOnlyTitle")}</p>
              <p className="mt-1 text-xs leading-5 text-[#b9b9b9]/62">{t("video.remake.longVideo.cost.estimateOnlyHelp")}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                aria-busy={isEstimateOnlyLoading}
                className="se-button-secondary min-h-10 rounded-[16px] px-3 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canEstimateLongVideoCost}
                onClick={onEstimateLongVideoCost}
                type="button"
              >
                {isEstimateOnlyLoading ? t("video.remake.longVideo.cost.estimateOnlyLoading") : t("video.remake.longVideo.cost.estimateOnly")}
              </button>
              <button
                aria-busy={isSandboxEstimateLoading}
                className="se-button-secondary min-h-10 rounded-[16px] px-3 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canEstimateSandbox}
                onClick={onEstimateLongVideoSandbox}
                type="button"
              >
                {isSandboxEstimateLoading
                  ? t("video.remake.longVideo.cost.sandboxEstimateOnlyLoading")
                  : t("video.remake.longVideo.cost.sandboxEstimateOnly")}
              </button>
            </div>
          </div>
          {estimateOnlySummary ? (
            <p className="rounded-[16px] border border-[#ffb44d]/24 bg-[#ffb44d]/9 p-3 text-xs leading-5 text-[#ffd08a]/86">
              {estimateOnlySummary}
            </p>
          ) : null}
          {sandboxEstimateSummary ? (
            <p className="rounded-[16px] border border-[#7dd3fc]/24 bg-[#0b2a3a]/60 p-3 text-xs leading-5 text-[#b7e8ff]/90">
              {sandboxEstimateSummary}
            </p>
          ) : null}
          {estimateOnlyError ? (
            <p className="rounded-[16px] border border-[#7f2d2d]/42 bg-[#2a1012]/70 p-3 text-xs leading-5 text-[#f1b4b4]/86">
              {estimateOnlyError}
            </p>
          ) : null}
          {sandboxEstimateError ? (
            <p className="rounded-[16px] border border-[#7f2d2d]/42 bg-[#2a1012]/70 p-3 text-xs leading-5 text-[#f1b4b4]/86">
              {sandboxEstimateError}
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
        isAnalyzing={isAnalyzing}
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
