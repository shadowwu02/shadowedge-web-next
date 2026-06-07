"use client";

import { useEffect, useRef, useState } from "react";
import type { VideoModel } from "@/types/video";

export function ModelSelector({
  models,
  selectedModelId,
  onChange,
}: {
  models: VideoModel[];
  selectedModelId?: string;
  onChange: (model: VideoModel) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLElement | null>(null);
  const selected = models.find((model) => model.id === selectedModelId) || models[0];

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (!target || rootRef.current?.contains(target)) return;
      setIsOpen(false);
    }

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  return (
    <section className="relative" ref={rootRef}>
      <button
        aria-expanded={isOpen}
        className="flex min-h-14 w-full items-center justify-between gap-3 rounded-[22px] border border-white/10 bg-white/[.055] px-3 py-2 text-left transition hover:border-[#ffb44d]/32 hover:bg-white/[.075]"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span className="min-w-0">
          <span className="block text-[11px] font-bold text-white/48">Model</span>
          <span className="mt-0.5 block truncate text-sm font-black text-white">{selected?.label || "Select model"}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-[#ffb44d]/14 px-2.5 py-1 text-[11px] font-bold text-[#ffd08a]">
            {selected?.credits ?? "--"} credits
          </span>
          <span className="text-lg leading-none text-white/40">›</span>
        </span>
      </button>

      {isOpen ? (
        <div className="se-scrollbar absolute left-0 right-0 top-[calc(100%+8px)] z-40 max-h-72 overflow-y-auto rounded-[22px] border border-white/10 bg-[#10141f]/98 p-2 shadow-2xl shadow-black/45 backdrop-blur-xl">
          {models.map((model) => {
            const isSelected = model.id === selected?.id;
            return (
              <button
                className={`w-full rounded-2xl border px-3 py-2.5 text-left transition ${
                  isSelected
                    ? "border-[#ffb44d]/42 bg-[#ffb44d]/12"
                    : "border-transparent hover:border-white/10 hover:bg-white/[.055]"
                }`}
                key={model.id}
                onClick={() => {
                  onChange(model);
                  setIsOpen(false);
                }}
                type="button"
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black text-white">{model.label}</span>
                    <span className="mt-0.5 block truncate text-xs text-white/42">{model.desc || model.providerModel}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-white/[.055] px-2 py-1 text-[10px] font-black text-white/52">
                    {model.credits} cr
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
