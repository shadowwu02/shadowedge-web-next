"use client";

import Image from "next/image";
import Link from "next/link";
import { useI18n, type DictionaryKey } from "@/i18n/useI18n";

type CtaItem = {
  href: string;
  key: DictionaryKey;
  primary?: boolean;
};

type FeatureCard = {
  bodyKey: DictionaryKey;
  href: string;
  kickerKey: DictionaryKey;
  titleKey: DictionaryKey;
};

type ModelLogo = {
  alt: string;
  src: string;
};

const heroCtas: CtaItem[] = [
  { href: "/workspace/video", key: "home.createVideo", primary: true },
  { href: "/workspace/image", key: "home.createImage" },
  { href: "/workspace/video?tab=remake", key: "home.tryRemake" },
];

const featureCards: FeatureCard[] = [
  {
    href: "/workspace/image",
    kickerKey: "home.feature.image.kicker",
    titleKey: "home.feature.image.title",
    bodyKey: "home.feature.image.body",
  },
  {
    href: "/workspace/video",
    kickerKey: "home.feature.video.kicker",
    titleKey: "home.feature.video.title",
    bodyKey: "home.feature.video.body",
  },
  {
    href: "/workspace/video?tab=remake",
    kickerKey: "home.feature.remake.kicker",
    titleKey: "home.feature.remake.title",
    bodyKey: "home.feature.remake.body",
  },
  {
    href: "/workspace/canvas",
    kickerKey: "home.feature.canvas.kicker",
    titleKey: "home.feature.canvas.title",
    bodyKey: "home.feature.canvas.body",
  },
  {
    href: "/history",
    kickerKey: "home.feature.history.kicker",
    titleKey: "home.feature.history.title",
    bodyKey: "home.feature.history.body",
  },
  {
    href: "/models",
    kickerKey: "home.feature.models.kicker",
    titleKey: "home.feature.models.title",
    bodyKey: "home.feature.models.body",
  },
];

const workflowSteps: Array<{ bodyKey: DictionaryKey; titleKey: DictionaryKey }> = [
  { titleKey: "home.workflow.step1.title", bodyKey: "home.workflow.step1.body" },
  { titleKey: "home.workflow.step2.title", bodyKey: "home.workflow.step2.body" },
  { titleKey: "home.workflow.step3.title", bodyKey: "home.workflow.step3.body" },
];

const modelLogos: ModelLogo[] = [
  { alt: "GPT Image 2", src: "/home/gpt-image-2.png" },
  { alt: "Seedance", src: "/home/seedance.png" },
  { alt: "Google Veo", src: "/home/veo.png" },
  { alt: "Kling", src: "/home/kling.png" },
  { alt: "Wan", src: "/home/wan.png" },
  { alt: "Grok", src: "/home/grok.png" },
];

function HomeCtaRow({ items }: { items: CtaItem[] }) {
  const { t } = useI18n();

  return (
    <div className="flex flex-wrap gap-2.5">
      {items.map((item) => (
        <Link
          className={`inline-flex min-h-11 items-center justify-center rounded-[18px] px-4 text-sm font-black transition ${
            item.primary ? "se-button-primary" : "se-button-secondary"
          }`}
          href={item.href}
          key={item.href}
        >
          <span>{t(item.key)}</span>
          <span className="ml-2" aria-hidden="true">
            {"->"}
          </span>
        </Link>
      ))}
    </div>
  );
}

