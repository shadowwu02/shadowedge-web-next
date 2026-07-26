"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/useI18n";
import {
  createBetaUpgradeRequest,
  type BetaUpgradeTargetPlan,
} from "@/lib/beta-upgrade-request";
import type { EnterprisePlan } from "@/lib/enterprise-workspace-api";
import type { WorkspacePermission, WorkspaceRole } from "@/features/workspace/workspacePermissions";

const targetPlans: BetaUpgradeTargetPlan[] = ["TEAM", "BUSINESS", "ENTERPRISE"];
const planRank: Record<EnterprisePlan["planId"], number> = {
  FREE: 0,
  TEAM: 1,
  BUSINESS: 2,
  ENTERPRISE: 3,
};

export function canManageBetaUpgrade(
  role: WorkspaceRole | undefined,
  permissions: readonly WorkspacePermission[] | undefined,
  organizationWide = false,
) {
  return (
    (role === "OWNER" || (role === "ADMIN" && organizationWide)) &&
    Boolean(permissions?.includes("PLAN_MANAGE"))
  );
}

export function BetaUpgradeRequestCard({
  organizationId,
  currentPlan,
}: Readonly<{
  organizationId: string;
  currentPlan: EnterprisePlan["planId"];
}>) {
  const { t, tf } = useI18n();
  const availableTargets = targetPlans.filter((plan) => planRank[plan] > planRank[currentPlan]);
  const [open, setOpen] = useState(false);
  const [targetPlan, setTargetPlan] = useState<BetaUpgradeTargetPlan>(
    availableTargets[0] ?? "ENTERPRISE",
  );
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");

  const submit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const request = await createBetaUpgradeRequest({
        organizationId,
        currentPlan,
        targetPlan,
        reason,
      });
      setReference(request.requestId);
    } catch {
      setError(t("subscription.upgrade.error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-[24px] border border-violet-300/18 bg-violet-300/[.05] p-4">
      <span className="text-[10px] font-black uppercase tracking-[.16em] text-violet-200">{t("subscription.upgrade.eyebrow")}</span>
      <h3 className="mt-2 text-lg font-black text-white">{t("subscription.upgrade.title")}</h3>
      <p className="mt-2 text-xs leading-5 text-white/45">{t("subscription.upgrade.description")}</p>

      {reference ? (
        <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-300/[.06] p-4" role="status">
          <strong className="text-sm text-emerald-100">{t("subscription.upgrade.success")}</strong>
          <p className="mt-1 text-xs text-emerald-100/55">{tf("subscription.upgrade.reference", { reference })}</p>
          <p className="mt-2 text-[10px] leading-5 text-white/38">{t("subscription.upgrade.successBoundary")}</p>
        </div>
      ) : open ? (
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-xs font-bold text-white/60">{t("subscription.upgrade.target")}</span>
            <select
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none focus:border-violet-300/35"
              onChange={(event) => setTargetPlan(event.target.value as BetaUpgradeTargetPlan)}
              value={targetPlan}
            >
              {availableTargets.map((plan) => (
                <option key={plan} value={plan}>{t(`subscription.plan.${plan}` as const)}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-bold text-white/60">{t("subscription.upgrade.reason")}</span>
            <textarea
              className="mt-2 min-h-24 w-full resize-y rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-violet-300/35"
              maxLength={800}
              onChange={(event) => setReason(event.target.value)}
              placeholder={t("subscription.upgrade.reasonPlaceholder")}
              value={reason}
            />
          </label>
          {error ? <p className="text-xs font-bold text-rose-300" role="alert">{error}</p> : null}
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-2xl bg-violet-200 px-4 py-2.5 text-xs font-black text-[#17131e] disabled:opacity-50"
              disabled={submitting}
              onClick={() => void submit()}
              type="button"
            >
              {submitting ? t("subscription.upgrade.submitting") : t("subscription.upgrade.submit")}
            </button>
            <button
              className="rounded-2xl border border-white/10 px-4 py-2.5 text-xs font-black text-white/60"
              disabled={submitting}
              onClick={() => setOpen(false)}
              type="button"
            >
              {t("subscription.upgrade.cancel")}
            </button>
          </div>
        </div>
      ) : availableTargets.length ? (
        <button
          className="mt-4 rounded-2xl border border-violet-300/25 bg-violet-300/10 px-4 py-3 text-sm font-black text-violet-100 transition hover:bg-violet-300/15"
          onClick={() => setOpen(true)}
          type="button"
        >
          {t("subscription.upgrade.open")}
        </button>
      ) : (
        <p className="mt-4 rounded-2xl border border-white/8 bg-black/20 p-4 text-xs leading-5 text-white/45">
          {t("subscription.upgrade.highestPlan")}
        </p>
      )}
    </section>
  );
}
