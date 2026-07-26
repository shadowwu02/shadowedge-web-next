"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BetaBadge } from "@/components/feedback/BetaFeedbackCenter";
import { useI18n } from "@/i18n/useI18n";
import {
  getEnterpriseOrganization,
  getEnterpriseOrganizationPlan,
  listEnterpriseOrganizations,
} from "@/lib/enterprise-workspace-api";

type AccountWorkspaceState = {
  organizationCount: number;
  workspaceCount: number;
  role: string;
  plan: string;
};

export function AccountWorkspaceSummary() {
  const { t, tf } = useI18n();
  const [state, setState] = useState<AccountWorkspaceState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const organizations = await listEnterpriseOrganizations();
          if (controller.signal.aborted) return;
          if (!organizations.organizations.length) {
            setState({ organizationCount: 0, workspaceCount: 0, role: "", plan: "" });
            return;
          }
          const primary = organizations.organizations[0];
          const detail = await getEnterpriseOrganization(primary.organizationId);
          let plan = "";
          if (detail.currentAccess.permissions.includes("PLAN_VIEW")) {
            plan = (await getEnterpriseOrganizationPlan(primary.organizationId)).plan.name;
          }
          if (!controller.signal.aborted) {
            setState({
              organizationCount: organizations.organizations.length,
              workspaceCount: detail.workspaces.length,
              role: detail.currentAccess.role,
              plan,
            });
          }
        } catch {
          if (!controller.signal.aborted) {
            setState({ organizationCount: 0, workspaceCount: 0, role: "", plan: "" });
          }
        } finally {
          if (!controller.signal.aborted) setLoading(false);
        }
      })();
    }, 0);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <section className="se-card-quiet rounded-[28px] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="se-eyebrow">{t("workspace.account.enterprise")}</p>
        <BetaBadge />
      </div>
      <p className="mt-3 text-sm leading-6 text-[#f4f4f4]/72">{t("workspace.account.enterpriseDescription")}</p>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-2xl border border-white/8 bg-black/20 p-3">
          <span className="text-white/38">{t("workspace.currentOrganization")}</span>
          <strong className="mt-1 block text-white">
            {loading ? "—" : tf("workspace.account.organizationCount", { count: state?.organizationCount ?? 0 })}
          </strong>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/20 p-3">
          <span className="text-white/38">{t("workspace.currentWorkspace")}</span>
          <strong className="mt-1 block text-white">
            {loading ? "—" : tf("workspace.account.workspaceCount", { count: state?.workspaceCount ?? 0 })}
          </strong>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/20 p-3">
          <span className="text-white/38">{t("workspace.role")}</span>
          <strong className="mt-1 block text-white">{state?.role || "—"}</strong>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/20 p-3">
          <span className="text-white/38">{t("workspace.plan")}</span>
          <strong className="mt-1 block text-white">
            {state?.organizationCount ? state.plan || t("workspace.account.planRestricted") : t("workspace.plan.freeCompatibility")}
          </strong>
        </div>
      </div>
      {!loading && !state?.organizationCount ? (
        <p className="mt-3 text-xs leading-5 text-white/40">{t("workspace.account.noOrganization")}</p>
      ) : null}
      <Link
        className="mt-4 inline-flex w-full justify-center rounded-2xl border border-[#d9b56d]/25 bg-[#d9b56d]/10 px-4 py-3 text-sm font-black text-[#f2d899]"
        href="/workspace"
      >
        {t("workspace.account.open")}
      </Link>
    </section>
  );
}
