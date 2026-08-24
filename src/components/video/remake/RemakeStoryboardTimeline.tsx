"use client";

import { useMemo, useState } from "react";

import { useI18n } from "@/i18n/useI18n";
import type { RemakeKeyframe, RemakeShot, RemakeShotGenerationState } from "@/components/video/remake/remakeTypes";

type RemakeStoryboardTimelineProps = {
  shotGenerations?: Record<string, RemakeShotGenerationState>;
  shots: RemakeShot[];
};

type ShotDraft = {
  description: string;
  prompt: string;
};

function formatTime(seconds: number) {
  return `${seconds.toFixed(seconds % 1 === 0 ? 0 : 1)}s`;
}

function getShotKey(shot: RemakeShot) {
  return `${shot.shotGroupId}:${shot.shot}`;
}

function buildDrafts(shots: RemakeShot[]) {
  return Object.fromEntries(
    shots.map((shot) => [
      getShotKey(shot),
      {
        description: shot.action,
        prompt: shot.prompt,
      } satisfies ShotDraft,
    ]),
  );
}

function KeyframePreview({ keyframes }: { keyframes: RemakeKeyframe[] }) {
  const { t } = useI18n();

  if (!keyframes.length) {
    return (
      <div className="grid min-h-48 place-items-center rounded-[22px] border border-dashed border-[rgba(244,244,244,0.12)] bg-[#05070b]/52 px-5 text-center text-sm text-[#b9b9b9]/62">
        {t("video.remake.timeline.noKeyframes")}
      </div>
    );
  }

  return (
    <div className="se-scrollbar flex snap-x gap-3 overflow-x-auto pb-2" data-testid="remake-keyframe-preview">
      {keyframes.map((frame, index) => (
        <a
          aria-label={`${t("video.remake.keyframe")} ${index + 1}`}
          className="group min-w-[220px] snap-start overflow-hidden rounded-[20px] border border-[rgba(244,244,244,0.09)] bg-[#05070b]/66 transition-colors hover:border-[#ffb44d]/42 sm:min-w-[260px]"
          href={frame.url}
          key={`${frame.url}-${frame.time}`}
          rel="noreferrer"
          target="_blank"
        >
          <div className="aspect-video bg-[#05070b]">
            {/* eslint-disable-next-line @next/next/no-img-element -- canonical analysis frame URLs are runtime-owned assets */}
            <img
              alt={`${t("video.remake.keyframe")} ${index + 1}`}
              className="size-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
              loading="lazy"
              src={frame.url}
            />
          </div>
          <div className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-[#b9b9b9]/72">
            <span>{t("video.remake.keyframe")}</span>
            <span>{formatTime(frame.time)}</span>
          </div>
        </a>
      ))}
    </div>
  );
}

export function RemakeStoryboardTimeline({ shotGenerations = {}, shots }: RemakeStoryboardTimelineProps) {
  const { t, tf } = useI18n();
  const [selectedShotKey, setSelectedShotKey] = useState(() => (shots[0] ? getShotKey(shots[0]) : ""));
  const [drafts, setDrafts] = useState<Record<string, ShotDraft>>(() => buildDrafts(shots));
  const selectedShot = shots.find((shot) => getShotKey(shot) === selectedShotKey) || shots[0];
  const selectedKey = selectedShot ? getShotKey(selectedShot) : "";
  const selectedDraft = selectedShot ? drafts[selectedKey] || { description: selectedShot.action, prompt: selectedShot.prompt } : null;
  const selectedKeyframes = useMemo(
    () => selectedShot?.keyframes || [],
    [selectedShot],
  );
  const selectedGeneration = selectedShot
    ? shotGenerations[getShotKey(selectedShot)]
    : undefined;
  const replacementStatus = selectedGeneration?.replacement?.generated.status || (
    selectedGeneration?.status === "queued"
      ? "pending"
      : selectedGeneration?.status === "generating"
        ? "processing"
        : selectedGeneration?.status === "failed"
          ? "failed"
          : undefined
  );
  const replacementAsset = selectedGeneration?.replacement?.generated.assetLineage;

  if (!selectedShot || !selectedDraft) return null;
  const activeDraft = selectedDraft;

  function updateSelectedDraft(field: keyof ShotDraft, value: string) {
    setDrafts((current) => {
      const currentDraft = current[selectedKey] || activeDraft;
      return {
        ...current,
        [selectedKey]: {
          description: field === "description" ? value : currentDraft.description,
          prompt: field === "prompt" ? value : currentDraft.prompt,
        },
      };
    });
  }

  return (
    <section
      aria-labelledby="remake-timeline-title"
      className="mb-5 overflow-hidden rounded-[28px] border border-[#ffb44d]/20 bg-[linear-gradient(145deg,rgba(255,180,77,0.08),rgba(5,7,11,0.72)_48%)] p-4 shadow-inner shadow-black/10 sm:p-5"
      data-testid="remake-storyboard-timeline"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="se-eyebrow">{t("video.remake.timeline.eyebrow")}</p>
          <h2 className="mt-1 text-xl font-semibold text-[#f4f4f4]" id="remake-timeline-title">
            {t("video.remake.timeline.title")}
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[#b9b9b9]/66">{t("video.remake.timeline.subtitle")}</p>
        </div>
        <span className="rounded-full border border-[#ffb44d]/24 bg-[#ffb44d]/10 px-3 py-1.5 text-xs font-semibold text-[#ffd08a]/88">
          {tf("video.remake.timeline.shotCount", { count: shots.length })}
        </span>
      </div>

      <div className="mt-5">
        <p className="se-eyebrow mb-2">{t("video.remake.timeline.shotTimeline")}</p>
        <div
          aria-label={t("video.remake.timeline.shotTimeline")}
          className="se-scrollbar flex min-h-16 gap-2 overflow-x-auto pb-2"
          role="listbox"
        >
          {shots.map((shot) => {
            const key = getShotKey(shot);
            const isSelected = key === selectedKey;
            return (
              <button
                aria-selected={isSelected}
                className={`min-w-[112px] rounded-[18px] border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffb44d]/80 ${
                  isSelected
                    ? "border-[#ffb44d]/58 bg-[#ffb44d]/14 text-[#fff1d6]"
                    : "border-[rgba(244,244,244,0.09)] bg-[#111318]/72 text-[#b9b9b9]/76 hover:border-[#ffb44d]/30"
                }`}
                key={key}
                onClick={() => setSelectedShotKey(key)}
                role="option"
                style={{ flexGrow: Math.max(1, shot.duration) }}
                type="button"
              >
                <span className="block text-xs font-semibold">{t("video.remake.shot")} {shot.shot}</span>
                <span className="mt-1 block text-[11px] opacity-70">
                  {formatTime(shot.sourceTimeRange.start)} – {formatTime(shot.sourceTimeRange.end)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div className="min-w-0 rounded-[24px] border border-[rgba(244,244,244,0.08)] bg-[#111318]/58 p-3 sm:p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="se-eyebrow">{t("video.remake.timeline.keyframePreview")}</p>
              <p className="mt-1 text-sm font-semibold text-[#f4f4f4]">
                {t("video.remake.shot")} {selectedShot.shot}
              </p>
            </div>
            <span className="rounded-full border border-[rgba(244,244,244,0.09)] bg-[#05070b]/58 px-3 py-1.5 text-xs font-semibold text-[#b9b9b9]/72">
              {selectedKeyframes.length} {t("video.remake.keyframes")}
            </span>
          </div>
          <KeyframePreview keyframes={selectedKeyframes} />
          <div className="mt-4 rounded-[20px] border border-[rgba(244,244,244,0.08)] bg-[#05070b]/52 p-3" data-testid="remake-shot-replacement">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
                <span className="rounded-full bg-white/5 px-2.5 py-1 text-[#b9b9b9]/76">{t("video.remake.timeline.originalV1")}</span>
                <span className="rounded-full bg-[#0b2a3a]/58 px-2.5 py-1 text-[#b7e8ff]/82">{t("video.remake.timeline.editedV2")}</span>
                <span className="rounded-full bg-[#ffb44d]/10 px-2.5 py-1 text-[#ffd08a]/88">{t("video.remake.timeline.generatedV3")}</span>
              </div>
              {replacementStatus ? (
                <span className="text-xs font-semibold text-[#b9b9b9]/72">{t(`video.remake.timeline.replacement.${replacementStatus}`)}</span>
              ) : null}
            </div>

            {replacementStatus === "completed" && replacementAsset ? (
              <video
                className="mt-3 aspect-video w-full rounded-[16px] bg-black object-cover"
                controls
                playsInline
                preload="none"
                src={replacementAsset.url}
              />
            ) : replacementStatus ? (
              <p className="mt-3 text-sm leading-6 text-[#b9b9b9]/66">
                {replacementStatus === "failed"
                  ? t("video.remake.timeline.replacementFailedHint")
                  : t("video.remake.timeline.replacementPendingHint")}
              </p>
            ) : (
              <p className="mt-3 text-sm leading-6 text-[#b9b9b9]/58">{t("video.remake.timeline.noReplacement")}</p>
            )}
          </div>
        </div>

        <div className="grid content-start gap-4 rounded-[24px] border border-[rgba(244,244,244,0.08)] bg-[#05070b]/42 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="se-eyebrow">{t("video.remake.timeline.shotEditor")}</p>
              <h3 className="mt-1 text-base font-semibold text-[#f4f4f4]">
                {t("video.remake.shot")} {selectedShot.shot}
              </h3>
            </div>
            <span className="rounded-full border border-[#7dd3fc]/20 bg-[#0b2a3a]/48 px-3 py-1.5 text-[11px] font-semibold text-[#b7e8ff]/82">
              {t("video.remake.timeline.localDraft")}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[16px] border border-[rgba(244,244,244,0.08)] bg-[#1a1c22]/58 p-3">
              <p className="se-eyebrow">{t("video.remake.timeline.startTime")}</p>
              <p className="mt-1 text-sm font-semibold text-[#f4f4f4]/84">{formatTime(selectedShot.sourceTimeRange.start)}</p>
            </div>
            <div className="rounded-[16px] border border-[rgba(244,244,244,0.08)] bg-[#1a1c22]/58 p-3">
              <p className="se-eyebrow">{t("video.remake.timeline.endTime")}</p>
              <p className="mt-1 text-sm font-semibold text-[#f4f4f4]/84">{formatTime(selectedShot.sourceTimeRange.end)}</p>
            </div>
          </div>

          <label className="grid gap-2 text-sm font-semibold text-[#f4f4f4]/84">
            <span>{t("video.remake.timeline.description")}</span>
            <textarea
              className="se-field min-h-24 resize-y rounded-[18px] px-3 py-2 text-sm font-normal leading-6"
              onChange={(event) => updateSelectedDraft("description", event.target.value)}
              value={selectedDraft.description}
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-[#f4f4f4]/84">
            <span>{t("video.remake.prompt")}</span>
            <textarea
              className="se-field min-h-28 resize-y rounded-[18px] px-3 py-2 text-sm font-normal leading-6"
              onChange={(event) => updateSelectedDraft("prompt", event.target.value)}
              value={selectedDraft.prompt}
            />
          </label>

          <p className="text-xs leading-5 text-[#b9b9b9]/58">{t("video.remake.timeline.localDraftHint")}</p>
        </div>
      </div>
    </section>
  );
}
