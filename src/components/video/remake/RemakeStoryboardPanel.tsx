"use client";

import { useI18n } from "@/i18n/useI18n";
import type { RemakeSettings, RemakeShot, RemakeStoryboard } from "@/components/video/remake/remakeTypes";

type RemakeStoryboardPanelProps = {
  analysisNotice?: string;
  onUsePrompt: (prompt: string) => void;
  settings: RemakeSettings;
  storyboard: RemakeStoryboard | null;
};

function formatTime(seconds: number) {
  return `${seconds.toFixed(seconds % 1 === 0 ? 0 : 1)}s`;
}

function formatTimeRange(shot: RemakeShot) {
  return `${formatTime(shot.sourceTimeRange.start)} - ${formatTime(shot.sourceTimeRange.end)}`;
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

export function RemakeStoryboardPanel({ analysisNotice = "", onUsePrompt, settings, storyboard }: RemakeStoryboardPanelProps) {
  const { t } = useI18n();
  const shots = storyboard?.shots || [];

  return (
    <section className="se-scrollbar h-full min-h-[520px] overflow-y-auto overflow-x-hidden rounded-[30px] border border-[rgba(244,244,244,0.08)] bg-[linear-gradient(180deg,rgba(17,19,24,0.88),rgba(5,7,11,0.95))] p-4 shadow-[0_28px_80px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(244,244,244,0.035)]">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4 rounded-[26px] border border-[rgba(244,244,244,0.08)] bg-[#05070b]/42 p-5">
        <div className="max-w-3xl">
          <p className="se-eyebrow">{t("video.remake.storyboard")}</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-[#f4f4f4]">{t("video.remake.storyboardTitle")}</h1>
          <p className="mt-2 text-sm leading-6 text-[#b9b9b9]/66">{t("video.remake.storyboardSubtitle")}</p>
        </div>
        <div className="grid gap-2 text-right text-xs text-[#b9b9b9]/58">
          <span className="rounded-full border border-[#ffb44d]/28 bg-[#ffb44d]/10 px-3 py-1.5 font-semibold text-[#ffb44d]">
            {settings.mode === "single_clip" ? t("video.remake.mode.singleClip") : t("video.remake.mode.fullFilm")}
          </span>
          <span>{settings.targetRegion}</span>
        </div>
      </div>

      {storyboard ? (
        <div className="mb-5 grid gap-3 lg:grid-cols-4">
          <ShotMeta label={t("video.remake.sourceVideo")} value={storyboard.sourceTitle || "--"} />
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
          {shots.map((shot) => (
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
                </div>

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
                  <button
                    className="min-h-10 cursor-not-allowed rounded-[16px] border border-[rgba(244,244,244,0.08)] bg-[#1a1c22]/56 px-3 text-sm font-semibold text-[#b9b9b9]/46"
                    disabled
                    type="button"
                  >
                    {t("video.remake.generateShot")} · {t("video.remake.comingSoon")}
                  </button>
                </div>
              </aside>
            </article>
          ))}
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
