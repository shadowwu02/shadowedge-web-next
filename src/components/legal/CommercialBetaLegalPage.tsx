"use client";

import Link from "next/link";
import { activeBrand } from "@/config/brand";
import { useI18n, type DictionaryKey } from "@/i18n/useI18n";

const termsSections = [
  ["legal.terms.eligibility.title", "legal.terms.eligibility.body"],
  ["legal.terms.beta.title", "legal.terms.beta.body"],
  ["legal.terms.content.title", "legal.terms.content.body"],
  ["legal.terms.use.title", "legal.terms.use.body"],
  ["legal.terms.ai.title", "legal.terms.ai.body"],
  ["legal.terms.control.title", "legal.terms.control.body"],
  ["legal.terms.termination.title", "legal.terms.termination.body"],
  ["legal.terms.disclaimer.title", "legal.terms.disclaimer.body"],
] satisfies Array<[DictionaryKey, DictionaryKey]>;

const privacySections = [
  ["legal.privacy.collect.title", "legal.privacy.collect.body"],
  ["legal.privacy.use.title", "legal.privacy.use.body"],
  ["legal.privacy.ai.title", "legal.privacy.ai.body"],
  ["legal.privacy.share.title", "legal.privacy.share.body"],
  ["legal.privacy.retention.title", "legal.privacy.retention.body"],
  ["legal.privacy.controls.title", "legal.privacy.controls.body"],
  ["legal.privacy.cookies.title", "legal.privacy.cookies.body"],
  ["legal.privacy.children.title", "legal.privacy.children.body"],
] satisfies Array<[DictionaryKey, DictionaryKey]>;

export function CommercialBetaLegalPage({ kind }: Readonly<{ kind: "privacy" | "terms" }>) {
  const { t, tf } = useI18n();
  const isTerms = kind === "terms";
  const titleKey = isTerms ? "legal.terms.title" : "legal.privacy.title";
  const introKey = isTerms ? "legal.terms.intro" : "legal.privacy.intro";
  const sections = isTerms ? termsSections : privacySections;

  return (
    <div className="se-scrollbar h-full overflow-y-auto overflow-x-hidden bg-[radial-gradient(circle_at_15%_0%,rgba(255,180,77,.10),transparent_30%),#090a0e]">
      <div className="mx-auto w-full max-w-4xl px-4 py-10 md:px-6 md:py-16">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link className="text-sm font-black text-[#ffd08a] transition hover:text-white" href="/">
            ← {t("legal.backHome")}
          </Link>
          <nav aria-label={t("commercial.legalLinks")} className="flex items-center gap-2 text-xs font-bold">
            <Link className={`rounded-full border px-3 py-2 ${isTerms ? "border-[#ffb44d]/55 bg-[#ffb44d]/12 text-[#ffd08a]" : "border-white/10 text-white/55"}`} href="/terms">
              {t("commercial.terms")}
            </Link>
            <Link className={`rounded-full border px-3 py-2 ${!isTerms ? "border-[#ffb44d]/55 bg-[#ffb44d]/12 text-[#ffd08a]" : "border-white/10 text-white/55"}`} href="/privacy">
              {t("commercial.privacy")}
            </Link>
          </nav>
        </div>

        <header className="mt-8 rounded-[30px] border border-[#ffb44d]/18 bg-[#15161b]/92 p-6 md:p-9">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-[#ffb44d]/24 bg-[#ffb44d]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.18em] text-[#ffd08a]">
              {t("legal.betaLabel")}
            </span>
            <span className="text-xs font-bold text-white/38">{t("legal.updated")}</span>
          </div>
          <h1 className="mt-5 text-4xl font-black tracking-tight text-white md:text-5xl">{t(titleKey)}</h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-white/62">{t(introKey)}</p>
          <p className="mt-5 rounded-2xl border border-[#ffb44d]/14 bg-[#ffb44d]/[.06] p-4 text-sm leading-6 text-[#ffe0ab]/78">
            {t("legal.notice")}
          </p>
        </header>

        <main className="mt-6 grid gap-4">
          {sections.map(([sectionTitle, body]) => (
            <section className="rounded-[24px] border border-white/8 bg-white/[.025] p-5 md:p-6" key={sectionTitle}>
              <h2 className="text-lg font-black text-white">{t(sectionTitle)}</h2>
              <p className="mt-3 text-sm leading-7 text-white/58">{t(body)}</p>
            </section>
          ))}
        </main>

        <footer className="mt-6 rounded-[24px] border border-white/8 bg-white/[.025] p-5 text-sm leading-7 text-white/55">
          {tf("legal.contact", { email: activeBrand.supportEmail })}
        </footer>
      </div>
    </div>
  );
}
