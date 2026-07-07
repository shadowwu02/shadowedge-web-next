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

export function PricingBillingPage() {
  const { t } = useI18n();
  const [billing, setBilling] = useState<BillingCycle>("monthly");
  const isAnnual = billing === "annual";
  const isGoldTide = activeBrand.id === "newbrand";

  const billingLabel = useMemo(() => (isAnnual ? t("pricing.annually") : t("pricing.monthly")), [isAnnual, t]);

  return (
    <div className={isGoldTide ? "se-scrollbar h-full overflow-y-auto overflow-x-hidden bg-[radial-gradient(circle_at_18%_0%,rgba(217,181,109,.10),transparent_34%),#0c0d0d]" : "se-scrollbar h-full overflow-y-auto overflow-x-hidden"}>
      <div className="mx-auto flex min-h-full w-full max-w-[1480px] flex-col gap-4 pb-5">
        <section className={isGoldTide ? "rounded-[30px] border border-[#d9b56d]/14 bg-[#12110f]/88 p-5 shadow-2xl shadow-black/20 md:p-6" : "se-card-quiet rounded-[30px] p-5 md:p-6"}>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className={isGoldTide ? "text-xs font-black uppercase tracking-[.2em] text-[#d9b56d]" : "se-eyebrow"}>{isGoldTide ? "Premium credits" : t("pricing.eyebrow")}</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-[#f4f4f4] md:text-4xl">{isGoldTide ? "Gold-Tide AI Plans" : t("pricing.title")}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#b9b9b9]/62">
                {isGoldTide ? "Flexible credits for image, video, and prompt creation." : t("pricing.subtitle")}
              </p>
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
              <span className={isGoldTide ? "rounded-full border border-[#d9b56d]/22 bg-[#d9b56d]/10 px-3 py-2 text-[11px] font-black text-[#f2d899]" : "rounded-full border border-[#ffb44d]/22 bg-[#ffb44d]/10 px-3 py-2 text-[11px] font-black text-[#ffd08a]"}>
                {t("pricing.save")}
              </span>
            </div>
          </div>
        </section>

        <section className={isGoldTide ? "rounded-[28px] border border-[#d9b56d]/16 bg-[#d9b56d]/8 p-4 md:p-5" : "rounded-[28px] border border-[#ffb44d]/16 bg-[#ffb44d]/8 p-4 md:p-5"}>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className={isGoldTide ? "text-sm font-black text-[#f2d899]" : "text-sm font-black text-[#ffd08a]"}>
                {isGoldTide ? "Credits support" : t("pricing.checkoutMigratingTitle")}
              </p>
              <p className="mt-1 text-sm leading-6 text-[#f4f4f4]/72">
                {isGoldTide ? `For account or credits support, contact ${activeBrand.supportEmail}. Online checkout is still being prepared.` : t("pricing.checkoutMigrating")}
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
              className={
                isGoldTide
                  ? `relative flex min-h-[620px] flex-col rounded-[28px] border bg-[#12110f]/82 p-5 transition-colors ${
                      plan.featured ? "border-[#d9b56d]/55 shadow-[0_22px_70px_rgba(217,181,109,.12)]" : "border-white/8 hover:border-[#d9b56d]/24"
                    }`
                  : `relative flex min-h-[620px] flex-col rounded-[28px] border bg-[#111318]/72 p-5 transition-colors ${
                      plan.featured ? "border-[#ffb44d]/55 shadow-[0_22px_70px_rgba(255,180,77,.12)]" : "border-white/8 hover:border-[#ffb44d]/24"
                    }`
              }
              key={plan.id}
            >
              {plan.featured ? (
                <span className={isGoldTide ? "mb-4 w-fit rounded-full border border-[#d9b56d]/30 bg-[#d9b56d]/14 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.14em] text-[#f2d899]" : "mb-4 w-fit rounded-full border border-[#ffb44d]/30 bg-[#ffb44d]/14 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.14em] text-[#ffd08a]"}>
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

                <div className={isGoldTide ? "mt-4 rounded-[18px] border border-[#d9b56d]/18 bg-[#d9b56d]/10 px-4 py-3" : "mt-4 rounded-[18px] border border-[#ffb44d]/18 bg-[#ffb44d]/10 px-4 py-3"}>
                  <p className={isGoldTide ? "text-[10px] font-black uppercase tracking-[.16em] text-[#f2d899]/78" : "text-[10px] font-black uppercase tracking-[.16em] text-[#ffd08a]/78"}>{t("pricing.includedCredits")}</p>
                  <p className="mt-1 text-sm font-black text-[#f4f4f4]">{t(isAnnual ? plan.annualCreditsKey : plan.monthlyCreditsKey)}</p>
                </div>

                <div className="mt-3 rounded-[18px] border border-white/8 bg-white/[.035] px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#b9b9b9]/42">{t("pricing.parallelGenerations")}</p>
                  <p className="mt-1 text-sm font-black text-[#f4f4f4]">{t(plan.parallelKey)}</p>
                </div>

                <ul className="mt-5 space-y-3 text-sm leading-6 text-[#b9b9b9]/68">
                  {plan.features.map((feature) => (
                    <li className="flex gap-2" key={feature}>
                      <span className={isGoldTide ? "mt-2 size-1.5 shrink-0 rounded-full bg-[#d9b56d]" : "mt-2 size-1.5 shrink-0 rounded-full bg-[#ffb44d]"} />
                      <span>{t(feature)}</span>
                    </li>
                  ))}
                </ul>

                <button
                  className={
                    isGoldTide
                      ? "mt-auto min-h-11 rounded-[18px] bg-[#d9b56d] px-4 text-sm font-black text-[#10100e] transition hover:bg-[#f2d899]"
                      : "se-button-primary mt-auto min-h-11 rounded-[18px] px-4 text-sm font-black"
                  }
                  type="button"
                >
                  {isGoldTide ? "Contact support" : t(plan.ctaKey)}
                </button>
              </div>
            </article>
          ))}
        </section>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className={isGoldTide ? "rounded-[28px] border border-[#d9b56d]/14 bg-[#12110f]/82 p-4 md:p-5" : "se-card-quiet rounded-[28px] p-4 md:p-5"}>
            <p className={isGoldTide ? "text-xs font-black uppercase tracking-[.2em] text-[#d9b56d]" : "se-eyebrow"}>{t("pricing.creditsExplanation")}</p>
            <h2 className="mt-2 text-xl font-black text-[#f4f4f4]">{isGoldTide ? "How Gold-Tide credits work" : t("pricing.howCreditsWork")}</h2>
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
