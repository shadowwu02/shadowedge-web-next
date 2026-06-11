"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useI18n } from "@/i18n/useI18n";
import { getDefaultVideoModelRule, getVideoModelRule, normalizeVideoParamsForModel } from "@/lib/video/videoModelRules";

export type VideoParams = {
  duration: number;
  ratio: string;
  quality: string;
  generateAudio: boolean;
};

type ParamKey = "duration" | "ratio" | "quality";

type MenuPosition = {
  left: number;
  top: number;
  width: number;
};

type MenuPositionOptions = {
  menuSize?: {
    height: number;
    width: number;
  };
  optionCount?: number;
};

const menuGap = 8;
const viewportPadding = 12;

function uniqueSortedDurations(durations: number[], currentDuration: number) {
  const values = durations.length ? durations : [currentDuration || 5];
  return Array.from(new Set(values.map((duration) => Number(duration)).filter(Boolean))).sort((a, b) => a - b);
}

function getClosestDurationIndex(durations: number[], currentDuration: number) {
  const current = Number(currentDuration) || durations[0] || 5;
  let closestIndex = 0;
  let closestDistance = Number.POSITIVE_INFINITY;

  durations.forEach((duration, index) => {
    const distance = Math.abs(duration - current);
    if (distance < closestDistance) {
      closestIndex = index;
      closestDistance = distance;
    }
  });

  return closestIndex;
}

function getEstimatedMenuHeight(key: ParamKey, optionCount = 0) {
  if (key === "duration") return 220;
  return Math.min(236, Math.max(52, optionCount * 42 + 16));
}

function getMenuPosition(trigger: HTMLElement, key: ParamKey, options: MenuPositionOptions = {}): MenuPosition {
  const rect = trigger.getBoundingClientRect();
  const desiredWidth = key === "duration" ? 318 : Math.max(150, Math.min(220, rect.width + 30));
  const width = Math.min(desiredWidth, Math.max(180, window.innerWidth - viewportPadding * 2));
  const menuHeight = Math.max(
    52,
    options.menuSize?.height || getEstimatedMenuHeight(key, options.optionCount),
  );
  const belowTop = rect.bottom + menuGap;
  const belowSpace = window.innerHeight - belowTop - viewportPadding;
  const aboveTop = rect.top - menuHeight - menuGap;
  const aboveSpace = rect.top - menuGap - viewportPadding;
  const shouldOpenAbove = belowSpace < menuHeight && aboveSpace > belowSpace;
  let left = rect.left;
  let top = shouldOpenAbove ? aboveTop : belowTop;

  if (left + width > window.innerWidth - viewportPadding) {
    left = window.innerWidth - width - viewportPadding;
  }

  const maxTop = Math.max(viewportPadding, window.innerHeight - menuHeight - viewportPadding);
  if (top > maxTop) {
    top = maxTop;
  }

  return {
    left: Math.max(viewportPadding, left),
    top: Math.max(viewportPadding, top),
    width,
  };
}

