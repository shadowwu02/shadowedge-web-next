"use client";

import Image from "next/image";
import Link from "next/link";
import { activeBrand } from "@/config/brand";
import { useI18n, type DictionaryKey } from "@/i18n/useI18n";

type CtaItem = {
  href: string;
  key?: DictionaryKey;
  label?: string;
  primary?: boolean;
};

type DemoVideo = {
  bodyKey: DictionaryKey;
  href: string;
  poster: string;
  src: string;
  titleKey: DictionaryKey;
};

type FeatureCard = {
  bodyKey: DictionaryKey;
  href: string;
  kickerKey: DictionaryKey;
  titleKey: DictionaryKey;
};

type ModelCard = {
  bodyKey: DictionaryKey;
  badgeKey?: DictionaryKey;
  href: string;
  logoAlt: string;
  logoSrc: string;
  metaKeys: DictionaryKey[];
  title: string;
};

type ToolCard = {
  bodyKey: DictionaryKey;
  href: string;
  logoAlt: string;
  logoSrc: string;
  title: string;
};

const heroCtas: CtaItem[] = [
  { href: "/workspace/video", key: "home.createVideo", primary: true },
  { href: "/workspace/image", key: "home.createImage" },
  { href: "/workspace/video?tab=remake", key: "home.tryRemake" },
];

const goldHeroCtas: CtaItem[] = [
  { href: "/workspace/video", label: "Start Creating", primary: true },
  { href: "/workspace/image", label: "Explore AI Workspace" },
  { href: "/prompt-studio", label: "Open Prompt Studio" },
];

const goldFeatureCards = [
  {
    href: "/workspace/image",
    kicker: "Image",
    title: "AI Image Generation",
    body: "Compose polished stills, campaign assets, product concepts, and reference-guided visuals from one refined workspace.",
  },
  {
    href: "/workspace/video",
    kicker: "Video",
    title: "AI Video Generation",
    body: "Move from prompt or reference frames into cinematic short-form motion with model-aware controls.",
  },
  {
    href: "/prompt-studio",
    kicker: "Prompt",
    title: "Prompt Studio",
    body: "Shape reusable prompts for characters, scenes, products, and campaigns before sending them into production.",
  },
  {
    href: "/assets",
    kicker: "References",
    title: "Reference Media Workflow",
    body: "Keep key images, media cues, and creative context close at hand for more consistent AI output.",
  },
];

const goldWorkflowSteps = [
  {
    title: "Define the creative direction",
    body: "Start with a prompt, visual reference, or reusable prompt studio draft tailored to the outcome you need.",
  },
  {
    title: "Select the right AI path",
    body: "Choose image, video, prompt, or reference workflows with clear controls for the production moment.",
  },
  {
    title: "Review and continue",
    body: "Use project history and workspace recovery to keep polished outputs moving without losing context.",
  },
];

const demoVideos: DemoVideo[] = [
  {
    href: "/workspace/video",
    src: "/home/home-demo-video-1.mp4",
    poster: "/home/home-demo-poster-1.webp",
    titleKey: "home.demo.video1.title",
    bodyKey: "home.demo.video1.body",
  },
  {
    href: "/workspace/video",
    src: "/home/home-demo-video-2.mp4",
    poster: "/home/home-demo-poster-2.webp",
    titleKey: "home.demo.video2.title",
    bodyKey: "home.demo.video2.body",
  },
];

const hotModels: ModelCard[] = [
  {
    href: "/workspace/image",
    logoSrc: "/home/gpt-image-2.png",
    logoAlt: "GPT Image 2",
    title: "GPT Image 2",
    bodyKey: "home.model.gpt.body",
    badgeKey: "home.model.badgeNew",
    metaKeys: ["home.model.meta.image", "home.model.meta.textRendering", "home.model.meta.editing"],
  },
  {
    href: "/workspace/video",
    logoSrc: "/home/seedance.png",
    logoAlt: "Seedance",
    title: "Seedance 2.0",
    bodyKey: "home.model.seedance.body",
    badgeKey: "home.model.badgeNew",
    metaKeys: ["home.model.meta.video", "home.model.meta.imageToVideo", "home.model.meta.motion"],
  },
  {
    href: "/workspace/image",
    logoSrc: "/home/veo.png",
    logoAlt: "Nano Banana",
    title: "Nano Banana",
    bodyKey: "home.model.nano.body",
    badgeKey: "home.model.badgeHot",
    metaKeys: ["home.model.meta.image", "home.model.meta.fast", "home.model.meta.creatorPick"],
  },
];

