"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { VideoModelLogo } from "@/components/video/VideoModelLogo";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useI18n } from "@/i18n/useI18n";
import { getImageHistory } from "@/lib/image-api";
import {
  getImageHistoryStableKey,
  getImageHistoryTime,
  isImageActiveStatus,
  isImageCompletedStatus,
  isImageFailedStatus,
} from "@/lib/image/imageHistoryUtils";
import { getImageHistoryModelLogoLookup } from "@/lib/image/imageModelLogo";
import { getVideoHistory } from "@/lib/video-api";
import { getSafeVideoHistoryView, getVideoHistoryStableKey, getVideoHistoryTime } from "@/lib/video/historyUtils";
import { formatCredits, formatTime, isVideoActiveStatus, isVideoCompletedStatus, isVideoFailedStatus } from "@/lib/utils";
import type { ImageHistoryItem } from "@/types/image";
import type { VideoTaskRecord } from "@/types/video";

type AccountActivityKind = "image" | "remake" | "video";
type AccountActivityStatus = "completed" | "failed" | "processing" | "unknown";

type AccountActivityItem = {
  cost: number;
  createdAtLabel: string;
  createdAtTime: number;
  jobId: string;
  key: string;
  kind: AccountActivityKind;
  modelLabel: string;
  modelLogoLookup: string;
  outputUrl: string;
  prompt: string;
  refunded: boolean;
  status: AccountActivityStatus;
};

