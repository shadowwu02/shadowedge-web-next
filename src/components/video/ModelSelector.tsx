"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n/useI18n";
import { getVideoModelLogo } from "@/lib/video/modelLogoMap";
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

function getModelInitials(model: VideoModel | undefined) {
  const label = model?.label || "AI";
  return label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function ModelLogo({ model, size = 24 }: { model: VideoModel | undefined; size?: number }) {
  const logo = getVideoModelLogo(getModelLogoLookup(model));
  const label = model?.label || "Video model";

  return (
    <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-2xl border border-[#33323a]/65 bg-[#111318] text-[10px] font-black text-[#b9b9b9]/70">
      {logo ? <Image alt={`${label} logo`} className="h-auto w-auto object-contain" height={size} src={logo} width={size} /> : getModelInitials(model)}
    </span>
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
        className="flex min-h-14 w-full items-center justify-between gap-3 rounded-[22px] border border-white/10 bg-white/[.055] px-3 py-2 text-left transition hover:border-[#ffb44d]/32 hover:bg-white/[.075]"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span className="flex min-w-0 items-center gap-3">
          <ModelLogo model={selected} />
          <span className="min-w-0">
            <span className="block text-[11px] font-bold text-white/48">{t("video.params.model")}</span>
            <span className="mt-0.5 block truncate text-sm font-black text-white">{selected?.label || t("video.model.select")}</span>
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-[#ffb44d]/14 px-2.5 py-1 text-[11px] font-bold text-[#ffd08a]">
            {selected?.credits === undefined ? "--" : tf("video.model.creditsShort", { credits: selected.credits })}
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
                <span className="grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3">
                  <ModelLogo model={model} size={22} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black text-white">{model.label}</span>
                    <span className="mt-0.5 block truncate text-xs text-white/42">
                      {getLocalizedModelDescription(model.desc, t) || model.providerModel}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-white/[.055] px-2 py-1 text-[10px] font-black text-white/52">
                    {tf("video.model.creditsShort", { credits: model.credits })}
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
