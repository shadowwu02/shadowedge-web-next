"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useI18n } from "@/i18n/useI18n";
import {
  getBetaReleaseVersion,
  getSafeFeedbackPath,
  submitBetaFeedback,
  type BetaFeedbackCategory,
  type BetaFeedbackErrorType,
  type BetaFeedbackReceipt,
} from "@/lib/beta-feedback-api";

type FeedbackEntry = "dashboard" | "studio" | "account";

type BetaFeedbackCenterProps = {
  appearance?: "card" | "compact";
  entry: FeedbackEntry;
};

const categoryKeys = {
  BUG_REPORT: "beta.feedback.type.bug",
  FEATURE_REQUEST: "beta.feedback.type.feature",
  UX_FEEDBACK: "beta.feedback.type.ux",
} as const;

const errorTypeKeys = {
  AUTH_ERROR: "beta.feedback.error.auth",
  NETWORK_ERROR: "beta.feedback.error.network",
  PAGE_ERROR: "beta.feedback.error.page",
  WORKFLOW_ERROR: "beta.feedback.error.workflow",
  OTHER: "beta.feedback.error.other",
} as const;

function currentPathname() {
  return typeof window === "undefined" ? "/" : getSafeFeedbackPath(window.location.pathname);
}

export function BetaBadge() {
  const { t, tf } = useI18n();
  const version = getBetaReleaseVersion();
  return (
    <span
      aria-label={`${t("beta.badge.label")} · ${tf("beta.badge.version", { version })}`}
      className="inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-300/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[.14em] text-amber-200"
    >
      <span>{t("beta.badge.label")}</span>
      <span className="text-amber-100/50">{version}</span>
    </span>
  );
}

