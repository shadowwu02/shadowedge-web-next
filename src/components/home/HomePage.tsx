"use client";

import Image from "next/image";
import Link from "next/link";
import { useI18n, type DictionaryKey } from "@/i18n/useI18n";

type CtaItem = {
  href: string;
  key: DictionaryKey;
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

function HomeCtaRow({ items }: { items: CtaItem[] }) {
  const { t } = useI18n();

  return (
    <div className="flex flex-wrap gap-3">
      {items.map((item) => (
        <Link
          className={`inline-flex min-h-11 items-center justify-center rounded-[14px] px-5 text-sm font-black transition ${
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

function SectionHeader({
  ctaHref,
  ctaKey,
  eyebrowKey,
  subtitleKey,
  titleKey,
}: {
  ctaHref?: string;
  ctaKey?: DictionaryKey;
  eyebrowKey: DictionaryKey;
  subtitleKey: DictionaryKey;
  titleKey: DictionaryKey;
}) {
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
        <p className="se-eyebrow">{t(eyebrowKey)}</p>
        <h2 className="mt-3 text-3xl font-black leading-tight text-[#f4f4f4] md:text-4xl">{t(titleKey)}</h2>
        <p className="mt-3 text-base leading-7 text-[#b9b9b9]/72">{t(subtitleKey)}</p>
      </div>
      {ctaHref && ctaKey ? (
        <Link className="se-button-secondary inline-flex min-h-10 shrink-0 items-center justify-center rounded-full px-4 text-sm font-black" href={ctaHref}>
          {t(ctaKey)}
        </Link>
      ) : null}
    </div>
  );
}

function HeroMediaGrid() {
  const { t } = useI18n();

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {demoVideos.map((video) => (
        <Link
          className="group relative min-h-[340px] overflow-hidden rounded-[24px] border border-white/10 bg-[#33323a] shadow-2xl shadow-black/24 transition hover:-translate-y-0.5 hover:border-[#ffb44d]/34"
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
        className="group relative overflow-hidden rounded-[24px] border border-white/10 bg-[radial-gradient(circle_at_16%_18%,rgba(255,180,77,.10),transparent_34%),linear-gradient(135deg,#33323a,#1f2027)] p-6 transition hover:-translate-y-0.5 hover:border-[#ffb44d]/32 sm:col-span-2"
        href="/workspace/canvas"
      >
        <div className="grid gap-5 sm:grid-cols-[58px_1fr_auto] sm:items-center">
          <div className="grid size-14 place-items-center rounded-[18px] border border-[#ffb44d]/20 bg-[#20212a] text-2xl font-black text-[#ffb44d] shadow-xl shadow-black/20">
            *
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[.14em] text-[#ffb44d]">{t("home.heroWorkflowLabel")}</p>
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

  return (
    <div className="se-scrollbar h-full overflow-y-auto overflow-x-hidden bg-[#2b2a31]">
      <div className="mx-auto w-full max-w-[1280px] px-3 pb-16 pt-10 md:px-6 md:pt-14">
        <section className="grid gap-8 pb-14 md:pb-20 xl:grid-cols-[48%_52%] xl:items-start">
          <div className="pt-2 md:pt-5">
            <p className="se-eyebrow">{t("home.heroEyebrow")}</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-black leading-[1.06] tracking-tight text-[#f4f4f4] md:text-6xl">
              {t("home.title")}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#b9b9b9]/82 md:text-xl">{t("home.subtitle")}</p>
            <div className="mt-8">
              <HomeCtaRow items={heroCtas} />
            </div>
            <div className="mt-7 rounded-[24px] border border-[#ffb44d]/18 bg-[#ffb44d]/8 p-4">
              <p className="text-sm leading-6 text-[#f4f4f4]/78">{t("home.betaNotice")}</p>
            </div>
          </div>

          <HeroMediaGrid />
        </section>

        <section className="py-10 md:py-14">
          <SectionHeader
            ctaHref="/models"
            ctaKey="home.viewModels"
            eyebrowKey="home.popularModelsEyebrow"
            subtitleKey="home.popularModelsSubtitle"
            titleKey="home.popularModelsTitle"
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
            subtitleKey="home.capabilitiesSubtitle"
            titleKey="home.capabilitiesTitle"
          />

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
        </section>

        <section className="py-10 md:py-14">
          <SectionHeader
            eyebrowKey="home.workflowTitle"
            subtitleKey="home.workflowSubtitle"
            titleKey="home.workflowLegacyTitle"
          />
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {workflowSteps.map((step, index) => (
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
            eyebrowKey="home.pricingPreviewEyebrow"
            subtitleKey="home.pricingPreviewSubtitle"
            titleKey="home.pricingPreviewTitle"
          />
          <div className="mt-8 grid gap-5 rounded-[28px] bg-[#16171c] p-4 md:grid-cols-3 md:p-6">
            {pricingPreview.map((plan) => (
              <article
                className={`rounded-[22px] border p-5 ${
                  plan.featured ? "border-[#ffb44d]/70 bg-[#1f2027]" : "border-white/10 bg-[#1f2027]/78"
                }`}
                key={plan.nameKey}
              >
                <p className="text-lg font-black text-[#f4f4f4]">{t(plan.nameKey)}</p>
                <p className="mt-4 text-4xl font-black text-[#f4f4f4]">{plan.priceKey ? t(plan.priceKey) : plan.price}</p>
                <p className="mt-3 rounded-[14px] border border-[#ffb44d]/16 bg-[#ffb44d]/8 px-3 py-2 text-sm font-black text-[#ffd08a]">
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

          <aside className="rounded-[28px] border border-[#ffb44d]/18 bg-[#33323a] p-6 lg:sticky lg:top-4 lg:self-start">
            <p className="se-eyebrow">{t("home.startCreating")}</p>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#f4f4f4]">{t("home.ctaTitle")}</h2>
            <p className="mt-3 text-sm leading-6 text-[#b9b9b9]/72">{t("home.ctaSubtitle")}</p>
            <div className="mt-6">
              <HomeCtaRow
                items={[
                  { href: "/workspace/video", key: "home.createVideo", primary: true },
                  { href: "/workspace/canvas", key: "home.openCanvas" },
                  { href: "/history", key: "home.openHistory" },
                ]}
              />
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}
