"use client";

import { useI18n } from "@/i18n/useI18n";

export function VideoHowItWorks({ modelName }: { modelName?: string }) {
  const { t, tf } = useI18n();
  const steps = [
    {
      body: t("video.guide.step1.body"),
      title: t("video.guide.step1.title"),
    },
    {
      body: t("video.guide.step2.body"),
      title: t("video.guide.step2.title"),
    },
    {
      body: t("video.guide.step3.body"),
      title: t("video.guide.step3.title"),
    },
    {
      body: t("video.guide.step4.body"),
      title: t("video.guide.step4.title"),
    },
  ];
  const tips = [
    t("video.guide.tip.references"),
    t("video.guide.tip.startEnd"),
    t("video.guide.tip.reuse"),
    t("video.guide.tip.history"),
  ];

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[30px] border border-white/10 bg-white/[.04] p-3 shadow-2xl shadow-black/18">
      <div className="mb-3 flex-none border-b border-white/10 pb-3">
        <p className="text-[11px] font-black uppercase tracking-[.18em] text-[#ffcf83]">{t("video.guide.title")}</p>
        <h2 className="mt-1 text-sm font-black text-white">{tf("video.guide.subtitle", { model: modelName || t("video.model.current") })}</h2>
      </div>

      <div className="se-scrollbar min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="grid gap-3">
          {steps.map((step, index) => (
            <article className="rounded-[22px] border border-white/10 bg-black/20 p-3" key={step.title}>
              <div className="flex gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-2xl border border-[#ffb44d]/28 bg-[#ffb44d]/12 text-xs font-black text-[#ffd08a]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-[#f4f4f4]">{step.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-[#b9b9b9]">{step.body}</p>
                </div>
              </div>
            </article>
          ))}

          <div className="rounded-[22px] border border-[#ffb44d]/20 bg-[#ffb44d]/10 p-3">
            <h3 className="text-xs font-black uppercase tracking-[.16em] text-[#ffd08a]">{t("video.guide.tips.title")}</h3>
            <ul className="mt-2 grid gap-2 text-xs leading-5 text-[#f4f4f4]/72">
              {tips.map((tip) => (
                <li className="flex gap-2" key={tip}>
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#ffb44d]" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
