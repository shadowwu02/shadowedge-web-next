"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { activeBrand } from "@/config/brand";
import { useI18n, type DictionaryKey } from "@/i18n/useI18n";

type CtaItem = {
  href: string;
  labelKey: DictionaryKey;
  primary?: boolean;
};

const features: Array<{
  bodyKey: DictionaryKey;
  points: DictionaryKey[];
  titleKey: DictionaryKey;
}> = [
  {
    titleKey: "features.imageGeneration.title",
    bodyKey: "features.imageGeneration.body",
    points: ["features.imageGeneration.point1", "features.imageGeneration.point2", "features.imageGeneration.point3"],
  },
  {
    titleKey: "features.imageToImage.title",
    bodyKey: "features.imageToImage.body",
    points: ["features.imageToImage.point1", "features.imageToImage.point2", "features.imageToImage.point3"],
  },
  {
    titleKey: "features.videoGeneration.title",
    bodyKey: "features.videoGeneration.body",
    points: ["features.videoGeneration.point1", "features.videoGeneration.point2", "features.videoGeneration.point3"],
  },
  {
    titleKey: "features.references.title",
    bodyKey: "features.references.body",
    points: ["features.references.point1", "features.references.point2", "features.references.point3"],
  },
  {
    titleKey: "features.remake.title",
    bodyKey: "features.remake.body",
    points: ["features.remake.point1", "features.remake.point2", "features.remake.point3"],
  },
  {
    titleKey: "features.canvas.title",
    bodyKey: "features.canvas.body",
    points: ["features.canvas.point1", "features.canvas.point2", "features.canvas.point3"],
  },
  {
    titleKey: "features.historyAccount.title",
    bodyKey: "features.historyAccount.body",
    points: ["features.historyAccount.point1", "features.historyAccount.point2", "features.historyAccount.point3"],
  },
  {
    titleKey: "features.models.title",
    bodyKey: "features.models.body",
    points: ["features.models.point1", "features.models.point2", "features.models.point3"],
  },
];

const featureCtas: CtaItem[] = [
  { href: "/workspace/image", labelKey: "features.cta.createImage", primary: true },
  { href: "/workspace/video", labelKey: "features.cta.createVideo" },
  { href: "/workspace/video?tab=remake", labelKey: "features.cta.tryRemake" },
  { href: "/models", labelKey: "features.cta.viewModels" },
];

const faqItems: Array<{ answerKey: DictionaryKey; questionKey: DictionaryKey }> = [
  { questionKey: "faq.q.credits", answerKey: "faq.a.credits" },
  { questionKey: "faq.q.references", answerKey: "faq.a.references" },
  { questionKey: "faq.q.remake", answerKey: "faq.a.remake" },
  { questionKey: "faq.q.canvas", answerKey: "faq.a.canvas" },
  { questionKey: "faq.q.history", answerKey: "faq.a.history" },
  { questionKey: "faq.q.failed", answerKey: "faq.a.failed" },
  { questionKey: "faq.q.longVideos", answerKey: "faq.a.longVideos" },
  { questionKey: "faq.q.topUp", answerKey: "faq.a.topUp" },
];

const faqCtas: CtaItem[] = [
  { href: "/workspace/image", labelKey: "features.cta.createImage", primary: true },
  { href: "/workspace/video", labelKey: "features.cta.createVideo" },
  { href: "/contact", labelKey: "faq.contactSupport" },
];

const feedbackFields: DictionaryKey[] = [
  "contact.feedback.email",
  "contact.feedback.jobId",
  "contact.feedback.feature",
  "contact.feedback.modelParams",
  "contact.feedback.credits",
  "contact.feedback.error",
  "contact.feedback.screenshot",
];

const contactCtas: CtaItem[] = [
  { href: "/account", labelKey: "contact.cta.account", primary: true },
  { href: "/history", labelKey: "contact.cta.history" },
  { href: "/pricing", labelKey: "contact.cta.pricing" },
];

function PageShell({
  children,
  eyebrowText,
  eyebrowKey,
  subtitleText,
  subtitleKey,
  titleText,
  titleKey,
}: {
  children: ReactNode;
  eyebrowText?: string;
  eyebrowKey: DictionaryKey;
  subtitleText?: string;
  subtitleKey: DictionaryKey;
  titleText?: string;
  titleKey: DictionaryKey;
}) {
  const { t } = useI18n();

  return (
    <div className="se-scrollbar h-full overflow-y-auto overflow-x-hidden">
      <div className="mx-auto flex min-h-full w-full max-w-[1480px] flex-col gap-4 pb-5">
        <section className="se-card-quiet rounded-[30px] p-5 md:p-6">
          <div className="max-w-3xl">
            <p className="se-eyebrow">{eyebrowText || t(eyebrowKey)}</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-[#f4f4f4] md:text-4xl">{titleText || t(titleKey)}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#b9b9b9]/68">{subtitleText || t(subtitleKey)}</p>
          </div>
        </section>
        {children}
      </div>
    </div>
  );
}

function CtaRow({ items }: { items: CtaItem[] }) {
  const { t } = useI18n();

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Link
          className={`inline-flex min-h-11 items-center justify-center rounded-[18px] px-4 text-sm font-black transition ${
            item.primary ? "se-button-primary" : "se-button-secondary"
          }`}
          href={item.href}
          key={item.href}
        >
          <span>{t(item.labelKey)}</span>
          <span className="ml-2" aria-hidden="true">
            {"->"}
          </span>
        </Link>
      ))}
    </div>
  );
}

