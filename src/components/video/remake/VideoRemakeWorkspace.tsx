"use client";

import { RemakeSettingsPanel } from "@/components/video/remake/RemakeSettingsPanel";
import { RemakeSourceUpload } from "@/components/video/remake/RemakeSourceUpload";
import { useI18n } from "@/i18n/useI18n";
import type { RemakeMode, RemakeSourceVideo, RemakeTargetRegion } from "@/components/video/remake/remakeTypes";

type VideoRemakeWorkspaceProps = {
  analyzeLabel?: string;
  analysisError?: string;
  analysisNotice?: string;
  characterRules: string;
  isAnalyzing?: boolean;
  mode: RemakeMode;
  onAnalyze: () => void;
  onCharacterRulesChange: (value: string) => void;
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

export function VideoRemakeWorkspace({
  analyzeLabel,
  analysisError = "",
  analysisNotice = "",
  characterRules,
  isAnalyzing = false,
  mode,
  onAnalyze,
  onCharacterRulesChange,
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

  return (
    <div className="grid content-start gap-3">
      <section className="rounded-[24px] border border-[#ffb44d]/20 bg-[#ffb44d]/8 p-4">
        <p className="se-eyebrow">{t("video.remake.title")}</p>
        <h1 className="mt-2 text-lg font-semibold tracking-[-0.02em] text-[#f4f4f4]">{t("video.remake.subtitle")}</h1>
        <p className="mt-2 text-sm leading-6 text-[#b9b9b9]/68">{t("video.remake.workflowDescription")}</p>
      </section>

      <RemakeSourceUpload
        durationWarning={Boolean(
          sourceVideo?.duration &&
            (sourceVideo.duration < 3 ||
              (mode === "single_clip" && sourceVideo.duration > 60) ||
              (mode === "full_film" && sourceVideo.duration > 120)),
        )}
        onChange={onSourceVideoChange}
        sourceVideo={sourceVideo}
      />
      <RemakeSettingsPanel
        analyzeLabel={analyzeLabel}
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
