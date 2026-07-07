"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { activeBrand } from "@/config/brand";
import { useI18n } from "@/i18n/useI18n";

type BillingCycle = "annual" | "monthly";

const pricingPlans = [
  {
    id: "essential",
    nameKey: "pricing.plan.essential.name",
    monthlyPrice: "$9",
    annualPrice: "$7",
    monthlyCreditsKey: "pricing.plan.essential.monthlyCredits",
    annualCreditsKey: "pricing.plan.essential.annualCredits",
    recommendedKey: "pricing.plan.essential.recommended",
    ctaKey: "pricing.contactAdmin",
    parallelKey: "pricing.plan.essential.parallel",
    featured: false,
    features: [
      "pricing.feature.standardImage",
      "pricing.feature.coreWorkflow",
      "pricing.feature.basicEditing",
      "pricing.feature.personalUse",
      "pricing.feature.parallel5",
    ],
  },
  {
    id: "pro",
    nameKey: "pricing.plan.pro.name",
    monthlyPrice: "$29",
    annualPrice: "$24",
    monthlyCreditsKey: "pricing.plan.pro.monthlyCredits",
    annualCreditsKey: "pricing.plan.pro.annualCredits",
    recommendedKey: "pricing.plan.pro.recommended",
    ctaKey: "pricing.contactAdmin",
    parallelKey: "pricing.plan.pro.parallel",
    featured: true,
    features: [
      "pricing.feature.fasterGeneration",
      "pricing.feature.moreWorkflow",
      "pricing.feature.advancedEditing",
      "pricing.feature.commercialReady",
      "pricing.feature.parallel12",
      "pricing.feature.priorityProcessing",
    ],
  },
  {
    id: "studio",
    nameKey: "pricing.plan.studio.name",
    monthlyPrice: "Custom",
    annualPrice: "Custom",
    monthlyCreditsKey: "pricing.plan.studio.monthlyCredits",
    annualCreditsKey: "pricing.plan.studio.annualCredits",
    recommendedKey: "pricing.plan.studio.recommended",
    ctaKey: "pricing.contactAdmin",
    parallelKey: "pricing.plan.studio.parallel",
    featured: false,
    features: [
      "pricing.feature.teamSetup",
      "pricing.feature.sharedWorkflows",
      "pricing.feature.advancedControl",
      "pricing.feature.commercialRights",
      "pricing.feature.customParallel",
      "pricing.feature.prioritySupport",
      "pricing.feature.scalableProduction",
    ],
  },
] as const;

const explanationItems = [
  "pricing.explanation.image",
  "pricing.explanation.video",
  "pricing.explanation.remake",
  "pricing.explanation.actual",
] as const;

const quickLinks = [
  { href: "/account", key: "pricing.goAccount" },
  { href: "/history", key: "pricing.goHistory" },
  { href: "/workspace/image", key: "pricing.createImage" },
  { href: "/workspace/video", key: "pricing.createVideo" },
] as const;

const goldTideCustomFeatures = [
  "Custom image and video generation credits",
  "AI image, video, and prompt creation",
  "Flexible recurring or project-based packages",
  "Priority onboarding available",
  "Contact support@gold-tide.com for plan details",
] as const;