const toolModels: ToolCard[] = [
  {
    href: "/workspace/video",
    logoSrc: "/home/kling.png",
    logoAlt: "Kling",
    title: "Kling Video",
    bodyKey: "home.tool.kling.body",
  },
  {
    href: "/workspace/video",
    logoSrc: "/home/veo.png",
    logoAlt: "Veo",
    title: "Veo 3.1 Lite",
    bodyKey: "home.tool.veo.body",
  },
  {
    href: "/workspace/video",
    logoSrc: "/home/wan.png",
    logoAlt: "Wan",
    title: "Wan 2.7 I2V",
    bodyKey: "home.tool.wan.body",
  },
  {
    href: "/workspace/video",
    logoSrc: "/home/grok.png",
    logoAlt: "Grok",
    title: "Grok Imagine Video",
    bodyKey: "home.tool.grok.body",
  },
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

const pricingPreview = [
  {
    nameKey: "pricing.plan.essential.name",
    price: "$9",
    creditsKey: "pricing.plan.essential.monthlyCredits",
    bodyKey: "pricing.plan.essential.recommended",
  },
  {
    nameKey: "pricing.plan.pro.name",
    price: "$29",
    creditsKey: "pricing.plan.pro.monthlyCredits",
    bodyKey: "pricing.plan.pro.recommended",
    featured: true,
  },
  {
    nameKey: "pricing.plan.studio.name",
    priceKey: "pricing.customPrice",
    creditsKey: "pricing.plan.studio.monthlyCredits",
    bodyKey: "pricing.plan.studio.recommended",
  },
] satisfies Array<{
  bodyKey: DictionaryKey;
  creditsKey: DictionaryKey;
  featured?: boolean;
  nameKey: DictionaryKey;
  price?: string;
  priceKey?: DictionaryKey;
}>;

const faqPreview = [
  { questionKey: "faq.q.credits", answerKey: "faq.a.credits" },
  { questionKey: "faq.q.references", answerKey: "faq.a.references" },
  { questionKey: "faq.q.remake", answerKey: "faq.a.remake" },
  { questionKey: "faq.q.canvas", answerKey: "faq.a.canvas" },
] satisfies Array<{ answerKey: DictionaryKey; questionKey: DictionaryKey }>;

function HomeCtaRow({ items, tone = "default" }: { items: CtaItem[]; tone?: "default" | "gold" }) {
  const { t } = useI18n();

  return (
    <div className="flex flex-wrap gap-3">
      {items.map((item) => (
        <Link
          className={
            tone === "gold"
              ? `inline-flex min-h-11 items-center justify-center rounded-[14px] border px-5 text-sm font-black transition ${
                  item.primary
                    ? "border-[#d9b56d] bg-[#d9b56d] text-[#10100e] shadow-[0_18px_45px_rgba(217,181,109,.18)] hover:bg-[#f2d899]"
                    : "border-[#d9b56d]/28 bg-[#12110f]/70 text-[#f2d899] hover:border-[#d9b56d]/54 hover:bg-[#d9b56d]/10"
                }`
              : `inline-flex min-h-11 items-center justify-center rounded-[14px] px-5 text-sm font-black transition ${
                  item.primary ? "se-button-primary" : "se-button-secondary"
                }`
          }
          href={item.href}
          key={item.href}
        >
          <span>{item.label || (item.key ? t(item.key) : "")}</span>
          <span className="ml-2" aria-hidden="true">
            {"->"}
          </span>
        </Link>
      ))}
    </div>
  );
}

function SectionHeader({
  ctaHref,
  ctaKey,
  ctaLabel,
  eyebrowKey,
  eyebrowText,
  subtitleKey,
  subtitleText,
  titleKey,
  titleText,
  tone = "default",
}: {
  ctaHref?: string;
  ctaKey?: DictionaryKey;
  ctaLabel?: string;
  eyebrowKey: DictionaryKey;
  eyebrowText?: string;
  subtitleKey: DictionaryKey;
  subtitleText?: string;
  titleKey: DictionaryKey;
  titleText?: string;
  tone?: "default" | "gold";
}) {
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
        <p className={tone === "gold" ? "text-xs font-black uppercase tracking-[.2em] text-[#d9b56d]" : "se-eyebrow"}>{eyebrowText || t(eyebrowKey)}</p>
        <h2 className="mt-3 text-3xl font-black leading-tight text-[#f4f4f4] md:text-4xl">{titleText || t(titleKey)}</h2>
        <p className="mt-3 text-base leading-7 text-[#b9b9b9]/72">{subtitleText || t(subtitleKey)}</p>
      </div>
      {ctaHref && ctaKey ? (
        <Link
          className={
            tone === "gold"
              ? "inline-flex min-h-10 shrink-0 items-center justify-center rounded-full border border-[#d9b56d]/28 bg-[#12110f]/70 px-4 text-sm font-black text-[#f2d899] transition hover:border-[#d9b56d]/54 hover:bg-[#d9b56d]/10"
              : "se-button-secondary inline-flex min-h-10 shrink-0 items-center justify-center rounded-full px-4 text-sm font-black"
          }
          href={ctaHref}
        >
          {ctaLabel || t(ctaKey)}
        </Link>
      ) : null}
    </div>
  );
}

