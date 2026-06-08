"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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

const menuMaxHeight = 240;

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

function getMenuPosition(trigger: HTMLElement, key: ParamKey): MenuPosition {
  const rect = trigger.getBoundingClientRect();
  const gap = 8;
  const width = key === "duration" ? 260 : Math.max(150, Math.min(220, rect.width + 30));
  let left = rect.left;
  let top = rect.bottom + gap;

  if (left + width > window.innerWidth - 12) {
    left = window.innerWidth - width - 12;
  }

  if (top + menuMaxHeight > window.innerHeight - 12) {
    top = rect.top - menuMaxHeight - gap;
  }

  return {
    left: Math.max(12, left),
    top: Math.max(12, top),
    width,
  };
}

export function VideoParamsPanel({
  value,
  onChange,
  durations,
  ratios,
  qualities,
}: {
  value: VideoParams;
  onChange: (value: VideoParams) => void;
  durations: number[];
  ratios: string[];
  qualities: string[];
}) {
  const [openKey, setOpenKey] = useState<ParamKey | null>(null);
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({ left: 0, top: 0, width: 180 });
  const rootRef = useRef<HTMLElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const durationOptions = useMemo(() => uniqueSortedDurations(durations, value.duration), [durations, value.duration]);
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

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", closeMenu);
    window.addEventListener("scroll", closeMenu, true);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
    };
  }, [openKey]);

  function openMenu(key: ParamKey, trigger: HTMLElement) {
    setMenuPosition(getMenuPosition(trigger, key));
    setOpenKey((current) => (current === key ? null : key));
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
    { key: "duration", label: "Duration", value: `${value.duration}s` },
    { key: "ratio", label: "Ratio", value: value.ratio },
    { key: "quality", label: "Quality", value: value.quality },
  ];

  return (
    <section className="flex flex-wrap gap-2" ref={rootRef}>
      {chips.map((chip) => (
        <button
          aria-expanded={openKey === chip.key}
          className="flex min-h-11 flex-1 items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/[.055] px-3 text-left text-xs font-bold text-white/42 transition hover:border-[#ffb44d]/32 hover:bg-white/[.075]"
          key={chip.key}
          onClick={(event) => openMenu(chip.key, event.currentTarget)}
          type="button"
        >
          <span>{chip.label}</span>
          <span className="truncate text-sm font-black text-white">{chip.value}</span>
        </button>
      ))}

      {openKey ? (
        <div
          className="fixed z-40 rounded-2xl border border-white/10 bg-[#10141f]/98 p-2 shadow-2xl shadow-black/50 backdrop-blur-xl"
          ref={menuRef}
          style={{
            left: menuPosition.left,
            top: menuPosition.top,
            width: menuPosition.width,
          }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {openKey === "duration" ? (
            <div className="grid gap-3 p-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-white">Choose duration</span>
                <span className="rounded-full bg-[#ffb44d]/18 px-2.5 py-1 text-xs font-black text-[#ffd08a]">
                  {value.duration}s
                </span>
              </div>
              <input
                aria-label="Duration"
                className="se-duration-slider w-full cursor-pointer"
                max={Math.max(0, durationOptions.length - 1)}
                min={0}
                onChange={(event) => updateDuration(Number(event.target.value))}
                step={1}
                type="range"
                value={durationIndex}
              />
              <div className="flex items-center justify-between gap-2 text-[11px] font-bold text-white/42">
                {durationOptions.map((duration) => (
                  <button
                    className={`rounded-full px-2 py-1 transition ${
                      duration === value.duration
                        ? "bg-[#ffb44d]/18 text-[#ffd08a]"
                        : "hover:bg-white/[.06] hover:text-white"
                    }`}
                    key={duration}
                    onClick={() => onChange({ ...value, duration })}
                    type="button"
                  >
                    {duration}s
                  </button>
                ))}
              </div>
              <button
                className="justify-self-end rounded-full border border-white/10 px-3 py-1.5 text-xs font-black text-white/62 transition hover:border-[#ffb44d]/35 hover:text-[#ffd08a]"
                onClick={() => setOpenKey(null)}
                type="button"
              >
                Done
              </button>
            </div>
          ) : (
            <div className="se-subtle-scrollbar grid max-h-[220px] gap-1 overflow-y-auto">
              {(openKey === "ratio" ? ratios : qualities).map((option) => {
                const isSelected = option === (openKey === "ratio" ? value.ratio : value.quality);
                return (
                  <button
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-bold transition ${
                      isSelected
                        ? "bg-[#ffb44d]/16 text-[#ffd08a]"
                        : "text-white/68 hover:bg-white/[.055] hover:text-white"
                    }`}
                    key={`${openKey}-${option}`}
                    onClick={() => updateListValue(openKey, option)}
                    type="button"
                  >
                    <span>{option}</span>
                    {isSelected ? <span className="text-[11px] uppercase tracking-[.12em] text-[#ffd08a]">set</span> : null}
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
