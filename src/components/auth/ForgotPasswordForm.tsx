"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { isAuthRateLimitError, requestPasswordReset } from "@/lib/auth-api";
import { useI18n } from "@/i18n/useI18n";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function ForgotPasswordForm() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");

    const cleanEmail = email.trim();
    if (!isValidEmail(cleanEmail)) {
      setStatus(t("auth.invalidEmail"));
      return;
    }

    setIsLoading(true);

    try {
      await requestPasswordReset(cleanEmail);
      setStatus(t("auth.resetLinkSent"));
    } catch (error) {
      setStatus(isAuthRateLimitError(error) ? t("auth.tooManyAttempts") : t("auth.resetPasswordFailed"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-white/[.045] p-6 shadow-2xl shadow-black/35 md:p-8">
      <div className="mb-7">
        <p className="text-xs font-black uppercase tracking-[.22em] text-[#ffcf83]">{t("auth.accountLabel")}</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-white">{t("auth.forgotPassword")}</h1>
        <p className="mt-3 text-sm leading-6 text-white/58">{t("auth.forgotPasswordIntro")}</p>
      </div>

      <form className="grid gap-4" onSubmit={handleSubmit}>
        <label className="grid gap-2">
          <span className="text-xs font-bold uppercase tracking-[.16em] text-white/42">{t("auth.email")}</span>
          <input
            autoComplete="email"
            className="h-12 rounded-2xl border border-white/10 bg-black/30 px-4 text-sm font-semibold text-white outline-none transition placeholder:text-white/25 focus:border-[#ffb44d]/65 focus:ring-4 focus:ring-[#ffb44d]/10"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            type="email"
            value={email}
          />
        </label>

        <button
          className="se-button-primary mt-2 h-12 rounded-2xl px-5 text-sm font-black focus:outline-none focus:ring-4 focus:ring-[#f6a935]/20"
          disabled={isLoading}
          type="submit"
        >
          {isLoading ? t("auth.sendingResetLink") : t("auth.sendResetLink")}
        </button>
      </form>

      {status ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-black/24 p-3 text-sm leading-6 text-white/72">
          {status}
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-3 text-sm text-white/48 sm:flex-row sm:items-center sm:justify-between">
        <Link className="font-bold text-[#ffcf83] hover:text-[#ffc766]" href="/sign-in">
          {t("auth.backToSignIn")}
        </Link>
        <span>{t("auth.checkYourEmail")}</span>
      </div>
    </div>
  );
}
