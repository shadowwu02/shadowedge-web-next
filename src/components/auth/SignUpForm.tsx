"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { isAuthRateLimitError, registerWithPassword, signInWithPassword } from "@/lib/auth-api";
import { getSafeAuthNext } from "@/lib/auth-routes";
import { useI18n } from "@/i18n/useI18n";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
export function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const nextPath = useMemo(() => getSafeAuthNext(searchParams.get("next"), "/workspace/image"), [searchParams]);
  const signInHref = `/sign-in?next=${encodeURIComponent(nextPath)}`;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const passwordRules = [
    { key: "minLength", label: t("auth.passwordRuleMinLength"), passed: password.length >= 8 },
    { key: "uppercase", label: t("auth.passwordRuleUppercase"), passed: /[A-Z]/.test(password) },
    { key: "lowercase", label: t("auth.passwordRuleLowercase"), passed: /[a-z]/.test(password) },
    { key: "number", label: t("auth.passwordRuleNumber"), passed: /[0-9]/.test(password) },
    { key: "symbol", label: t("auth.passwordRuleSymbol"), passed: /[^A-Za-z0-9]/.test(password) },
  ];
  const isPasswordValid = passwordRules.every((rule) => rule.passed);
  const isEmailValid = isValidEmail(email.trim());
  const passwordsMatch = Boolean(confirmPassword) && password === confirmPassword;
  const canSubmit = isEmailValid && isPasswordValid && passwordsMatch && !isLoading;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");

    const cleanEmail = email.trim();
    if (!isValidEmail(cleanEmail)) {
      setStatus(t("auth.invalidEmail"));
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
      await registerWithPassword(cleanEmail, password);
      setStatus(t("auth.signUpSuccess"));

      try {
        await signInWithPassword(cleanEmail, password);
        router.replace(nextPath);
        router.refresh();
      } catch {
        router.replace(`/sign-in?registered=1&next=${encodeURIComponent(nextPath)}`);
      }
    } catch (error) {
      setStatus(isAuthRateLimitError(error) ? t("auth.tooManyAttempts") : error instanceof Error ? error.message : t("auth.registrationFailed"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-white/[.045] p-6 shadow-2xl shadow-black/35 md:p-8">
      <div className="mb-7">
        <p className="text-xs font-black uppercase tracking-[.22em] text-[#ffcf83]">{t("auth.accountLabel")}</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-white">{t("auth.createAccount")}</h1>
        <p className="mt-3 text-sm leading-6 text-white/58">{t("auth.signUpIntro")}</p>
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

        <label className="grid gap-2">
          <span className="text-xs font-bold uppercase tracking-[.16em] text-white/42">{t("auth.password")}</span>
          <div className="relative">
            <input
              autoComplete="new-password"
              className="h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 pr-20 text-sm font-semibold text-white outline-none transition placeholder:text-white/25 focus:border-[#ffb44d]/65 focus:ring-4 focus:ring-[#ffb44d]/10"
              onChange={(event) => setPassword(event.target.value)}
              placeholder={t("auth.passwordPlaceholder")}
              type={showPassword ? "text" : "password"}
              value={password}
            />
            <button
              aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl border border-white/10 bg-white/[.06] px-3 py-1 text-xs font-black text-[#ffcf83] transition hover:border-[#ffb44d]/50 hover:bg-[#ffb44d]/12 hover:text-[#ffe2ad]"
              onClick={() => setShowPassword((value) => !value)}
              type="button"
            >
              {showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
            </button>
          </div>
        </label>

        <div className="rounded-2xl border border-white/10 bg-black/24 p-3">
          <p className="text-xs font-bold uppercase tracking-[.14em] text-white/42">
            {t("auth.passwordRequirements")}
          </p>
          <ul className="mt-2 grid gap-1.5 text-xs leading-5">
            {passwordRules.map((rule) => (
              <li
                className={`flex items-center gap-2 ${rule.passed ? "text-[#9be7e7]" : "text-white/45"}`}
                key={rule.key}
              >
                <span
                  aria-hidden="true"
                  className={`grid h-4 w-4 place-items-center rounded-full text-[10px] font-black ${
                    rule.passed ? "bg-[#9be7e7]/16 text-[#9be7e7]" : "bg-white/[.08] text-white/40"
                  }`}
                >
                  {rule.passed ? "OK" : "-"}
                </span>
                <span>{rule.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <label className="grid gap-2">
          <span className="text-xs font-bold uppercase tracking-[.16em] text-white/42">{t("auth.confirmPassword")}</span>
          <div className="relative">
            <input
              autoComplete="new-password"
              className="h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 pr-20 text-sm font-semibold text-white outline-none transition placeholder:text-white/25 focus:border-[#ffb44d]/65 focus:ring-4 focus:ring-[#ffb44d]/10"
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder={t("auth.confirmPasswordPlaceholder")}
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
            />
            <button
              aria-label={showConfirmPassword ? t("auth.hidePassword") : t("auth.showPassword")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl border border-white/10 bg-white/[.06] px-3 py-1 text-xs font-black text-[#ffcf83] transition hover:border-[#ffb44d]/50 hover:bg-[#ffb44d]/12 hover:text-[#ffe2ad]"
              onClick={() => setShowConfirmPassword((value) => !value)}
              type="button"
            >
              {showConfirmPassword ? t("auth.hidePassword") : t("auth.showPassword")}
            </button>
          </div>
        </label>

        <p className="rounded-2xl border border-white/10 bg-black/24 p-3 text-xs leading-5 text-white/52">
          {t("auth.termsHint")}
        </p>

        <button
          className="se-button-primary mt-2 h-12 rounded-2xl px-5 text-sm font-black focus:outline-none focus:ring-4 focus:ring-[#f6a935]/20"
          disabled={!canSubmit}
          type="submit"
        >
          {isLoading ? t("auth.creatingAccount") : t("auth.signUp")}
        </button>
      </form>

      {status ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-black/24 p-3 text-sm leading-6 text-white/72">
          {status}
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-3 text-sm text-white/48 sm:flex-row sm:items-center sm:justify-between">
        <Link className="font-bold text-[#ffcf83] hover:text-[#ffc766]" href={signInHref}>
          {t("auth.alreadyHaveAccount")} {t("auth.signIn")}
        </Link>
        <span>{t("auth.continueAfterSignIn")}</span>
      </div>
    </div>
  );
}