type UsageSummary = {
  failedRefunded: number;
  image: number;
  remake: number;
  total: number;
  video: number;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function pickString(...values: unknown[]) {
  return values.find((value) => typeof value === "string" && value.trim()) as string | undefined;
}

function pickNumber(...values: unknown[]) {
  return values.map((value) => Number(value)).find((value) => Number.isFinite(value));
}

function getRemakeMeta(record: VideoTaskRecord) {
  const raw = asRecord(record);
  const request = asRecord(raw.request);
  const rawPayload = asRecord(raw.raw);
  const candidates = [
    asRecord(raw.meta),
    asRecord(raw.metadata),
    asRecord(request.meta),
    asRecord(rawPayload.meta),
    asRecord(raw.params),
    asRecord(raw.data),
  ];
  return candidates.find((item) => Object.keys(item).length) || {};
}

function isRemakeRecord(record: VideoTaskRecord) {
  const meta = getRemakeMeta(record);
  return meta.source === "remake" || meta.remake === true || meta.remake_source === "storyboard_shot";
}

function normalizeActivityStatus(status: unknown, kind: "image" | "video"): AccountActivityStatus {
  const value = String(status || "");
  if (kind === "image") {
    if (isImageFailedStatus(value)) return "failed";
    if (isImageCompletedStatus(value)) return "completed";
    if (isImageActiveStatus(value)) return "processing";
    return "unknown";
  }

  if (isVideoFailedStatus(value)) return "failed";
  if (isVideoCompletedStatus(value)) return "completed";
  if (isVideoActiveStatus(value)) return "processing";
  return "unknown";
}

function getImageCost(item: ImageHistoryItem) {
  return Math.max(0, pickNumber(item.cost, item.creditsCharged, item.meta?.clientCost, item.meta?.cost, item.meta?.credits, 0) || 0);
}

function getVideoCost(record: VideoTaskRecord) {
  const raw = asRecord(record);
  const meta = getRemakeMeta(record);
  return Math.max(
    0,
    pickNumber(
      raw.cost,
      raw.credits,
      raw.creditCost,
      raw.cost_credits,
      raw.costCredits,
      meta.cost,
      meta.credits,
      meta.creditCost,
      meta.clientCost,
      meta.cost_credits,
      0,
    ) || 0,
  );
}

function isImageRefunded(item: ImageHistoryItem) {
  const refundStatus = String(item.refundStatus || item.meta?.refundStatus || item.meta?.refund_status || "").toLowerCase();
  return Boolean(item.refunded || item.meta?.refunded || refundStatus.includes("refund"));
}

function isVideoRefunded(record: VideoTaskRecord, refundNotice = "") {
  const raw = asRecord(record);
  const meta = getRemakeMeta(record);
  const refundStatus = String(raw.refundStatus || raw.refund_status || meta.refundStatus || meta.refund_status || "").toLowerCase();
  return Boolean(raw.refunded || meta.refunded || refundStatus.includes("refund") || refundNotice);
}

function makeImageActivity(item: ImageHistoryItem): AccountActivityItem {
  const jobId = item.dbJobId || item.jobId || item.id || "";
  const createdAtTime = getImageHistoryTime(item);

  return {
    cost: getImageCost(item),
    createdAtLabel: formatTime(item.createdAt),
    createdAtTime,
    jobId,
    key: `image:${getImageHistoryStableKey(item, jobId || String(createdAtTime))}`,
    kind: "image",
    modelLabel: item.model || "Image",
    modelLogoLookup: getImageHistoryModelLogoLookup(item),
    outputUrl: item.outputUrl || item.outputUrls?.[0] || "",
    prompt: item.prompt || "",
    refunded: isImageRefunded(item),
    status: normalizeActivityStatus(item.status, "image"),
  };
}

function makeVideoActivity(record: VideoTaskRecord): AccountActivityItem {
  const view = getSafeVideoHistoryView(record);
  const kind: AccountActivityKind = isRemakeRecord(record) ? "remake" : "video";
  const createdAtTime = getVideoHistoryTime(record);
  const jobId = view.jobLabel === "--" ? getVideoHistoryStableKey(record, "") : view.jobLabel;

  return {
    cost: getVideoCost(record),
    createdAtLabel: view.createdAtLabel,
    createdAtTime,
    jobId,
    key: `${kind}:${getVideoHistoryStableKey(record, view.key)}`,
    kind,
    modelLabel: view.modelLabel || "Video",
    modelLogoLookup: [record.modelId, record.model, record.frontendModel, record.providerModel, record.provider, view.modelLabel].filter(Boolean).join(" "),
    outputUrl: view.outputUrl,
    prompt: view.title || "",
    refunded: isVideoRefunded(record, view.refundNotice),
    status: normalizeActivityStatus(view.status, "video"),
  };
}

function statusClass(status: AccountActivityStatus) {
  if (status === "failed") return "se-status-failed";
  if (status === "completed") return "se-status-completed";
  if (status === "processing") return "se-status-processing";
  return "se-status-neutral";
}

function sumUsage(items: AccountActivityItem[]): UsageSummary {
  return items.reduce<UsageSummary>(
    (summary, item) => {
      summary.total += item.cost;
      if (item.kind === "image") summary.image += item.cost;
      if (item.kind === "video") summary.video += item.cost;
      if (item.kind === "remake") summary.remake += item.cost;
      if (item.status === "failed" && item.refunded) summary.failedRefunded += 1;
      return summary;
    },
    { failedRefunded: 0, image: 0, remake: 0, total: 0, video: 0 },
  );
}

function sortByCreatedAt(items: AccountActivityItem[]) {
  return [...items].sort((left, right) => right.createdAtTime - left.createdAtTime);
}

function formatCreditLabel(value: number) {
  return formatCredits(Math.round(value * 100) / 100);
}

export function AccountCreditsPage() {
  const router = useRouter();
  const { isLoading, isSignedIn, profile, refresh } = useAuthSession();
  const { t, tf } = useI18n();
  const [activities, setActivities] = useState<AccountActivityItem[]>([]);
  const [activityError, setActivityError] = useState("");
  const [canCheckAuth, setCanCheckAuth] = useState(false);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);
  const hasAccountSession = Boolean(isSignedIn && profile?.email);

  const loadActivity = useCallback(async () => {
    setIsLoadingActivity(true);
    setActivityError("");

    const [imageResult, videoResult] = await Promise.allSettled([getImageHistory(50), getVideoHistory(80)]);
    const nextItems: AccountActivityItem[] = [];
    const errors: string[] = [];

    if (imageResult.status === "fulfilled") {
      nextItems.push(...imageResult.value.map(makeImageActivity));
    } else {
      errors.push(t("account.imageHistoryLoadFailed"));
    }

    if (videoResult.status === "fulfilled") {
      nextItems.push(...videoResult.value.map(makeVideoActivity));
    } else {
      errors.push(t("account.videoHistoryLoadFailed"));
    }

    setActivities(sortByCreatedAt(nextItems));
    setActivityError(errors.join(" "));
    setIsLoadingActivity(false);
  }, [t]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCanCheckAuth(true);
    }, 350);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!canCheckAuth || isLoading) return;
    if (!hasAccountSession) {
      router.replace("/sign-in?next=/account");
    }
  }, [canCheckAuth, hasAccountSession, isLoading, router]);

  useEffect(() => {
    if (!hasAccountSession) return;

    const timer = window.setTimeout(() => {
      void loadActivity();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [hasAccountSession, loadActivity]);

  const visibleActivities = useMemo(() => (hasAccountSession ? activities : []), [activities, hasAccountSession]);
  const visibleActivityError = hasAccountSession ? activityError : "";
  const usage = useMemo(() => sumUsage(visibleActivities), [visibleActivities]);
  const recentActivity = useMemo(() => visibleActivities.slice(0, 10), [visibleActivities]);
  const rawProfile = asRecord(profile);
  const creditsBalance = pickNumber(profile?.credits_balance, profile?.credits, rawProfile.creditsBalance, rawProfile.balance, 0) || 0;
  const maxConcurrency = pickNumber(profile?.max_concurrency, profile?.maxConcurrency, profile?.concurrency);
  const accountStatus = pickString(rawProfile.status, rawProfile.accountStatus, rawProfile.account_status) || (isSignedIn ? t("account.statusActive") : t("account.statusSignedOut"));

  const kindLabel = (kind: AccountActivityKind) => {
    if (kind === "image") return t("account.type.image");
    if (kind === "remake") return t("account.type.remake");
    return t("account.type.video");
  };

  const statusLabel = (status: AccountActivityStatus) => {
    if (status === "completed") return t("account.status.completed");
    if (status === "failed") return t("account.status.failed");
    if (status === "processing") return t("account.status.processing");
    return t("account.status.unknown");
  };

  const handleRefresh = () => {
    void refresh();
    if (hasAccountSession) void loadActivity();
  };

  const usageCards = [
    { label: t("account.imageUsage"), value: usage.image },
    { label: t("account.videoUsage"), value: usage.video },
    { label: t("account.remakeUsage"), value: usage.remake },
    { label: t("account.totalUsage"), value: usage.total },
  ];

  const quickActions = [
    { href: "/workspace/image", label: t("account.createImage") },
    { href: "/workspace/video", label: t("account.createVideo") },
    { href: "/history", label: t("account.viewHistory") },
    { href: "/pricing", label: t("account.pricing") },
  ];

  return (
    <div className="se-scrollbar h-full overflow-y-auto overflow-x-hidden">
      <div className="mx-auto flex min-h-full w-full max-w-[1480px] flex-col gap-4 pb-5">
        <section className="se-card-quiet rounded-[30px] p-5 md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="se-eyebrow">{t("account.overview")}</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-[#f4f4f4] md:text-4xl">{t("account.title")}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#b9b9b9]/62">{t("account.subtitle")}</p>
            </div>
            <button className="se-button-secondary min-h-10 rounded-full px-4 text-xs font-bold" disabled={isLoading || isLoadingActivity} onClick={handleRefresh} type="button">
              {isLoading || isLoadingActivity ? t("account.loading") : t("account.refresh")}
            </button>
          </div>
        </section>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <section className="grid gap-4 md:grid-cols-3">
              <div className="se-card-quiet rounded-[26px] p-4">
                <p className="se-eyebrow">{t("account.email")}</p>
                <p className="mt-3 break-all text-lg font-black text-[#f4f4f4]">{profile?.email || "--"}</p>
                <p className="mt-2 text-xs text-[#b9b9b9]/52">{isSignedIn ? t("account.signedIn") : t("account.signIn")}</p>
              </div>
              <div className="se-card-quiet rounded-[26px] p-4">
                <p className="se-eyebrow">{t("account.creditsBalance")}</p>
                <p className="mt-3 text-4xl font-black text-[#ffd08a]">{formatCreditLabel(creditsBalance)}</p>
                <p className="mt-2 text-xs text-[#b9b9b9]/52">{t("account.credits")}</p>
              </div>
              <div className="se-card-quiet rounded-[26px] p-4">
                <p className="se-eyebrow">{t("account.accountStatus")}</p>
                <p className="mt-3 text-lg font-black text-[#f4f4f4]">{accountStatus}</p>
                <p className="mt-2 text-xs text-[#b9b9b9]/52">
                  {maxConcurrency ? tf("account.maxConcurrencyValue", { count: maxConcurrency }) : t("account.maxConcurrencyUnknown")}
                </p>
              </div>
            </section>

            <section className="se-card-quiet rounded-[28px] p-4 md:p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="se-eyebrow">{t("account.creditsSummary")}</p>
                  <h2 className="mt-2 text-xl font-black text-[#f4f4f4]">{t("account.recentUsage")}</h2>
                </div>
                <p className="text-xs text-[#b9b9b9]/52">{t("account.basedOnRecentHistory")}</p>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {usageCards.map((card) => (
                  <div className="rounded-[20px] border border-white/8 bg-[#05070b]/46 p-4" key={card.label}>
                    <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#b9b9b9]/42">{card.label}</p>
                    <p className="mt-2 text-2xl font-black text-[#f4f4f4]">{tf("account.creditsUnit", { credits: formatCreditLabel(card.value) })}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded-[18px] border border-[#ffb44d]/16 bg-[#ffb44d]/8 px-3 py-2 text-xs leading-5 text-[#ffd08a]/74">
                {tf("account.failedRefundedCount", { count: usage.failedRefunded })}
              </div>
            </section>

            <section className="se-card-quiet rounded-[28px] p-4 md:p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="se-eyebrow">{t("account.recentActivity")}</p>
                  <h2 className="mt-2 text-xl font-black text-[#f4f4f4]">{tf("account.recentJobsCount", { count: recentActivity.length })}</h2>
                </div>
                <Link className="se-button-secondary inline-flex min-h-9 items-center justify-center rounded-full px-4 text-xs font-bold" href="/history">
                  {t("account.viewHistory")}
                </Link>
              </div>
              {visibleActivityError ? <div className="mt-4 rounded-[18px] border border-[#8c4632]/42 bg-[#2a1012]/72 px-3 py-2 text-xs leading-5 text-[#f2b3a1]">{visibleActivityError}</div> : null}
              <div className="mt-4 space-y-2">
                {isLoadingActivity && !recentActivity.length ? (
                  <div className="rounded-[22px] border border-dashed border-white/10 p-8 text-center text-sm text-[#b9b9b9]/54">{t("account.loadingActivity")}</div>
                ) : recentActivity.length ? (
                  recentActivity.map((item) => (
                    <article className="rounded-[20px] border border-white/8 bg-[#05070b]/42 p-3 transition-colors hover:border-[#ffb44d]/20" key={item.key}>
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-[#ffb44d]/20 bg-[#ffb44d]/10 px-2.5 py-1 text-[10px] font-black text-[#ffd08a]">{kindLabel(item.kind)}</span>
                            <span className={`se-status rounded-full px-2.5 py-1 text-[10px] font-black ${statusClass(item.status)}`}>{statusLabel(item.status)}</span>
                            <span className="se-pill rounded-full px-2.5 py-1 text-[10px]">{item.createdAtLabel}</span>
                          </div>
                          <p className="mt-2 line-clamp-2 text-sm font-semibold leading-5 text-[#f4f4f4]/78">{item.prompt || t("account.untitledActivity")}</p>
                          <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2 text-xs text-[#b9b9b9]/50">
                            <VideoModelLogo label={item.modelLabel} lookup={item.modelLogoLookup} size="sm" />
                            <span className="max-w-[220px] truncate font-semibold text-[#f4f4f4]/72">{item.modelLabel}</span>
                            <span>{tf("account.creditsUnit", { credits: formatCreditLabel(item.cost) })}</span>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          {item.outputUrl ? (
                            <a className="se-button-secondary inline-flex min-h-8 items-center rounded-full px-3 text-[11px] font-semibold" href={item.outputUrl} rel="noreferrer" target="_blank">
                              {t("account.open")}
                            </a>
                          ) : null}
                          <Link className="se-button-ghost inline-flex min-h-8 items-center rounded-full px-3 text-[11px] font-semibold" href="/history">
                            {t("account.viewInHistory")}
                          </Link>
                        </div>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="rounded-[22px] border border-dashed border-white/10 p-8 text-center">
                    <p className="text-sm font-black text-[#f4f4f4]">{t("account.activityEmpty")}</p>
                    <p className="mt-2 text-xs leading-5 text-[#b9b9b9]/52">{t("account.activityEmptyHint")}</p>
                  </div>
                )}
              </div>
            </section>
          </div>

          <aside className="space-y-4">
            <section className="se-card-quiet rounded-[28px] p-4">
              <p className="se-eyebrow">{t("account.quickActions")}</p>
              <div className="mt-4 grid gap-2">
                {quickActions.map((item) => (
                  <Link className="se-button-secondary flex min-h-11 items-center justify-between rounded-[18px] px-4 text-sm font-bold" href={item.href} key={item.href}>
                    <span>{item.label}</span>
                    <span aria-hidden="true">{"->"}</span>
                  </Link>
                ))}
              </div>
            </section>

            <section className="se-card-quiet rounded-[28px] p-4">
              <p className="se-eyebrow">{t("account.billingNote")}</p>
              <p className="mt-3 text-sm leading-6 text-[#f4f4f4]/72">{t("account.billingMigrationNote")}</p>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
