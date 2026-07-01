"use client";

import { useI18n } from "@/i18n/useI18n";
import type { RemakeMode, RemakeTargetRegion } from "@/components/video/remake/remakeTypes";

type RemakeSettingsPanelProps = {
  analyzeLabel?: string;
  analyzeBlockedReason?: string;
  analysisError?: string;
  analysisNotice?: string;
  characterRules: string;
  isAnalyzing?: boolean;
  mode: RemakeMode;
  onAnalyze: () => void;
  onCharacterRulesChange: (value: string) => void;
  onModeChange: (mode: RemakeMode) => void;
  onSceneStyleChange: (value: string) => void;
  onTargetRegionChange: (targetRegion: RemakeTargetRegion) => void;
  onTranslateDialogueChange: (value: boolean) => void;
  sceneStyle: string;
  targetRegion: RemakeTargetRegion;
  translateDialogue: boolean;
};

const modeOptions: RemakeMode[] = ["single_clip", "full_film"];
const targetRegions: RemakeTargetRegion[] = ["US", "Middle East", "Japan", "Southeast Asia"];

function modeLabelKey(mode: RemakeMode) {
  return mode === "single_clip" ? "video.remake.mode.singleClip" : "video.remake.mode.fullFilm";
}

function modeHintKey(mode: RemakeMode) {
  return mode === "single_clip" ? "video.remake.mode.singleClipHint" : "video.remake.mode.fullFilmHint";
}

