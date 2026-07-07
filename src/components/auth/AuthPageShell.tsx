"use client";

import type { ReactNode } from "react";
import Image from "next/image";
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

const goldCopyByMode: Record<AuthPageMode, { eyebrow: string; title: string; body: string }> = {
  signIn: {
    eyebrow: "Gold-Tide AI Creative Studio",
    title: "Sign in to Gold-Tide AI.",
    body: "Access your creative workspace, credits, and project history.",
  },
  signUp: {
    eyebrow: "Premium account",
    title: "Create your Gold-Tide AI account.",
    body: "Start a refined workspace for cinematic images, videos, prompts, and reference-led production.",
  },
  forgotPassword: {
    eyebrow: "Account recovery",
    title: "Recover your Gold-Tide AI access.",
    body: "Request a secure reset link for your creative account. The link will return you to Gold-Tide AI.",
  },
  resetPassword: {
    eyebrow: "Secure reset",
    title: "Set a new Gold-Tide AI password.",
    body: "Choose a strong password, then continue into your Gold-Tide AI workspace.",
  },
};

export function AuthPageShell({ children, mode }: { children: ReactNode; mode: AuthPageMode }) {
  const { locale, setLocale, t } = useI18n();
  const copy = copyByMode[mode];
  const isGoldTide = activeBrand.id === "newbrand";
  const goldCopy = goldCopyByMode[mode];

  return (
    <main
      className={
        isGoldTide
          ? "min-h-screen bg-[radial-gradient(circle_at_14%_8%,rgba(217,181,109,.16),transparent_34%),radial-gradient(circle_at_82%_12%,rgba(82,74,58,.22),transparent_32%),linear-gradient(180deg,#10100e,#070809)] px-5 py-8 text-white"
          : "min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(255,180,77,.16),transparent_34%),#08090d] px-5 py-8 text-white"
      }
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <Link
          className={
            isGoldTide
              ? "inline-flex items-center gap-3 text-sm font-black uppercase tracking-[.2em] text-[#f2d899]"
              : "text-sm font-black uppercase tracking-[.22em] text-[#ffcf83]"
          }
          href="/"
        >
          {isGoldTide ? (
            <span className="grid size-8 place-items-center rounded-full border border-[#d9b56d]/24 bg-[#15130f]">
              <Image alt={activeBrand.name} className="h-5 w-5 object-contain" height={32} src={activeBrand.assets.mark} width={32} />
            </span>
          ) : null}
          <span>{activeBrand.name}</span>
        </Link>
        <LanguageSwitch locale={locale} onChange={setLocale} />
      </div>

      <div className="mx-auto grid min-h-[calc(100vh-7rem)] max-w-6xl items-center gap-10 lg:grid-cols-[minmax(0,1fr)_460px]">
        <section className="max-w-2xl">
          <p className={`text-sm font-black uppercase tracking-[.24em] ${isGoldTide ? "text-[#d9b56d]" : "text-[#ffcf83]"}`}>
            {isGoldTide ? goldCopy.eyebrow : t(copy.eyebrow)}
          </p>
          <h2 className="mt-5 text-5xl font-black leading-tight tracking-tight md:text-7xl">{isGoldTide ? goldCopy.title : t(copy.title)}</h2>
          <p className="mt-6 max-w-xl text-lg leading-8 text-white/62">{isGoldTide ? goldCopy.body : t(copy.body)}</p>
          {isGoldTide ? (
            <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-3">
              {["Image", "Video", "Prompt"].map((item) => (
                <div className="rounded-2xl border border-[#d9b56d]/16 bg-[#d9b56d]/[.07] px-4 py-3 text-sm font-black text-[#f2d899]" key={item}>
                  {item}
                </div>
              ))}
            </div>
          ) : null}
        </section>

        {children}
      </div>
    </main>
  );
}