function HeroPreview() {
  const { t } = useI18n();

  return (
    <div className="relative min-h-[520px] overflow-hidden rounded-[34px] border border-white/10 bg-[#0c0f16] p-4 shadow-2xl shadow-black/35 md:p-5">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(255,180,77,.22),transparent_32%),radial-gradient(circle_at_82%_22%,rgba(111,183,200,.18),transparent_30%),linear-gradient(135deg,rgba(255,255,255,.05),transparent_52%)]" />
      <div className="relative grid h-full gap-4 md:grid-cols-[1.05fr_.95fr]">
        <section className="flex min-h-[430px] flex-col justify-between overflow-hidden rounded-[28px] border border-white/10 bg-[#111318]/84 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="se-eyebrow">{t("home.demoTitle")}</p>
              <h2 className="mt-2 text-xl font-black text-[#f4f4f4]">{t("home.demoPanelTitle")}</h2>
            </div>
            <span className="rounded-full border border-[#ffb44d]/24 bg-[#ffb44d]/10 px-3 py-1.5 text-[11px] font-black text-[#ffd08a]">
              {t("home.demoLive")}
            </span>
          </div>

          <div className="mt-5 grid flex-1 place-items-center rounded-[24px] border border-white/8 bg-[radial-gradient(circle_at_center,rgba(255,180,77,.22),transparent_36%),linear-gradient(145deg,#1d2028,#080a0f)] p-6">
            <div className="relative aspect-[4/5] w-full max-w-[320px] overflow-hidden rounded-[30px] border border-white/12 bg-[#05070b] shadow-2xl shadow-black/40">
              <div className="absolute inset-x-7 top-8 h-20 rounded-full bg-[#ffb44d]/24 blur-3xl" />
              <div className="absolute inset-x-6 bottom-8 h-24 rounded-full bg-[#6fb7c8]/18 blur-3xl" />
              <div className="relative flex h-full flex-col justify-end p-5">
                <div className="rounded-[24px] border border-white/12 bg-white/[.055] p-4 backdrop-blur">
                  <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#ffcf83]">
                    {t("home.previewShotLabel")}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#f4f4f4]/76">{t("home.previewShotText")}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside className="grid gap-4">
          <section className="rounded-[28px] border border-white/10 bg-[#151820]/84 p-4">
            <p className="se-eyebrow">{t("home.demoModels")}</p>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {modelLogos.map((logo) => (
                <div
                  className="grid aspect-square place-items-center rounded-[20px] border border-white/10 bg-white/[.92] p-3"
                  key={logo.src}
                >
                  <Image alt={logo.alt} className="h-full w-full object-contain" height={80} src={logo.src} width={80} />
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-white/10 bg-[#151820]/84 p-4">
            <p className="se-eyebrow">{t("home.demoPipeline")}</p>
            <div className="mt-4 space-y-3">
              {workflowSteps.map((step, index) => (
                <div className="flex gap-3 rounded-[20px] border border-white/8 bg-[#05070b]/46 p-3" key={step.titleKey}>
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#ffb44d] text-xs font-black text-[#080a0f]">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-black text-[#f4f4f4]">{t(step.titleKey)}</p>
                    <p className="mt-1 text-xs leading-5 text-[#b9b9b9]/68">{t(step.bodyKey)}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

export function HomePage() {
  const { t } = useI18n();

  return (
    <div className="se-scrollbar h-full overflow-y-auto overflow-x-hidden">
      <div className="mx-auto flex min-h-full w-full max-w-[1480px] flex-col gap-5 pb-5">
        <section className="grid gap-5 xl:grid-cols-[minmax(0,.92fr)_minmax(560px,1fr)]">
          <div className="se-panel flex min-h-[520px] flex-col justify-between rounded-[34px] p-5 md:p-7">
            <div>
              <p className="se-eyebrow">{t("home.heroEyebrow")}</p>
              <h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight tracking-tight text-[#f4f4f4] md:text-6xl">
                {t("home.title")}
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-[#b9b9b9]/74 md:text-lg">{t("home.subtitle")}</p>
            </div>

            <div className="mt-8 space-y-5">
              <HomeCtaRow items={heroCtas} />
              <div className="rounded-[24px] border border-[#ffb44d]/18 bg-[#ffb44d]/8 p-4">
                <p className="text-sm leading-6 text-[#f4f4f4]/78">{t("home.betaNotice")}</p>
              </div>
            </div>
          </div>

          <HeroPreview />
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="se-card-quiet rounded-[30px] p-5 md:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="se-eyebrow">{t("home.featuresTitle")}</p>
                <h2 className="mt-2 text-2xl font-black text-[#f4f4f4] md:text-3xl">{t("home.featuresSubtitle")}</h2>
              </div>
              <HomeCtaRow
                items={[
                  { href: "/models", key: "home.viewModels" },
                  { href: "/pricing", key: "home.viewPricing" },
                ]}
              />
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {featureCards.map((feature) => (
                <Link
                  className="se-card-interactive min-h-[180px] rounded-[26px] p-5"
                  href={feature.href}
                  key={feature.titleKey}
                >
                  <p className="text-[10px] font-black uppercase tracking-[.14em] text-[#ffcf83]">{t(feature.kickerKey)}</p>
                  <h3 className="mt-3 text-lg font-black text-[#f4f4f4]">{t(feature.titleKey)}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#b9b9b9]/70">{t(feature.bodyKey)}</p>
                </Link>
              ))}
            </div>
          </div>

          <aside className="se-card-quiet rounded-[30px] p-5 md:p-6">
            <p className="se-eyebrow">{t("home.workflowTitle")}</p>
            <h2 className="mt-2 text-2xl font-black text-[#f4f4f4]">{t("home.workflowSubtitle")}</h2>
            <div className="mt-5 space-y-3">
              {workflowSteps.map((step, index) => (
                <div className="rounded-[22px] border border-white/8 bg-[#05070b]/40 p-4" key={step.titleKey}>
                  <div className="flex items-center gap-3">
                    <span className="grid size-8 place-items-center rounded-full bg-[#ffb44d] text-xs font-black text-[#080a0f]">
                      {index + 1}
                    </span>
                    <p className="text-sm font-black text-[#f4f4f4]">{t(step.titleKey)}</p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[#b9b9b9]/68">{t(step.bodyKey)}</p>
                </div>
              ))}
            </div>
          </aside>
        </section>

        <section className="rounded-[30px] border border-[#ffb44d]/18 bg-[#ffb44d]/8 p-5 md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="se-eyebrow">{t("home.startCreating")}</p>
              <h2 className="mt-2 text-2xl font-black text-[#f4f4f4]">{t("home.ctaTitle")}</h2>
              <p className="mt-2 text-sm leading-6 text-[#f4f4f4]/72">{t("home.ctaSubtitle")}</p>
            </div>
            <HomeCtaRow
              items={[
                { href: "/workspace/canvas", key: "home.openCanvas", primary: true },
                { href: "/history", key: "home.openHistory" },
                { href: "/models", key: "home.viewModels" },
              ]}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
