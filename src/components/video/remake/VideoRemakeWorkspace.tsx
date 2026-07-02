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
  isAnalyzing?: boolean;
  longVideoCostNotice?: string;
  mode: RemakeMode;
  onAnalyze: () => void;
  onCharacterRulesChange: (value: string) => void;
  onClearSourceVideo: () => void;
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
  if (duration > 120) return "video.remake.analysisTooLong";
  if (mode === "single_clip" && duration > 60) return "video.remake.singleClipTooLong";
  return "";
}

export function VideoRemakeWorkspace({
  analyzeLabel,
  analysisError = "",
  analysisNotice = "",
  characterRules,
  isAnalyzing = false,
  longVideoCostNotice = "",
  mode,
  onAnalyze,
  onCharacterRulesChange,
  onClearSourceVideo,
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
  const { t } = useI18n();
  const analyzeBlockedReasonKey = getAnalyzeBlockedReasonKey(mode, sourceVideo?.duration);

  return (
    <div className="grid content-start gap-3">
      <section className="se-card rounded-[24px] p-4">
        <p className="se-eyebrow">{t("video.remake.title")}</p>
        <h1 className="mt-2 text-lg font-semibold tracking-[-0.02em] text-[#f4f4f4]">{t("video.remake.subtitle")}</h1>
        <p className="mt-2 text-sm leading-6 text-[#b9b9b9]/68">{t("video.remake.workflowDescription")}</p>
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