export function FeaturesMarketingPage() {
  const { t } = useI18n();

  return (
    <PageShell eyebrowKey="features.eyebrow" subtitleKey="features.subtitle" titleKey="features.title">
      <section className="grid gap-4 lg:grid-cols-4">
        {features.map((feature) => (
          <article className="rounded-[28px] border border-white/8 bg-[#111318]/72 p-5 transition hover:border-[#ffb44d]/24" key={feature.titleKey}>
            <p className="se-eyebrow">{t(feature.titleKey)}</p>
            <p className="mt-3 text-sm leading-6 text-[#f4f4f4]/72">{t(feature.bodyKey)}</p>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-[#b9b9b9]/68">
              {feature.points.map((point) => (
                <li className="flex gap-2" key={point}>
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#ffb44d]" />
                  <span>{t(point)}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className="rounded-[28px] border border-[#ffb44d]/16 bg-[#ffb44d]/8 p-5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="se-eyebrow">{t("features.cta.eyebrow")}</p>
            <h2 className="mt-2 text-2xl font-black text-[#f4f4f4]">{t("features.cta.title")}</h2>
            <p className="mt-2 text-sm leading-6 text-[#f4f4f4]/72">{t("features.cta.subtitle")}</p>
          </div>
          <CtaRow items={featureCtas} />
        </div>
      </section>
    </PageShell>
  );
}

export function FaqMarketingPage() {
  const { t } = useI18n();

  return (
    <PageShell eyebrowKey="faq.eyebrow" subtitleKey="faq.subtitle" titleKey="faq.title">
      <section className="grid gap-3">
        {faqItems.map((item, index) => (
          <details className="group rounded-[24px] border border-white/8 bg-[#111318]/72 p-4 open:border-[#ffb44d]/26" key={item.questionKey} open={index === 0}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-black text-[#f4f4f4]">
              <span>{t(item.questionKey)}</span>
              <span className="grid size-8 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[.035] text-[#ffd08a] transition group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-4 max-w-4xl text-sm leading-6 text-[#b9b9b9]/72">{t(item.answerKey)}</p>
          </details>
        ))}
      </section>

      <section className="se-card-quiet rounded-[28px] p-5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="se-eyebrow">{t("faq.moreHelpEyebrow")}</p>
            <h2 className="mt-2 text-2xl font-black text-[#f4f4f4]">{t("faq.moreHelpTitle")}</h2>
            <p className="mt-2 text-sm leading-6 text-[#b9b9b9]/68">{t("faq.moreHelpSubtitle")}</p>
          </div>
          <CtaRow items={faqCtas} />
        </div>
      </section>
    </PageShell>
  );
}

export function ContactMarketingPage() {
  const { t } = useI18n();
  const isGoldTide = activeBrand.id === "newbrand";
  const supportCopy = `For account, credits, or workspace support, contact ${activeBrand.supportEmail}.`;

  return (
    <PageShell
      eyebrowKey="contact.eyebrow"
      eyebrowText={isGoldTide ? "Support" : undefined}
      subtitleKey="contact.subtitle"
      subtitleText={isGoldTide ? supportCopy : undefined}
      titleKey="contact.title"
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="se-card-quiet rounded-[28px] p-5 md:p-6">
          <p className="se-eyebrow">{isGoldTide ? "Customer support" : t("contact.betaEyebrow")}</p>
          <h2 className="mt-2 text-2xl font-black text-[#f4f4f4]">
            {isGoldTide ? `Contact ${activeBrand.name} support` : t("contact.betaTitle")}
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#b9b9b9]/72">
            {isGoldTide
              ? `${supportCopy} Include the details below so we can investigate safely. Do not send passwords, tokens, cookies, or private credentials.`
              : t("contact.betaBody")}
          </p>

          <div className="mt-5 rounded-[22px] border border-[#ffb44d]/18 bg-[#ffb44d]/8 p-4">
            <p className="text-sm font-black text-[#ffd08a]">{isGoldTide ? "Email support" : t("contact.noFormTitle")}</p>
            <p className="mt-2 text-sm leading-6 text-[#f4f4f4]/72">
              {isGoldTide
                ? `Online form submission is not connected yet. Please email ${activeBrand.supportEmail} with account, credits, or workspace context and the checklist fields below.`
                : t("contact.noFormBody")}
            </p>
          </div>

          <div className="mt-5">
            <CtaRow items={contactCtas} />
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-[28px] border border-white/8 bg-[#111318]/72 p-5">
            <p className="se-eyebrow">{t("contact.feedbackTitle")}</p>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-[#b9b9b9]/72">
              {feedbackFields.map((field) => (
                <li className="flex gap-2" key={field}>
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#ffb44d]" />
                  <span>{t(field)}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-[28px] border border-white/8 bg-[#111318]/72 p-5">
            <p className="se-eyebrow">{t("contact.channelsTitle")}</p>
            <div className="mt-4 grid gap-3">
              <div className="rounded-[18px] border border-white/8 bg-[#05070b]/42 p-4">
                <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#b9b9b9]/42">
                  {isGoldTide ? "Email" : t("contact.channel.admin")}
                </p>
                <p className="mt-1 text-sm font-black text-[#f4f4f4]">
                  {isGoldTide ? activeBrand.supportEmail : t("contact.channel.adminValue")}
                </p>
              </div>
              <div className="rounded-[18px] border border-white/8 bg-[#05070b]/42 p-4">
                <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#b9b9b9]/42">{t("contact.channel.response")}</p>
                <p className="mt-1 text-sm font-black text-[#f4f4f4]">{t("contact.channel.responseValue")}</p>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </PageShell>
  );
}
