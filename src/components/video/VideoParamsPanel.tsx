"use client";

import { useEffect, useRef, useState } from "react";

export type VideoParams = {
  duration: number;
  ratio: string;
  quality: string;
  generateAudio: boolean;
};

type ParamKey = "duration" | "ratio" | "quality";

type ParamOption = {
  label: string;
  value: number | string;
};

type MenuPosition = {
  left: number;
  top: number;
  width: number;
};

const menuMaxHeight = 220;

function getMenuPosition(trigger: HTMLElement): MenuPosition {
  const rect = trigger.getBoundingClientRect();
  const gap = 8;
  const width = Math.max(150, Math.min(220, rect.width + 28));
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
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({ left: 0, top: 0, width: 160 });
  const rootRef = useRef<HTMLElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const config: Record<ParamKey, { label: string; currentLabel: string; options: ParamOption[] }> = {
    duration: {
      label: "Duration",
      currentLabel: `${value.duration}s`,
      options: durations.map((duration) => ({ label: `${duration}s`, value: duration })),
    },
    ratio: {
      label: "Ratio",
      currentLabel: value.ratio,
      options: ratios.map((ratio) => ({ label: ratio, value: ratio })),
    },
    quality: {
      label: "Quality",
      currentLabel: value.quality,
      options: qualities.map((quality) => ({ label: quality, value: quality })),
    },
  };

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

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("scroll", closeMenu, true);
    window.addEventListener("resize", closeMenu);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("scroll", closeMenu, true);
      window.removeEventListener("resize", closeMenu);
    };
  }, [openKey]);

  function openMenu(key: ParamKey, trigger: HTMLElement) {
    setMenuPosition(getMenuPosition(trigger));
    setOpenKey((current) => (current === key ? null : key));
  }

  function updateValue(key: ParamKey, nextValue: number | string) {
    setOpenKey(null);

    if (key === "duration") {
      onChange({ ...value, duration: Number(nextValue) });
      return;
    }

    if (key === "ratio") {
      onChange({ ...value, ratio: String(nextValue) });
      return;
    }

    onChange({ ...value, quality: String(nextValue) });
  }

  const activeMenu = openKey ? config[openKey] : null;

  return (
    <section className="flex flex-wrap gap-2" ref={rootRef}>
      {(Object.keys(config) as ParamKey[]).map((key) => {
        const item = config[key];
        return (
          <button
            aria-expanded={openKey === key}
            className="flex min-h-11 flex-1 items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/[.055] px-3 text-left text-xs font-bold text-white/42 transition hover:border-[#ffb44d]/32 hover:bg-white/[.075]"
            key={key}
            onClick={(event) => openMenu(key, event.currentTarget)}
            type="button"
          >
            <span>{item.label}</span>
            <span className="truncate text-sm font-black text-white">{item.currentLabel}</span>
          </button>
        );
      })}

      {openKey && activeMenu ? (
        <div
          className="se-subtle-scrollbar fixed z-40 max-h-[220px] overflow-y-auto rounded-2xl border border-white/10 bg-[#10141f]/98 p-1.5 shadow-2xl shadow-black/50 backdrop-blur-xl"
          ref={menuRef}
          style={{
            left: menuPosition.left,
            top: menuPosition.top,
            width: menuPosition.width,
          }}
        >
          {activeMenu.options.map((option) => {
            const isSelected = String(option.value) === String(value[openKey]);
            return (
              <button
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-bold transition ${
                  isSelected
                    ? "bg-[#ffb44d]/16 text-[#ffd08a]"
                    : "text-white/68 hover:bg-white/[.055] hover:text-white"
                }`}
                key={`${openKey}-${option.value}`}
                onClick={() => updateValue(openKey, option.value)}
                type="button"
              >
                <span>{option.label}</span>
                {isSelected ? <span className="text-[11px] uppercase tracking-[.12em] text-[#ffd08a]">set</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
