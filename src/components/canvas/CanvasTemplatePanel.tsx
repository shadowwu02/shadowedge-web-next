"use client";

import type { CanvasTemplate, CanvasTemplateId } from "@/components/canvas/canvasTypes";
import { useI18n } from "@/i18n/useI18n";

export const canvasTemplates: CanvasTemplate[] = [
  {
    id: "short-video",
    index: "01",
    titleKey: "canvas.template.shortVideo.title",
    descriptionKey: "canvas.template.shortVideo.description",
    promptKey: "canvas.template.shortVideo.prompt",
    image: { model: "Auto", ratio: "9:16", quality: "standard" },
    video: { model: "Seedance 2.0", duration: 5, ratio: "9:16", quality: "standard", resolution: "720p" },
  },
  {
    id: "anime-shot",
    index: "02",
    titleKey: "canvas.template.animeShot.title",
    descriptionKey: "canvas.template.animeShot.description",
    promptKey: "canvas.template.animeShot.prompt",
    image: { model: "Seedream", ratio: "16:9", quality: "style" },
    video: { model: "Seedance 2.0", duration: 5, ratio: "16:9", quality: "standard", resolution: "720p" },
  },
  {
    id: "movie-scene",
    index: "03",
    titleKey: "canvas.template.movieScene.title",
    descriptionKey: "canvas.template.movieScene.description",
    promptKey: "canvas.template.movieScene.prompt",
    image: { model: "GPT Image 2", ratio: "16:9", quality: "cinematic" },
    video: { model: "Google Veo", duration: 8, ratio: "16:9", quality: "premium", resolution: "1080p" },
  },
  {
    id: "product-video",
    index: "04",
    titleKey: "canvas.template.productVideo.title",
    descriptionKey: "canvas.template.productVideo.description",
    promptKey: "canvas.template.productVideo.prompt",
    image: { model: "Nano Banana", ratio: "1:1", quality: "product" },
    video: { model: "Seedance 2.0", duration: 5, ratio: "1:1", quality: "standard", resolution: "720p" },
  },
];

type CanvasTemplatePanelProps = {
  onApply: (templateId: CanvasTemplateId) => void;
};

export function CanvasTemplatePanel({ onApply }: CanvasTemplatePanelProps) {
  const { t } = useI18n();

  return (
    <section className="se-card rounded-[28px] p-4 md:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="se-eyebrow">{t("canvas.templates")}</p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-[#f7f3ea]">{t("canvas.templatesTitle")}</h2>
        </div>
        <p className="max-w-xl text-xs leading-5 text-[#d6d0c4]/58">{t("canvas.templatesHint")}</p>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {canvasTemplates.map((template) => (
          <article
            className="rounded-[22px] border border-[rgba(244,244,244,0.09)] bg-[#0f1117]/82 p-4 transition hover:border-[#ffb44d]/28 hover:bg-[#15130f]"
            key={template.id}
          >
            <span className="text-[11px] font-bold uppercase tracking-[.18em] text-[#ffcf83]">{template.index}</span>
            <h3 className="mt-3 text-sm font-semibold text-[#f7f3ea]">{t(template.titleKey)}</h3>
            <p className="mt-2 min-h-[54px] text-xs leading-5 text-[#d6d0c4]/62">{t(template.descriptionKey)}</p>
            <button
              className="se-button-secondary mt-4 w-full justify-center rounded-2xl px-3 py-2.5 text-xs font-semibold"
              onClick={() => onApply(template.id)}
              type="button"
            >
              {t("canvas.applyTemplate")}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