export function PricingBillingPage() {
  const { t } = useI18n();
  const [billing, setBilling] = useState<BillingCycle>("monthly");
  const isAnnual = billing === "annual";
  const isGoldTide = activeBrand.id === "newbrand";

  const billingLabel = useMemo(() => (isAnnual ? t("pricing.annually") : t("pricing.monthly")), [isAnnual, t]);

  if (isGoldTide) {
    return (
      <div className="se-scrollbar h-full overflow-y-auto overflow-x-hidden bg-[radial-gradient(circle_at_18%_0%,rgba(217,181,109,.10),transparent_34%),#0c0d0d]">
        <div className="mx-auto flex min-h-full w-full max-w-[1180px] flex-col gap-4 pb-5">
          <section className="rounded-[30px] border border-[#d9b56d]/14 bg-[#12110f]/88 p-5 shadow-2xl shadow-black/20 md:p-6">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[.2em] text-[#d9b56d]">Custom credits</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-[#f4f4f4] md:text-4xl">Gold-Tide AI Plans</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#b9b9b9]/70">
                Custom creative credits and production support for teams, agencies, and creators.
              </p>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <article className="relative flex min-h-[540px] flex-col overflow-hidden rounded-[30px] border border-[#d9b56d]/28 bg-[linear-gradient(145deg,rgba(217,181,109,.14),rgba(18,17,15,.92)_40%,rgba(8,8,7,.96))] p-6 shadow-[0_26px_90px_rgba(0,0,0,.28)]">
              <div className="absolute right-[-80px] top-[-110px] size-72 rounded-full bg-[#d9b56d]/12 blur-3xl" />
              <div className="relative flex flex-1 flex-col">
                <span className="mb-5 w-fit rounded-full border border-[#d9b56d]/30 bg-[#d9b56d]/14 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.14em] text-[#f2d899]">
                  Contact us for pricing
                </span>

                <h2 className="text-3xl font-black text-[#f4f4f4]">Custom Plan</h2>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-[#f4f4f4]/70">
                  Tailored credits and creative production support for image generation, video generation, and prompt workflows.
                </p>

                <div className="mt-6 rounded-[22px] border border-[#d9b56d]/18 bg-[#d9b56d]/10 px-5 py-4">
                  <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#f2d899]/78">Pricing</p>
                  <p className="mt-2 text-lg font-black text-[#f4f4f4]">Custom quote after support review</p>
                </div>

                <ul className="mt-6 grid gap-3 text-sm leading-6 text-[#f4f4f4]/74 md:grid-cols-2">
                  {goldTideCustomFeatures.map((feature) => (
                    <li className="flex gap-2 rounded-[18px] border border-white/8 bg-[#05070b]/36 p-3" key={feature}>
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#d9b56d]" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto pt-7">
                  <a
                    className="inline-flex min-h-12 items-center justify-center rounded-[18px] bg-[#d9b56d] px-5 text-sm font-black text-[#10100e] transition hover:bg-[#f2d899]"
                    href={`mailto:${activeBrand.supportEmail}?subject=Gold-Tide AI Custom Plan`}
                  >
                    Contact Support
                  </a>
                </div>
              </div>
            </article>

            <aside className="space-y-4">
              <section className="rounded-[28px] border border-[#d9b56d]/16 bg-[#d9b56d]/8 p-4 md:p-5">
                <p className="text-sm font-black text-[#f2d899]">Plan details</p>
                <p className="mt-2 text-sm leading-6 text-[#f4f4f4]/72">
                  For account, credits, or workspace support, contact {activeBrand.supportEmail}.
                </p>
              </section>

              <section className="rounded-[28px] border border-white/8 bg-[#12110f]/82 p-4">
                <p className="text-xs font-black uppercase tracking-[.2em] text-[#d9b56d]">Workspace</p>
                <div className="mt-4 grid gap-2">
                  {quickLinks.slice(2).map((item) => (
                    <Link className="flex min-h-11 items-center justify-between rounded-[18px] border border-white/10 bg-[#05070b]/42 px-4 text-sm font-bold text-[#f4f4f4]/78 transition hover:border-[#d9b56d]/28 hover:text-[#f2d899]" href={item.href} key={item.href}>
                      <span>{t(item.key)}</span>
                      <span aria-hidden="true">{"->"}</span>
                    </Link>
                  ))}
                </div>
              </section>
            </aside>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="se-scrollbar h-full overflow-y-auto overflow-x-hidden">
      <div className="mx-auto flex min-h-full w-full max-w-[1480px] flex-col gap-4 pb-5">
        <section className="se-card-quiet rounded-[30px] p-5 md:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="se-eyebrow">{t("pricing.eyebrow")}</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-[#f4f4f4] md:text-4xl">{t("pricing.title")}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#b9b9b9]/62">{t("pricing.subtitle")}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="se-segmented inline-flex rounded-2xl p-1.5">
                <button
                  className={`se-segmented-item min-h-9 rounded-full px-4 text-xs font-black ${billing === "monthly" ? "se-segmented-item-active" : ""}`}
                  onClick={() => setBilling("monthly")}
                  type="button"
                >
                  {t("pricing.monthly")}
                </button>
                <button
                  className={`se-segmented-item min-h-9 rounded-full px-4 text-xs font-black ${billing === "annual" ? "se-segmented-item-active" : ""}`}
                  onClick={() => setBilling("annual")}
                  type="button"
                >
                  {t("pricing.annually")}
                </button>
              </div>
              <span className="rounded-full border border-[#ffb44d]/22 bg-[#ffb44d]/10 px-3 py-2 text-[11px] font-black text-[#ffd08a]">
                {t("pricing.save")}
              </span>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-[#ffb44d]/16 bg-[#ffb44d]/8 p-4 md:p-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-black text-[#ffd08a]">{t("pricing.checkoutMigratingTitle")}</p>
              <p className="mt-1 text-sm leading-6 text-[#f4f4f4]/72">
                {t("pricing.checkoutMigrating")}
              </p>
            </div>
            <span className="w-fit rounded-full border border-white/10 bg-[#05070b]/42 px-3 py-1.5 text-[11px] font-black text-[#f4f4f4]/70">
              {billingLabel}
            </span>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {pricingPlans.map((plan) => (
            <article
              className={`relative flex min-h-[620px] flex-col rounded-[28px] border bg-[#111318]/72 p-5 transition-colors ${
                plan.featured ? "border-[#ffb44d]/55 shadow-[0_22px_70px_rgba(255,180,77,.12)]" : "border-white/8 hover:border-[#ffb44d]/24"
              }`}
              key={plan.id}
            >
              {plan.featured ? (
                <span className="mb-4 w-fit rounded-full border border-[#ffb44d]/30 bg-[#ffb44d]/14 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.14em] text-[#ffd08a]">
                  {t("pricing.mostPopular")}
                </span>
              ) : null}

              <div className="flex flex-1 flex-col">
                <h2 className="text-2xl font-black text-[#f4f4f4]">{t(plan.nameKey)}</h2>
                <div className="mt-5 flex items-end gap-2">
                  <span className="text-5xl font-black tracking-tight text-[#f4f4f4]">
                    {plan.id === "studio" ? t("pricing.customPrice") : isAnnual ? plan.annualPrice : plan.monthlyPrice}
                  </span>
                  {plan.id !== "studio" ? (
                    <span className="mb-2 text-sm font-semibold text-[#b9b9b9]/54">
                      {isAnnual ? t("pricing.perMonthAnnual") : t("pricing.perMonth")}
                    </span>
                  ) : null}
                </div>

                <p className="mt-4 min-h-[52px] text-sm leading-6 text-[#b9b9b9]/64">{t(plan.recommendedKey)}</p>

                <div className="mt-4 rounded-[18px] border border-[#ffb44d]/18 bg-[#ffb44d]/10 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#ffd08a]/78">{t("pricing.includedCredits")}</p>
                  <p className="mt-1 text-sm font-black text-[#f4f4f4]">{t(isAnnual ? plan.annualCreditsKey : plan.monthlyCreditsKey)}</p>
                </div>

                <div className="mt-3 rounded-[18px] border border-white/8 bg-white/[.035] px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#b9b9b9]/42">{t("pricing.parallelGenerations")}</p>
                  <p className="mt-1 text-sm font-black text-[#f4f4f4]">{t(plan.parallelKey)}</p>
                </div>

                <ul className="mt-5 space-y-3 text-sm leading-6 text-[#b9b9b9]/68">
                  {plan.features.map((feature) => (
                    <li className="flex gap-2" key={feature}>
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#ffb44d]" />
                      <span>{t(feature)}</span>
                    </li>
                  ))}
                </ul>

                <button
                  className="se-button-primary mt-auto min-h-11 rounded-[18px] px-4 text-sm font-black"
                  type="button"
                >
                  {t(plan.ctaKey)}
                </button>
              </div>
            </article>
          ))}
        </section>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="se-card-quiet rounded-[28px] p-4 md:p-5">
            <p className="se-eyebrow">{t("pricing.creditsExplanation")}</p>
            <h2 className="mt-2 text-xl font-black text-[#f4f4f4]">{t("pricing.howCreditsWork")}</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {explanationItems.map((item) => (
                <div className="rounded-[20px] border border-white/8 bg-[#05070b]/46 p-4" key={item}>
                  <p className="text-sm leading-6 text-[#f4f4f4]/76">{t(item)}</p>
                </div>
              ))}
            </div>
          </section>

          <aside className="space-y-4">
            <section className="se-card-quiet rounded-[28px] p-4">
              <p className="se-eyebrow">{t("pricing.quickLinks")}</p>
              <div className="mt-4 grid gap-2">
                {quickLinks.map((item) => (
                  <Link className="se-button-secondary flex min-h-11 items-center justify-between rounded-[18px] px-4 text-sm font-bold" href={item.href} key={item.href}>
                    <span>{t(item.key)}</span>
                    <span aria-hidden="true">{"->"}</span>
                  </Link>
                ))}
              </div>
            </section>

            <section className="se-card-quiet rounded-[28px] p-4">
              <p className="se-eyebrow">{t("pricing.actualBillingNote")}</p>
              <p className="mt-3 text-sm leading-6 text-[#f4f4f4]/72">{t("pricing.billingNoteBody")}</p>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