export function BetaFeedbackCenter({
  appearance = "card",
  entry,
}: Readonly<BetaFeedbackCenterProps>) {
  const { locale, t, tf } = useI18n();
  const { isLoading, isSignedIn } = useAuthSession();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<BetaFeedbackCategory>("BUG_REPORT");
  const [errorType, setErrorType] = useState<BetaFeedbackErrorType>("PAGE_ERROR");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [actionPath, setActionPath] = useState("");
  const [pageSource, setPageSource] = useState("/");
  const [occurredAt, setOccurredAt] = useState("");
  const [receipt, setReceipt] = useState<BetaFeedbackReceipt | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const version = getBetaReleaseVersion();

  const entryLabel = t(`beta.feedback.entry.${entry}` as const);
  const occurredAtLabel = useMemo(() => {
    if (!occurredAt) return "";
    return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(occurredAt));
  }, [locale, occurredAt]);

  const openDialog = () => {
    const now = new Date().toISOString();
    setPageSource(currentPathname());
    setOccurredAt(now);
    setError("");
    setReceipt(null);
    setOpen(true);
  };

  const closeDialog = () => {
    if (submitting) return;
    setOpen(false);
  };

  const resetForm = () => {
    setCategory("BUG_REPORT");
    setErrorType("PAGE_ERROR");
    setTitle("");
    setDescription("");
    setActionPath("");
    setError("");
    setReceipt(null);
    setOccurredAt(new Date().toISOString());
  };

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, submitting]);

  const submit = async () => {
    if (!title.trim() || !description.trim()) {
      setError(t("beta.feedback.error.required"));
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const nextReceipt = await submitBetaFeedback({
        category,
        title,
        description,
        locale,
        appVersion: version,
        source: pageSource,
        ...(category === "BUG_REPORT"
          ? {
              errorReport: {
                errorType,
                pageSource,
                occurredAt,
                actionPath,
              },
            }
          : {}),
      });
      setReceipt(nextReceipt);
    } catch {
      setError(t("beta.feedback.error.submit"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {appearance === "compact" ? (
        <button
          className="w-full rounded-2xl border border-amber-300/20 bg-amber-300/[.055] p-3 text-left transition hover:border-amber-300/35 hover:bg-amber-300/[.08]"
          onClick={openDialog}
          type="button"
        >
          <div className="flex items-center justify-between gap-3">
            <BetaBadge />
            <span className="text-[10px] font-black text-amber-100/55">{entryLabel}</span>
          </div>
          <strong className="mt-3 block text-sm text-white">{t("beta.feedback.open")}</strong>
        </button>
      ) : (
        <section className="rounded-[24px] border border-amber-300/18 bg-[linear-gradient(145deg,rgba(252,211,77,.07),rgba(255,255,255,.02))] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <BetaBadge />
            <span className="text-[10px] font-black uppercase tracking-[.14em] text-white/35">{entryLabel}</span>
          </div>
          <h2 className="mt-4 text-lg font-black text-white">{t("beta.status.title")}</h2>
          <p className="mt-2 text-xs leading-5 text-white/48">{t("beta.status.description")}</p>
          <button
            className="mt-4 inline-flex min-h-10 items-center justify-center rounded-2xl border border-amber-300/25 bg-amber-300/10 px-4 text-sm font-black text-amber-100 transition hover:bg-amber-300/15"
            onClick={openDialog}
            type="button"
          >
            {t("beta.feedback.open")}
          </button>
        </section>
      )}

      {open ? (
        <div
          aria-label={t("beta.feedback.dialogAria")}
          aria-modal="true"
          className="fixed inset-0 z-[120] grid place-items-center overflow-y-auto bg-black/80 p-4 backdrop-blur-md"
          role="dialog"
        >
          <section className="my-auto w-full max-w-2xl overflow-hidden rounded-[28px] border border-amber-300/20 bg-[radial-gradient(circle_at_top_right,rgba(252,211,77,.12),transparent_38%),#10100f] shadow-2xl shadow-black/60">
            <header className="flex items-start justify-between gap-4 border-b border-white/8 p-5 md:p-6">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-[10px] font-black uppercase tracking-[.18em] text-amber-200">{t("beta.feedback.eyebrow")}</span>
                  <BetaBadge />
                </div>
                <h2 className="mt-3 text-2xl font-black text-white">{t("beta.feedback.title")}</h2>
                <p className="mt-2 text-sm leading-6 text-white/50">{t("beta.feedback.description")}</p>
              </div>
              <button
                aria-label={t("beta.feedback.close")}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[.04] text-lg text-white/60"
                onClick={closeDialog}
                type="button"
              >
                ×
              </button>
            </header>

            {isLoading ? (
              <div className="grid min-h-52 place-items-center p-6 text-sm font-bold text-white/45">{t("dashboard.loading")}</div>
            ) : !isSignedIn ? (
              <div className="p-6 text-center md:p-8">
                <h3 className="text-xl font-black text-white">{t("beta.feedback.signInTitle")}</h3>
                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/50">{t("beta.feedback.signInMessage")}</p>
                <Link
                  className="mt-6 inline-flex rounded-2xl bg-amber-300 px-5 py-3 text-sm font-black text-[#11100e]"
                  href={`/sign-in?next=${encodeURIComponent(pageSource)}`}
                >
                  {t("beta.feedback.signIn")}
                </Link>
              </div>
            ) : receipt ? (
              <div className="p-6 text-center md:p-8" role="status">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-emerald-300/25 bg-emerald-300/10 text-2xl text-emerald-200">✓</div>
                <h3 className="mt-5 text-xl font-black text-white">{t("beta.feedback.successTitle")}</h3>
                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/50">
                  {tf("beta.feedback.successMessage", { reference: receipt.reference })}
                </p>
                <button
                  className="mt-6 rounded-2xl border border-white/12 bg-white/[.04] px-5 py-3 text-sm font-black text-white"
                  onClick={resetForm}
                  type="button"
                >
                  {t("beta.feedback.sendAnother")}
                </button>
              </div>
            ) : (
              <div className="space-y-5 p-5 md:p-6">
                <label className="block">
                  <span className="text-xs font-black text-white/70">{t("beta.feedback.type")}</span>
                  <select
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none focus:border-amber-300/40"
                    onChange={(event) => setCategory(event.target.value as BetaFeedbackCategory)}
                    value={category}
                  >
                    {(Object.keys(categoryKeys) as BetaFeedbackCategory[]).map((value) => (
                      <option key={value} value={value}>{t(categoryKeys[value])}</option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs font-black text-white/70">{t("beta.feedback.summary")}</span>
                  <input
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-amber-300/40"
                    maxLength={160}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder={t("beta.feedback.summaryPlaceholder")}
                    value={title}
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-black text-white/70">{t("beta.feedback.details")}</span>
                  <textarea
                    className="mt-2 min-h-28 w-full resize-y rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-white/25 focus:border-amber-300/40"
                    maxLength={3000}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder={t("beta.feedback.detailsPlaceholder")}
                    value={description}
                  />
                </label>

                {category === "BUG_REPORT" ? (
                  <div className="grid gap-4 rounded-2xl border border-white/8 bg-white/[.025] p-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-xs font-black text-white/70">{t("beta.feedback.errorType")}</span>
                      <select
                        className="mt-2 w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2.5 text-sm text-white outline-none"
                        onChange={(event) => setErrorType(event.target.value as BetaFeedbackErrorType)}
                        value={errorType}
                      >
                        {(Object.keys(errorTypeKeys) as BetaFeedbackErrorType[]).map((value) => (
                          <option key={value} value={value}>{t(errorTypeKeys[value])}</option>
                        ))}
                      </select>
                    </label>
                    <div>
                      <span className="text-xs font-black text-white/70">{t("beta.feedback.pageSource")}</span>
                      <strong className="mt-2 block rounded-xl border border-white/8 bg-black/25 px-3 py-2.5 text-sm text-white/65">{pageSource}</strong>
                    </div>
                    <label className="block sm:col-span-2">
                      <span className="text-xs font-black text-white/70">{t("beta.feedback.actionPath")}</span>
                      <input
                        className="mt-2 w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/25"
                        maxLength={800}
                        onChange={(event) => setActionPath(event.target.value)}
                        placeholder={t("beta.feedback.actionPathPlaceholder")}
                        value={actionPath}
                      />
                    </label>
                    <div className="sm:col-span-2">
                      <span className="text-xs font-black text-white/70">{t("beta.feedback.occurredAt")}</span>
                      <strong className="mt-1 block text-xs text-white/45">{occurredAtLabel}</strong>
                    </div>
                  </div>
                ) : null}

                <div className="rounded-2xl border border-sky-300/15 bg-sky-300/[.045] p-4">
                  <strong className="text-xs text-sky-100">{t("beta.feedback.privacyTitle")}</strong>
                  <p className="mt-2 text-xs leading-5 text-sky-100/55">{t("beta.feedback.privacyMessage")}</p>
                </div>

                {error ? <div className="rounded-2xl border border-red-300/20 bg-red-300/[.06] p-3 text-sm text-red-100" role="alert">{error}</div> : null}

                <div className="flex justify-end gap-3">
                  <button
                    className="rounded-2xl border border-white/12 bg-white/[.04] px-4 py-3 text-sm font-black text-white/70"
                    onClick={closeDialog}
                    type="button"
                  >
                    {t("beta.feedback.close")}
                  </button>
                  <button
                    className="rounded-2xl bg-amber-300 px-5 py-3 text-sm font-black text-[#11100e] disabled:opacity-50"
                    disabled={submitting}
                    onClick={() => void submit()}
                    type="button"
                  >
                    {submitting ? t("beta.feedback.submitting") : t("beta.feedback.submit")}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}