export function VideoParamsPanel({
  value,
  onChange,
  modelId,
}: {
  value: VideoParams;
  onChange: (value: VideoParams) => void;
  modelId: string;
}) {
  const { t, tf } = useI18n();
  const [openKey, setOpenKey] = useState<ParamKey | null>(null);
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({ left: 0, top: 0, width: 180 });
  const rootRef = useRef<HTMLElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const defaultRule = getDefaultVideoModelRule();
  const modelRule = useMemo(() => getVideoModelRule(modelId), [modelId]);
  const ratioOptions = useMemo(
    () => (modelRule.ratios.length ? modelRule.ratios : defaultRule.ratios).map(String),
    [defaultRule.ratios, modelRule.ratios],
  );
  const qualityOptions = useMemo(() => {
    const values = modelRule.qualities.length ? modelRule.qualities : modelRule.resolutions;
    return (values.length ? values : defaultRule.qualities).map(String);
  }, [defaultRule.qualities, modelRule.qualities, modelRule.resolutions]);
  const durationOptions = useMemo(
    () => uniqueSortedDurations(modelRule.durations.length ? modelRule.durations : defaultRule.durations, value.duration),
    [defaultRule.durations, modelRule.durations, value.duration],
  );
  const durationIndex = getClosestDurationIndex(durationOptions, value.duration);

  useEffect(() => {
    if (!openKey) return;

    function closeMenu() {
      setOpenKey(null);
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      closeMenu();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeMenu();
    }

    function handleScroll(event: Event) {
      const target = event.target as Node | null;
      if (target && menuRef.current?.contains(target)) return;
      closeMenu();
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", closeMenu);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [openKey]);

  useLayoutEffect(() => {
    if (!openKey || !triggerRef.current || !menuRef.current) return;

    const optionCount =
      openKey === "duration" ? durationOptions.length : openKey === "ratio" ? ratioOptions.length : qualityOptions.length;
    const rect = menuRef.current.getBoundingClientRect();
    const nextPosition = getMenuPosition(triggerRef.current, openKey, {
      menuSize: {
        height: rect.height,
        width: rect.width,
      },
      optionCount,
    });

    setMenuPosition((current) =>
      current.left === nextPosition.left && current.top === nextPosition.top && current.width === nextPosition.width
        ? current
        : nextPosition,
    );
  }, [durationOptions.length, openKey, qualityOptions.length, ratioOptions.length]);

  function openMenu(key: ParamKey, trigger: HTMLElement) {
    if (openKey === key) {
      setOpenKey(null);
      return;
    }

    const optionCount = key === "duration" ? durationOptions.length : key === "ratio" ? ratioOptions.length : qualityOptions.length;
    triggerRef.current = trigger;
    setMenuPosition(getMenuPosition(trigger, key, { optionCount }));
    setOpenKey(key);
  }

  function updateDuration(nextIndex: number) {
    const nextDuration = durationOptions[nextIndex] || durationOptions[0] || value.duration;
    onChange({ ...value, duration: nextDuration });
  }

  function updateListValue(key: "ratio" | "quality", nextValue: string) {
    setOpenKey(null);
    onChange({
      ...value,
      [key]: nextValue,
    });
  }

  const chips: Array<{ key: ParamKey; label: string; value: string }> = [
    { key: "duration", label: t("video.params.duration"), value: tf("video.params.secondsValue", { seconds: value.duration }) },
    { key: "ratio", label: t("video.params.ratio"), value: value.ratio },
    { key: "quality", label: t("video.params.quality"), value: value.quality },
  ];
  const durationProgress =
    durationOptions.length > 1 ? Math.round((durationIndex / (durationOptions.length - 1)) * 100) : 100;

  useEffect(() => {
    const normalized = normalizeVideoParamsForModel(modelId, value);
    const nextValue: VideoParams = {
      duration: normalized.duration,
      generateAudio: value.generateAudio,
      quality: normalized.quality,
      ratio: normalized.ratio,
    };

    if (
      nextValue.duration !== value.duration ||
      nextValue.ratio !== value.ratio ||
      nextValue.quality !== value.quality
    ) {
      onChange(nextValue);
    }
  }, [modelId, onChange, value]);

  return (
    <section className="flex flex-wrap gap-2" ref={rootRef}>
      {chips.map((chip) => (
        <button
          aria-expanded={openKey === chip.key}
          className="se-control flex min-h-12 min-w-[96px] flex-1 basis-[calc(33.333%-0.5rem)] flex-col items-start justify-center gap-0.5 rounded-[18px] px-3 text-left text-xs font-medium text-[#b9b9b9]/58 shadow-inner shadow-black/10"
          key={chip.key}
          onClick={(event) => openMenu(chip.key, event.currentTarget)}
          type="button"
        >
          <span className="w-full truncate whitespace-nowrap leading-4">{chip.label}</span>
          <span className="w-full truncate whitespace-nowrap text-sm font-semibold leading-5 text-[#f4f4f4]">{chip.value}</span>
        </button>
      ))}

      {openKey ? (
        <div
          className="se-card-quiet fixed z-40 rounded-[22px] p-2 shadow-2xl shadow-black/50 backdrop-blur-xl"
          ref={menuRef}
          style={{
            left: menuPosition.left,
            top: menuPosition.top,
            width: menuPosition.width,
          }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {openKey === "duration" ? (
            <div className="grid gap-4 p-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#f4f4f4]">{t("video.params.chooseDuration")}</span>
                <span className="rounded-full border border-[#ffb44d]/18 bg-[#ffb44d]/12 px-2.5 py-1 text-xs font-semibold text-[#ffd08a]">
                  {tf("video.params.secondsValue", { seconds: value.duration })}
                </span>
              </div>
              <div className="px-1.5 pt-1">
                <input
                  aria-label={t("video.params.duration")}
                  className="se-duration-slider w-full cursor-pointer"
                  max={Math.max(0, durationOptions.length - 1)}
                  min={0}
                  onChange={(event) => updateDuration(Number(event.target.value))}
                  step={1}
                  style={{ "--se-duration-progress": `${durationProgress}%` } as CSSProperties}
                  type="range"
                  value={durationIndex}
                />
              </div>
              <div
                className="grid gap-1 text-center text-[10px] font-semibold text-[#b9b9b9]/42"
                style={{ gridTemplateColumns: `repeat(${durationOptions.length}, minmax(0, 1fr))` }}
              >
                {durationOptions.map((duration) => (
                  <button
                    className={`min-w-0 rounded-full px-0.5 py-1 transition-colors ${
                      duration === value.duration
                        ? "bg-[#ffb44d]/18 text-[#ffd08a]"
                        : "hover:bg-[#1a1c22] hover:text-[#f4f4f4]"
                    }`}
                    key={duration}
                    onClick={() => onChange({ ...value, duration })}
                    type="button"
                  >
                    {tf("video.params.secondsValue", { seconds: duration })}
                  </button>
                ))}
              </div>
              <button
                className="se-button-secondary justify-self-end rounded-full px-3 py-1.5 text-xs font-semibold"
                onClick={() => setOpenKey(null)}
                type="button"
              >
                {t("common.actions.done")}
              </button>
            </div>
          ) : (
            <div className="se-subtle-scrollbar grid max-h-[220px] gap-1 overflow-y-auto">
              {(openKey === "ratio" ? ratioOptions : qualityOptions).map((option) => {
                const isSelected = option === (openKey === "ratio" ? value.ratio : value.quality);
                return (
                  <button
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-semibold transition-colors ${
                      isSelected
                        ? "bg-[#ffb44d]/16 text-[#ffd08a]"
                        : "text-[#b9b9b9]/72 hover:bg-[#1a1c22] hover:text-[#f4f4f4]"
                    }`}
                    key={`${openKey}-${option}`}
                    onClick={() => updateListValue(openKey, option)}
                    type="button"
                  >
                    <span className="min-w-0">{option}</span>
                    {isSelected ? (
                      <span className="shrink-0 text-[11px] uppercase tracking-[.12em] text-[#ffd08a]">
                        {t("video.params.selected")}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
