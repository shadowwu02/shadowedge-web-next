"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { LanguageSwitch } from "@/components/common/LanguageSwitch";
import { activeBrand } from "@/config/brand";
import { useI18n, type DictionaryKey } from "@/i18n/useI18n";

type AuthPageMode = "signIn" | "signUp" | "forgotPassword" | "resetPassword";

const copyByMode: Record<AuthPageMode, { eyebrow: DictionaryKey; title: DictionaryKey; body: DictionaryKey }> = {
  signIn: {
    eyebrow: "auth.pageEyebrow",
    title: "auth.signInHeroTitle",
    body: "auth.signInHeroBody",
  },
  signUp: {
    eyebrow: "auth.pageEyebrow",
    title: "auth.signUpHeroTitle",
    body: "auth.signUpHeroBody",
  },
  forgotPassword: {
    eyebrow: "auth.pageEyebrow",
    title: "auth.forgotPasswordHeroTitle",
    body: "auth.forgotPasswordHeroBody",
  },
  resetPassword: {
    eyebrow: "auth.pageEyebrow",
    title: "auth.resetPasswordHeroTitle",
    body: "auth.resetPasswordHeroBody",
  },
};

export function AuthPageShell({ children, mode }: { children: ReactNode; mode: AuthPageMode }) {
  const { locale, setLocale, t } = useI18n();
  const copy = copyByMode[mode];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(255,180,77,.16),transparent_34%),#08090d] px-5 py-8 text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <Link className="text-sm font-black uppercase tracking-[.22em] text-[#ffcf83]" href="/">
          {activeBrand.name}
        </Link>
        <LanguageSwitch locale={locale} onChange={setLocale} />
      </div>

      <div className="mx-auto grid min-h-[calc(100vh-7rem)] max-w-6xl items-center gap-10 lg:grid-cols-[minmax(0,1fr)_460px]">
        <section className="max-w-2xl">
          <p className="text-sm font-black uppercase tracking-[.24em] text-[#ffcf83]">{t(copy.eyebrow)}</p>
          <h2 className="mt-5 text-5xl font-black leading-tight tracking-tight md:text-7xl">{t(copy.title)}</h2>
          <p className="mt-6 max-w-xl text-lg leading-8 text-white/62">{t(copy.body)}</p>
        </section>

        {children}
      </div>
    </main>
  );
}