function HeroMediaGrid({ tone = "default" }: { tone?: "default" | "gold" }) {
  const { t } = useI18n();
  const isGold = tone === "gold";

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {demoVideos.map((video) => (
        <Link
          className={
            isGold
              ? "group relative min-h-[340px] overflow-hidden rounded-[24px] border border-[#d9b56d]/16 bg-[#171614] shadow-2xl shadow-black/30 transition hover:-translate-y-0.5 hover:border-[#d9b56d]/38"
              : "group relative min-h-[340px] overflow-hidden rounded-[24px] border border-white/10 bg-[#33323a] shadow-2xl shadow-black/24 transition hover:-translate-y-0.5 hover:border-[#ffb44d]/34"
          }
          href={video.href}
          key={video.src}
        >
          <video
            aria-label={t(video.titleKey)}
            autoPlay
            className="absolute inset-0 h-full w-full object-cover brightness-[.72] transition duration-300 group-hover:scale-[1.025] group-hover:brightness-90"
            loop
            muted
            playsInline
            poster={video.poster}
            preload="metadata"
            src={video.src}
          >
            {t("home.demoVideoFallback")}
          </video>
          <div className="absolute inset-0 bg-gradient-to-t from-[#111217]/95 via-[#111217]/28 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 md:p-6">
            <h3 className="text-2xl font-black leading-tight text-[#f4f4f4]">{t(video.titleKey)}</h3>
            <p className="mt-3 text-sm leading-6 text-[#d6d6d6]/78">{t(video.bodyKey)}</p>
          </div>
        </Link>
      ))}

      <Link
        className={
          isGold
            ? "group relative overflow-hidden rounded-[24px] border border-[#d9b56d]/18 bg-[radial-gradient(circle_at_16%_18%,rgba(217,181,109,.13),transparent_34%),linear-gradient(135deg,#1b1813,#10100f)] p-6 transition hover:-translate-y-0.5 hover:border-[#d9b56d]/42 sm:col-span-2"
            : "group relative overflow-hidden rounded-[24px] border border-white/10 bg-[radial-gradient(circle_at_16%_18%,rgba(255,180,77,.10),transparent_34%),linear-gradient(135deg,#33323a,#1f2027)] p-6 transition hover:-translate-y-0.5 hover:border-[#ffb44d]/32 sm:col-span-2"
        }
        href="/workspace/canvas"
      >
        <div className="grid gap-5 sm:grid-cols-[58px_1fr_auto] sm:items-center">
          <div className={`grid size-14 place-items-center rounded-[18px] border text-2xl font-black shadow-xl shadow-black/20 ${isGold ? "border-[#d9b56d]/24 bg-[#12110f] text-[#d9b56d]" : "border-[#ffb44d]/20 bg-[#20212a] text-[#ffb44d]"}`}>
            *
          </div>
          <div>
            <p className={`text-[11px] font-black uppercase tracking-[.14em] ${isGold ? "text-[#d9b56d]" : "text-[#ffb44d]"}`}>{t("home.heroWorkflowLabel")}</p>
            <h3 className="mt-2 text-2xl font-black text-[#f4f4f4]">{t("home.heroWorkflowTitle")}</h3>
            <p className="mt-2 text-sm leading-6 text-[#b9b9b9]/72">{t("home.heroWorkflowBody")}</p>
          </div>
          <span className="hidden size-10 place-items-center rounded-full border border-white/10 bg-white/[.055] text-[#ffb44d] transition group-hover:bg-[#ffb44d] group-hover:text-[#080a0f] sm:grid">
            {"->"}
          </span>
        </div>
      </Link>
    </div>
  );
}

