"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PasswordRuleList } from "@/components/auth/PasswordRuleList";
import { activeBrand } from "@/config/brand";
import { isAuthRateLimitError, isInvalidResetLinkError, resetPassword } from "@/lib/auth-api";
import { isStrongAuthPassword } from "@/lib/auth-password";
import { useI18n } from "@/i18n/useI18n";

type RecoveryCredential = {
  code: string;
  accessToken: string;
  refreshToken: string;
};

function readRecoveryCredential(): RecoveryCredential {
  if (typeof window === "undefined") return { code: "", accessToken: "", refreshToken: "" };

  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));

  return {
    code: query.get("code") || hash.get("code") || "",
    accessToken: hash.get("access_token") || query.get("access_token") || "",
    refreshToken: hash.get("refresh_token") || query.get("refresh_token") || "",
  };
}

export function ResetPasswordForm() {
  const router = useRouter();
  const { t } = useI18n();
  const [credential, setCredential] = useState<RecoveryCredential>({ code: "", accessToken: "", refreshToken: "" });
  const [isCredentialReady, setIsCredentialReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const hasResetCredential = Boolean(credential.code || credential.accessToken);
  const isPasswordValid = isStrongAuthPassword(password);
  const passwordsMatch = Boolean(confirmPassword) && password === confirmPassword;
  const canSubmit = hasResetCredential && isPasswordValid && passwordsMatch && !isLoading;
  const isGoldTide = activeBrand.id === "newbrand";
  const cardClass = isGoldTide
    ? "w-full max-w-md rounded-[28px] border border-[#d9b56d]/20 bg-[#12110f]/88 p-6 shadow-2xl shadow-black/45 md:p-8"
    : "w-full max-w-md rounded-[28px] border border-white/10 bg-white/[.045] p-6 shadow-2xl shadow-black/35 md:p-8";
  const passwordInputClass = isGoldTide
    ? "h-12 w-full rounded-2xl border border-[#d9b56d]/14 bg-black/30 px-4 pr-20 text-sm font-semibold text-white outline-none transition placeholder:text-white/25 focus:border-[#d9b56d]/70 focus:ring-4 focus:ring-[#d9b56d]/10"
    : "h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 pr-20 text-sm font-semibold text-white outline-none transition placeholder:text-white/25 focus:border-[#ffb44d]/65 focus:ring-4 focus:ring-[#ffb44d]/10";
  const toggleClass = isGoldTide
    ? "absolute right-2 top-1/2 -translate-y-1/2 rounded-xl border border-[#d9b56d]/16 bg-[#d9b56d]/[.07] px-3 py-1 text-xs font-black text-[#f2d899] transition hover:border-[#d9b56d]/50 hover:bg-[#d9b56d]/12 disabled:cursor-not-allowed disabled:opacity-50"
    : "absolute right-2 top-1/2 -translate-y-1/2 rounded-xl border border-white/10 bg-white/[.06] px-3 py-1 text-xs font-black text-[#ffcf83] transition hover:border-[#ffb44d]/50 hover:bg-[#ffb44d]/12 hover:text-[#ffe2ad]";
  const primaryButtonClass = isGoldTide
    ? "mt-2 h-12 rounded-2xl bg-[#d9b56d] px-5 text-sm font-black text-[#10100e] transition hover:bg-[#f2d899] focus:outline-none focus:ring-4 focus:ring-[#d9b56d]/20 disabled:cursor-not-allowed disabled:opacity-50"
    : "se-button-primary mt-2 h-12 rounded-2xl px-5 text-sm font-black focus:outline-none focus:ring-4 focus:ring-[#f6a935]/20";

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextCredential = readRecoveryCredential();
      setCredential(nextCredential);
      setIsCredentialReady(true);

      if (nextCredential.code || nextCredential.accessToken || window.location.hash) {
        window.history.replaceState(null, "", "/reset-password");
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const initialStatus = useMemo(() => {
    if (!isCredentialReady) return "";
    return hasResetCredential ? "" : t("auth.invalidResetLink");
  }, [hasResetCredential, isCredentialReady, t]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");

    if (!hasResetCredential) {
      setStatus(t("auth.invalidResetLink"));
      return;
    }

    if (!isPasswordValid) {
      setStatus(t("auth.passwordRequirementsError"));
      return;
    }

    if (password !== confirmPassword) {
      setStatus(t("auth.passwordMismatch"));
      return;
    }

    setIsLoading(true);

    try {
      await resetPassword({
        password,
        code: credential.code,
        accessToken: credential.accessToken,
        refreshToken: credential.refreshToken,
      });
      router.replace("/sign-in?reset=1");
      router.refresh();
    } catch (error) {
      if (isAuthRateLimitError(error)) {
        setStatus(t("auth.tooManyAttempts"));
      } else if (isInvalidResetLinkError(error)) {
        setStatus(t("auth.invalidResetLink"));
      } else {
        setStatus(t("auth.resetPasswordFailed"));
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={cardClass}>
      <div className="mb-7">
        <p className={`text-xs font-black uppercase tracking-[.22em] ${isGoldTide ? "text-[#d9b56d]" : "text-[#ffcf83]"}`}>
          {isGoldTide ? "Gold-Tide secure reset" : t("auth.accountLabel")}
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-white">{isGoldTide ? "Set a new Gold-Tide AI password" : t("auth.resetPassword")}</h1>
        <p className="mt-3 text-sm leading-6 text-white/58">
          {isGoldTide ? "Choose a strong password, then continue into your Gold-Tide AI workspace." : t("auth.resetPasswordIntro")}
        </p>
      </div>

      <form className="grid gap-4" onSubmit={handleSubmit}>
        <label className="grid gap-2">
          <span className="text-xs font-bold uppercase tracking-[.16em] text-white/42">{t("auth.newPassword")}</span>
          <div className="relative">
            <input
              autoComplete="new-password"
              className={passwordInputClass}
              disabled={!hasResetCredential}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={t("auth.passwordPlaceholder")}
              type={showPassword ? "text" : "password"}
              value={password}
            />
            <button
              aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
              className={toggleClass}
              disabled={!hasResetCredential}
              onClick={() => setShowPassword((value) => !value)}
              type="button"
            >
              {showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
            </button>
          </div>
        </label>

        <PasswordRuleList password={password} />

        <label className="grid gap-2">
          <span className="text-xs font-bold uppercase tracking-[.16em] text-white/42">{t("auth.confirmNewPassword")}</span>
          <div className="relative">
            <input
              autoComplete="new-password"
              className={passwordInputClass}
              disabled={!hasResetCredential}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder={t("auth.confirmPasswordPlaceholder")}
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
            />
            <button
              aria-label={showConfirmPassword ? t("auth.hidePassword") : t("auth.showPassword")}
              className={toggleClass}
              disabled={!hasResetCredential}
              onClick={() => setShowConfirmPassword((value) => !value)}
              type="button"
            >
              {showConfirmPassword ? t("auth.hidePassword") : t("auth.showPassword")}
            </button>
          </div>
        </label>

        <button
          className={primaryButtonClass}
          disabled={!canSubmit}
          type="submit"
        >
          {isLoading ? t("auth.resettingPassword") : t("auth.resetPassword")}
        </button>
      </form>

      {status || initialStatus ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-black/24 p-3 text-sm leading-6 text-white/72">
          {status || initialStatus}
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-3 text-sm text-white/48 sm:flex-row sm:items-center sm:justify-between">
        <Link className={`font-bold ${isGoldTide ? "text-[#d9b56d] hover:text-[#f2d899]" : "text-[#ffcf83] hover:text-[#ffc766]"}`} href="/sign-in">
          {t("auth.backToSignIn")}
        </Link>
        <span>{t("auth.passwordResetSafety")}</span>
      </div>
    </div>
  );
}
