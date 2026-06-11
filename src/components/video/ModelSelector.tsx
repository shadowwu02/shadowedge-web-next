"use client";

import { useEffect, useRef, useState } from "react";
import { VideoModelLogo } from "@/components/video/VideoModelLogo";
import { useI18n } from "@/i18n/useI18n";
import type { VideoModel } from "@/types/video";

function getLocalizedModelDescription(description: string | undefined, t: ReturnType<typeof useI18n>["t"]) {
  if (description === "General video generation model. Replace with live model registry when available.") {
    return t("video.model.fallbackSeedanceDescription");
  }

  if (description === "Cinematic video model placeholder.") {
    return t("video.model.fallbackVeoDescription");
  }

  return description || "";
}

function getModelLogoLookup(model: VideoModel | undefined) {
  if (!model) return "";
  return [model.id, model.providerModel, model.provider, model.label].filter(Boolean).join(" ");
}

function ChevronIcon() {
  return (
    <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 24 24">
      <path d="m8 10 4 4 4-4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

export function ModelSelector({
  models,
  selectedModelId,
  onChange,
}: {
  models: VideoModel[];
  selectedModelId?: string;
  onChange: (model: VideoModel) => void;
}) {
  const { t, tf } = useI18n();
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
        className="se-control group flex min-h-[62px] w-full items-center justify-between gap-3 rounded-[24px] px-3.5 py-2.5 text-left shadow-inner shadow-black/10"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span className="flex min-w-0 items-center gap-3">
          <VideoModelLogo label={selected?.label} lookup={getModelLogoLookup(selected)} size="lg" />
          <span className="min-w-0">
            <span className="block text-[11px] font-medium text-[#b9b9b9]/56">{t("video.params.model")}</span>
            <span className="mt-0.5 block truncate text-sm font-semibold text-[#f4f4f4]">{selected?.label || t("video.model.select")}</span>
          </span>
        </span>
        <span className="grid size-8 shrink-0 place-items-center rounded-full border border-[rgba(244,244,244,0.08)] bg-[#111318]/72 text-[#b9b9b9]/55 transition-colors group-hover:border-[#ffb44d]/24 group-hover:text-[#ffd08a]">
          <ChevronIcon />
        </span>
      </button>

      {isOpen ? (
        <div className="se-scrollbar se-card-quiet absolute left-0 right-0 top-[calc(100%+8px)] z-40 max-h-72 overflow-y-auto rounded-[22px] p-2 shadow-2xl shadow-black/45 backdrop-blur-xl">
          {models.map((model) => {
            const isSelected = model.id === selected?.id;
            return (
              <button
                className={`w-full rounded-[16px] border px-3 py-2.5 text-left transition-colors ${
                  isSelected
                    ? "border-[#ffb44d]/34 bg-[#ffb44d]/12"
                    : "border-transparent hover:border-[rgba(244,244,244,0.08)] hover:bg-[#1a1c22]/72"
                }`}
                key={model.id}
                onClick={() => {
                  onChange(model);
                  setIsOpen(false);
                }}
                type="button"
              >
                <span className="grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3">
                  <VideoModelLogo label={model.label} lookup={getModelLogoLookup(model)} size="lg" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-[#f4f4f4]">{model.label}</span>
                    <span className="mt-0.5 block truncate text-xs text-[#b9b9b9]/52">
                      {getLocalizedModelDescription(model.desc, t) || model.providerModel}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full border border-[rgba(244,244,244,0.07)] bg-[#05070b]/60 px-2 py-1 text-[10px] font-medium text-[#b9b9b9]/42">
                    {tf("video.model.creditsFrom", { credits: model.credits })}
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