export function RemakeSettingsPanel({
  analyzeLabel,
  analyzeBlockedReason = "",
  analysisError = "",
  analysisNotice = "",
  characterRules,
  isAnalyzing = false,
  mode,
  onAnalyze,
  onCharacterRulesChange,
  onModeChange,
  onSceneStyleChange,
  onTargetRegionChange,
  onTranslateDialogueChange,
  sceneStyle,
  targetRegion,
  translateDialogue,
}: RemakeSettingsPanelProps) {
  const { t } = useI18n();

  return (
    <section className="se-card grid gap-3 rounded-[24px] p-4 shadow-inner shadow-black/10">
      <div>
        <p className="se-eyebrow">{t("video.remake.mode")}</p>
        <div className="mt-2 grid gap-2">
          {modeOptions.map((item) => {
            const isActive = item === mode;
            return (
              <button
                className={`rounded-[18px] border p-3 text-left transition-colors ${
                  isActive
                    ? "se-status-ready text-[#ffb44d]"
                    : "se-control text-[#f4f4f4]/72 hover:text-[#f4f4f4]"
                }`}
                key={item}
                onClick={() => onModeChange(item)}
                type="button"
              >
                <span className="block text-sm font-semibold">{t(modeLabelKey(item))}</span>
                <span className="mt-1 block text-xs leading-5 text-[#b9b9b9]/62">{t(modeHintKey(item))}</span>
              </button>
            );
          })}
          <button
            aria-disabled="true"
            className="cursor-not-allowed rounded-[18px] border border-[rgba(244,244,244,0.08)] bg-[#111318]/78 p-3 text-left text-[#f4f4f4]/48"
            disabled
            type="button"
          >
            <span className="flex flex-wrap items-center justify-between gap-2">
              <span className="block text-sm font-semibold">{t("video.remake.mode.longVideoAnalysis")}</span>
              <span className="rounded-full border border-[#ffb44d]/22 bg-[#ffb44d]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#ffd08a]/84">
                {t("video.remake.longVideo.comingSoon")}
              </span>
            </span>
            <span className="mt-1 block text-xs leading-5 text-[#b9b9b9]/58">{t("video.remake.longVideo.description")}</span>
            <span className="mt-2 flex flex-wrap gap-1.5">
              <span className="rounded-full border border-[rgba(244,244,244,0.08)] bg-[#05070b]/44 px-2 py-0.5 text-[10px] font-semibold text-[#b9b9b9]/58">
                {t("video.remake.longVideo.backgroundProcessing")}
              </span>
              <span className="rounded-full border border-[rgba(244,244,244,0.08)] bg-[#05070b]/44 px-2 py-0.5 text-[10px] font-semibold text-[#b9b9b9]/58">
                {t("video.remake.longVideo.keyMoments")}
              </span>
              <span className="rounded-full border border-[rgba(244,244,244,0.08)] bg-[#05070b]/44 px-2 py-0.5 text-[10px] font-semibold text-[#b9b9b9]/58">
                {t("video.remake.longVideo.remakeStoryboard")}
              </span>
            </span>
            <span className="mt-2 block text-xs leading-5 text-[#ffd08a]/72">{t("video.remake.longVideo.currentLimitHint")}</span>
          </button>
        </div>
      </div>

      <label className="grid gap-2">
        <span className="se-eyebrow">{t("video.remake.targetRegion")}</span>
        <select
          className="h-11 rounded-[18px] border border-[rgba(244,244,244,0.08)] bg-[#1a1c22] px-3 text-sm font-medium text-[#f4f4f4] outline-none transition focus:border-[#ffb44d]/52"
          onChange={(event) => onTargetRegionChange(event.target.value as RemakeTargetRegion)}
          value={targetRegion}
        >
          {targetRegions.map((region) => (
            <option key={region} value={region}>
              {region}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-2">
        <span className="se-eyebrow">{t("video.remake.characterRules")}</span>
        <textarea
          className="se-subtle-scrollbar min-h-20 resize-y rounded-[18px] border border-[rgba(244,244,244,0.08)] bg-[#1a1c22] p-3 text-sm leading-6 text-[#f4f4f4] outline-none transition placeholder:text-[#b9b9b9]/35 focus:border-[#ffb44d]/52"
          onChange={(event) => onCharacterRulesChange(event.target.value)}
          placeholder={t("video.remake.characterRulesPlaceholder")}
          value={characterRules}
        />
      </label>

      <label className="grid gap-2">
        <span className="se-eyebrow">{t("video.remake.sceneStyle")}</span>
        <textarea
          className="se-subtle-scrollbar min-h-24 resize-y rounded-[18px] border border-[rgba(244,244,244,0.08)] bg-[#1a1c22] p-3 text-sm leading-6 text-[#f4f4f4] outline-none transition placeholder:text-[#b9b9b9]/35 focus:border-[#ffb44d]/52"
          onChange={(event) => onSceneStyleChange(event.target.value)}
          placeholder={t("video.remake.sceneStylePlaceholder")}
          value={sceneStyle}
        />
      </label>

      <button
        className={`flex items-center justify-between rounded-[18px] border p-3 text-left transition-colors ${
          translateDialogue
            ? "se-status-ready text-[#ffb44d]"
            : "se-control text-[#f4f4f4]/72"
        }`}
        onClick={() => onTranslateDialogueChange(!translateDialogue)}
        type="button"
      >
        <span>
          <span className="block text-sm font-semibold">{t("video.remake.translateDialogue")}</span>
          <span className="mt-1 block text-xs text-[#b9b9b9]/60">{t("video.remake.languagePair")}</span>
        </span>
        <span className={`h-6 w-11 rounded-full p-1 transition-colors ${translateDialogue ? "bg-[#ffb44d]" : "bg-[#33323a]"}`}>
          <span className={`block size-4 rounded-full bg-[#05070b] transition-transform ${translateDialogue ? "translate-x-5" : ""}`} />
        </span>
      </button>

      <p className="rounded-[18px] border border-[#ffb44d]/24 bg-[#ffb44d]/9 p-3 text-xs leading-5 text-[#ffd08a]/86">
        {t("video.remake.complianceNotice")}
      </p>

      {analysisNotice ? (
        <p className="rounded-[18px] border border-[#ffb44d]/24 bg-[#ffb44d]/10 p-3 text-xs leading-5 text-[#ffd08a]/86">
          {analysisNotice}
        </p>
      ) : null}

      {analysisError ? (
        <p className="rounded-[18px] border border-[#7f2d2d]/42 bg-[#2a1012]/70 p-3 text-xs leading-5 text-[#f1b4b4]/86">
          {analysisError}
        </p>
      ) : null}

      {analyzeBlockedReason ? (
        <p className="rounded-[18px] border border-[#ffb44d]/24 bg-[#ffb44d]/10 p-3 text-xs leading-5 text-[#ffd08a]/86">
          {analyzeBlockedReason}
        </p>
      ) : null}

      <button
        aria-busy={isAnalyzing}
        className="se-button-primary min-h-11 rounded-[18px] px-4 text-sm font-semibold"
        disabled={isAnalyzing || Boolean(analyzeBlockedReason)}
        onClick={onAnalyze}
        type="button"
      >
        {analyzeLabel || (isAnalyzing ? t("video.remake.analyzingStoryboard") : t("video.remake.analyze"))}
      </button>
    </section>
  );
}
