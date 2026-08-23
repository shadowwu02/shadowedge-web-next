"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { PublicPlan } from "@/config/public-plan-catalog";
import { activeBrand } from "@/config/brand";
import { useI18n, type DictionaryKey } from "@/i18n/useI18n";
import { loadPublicPlanCatalog } from "@/lib/public-plan-api";

type CatalogState =
  | { status: "loading"; plans: PublicPlan[] }
  | { status: "ready"; plans: PublicPlan[] }
  | { status: "unavailable"; plans: PublicPlan[] };

const featureKeys: Record<string, DictionaryKey> = {
  "image-generation": "pricing.catalog.feature.imageGeneration",
  "video-generation": "pricing.catalog.feature.videoGeneration",
  "usage-based-credits": "pricing.catalog.feature.usageBasedCredits",
};

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

function formatUSD(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function PricingBillingPage() {
  const { t } = useI18n();
  const [reloadToken, setReloadToken] = useState(0);
  const [catalog, setCatalog] = useState<CatalogState>({ status: "loading", plans: [] });
  const isGoldTide = activeBrand.id === "newbrand";

  const retryCatalog = useCallback(() => {
    setCatalog({ status: "loading", plans: [] });
    setReloadToken((value) => value + 1);
  }, []);

  useEffect(() => {
    let active = true;

    loadPublicPlanCatalog()
      .then(({ plans }) => {
        if (active) setCatalog({ status: "ready", plans });
      })
      .catch(() => {
        if (active) setCatalog({ status: "unavailable", plans: [] });
      });

    return () => {
      active = false;
    };
  }, [reloadToken]);

  const cardPlans = useMemo(
    () => catalog.plans.map((plan) => ({ ...plan, ctaHref: "/workspace?upgrade=1" })),
    [catalog.plans],
  );

  const accent = isGoldTide ? "#d9b56d" : "#ffb44d";

  return (
    <div className="se-scrollbar h-full overflow-y-auto overflow-x-hidden">
      <div className="mx-auto flex min-h-full w-full max-w-[1180px] flex-col gap-4 pb-5">
        <section className="se-card-quiet rounded-[30px] p-5 md:p-6">
          <div className="max-w-3xl">
            <p className="se-eyebrow">{t("pricing.catalog.eyebrow")}</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-[#f4f4f4] md:text-4xl">
              {t("pricing.catalog.title")}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#b9b9b9]/68">
              {t("pricing.catalog.subtitle")}
            </p>
          </div>
        </section>

        <section className="rounded-[28px] border border-[#ffb44d]/16 bg-[#ffb44d]/8 p-4 md:p-5">
          <p className="text-sm font-black text-[#ffd08a]">{t("pricing.beta.noticeTitle")}</p>
          <p className="mt-1 text-sm leading-6 text-[#f4f4f4]/72">{t("pricing.beta.noticeBody")}</p>
        </section>

        <section className="rounded-[28px] border border-violet-300/16 bg-violet-300/[.045] p-4 md:p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-black text-violet-100">{t("subscription.pricing.title")}</p>
              <p className="mt-1 text-sm leading-6 text-white/55">{t("subscription.pricing.description")}</p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Link className="rounded-2xl bg-violet-200 px-4 py-3 text-xs font-black text-[#17131e]" href="/workspace?upgrade=1">
                {t("subscription.pricing.workspace")}
              </Link>
              <Link className="rounded-2xl border border-white/10 px-4 py-3 text-xs font-black text-white/65" href="/contact">
                {t("subscription.pricing.contact")}
              </Link>
            </div>
          </div>
        </section>

        {catalog.status === "loading" ? (
          <section aria-live="polite" className="se-card-quiet rounded-[28px] p-6">
            <div className="h-5 w-44 animate-pulse rounded-full bg-white/10" />
            <div className="mt-4 h-12 w-32 animate-pulse rounded-2xl bg-white/10" />
            <p className="mt-5 text-sm text-[#b9b9b9]/62">{t("pricing.catalog.loading")}</p>
          </section>
        ) : null}

        {catalog.status === "unavailable" ? (
          <section aria-live="polite" className="rounded-[28px] border border-rose-300/20 bg-rose-300/[.06] p-6">
            <h2 className="text-xl font-black text-[#f4f4f4]">{t("pricing.catalog.unavailableTitle")}</h2>
            <p className="mt-2 text-sm leading-6 text-[#b9b9b9]/68">{t("pricing.catalog.unavailableBody")}</p>
            <button
              className="se-button-secondary mt-5 min-h-11 rounded-[18px] px-5 text-sm font-black"
              onClick={retryCatalog}
              type="button"
            >
              {t("pricing.catalog.retry")}
            </button>
          </section>
        ) : null}

        {catalog.status === "ready" ? (
          <section className="grid gap-4">
            {cardPlans.map((plan) => (
              <article
                className="relative flex min-h-[460px] flex-col overflow-hidden rounded-[30px] border bg-[#111318]/78 p-6 shadow-[0_22px_70px_rgba(0,0,0,.18)]"
                key={plan.planId}
                style={{ borderColor: `${accent}55` }}
              >
                <div className="absolute right-[-80px] top-[-110px] size-72 rounded-full opacity-10 blur-3xl" style={{ backgroundColor: accent }} />
                <div className="relative flex flex-1 flex-col">
                  <span className="mb-5 w-fit rounded-full border border-white/10 bg-white/[.04] px-3 py-1.5 text-[10px] font-black uppercase tracking-[.14em] text-[#f4f4f4]/72">
                    {t("pricing.catalog.displayOnly")}
                  </span>

                  <h2 className="text-3xl font-black text-[#f4f4f4]">{plan.name}</h2>
                  <div className="mt-5 flex flex-wrap items-end gap-2">
                    <span className="text-5xl font-black tracking-tight text-[#f4f4f4]">{formatUSD(plan.priceUSD)}</span>
                    <span className="mb-2 text-sm font-semibold text-[#b9b9b9]/54">
                      {plan.billingInterval === "monthly" ? t("pricing.perMonth") : plan.billingInterval}
                    </span>
                  </div>

                  <div className="mt-5 rounded-[20px] border border-white/10 bg-white/[.04] px-5 py-4">
                    <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#b9b9b9]/48">
                      {t("pricing.catalog.includedCredits")}
                    </p>
                    <p className="mt-2 text-xl font-black text-[#f4f4f4]">
                      {plan.credits.toLocaleString("en-US")} {t("pricing.catalog.credits")}
                    </p>
                  </div>

                  <ul className="mt-6 grid gap-3 text-sm leading-6 text-[#f4f4f4]/74 md:grid-cols-3">
                    {plan.features.map((feature) => (
                      <li className="flex gap-2 rounded-[18px] border border-white/8 bg-[#05070b]/36 p-3" key={feature}>
                        <span className="mt-2 size-1.5 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
                        <span>{featureKeys[feature] ? t(featureKeys[feature]) : feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    className="se-button-primary mt-auto inline-flex min-h-11 w-fit items-center justify-center rounded-[18px] px-5 text-sm font-black"
                    href={plan.ctaHref}
                  >
                    {t("pricing.catalog.viewWorkspace")}
                  </Link>
                </div>
              </article>
            ))}
          </section>
        ) : null}

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
              <p className="se-eyebrow">{t("pricing.beta.billingTitle")}</p>
              <p className="mt-3 text-sm leading-6 text-[#f4f4f4]/72">{t("pricing.beta.billingBody")}</p>
              <div className="mt-4 flex flex-wrap gap-3 text-xs font-bold">
                <Link className="text-[#ffd08a] hover:text-white" href="/terms">{t("commercial.terms")}</Link>
                <Link className="text-[#ffd08a] hover:text-white" href="/privacy">{t("commercial.privacy")}</Link>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