function HotModelCard({ model }: { model: ModelCard }) {
  const { t } = useI18n();

  return (
    <Link
      className="group relative flex min-h-[310px] flex-col justify-between overflow-hidden rounded-[26px] border border-white/10 bg-[#1f2027] p-5 transition hover:-translate-y-1 hover:border-[#ffb44d]/40 hover:shadow-2xl hover:shadow-black/28"
      href={model.href}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(255,180,77,.26),transparent_34%),radial-gradient(circle_at_82%_22%,rgba(111,183,200,.16),transparent_30%),linear-gradient(135deg,#22242d,#11141b)] opacity-90" />
      <div className="relative flex items-center justify-between gap-4">
        <div className="grid size-14 place-items-center overflow-hidden rounded-[18px] border border-white/20 bg-white/[.92] p-2">
          <Image alt={model.logoAlt} className="h-full w-full object-contain" height={72} src={model.logoSrc} width={72} />
        </div>
        {model.badgeKey ? (
          <span className="rounded-full bg-[#ffb44d] px-3 py-1.5 text-xs font-black text-[#080a0f]">{t(model.badgeKey)}</span>
        ) : null}
      </div>
      <div className="relative">
        <h3 className="text-3xl font-black leading-tight text-[#f4f4f4]">{model.title}</h3>
        <p className="mt-3 text-sm leading-6 text-[#d6d6d6]/78">{t(model.bodyKey)}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {model.metaKeys.map((key) => (
            <span className="rounded-full border border-white/10 bg-white/[.075] px-3 py-1.5 text-xs font-bold text-[#f4f4f4]/82" key={key}>
              {t(key)}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}

function ToolModelCard({ model }: { model: ToolCard }) {
  const { t } = useI18n();

  return (
    <Link
      className="grid min-h-[140px] grid-cols-[48px_1fr] gap-4 rounded-[22px] border border-white/10 bg-[#33323a]/82 p-5 transition hover:-translate-y-0.5 hover:border-[#ffb44d]/36"
      href={model.href}
    >
      <div className="grid size-12 place-items-center overflow-hidden rounded-[16px] border border-white/14 bg-white/[.92] p-2">
        <Image alt={model.logoAlt} className="h-full w-full object-contain" height={64} src={model.logoSrc} width={64} />
      </div>
      <div>
        <h3 className="text-lg font-black text-[#f4f4f4]">{model.title}</h3>
        <p className="mt-2 text-sm leading-6 text-[#b9b9b9]/70">{t(model.bodyKey)}</p>
      </div>
    </Link>
  );
}

export function HomePage() {
  const { t } = useI18n();
  const isGoldTide = activeBrand.id === "newbrand";

  return (
    <div
      className={
        isGoldTide
          ? "se-scrollbar h-full overflow-y-auto overflow-x-hidden bg-[radial-gradient(circle_at_18%_0%,rgba(217,181,109,.10),transparent_32%),linear-gradient(180deg,#11110f,#0b0c0d_42%,#12100e)]"
          : "se-scrollbar h-full overflow-y-auto overflow-x-hidden bg-[#2b2a31]"
      }
    >
      <div className="mx-auto w-full max-w-[1280px] px-3 pb-16 pt-10 md:px-6 md:pt-14">
        <section className="grid gap-8 pb-14 md:pb-20 xl:grid-cols-[48%_52%] xl:items-start">
          <div className="pt-2 md:pt-5">
            <p className={isGoldTide ? "text-xs font-black uppercase tracking-[.22em] text-[#d9b56d]" : "se-eyebrow"}>
              {isGoldTide ? activeBrand.name : t("home.heroEyebrow")}
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-black leading-[1.06] tracking-tight text-[#f4f4f4] md:text-6xl">
              {isGoldTide ? "Premium AI Creative Studio" : t("home.title")}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#b9b9b9]/82 md:text-xl">
              {isGoldTide ? "Create cinematic images, videos, and prompts with a refined AI workspace." : t("home.subtitle")}
            </p>
            <div className="mt-8">
              <HomeCtaRow items={isGoldTide ? goldHeroCtas : heroCtas} tone={isGoldTide ? "gold" : "default"} />
            </div>
            <div
              className={
                isGoldTide
                  ? "mt-7 rounded-[24px] border border-[#d9b56d]/18 bg-[#d9b56d]/8 p-4"
                  : "mt-7 rounded-[24px] border border-[#ffb44d]/18 bg-[#ffb44d]/8 p-4"
              }
            >
              <p className="text-sm leading-6 text-[#f4f4f4]/78">
                {isGoldTide
                  ? "A premium creative desk for image generation, cinematic motion, prompt refinement, and reference-led production."
                  : t("home.betaNotice")}
              </p>
            </div>
          </div>

          <HeroMediaGrid tone={isGoldTide ? "gold" : "default"} />
        </section>

        <section className="py-10 md:py-14">
          <SectionHeader
            ctaHref="/models"
            ctaKey="home.viewModels"
            ctaLabel={isGoldTide ? "Explore Models" : undefined}
            eyebrowKey="home.popularModelsEyebrow"
            eyebrowText={isGoldTide ? "Studio models" : undefined}
            subtitleKey="home.popularModelsSubtitle"
            subtitleText={isGoldTide ? "Choose a creative engine for polished stills, short-form motion, and refined campaign concepts." : undefined}
            titleKey="home.popularModelsTitle"
            titleText={isGoldTide ? "Start from a premium AI model set" : undefined}
            tone={isGoldTide ? "gold" : "default"}
          />

          <div className="mt-8 grid gap-5 lg:grid-cols-[1.15fr_1fr_1fr]">
            {hotModels.map((model) => (
              <HotModelCard key={model.title} model={model} />
            ))}
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {toolModels.map((model) => (
              <ToolModelCard key={model.title} model={model} />
            ))}
          </div>
        </section>

        <section className="py-10 md:py-14">
          <SectionHeader
            eyebrowKey="home.featuresTitle"
            eyebrowText={isGoldTide ? "Creative capabilities" : undefined}
            subtitleKey="home.capabilitiesSubtitle"
            subtitleText={isGoldTide ? "A focused public studio for image, video, prompt, and reference-media workflows." : undefined}
            titleKey="home.capabilitiesTitle"
            titleText={isGoldTide ? "Built for refined AI production" : undefined}
            tone={isGoldTide ? "gold" : "default"}
          />

          {isGoldTide ? (
            <div className="mt-8 grid gap-5 md:grid-cols-2">
              {goldFeatureCards.map((feature) => (
                <Link
                  className="relative min-h-[220px] overflow-hidden rounded-[24px] border border-[#d9b56d]/16 bg-[linear-gradient(135deg,#181715,#10100f)] p-6 transition hover:-translate-y-0.5 hover:border-[#d9b56d]/38 hover:shadow-2xl hover:shadow-black/30"
                  href={feature.href}
                  key={feature.title}
                >
                  <div className="mb-5 grid size-14 place-items-center rounded-[18px] border border-[#d9b56d]/20 bg-[#0d0d0c] text-xl font-black text-[#d9b56d]">
                    +
                  </div>
                  <p className="text-[11px] font-black uppercase tracking-[.14em] text-[#d9b56d]">{feature.kicker}</p>
                  <h3 className="mt-3 text-xl font-black text-[#f4f4f4]">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#b9b9b9]/72">{feature.body}</p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {featureCards.map((feature) => (
                <Link
                  className="se-card-interactive relative min-h-[220px] overflow-hidden rounded-[24px] p-6"
                  href={feature.href}
                  key={feature.titleKey}
                >
                  <div className="mb-5 grid size-14 place-items-center rounded-[18px] border border-white/10 bg-[#20212a] text-xl font-black text-[#ffb44d]">
                    +
                  </div>
                  <p className="text-[11px] font-black uppercase tracking-[.14em] text-[#ffcf83]">{t(feature.kickerKey)}</p>
                  <h3 className="mt-3 text-xl font-black text-[#f4f4f4]">{t(feature.titleKey)}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#b9b9b9]/72">{t(feature.bodyKey)}</p>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="py-10 md:py-14">
          <SectionHeader
            eyebrowKey="home.workflowTitle"
            eyebrowText={isGoldTide ? "Creative flow" : undefined}
            subtitleKey="home.workflowSubtitle"
            subtitleText={isGoldTide ? "Move from direction to model choice to review without leaving the Gold-Tide workspace." : undefined}
            titleKey="home.workflowLegacyTitle"
            titleText={isGoldTide ? "A calmer path from idea to polished output" : undefined}
            tone={isGoldTide ? "gold" : "default"}
          />
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {isGoldTide
              ? goldWorkflowSteps.map((step, index) => (
                  <article className="rounded-[24px] border border-[#d9b56d]/16 bg-[#171614]/82 p-6" key={step.title}>
                    <span className="grid size-10 place-items-center rounded-full bg-[#d9b56d] text-sm font-black text-[#10100e]">
                      {index + 1}
                    </span>
                    <h3 className="mt-5 text-xl font-black text-[#f4f4f4]">{step.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-[#b9b9b9]/72">{step.body}</p>
                  </article>
                ))
              : workflowSteps.map((step, index) => (
                  <article className="rounded-[24px] border border-white/10 bg-[#33323a]/82 p-6" key={step.titleKey}>
                    <span className="grid size-10 place-items-center rounded-full bg-[#ffb44d] text-sm font-black text-[#080a0f]">
                      {index + 1}
                    </span>
                    <h3 className="mt-5 text-xl font-black text-[#f4f4f4]">{t(step.titleKey)}</h3>
                    <p className="mt-3 text-sm leading-6 text-[#b9b9b9]/72">{t(step.bodyKey)}</p>
                  </article>
                ))}
          </div>
        </section>

        <section className="py-10 md:py-14">
          <SectionHeader
            ctaHref="/pricing"
            ctaKey="home.viewPricing"
            ctaLabel={isGoldTide ? "View Plans" : undefined}
            eyebrowKey="home.pricingPreviewEyebrow"
            eyebrowText={isGoldTide ? "Gold-Tide AI Plans" : undefined}
            subtitleKey="home.pricingPreviewSubtitle"
            subtitleText={isGoldTide ? "Flexible credits for image, video, and prompt creation while checkout setup is finalized." : undefined}
            titleKey="home.pricingPreviewTitle"
            titleText={isGoldTide ? "Plans shaped for premium AI creation" : undefined}
            tone={isGoldTide ? "gold" : "default"}
          />
          <div className={isGoldTide ? "mt-8 grid gap-5 rounded-[28px] border border-[#d9b56d]/12 bg-[#11100e] p-4 md:grid-cols-3 md:p-6" : "mt-8 grid gap-5 rounded-[28px] bg-[#16171c] p-4 md:grid-cols-3 md:p-6"}>
            {pricingPreview.map((plan) => (
              <article
                className={
                  isGoldTide
                    ? `rounded-[22px] border p-5 ${
                        plan.featured ? "border-[#d9b56d]/70 bg-[#181613]" : "border-white/10 bg-[#171614]/78"
                      }`
                    : `rounded-[22px] border p-5 ${plan.featured ? "border-[#ffb44d]/70 bg-[#1f2027]" : "border-white/10 bg-[#1f2027]/78"}`
                }
                key={plan.nameKey}
              >
                <p className="text-lg font-black text-[#f4f4f4]">{t(plan.nameKey)}</p>
                <p className="mt-4 text-4xl font-black text-[#f4f4f4]">{plan.priceKey ? t(plan.priceKey) : plan.price}</p>
                <p className={isGoldTide ? "mt-3 rounded-[14px] border border-[#d9b56d]/18 bg-[#d9b56d]/8 px-3 py-2 text-sm font-black text-[#f2d899]" : "mt-3 rounded-[14px] border border-[#ffb44d]/16 bg-[#ffb44d]/8 px-3 py-2 text-sm font-black text-[#ffd08a]"}>
                  {t(plan.creditsKey)}
                </p>
                <p className="mt-4 text-sm leading-6 text-[#b9b9b9]/72">{t(plan.bodyKey)}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-5 py-10 md:py-14 lg:grid-cols-[1fr_.9fr]">
          <div>
            <SectionHeader
              ctaHref="/faq"
              ctaKey="home.viewFaq"
              eyebrowKey="home.faqPreviewEyebrow"
              subtitleKey="home.faqPreviewSubtitle"
              titleKey="home.faqPreviewTitle"
            />
            <div className="mt-8 grid gap-4">
              {faqPreview.map((item, index) => (
                <article className="rounded-[22px] border border-white/10 bg-[#33323a]/82 p-5" key={item.questionKey}>
                  <p className="text-sm font-black text-[#ffcf83]">0{index + 1}</p>
                  <h3 className="mt-2 text-lg font-black text-[#f4f4f4]">{t(item.questionKey)}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#b9b9b9]/72">{t(item.answerKey)}</p>
                </article>
              ))}
            </div>
          </div>

          <aside className={isGoldTide ? "rounded-[28px] border border-[#d9b56d]/18 bg-[#171614] p-6 lg:sticky lg:top-4 lg:self-start" : "rounded-[28px] border border-[#ffb44d]/18 bg-[#33323a] p-6 lg:sticky lg:top-4 lg:self-start"}>
            <p className={isGoldTide ? "text-xs font-black uppercase tracking-[.2em] text-[#d9b56d]" : "se-eyebrow"}>{isGoldTide ? "Start creating" : t("home.startCreating")}</p>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#f4f4f4]">{isGoldTide ? "Open your Gold-Tide AI workspace" : t("home.ctaTitle")}</h2>
            <p className="mt-3 text-sm leading-6 text-[#b9b9b9]/72">
              {isGoldTide ? "Create images, video concepts, and prompt systems from one premium creative desk." : t("home.ctaSubtitle")}
            </p>
            <div className="mt-6">
              <HomeCtaRow
                items={
                  isGoldTide
                    ? [
                        { href: "/workspace/video", label: "Create Video", primary: true },
                        { href: "/prompt-studio", label: "Prompt Studio" },
                        { href: "/history", label: "Project History" },
                      ]
                    : [
                        { href: "/workspace/video", key: "home.createVideo", primary: true },
                        { href: "/workspace/canvas", key: "home.openCanvas" },
                        { href: "/history", key: "home.openHistory" },
                      ]
                }
                tone={isGoldTide ? "gold" : "default"}
              />
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}
