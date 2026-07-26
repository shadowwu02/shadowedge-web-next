"use client";

import { useI18n, type DictionaryKey } from "@/i18n/useI18n";
import type {
  EnterpriseEntitlementLimit,
  EnterpriseEntitlementsResponse,
} from "@/lib/enterprise-workspace-api";

const featureKeys: Record<string, DictionaryKey> = {
  USAGE_METERING: "workspace.feature.usageMetering",
  PROJECT_WORKSPACE: "workspace.feature.projectWorkspace",
  TEAM_COLLABORATION: "workspace.feature.teamCollaboration",
  CLIENT_REVIEW: "workspace.feature.clientReview",
  OPERATIONS_INTELLIGENCE: "workspace.feature.operationsIntelligence",
  GOVERNANCE_REPORTS: "workspace.feature.governanceReports",
  ENTERPRISE_POLICY: "workspace.feature.enterprisePolicy",
  DEDICATED_WORKSPACES: "workspace.feature.dedicatedWorkspaces",
};

function formatNumber(value: number | null, unlimited: string) {
  return value === null ? unlimited : new Intl.NumberFormat().format(value);
}

function formatStorage(value: number | null, unlimited: string) {
  if (value === null) return unlimited;
  if (value < 1_000_000_000) return `${Math.round(value / 1_000_000)} MB`;
  return `${Math.round(value / 1_000_000_000)} GB`;
}

function LimitCard({
  label,
  limit,
  storage = false,
}: Readonly<{
  label: string;
  limit: EnterpriseEntitlementLimit;
  storage?: boolean;
}>) {
  const { t, tf } = useI18n();
  const format = storage ? formatStorage : formatNumber;
  return (
    <div className="rounded-2xl border border-white/8 bg-black/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold text-white/42">{label}</span>
        <span className="rounded-full border border-white/8 px-2 py-0.5 text-[8px] font-black text-white/38">
          {t(`subscription.limit.status.${limit.status}` as DictionaryKey)}
        </span>
      </div>
      <strong className="mt-2 block text-lg text-white">
        {format(limit.current, t("subscription.unlimited"))} / {format(limit.limit, t("subscription.unlimited"))}
      </strong>
      <span className="mt-1 block text-[10px] text-white/35">
        {limit.available === null
          ? t(limit.status === "SCOPE_INCOMPLETE" ? "subscription.limit.partial" : "subscription.unlimited")
          : tf("subscription.limit.available", { value: format(limit.available, t("subscription.unlimited")) })}
      </span>
    </div>
  );
}

export function PlanEntitlementDetails({
  data,
  compact = false,
}: Readonly<{
  data: EnterpriseEntitlementsResponse;
  compact?: boolean;
}>) {
  const { t } = useI18n();
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[.16em] text-amber-200">{t("subscription.currentPlan")}</span>
          <h2 className="mt-2 text-2xl font-black text-white">{data.plan.name}</h2>
        </div>
        <span className="rounded-full border border-emerald-300/20 bg-emerald-300/[.07] px-3 py-1 text-[9px] font-black text-emerald-200">
          {t("subscription.betaPlan")}
        </span>
      </div>

      <div className={`mt-4 grid gap-2 ${compact ? "grid-cols-1" : "sm:grid-cols-3"}`}>
        <LimitCard label={t("subscription.limit.usage")} limit={data.entitlements.usageLimit} />
        <LimitCard label={t("subscription.limit.members")} limit={data.entitlements.memberLimit} />
        <LimitCard label={t("subscription.limit.storage")} limit={data.entitlements.storageLimit} storage />
      </div>

      <strong className="mt-5 block text-xs text-white/60">{t("subscription.entitlements")}</strong>
      <div className="mt-2 flex flex-wrap gap-2">
        {data.entitlements.featureAccess.map(({ feature, allowed }) => (
          <span
            className={`rounded-full border px-2.5 py-1 text-[9px] font-bold ${
              allowed
                ? "border-amber-300/15 bg-amber-300/[.06] text-amber-100"
                : "border-white/8 bg-white/[.03] text-white/30"
            }`}
            key={feature}
          >
            {featureKeys[feature] ? t(featureKeys[feature]) : feature.replaceAll("_", " ")}
          </span>
        ))}
      </div>
      <p className="mt-4 text-[10px] leading-5 text-white/35">{t("subscription.displayOnly")}</p>
    </div>
  );
}
