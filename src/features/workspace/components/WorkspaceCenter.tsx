"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BetaBadge } from "@/components/feedback/BetaFeedbackCenter";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useI18n, type DictionaryKey } from "@/i18n/useI18n";
import {
  getEnterpriseOrganization,
  getEnterpriseOrganizationPlan,
  getEnterpriseWorkspace,
  getEnterpriseWorkspaceMembers,
  getEnterpriseWorkspaceUsage,
  listEnterpriseOrganizations,
  type EnterpriseOrganization,
  type EnterpriseOrganizationResponse,
  type EnterprisePlanResponse,
  type EnterpriseUsageResponse,
  type EnterpriseWorkspaceMembersResponse,
  type EnterpriseWorkspaceResponse,
} from "@/lib/enterprise-workspace-api";
import {
  WORKSPACE_ROLES,
  hasWorkspacePermission,
  type WorkspacePermission,
  type WorkspaceRole,
} from "@/features/workspace/workspacePermissions";

const roleKeys: Record<WorkspaceRole, DictionaryKey> = {
  OWNER: "workspace.roles.owner",
  ADMIN: "workspace.roles.admin",
  MANAGER: "workspace.roles.manager",
  CREATOR: "workspace.roles.creator",
  REVIEWER: "workspace.roles.reviewer",
  VIEWER: "workspace.roles.viewer",
};

const roleDetailKeys: Record<WorkspaceRole, DictionaryKey> = {
  OWNER: "workspace.roles.owner.detail",
  ADMIN: "workspace.roles.admin.detail",
  MANAGER: "workspace.roles.manager.detail",
  CREATOR: "workspace.roles.creator.detail",
  REVIEWER: "workspace.roles.reviewer.detail",
  VIEWER: "workspace.roles.viewer.detail",
};

const permissionKeys: Record<WorkspacePermission, DictionaryKey> = {
  WORKSPACE_VIEW: "workspace.permission.workspaceView",
  WORKSPACE_MANAGE: "workspace.permission.workspaceManage",
  MEMBER_VIEW: "workspace.permission.memberView",
  MEMBER_MANAGE: "workspace.permission.memberManage",
  TEAM_VIEW: "workspace.permission.teamView",
  TEAM_MANAGE: "workspace.permission.teamManage",
  PROJECT_SCOPE_VIEW: "workspace.permission.projectScopeView",
  USAGE_VIEW: "workspace.permission.usageView",
  PLAN_VIEW: "workspace.permission.planView",
  PLAN_MANAGE: "workspace.permission.planManage",
};

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

function maskedMemberId(value: string) {
  const clean = String(value || "");
  return clean.length > 8 ? `…${clean.slice(-8)}` : clean;
}

function usageValue(usage: EnterpriseUsageResponse | null, type: string) {
  return usage?.byType.find((item) => item.type === type)?.quantity ?? 0;
}

function formatLimit(value: number | null, unlimited: string) {
  return value === null ? unlimited : new Intl.NumberFormat().format(value);
}

export function WorkspaceCenter() {
  const router = useRouter();
  const { isLoading: authLoading, isSignedIn } = useAuthSession();
  const { t, tf } = useI18n();
  const [organizations, setOrganizations] = useState<EnterpriseOrganization[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("");
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");
  const [organization, setOrganization] = useState<EnterpriseOrganizationResponse | null>(null);
  const [workspace, setWorkspace] = useState<EnterpriseWorkspaceResponse | null>(null);
  const [members, setMembers] = useState<EnterpriseWorkspaceMembersResponse | null>(null);
  const [usage, setUsage] = useState<EnterpriseUsageResponse | null>(null);
  const [plan, setPlan] = useState<EnterprisePlanResponse | null>(null);
  const [loadingOrganizations, setLoadingOrganizations] = useState(true);
  const [loadingScope, setLoadingScope] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!isSignedIn) router.replace("/sign-in?next=%2Fworkspace");
  }, [authLoading, isSignedIn, router]);

  useEffect(() => {
    if (authLoading || !isSignedIn) return;
    let active = true;
    const timer = window.setTimeout(() => {
      void listEnterpriseOrganizations()
        .then((result) => {
          if (!active) return;
          setOrganizations(result.organizations);
          setSelectedOrganizationId((current) =>
            result.organizations.some((item) => item.organizationId === current)
              ? current
              : result.organizations[0]?.organizationId || "",
          );
        })
        .catch(() => {
          if (active) setError(t("workspace.error.load"));
        })
        .finally(() => {
          if (active) setLoadingOrganizations(false);
        });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [authLoading, isSignedIn, t]);

  useEffect(() => {
    if (!selectedOrganizationId) return;
    let active = true;
    const timer = window.setTimeout(() => {
      setLoadingScope(true);
      setError("");
      setOrganization(null);
      setWorkspace(null);
      setMembers(null);
      setUsage(null);
      setPlan(null);
      void getEnterpriseOrganization(selectedOrganizationId)
        .then((result) => {
          if (!active) return;
          setOrganization(result);
          setSelectedWorkspaceId((current) =>
            result.workspaces.some((item) => item.workspaceId === current)
              ? current
              : result.workspaces[0]?.workspaceId || "",
          );
        })
        .catch(() => {
          if (active) setError(t("workspace.error.organization"));
        })
        .finally(() => {
          if (active) setLoadingScope(false);
        });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [selectedOrganizationId, t]);

  useEffect(() => {
    if (!selectedWorkspaceId || !organization) return;
    let active = true;
    const timer = window.setTimeout(() => {
      setLoadingScope(true);
      setError("");
      setWorkspace(null);
      setMembers(null);
      setUsage(null);
      setPlan(null);
      void getEnterpriseWorkspace(selectedWorkspaceId)
        .then(async (workspaceResult) => {
          if (!active) return;
          setWorkspace(workspaceResult);
          const membershipPermissions = workspaceResult.currentMembership.permissions;
          const organizationPermissions = organization.currentAccess.permissions;
          const [memberResult, usageResult, planResult] = await Promise.allSettled([
            hasWorkspacePermission(membershipPermissions, "MEMBER_VIEW")
              ? getEnterpriseWorkspaceMembers(selectedWorkspaceId)
              : Promise.resolve(null),
            hasWorkspacePermission(membershipPermissions, "USAGE_VIEW")
              ? getEnterpriseWorkspaceUsage(selectedWorkspaceId)
              : Promise.resolve(null),
            hasWorkspacePermission(organizationPermissions, "PLAN_VIEW")
              ? getEnterpriseOrganizationPlan(organization.organization.organizationId)
              : Promise.resolve(null),
          ]);
          if (!active) return;
          setMembers(memberResult.status === "fulfilled" ? memberResult.value : null);
          setUsage(usageResult.status === "fulfilled" ? usageResult.value : null);
          setPlan(planResult.status === "fulfilled" ? planResult.value : null);
        })
        .catch(() => {
          if (active) setError(t("workspace.error.workspace"));
        })
        .finally(() => {
          if (active) setLoadingScope(false);
        });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [organization, selectedWorkspaceId, t]);

  const currentPermissions = useMemo(
    () => workspace?.currentMembership.permissions ?? [],
    [workspace],
  );
  const canViewMembers = hasWorkspacePermission(currentPermissions, "MEMBER_VIEW");
  const canViewUsage = hasWorkspacePermission(currentPermissions, "USAGE_VIEW");
  const canViewPlan = hasWorkspacePermission(organization?.currentAccess.permissions, "PLAN_VIEW");
  const visiblePermissionLabels = useMemo(
    () => currentPermissions.map((permission) => t(permissionKeys[permission])),
    [currentPermissions, t],
  );

  if (authLoading || loadingOrganizations) {
    return <div className="grid h-full place-items-center rounded-[28px] border border-white/8 bg-[#090909] text-sm font-bold text-white/45">{t("workspace.loading")}</div>;
  }

  if (!isSignedIn) return null;

  if (!organizations.length) {
    return (
      <div className="grid h-full place-items-center overflow-y-auto rounded-[28px] border border-white/8 bg-[#090909] p-6 text-center">
        <div className="max-w-xl">
          <BetaBadge />
          <h1 className="mt-5 text-3xl font-black text-white">{t("workspace.empty.title")}</h1>
          <p className="mt-3 text-sm leading-7 text-white/48">{t("workspace.empty.description")}</p>
          <div className="mt-5 rounded-2xl border border-amber-300/15 bg-amber-300/[.05] p-4 text-sm text-amber-100/70">
            {t("workspace.enterpriseDescription")}
          </div>
          <Link className="mt-6 inline-flex rounded-2xl bg-[#d9b56d] px-5 py-3 text-sm font-black text-[#11100e]" href="/account">{t("workspace.empty.account")}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto rounded-[28px] border border-[#d9b56d]/15 bg-[#090909]">
      <div className="mx-auto max-w-7xl space-y-5 p-5 md:p-8">
        <header className="rounded-[28px] border border-[#d9b56d]/20 bg-[radial-gradient(circle_at_top_right,rgba(217,181,109,.15),transparent_40%),#11100e] p-6 md:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[10px] font-black uppercase tracking-[.2em] text-[#f2d899]">{t("workspace.eyebrow")}</span>
            <BetaBadge />
          </div>
          <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">{t("workspace.title")}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">{t("workspace.description")}</p>
            </div>
            <span className="rounded-full border border-emerald-300/20 bg-emerald-300/[.06] px-3 py-1.5 text-[10px] font-black uppercase tracking-[.14em] text-emerald-200">{t("workspace.boundary")}</span>
          </div>
        </header>

        <section className="grid gap-4 rounded-[24px] border border-white/8 bg-white/[.025] p-5 md:grid-cols-2">
          <label>
            <span className="text-[10px] font-black uppercase tracking-[.15em] text-white/40">{t("workspace.selectOrganization")}</span>
            <select className="mt-2 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white" onChange={(event) => setSelectedOrganizationId(event.target.value)} value={selectedOrganizationId}>
              {organizations.map((item) => <option key={item.organizationId} value={item.organizationId}>{item.name}</option>)}
            </select>
          </label>
          <label>
            <span className="text-[10px] font-black uppercase tracking-[.15em] text-white/40">{t("workspace.selectWorkspace")}</span>
            <select className="mt-2 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white disabled:opacity-40" disabled={!organization?.workspaces.length} onChange={(event) => setSelectedWorkspaceId(event.target.value)} value={selectedWorkspaceId}>
              {(organization?.workspaces ?? []).map((item) => <option key={item.workspaceId} value={item.workspaceId}>{item.name}</option>)}
            </select>
          </label>
        </section>

        {error ? <div className="rounded-2xl border border-red-300/20 bg-red-300/[.06] p-4 text-sm text-red-100" role="alert">{error}</div> : null}
        {loadingScope && !workspace ? <div className="rounded-[24px] border border-white/8 bg-white/[.02] p-8 text-center text-sm text-white/45">{t("workspace.loading")}</div> : null}

        {organization ? (
          <section className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
            <article className="rounded-[26px] border border-white/10 bg-white/[.025] p-5">
              <span className="text-[10px] font-black uppercase tracking-[.17em] text-[#d9b56d]">{t("workspace.currentOrganization")}</span>
              <h2 className="mt-3 text-2xl font-black text-white">{organization.organization.name}</h2>
              <dl className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/8 bg-black/20 p-3"><dt className="text-[10px] text-white/35">{t("workspace.status")}</dt><dd className="mt-1 text-sm font-black text-emerald-200">{organization.organization.status}</dd></div>
                <div className="rounded-2xl border border-white/8 bg-black/20 p-3"><dt className="text-[10px] text-white/35">{t("workspace.role")}</dt><dd className="mt-1 text-sm font-black text-white">{t(roleKeys[organization.currentAccess.role])}</dd></div>
                <div className="rounded-2xl border border-white/8 bg-black/20 p-3"><dt className="text-[10px] text-white/35">{t("workspace.currentWorkspace")}</dt><dd className="mt-1 text-sm font-black text-white">{organization.workspaces.length}</dd></div>
              </dl>
            </article>
            <article className="rounded-[26px] border border-amber-300/18 bg-amber-300/[.045] p-5">
              <div className="flex items-center justify-between gap-3"><span className="text-[10px] font-black uppercase tracking-[.17em] text-amber-200">{t("workspace.beta")}</span><BetaBadge /></div>
              <h2 className="mt-3 text-xl font-black text-white">{t("workspace.enterpriseAvailable")}</h2>
              <p className="mt-2 text-sm leading-6 text-white/48">{t("workspace.enterpriseDescription")}</p>
            </article>
          </section>
        ) : null}

        {workspace ? (
          <>
            <section className="grid gap-4 lg:grid-cols-[.8fr_1.2fr]">
              <article className="rounded-[26px] border border-white/10 bg-white/[.025] p-5">
                <span className="text-[10px] font-black uppercase tracking-[.17em] text-[#d9b56d]">{t("workspace.profile")}</span>
                <h2 className="mt-3 text-xl font-black text-white">{workspace.workspace.name}</h2>
                <dl className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/8 bg-black/20 p-3"><dt className="text-[10px] text-white/35">{t("workspace.role")}</dt><dd className="mt-1 text-sm font-black text-white">{t(roleKeys[workspace.currentMembership.role])}</dd></div>
                  <div className="rounded-2xl border border-white/8 bg-black/20 p-3"><dt className="text-[10px] text-white/35">{t("workspace.members")}</dt><dd className="mt-1 text-sm font-black text-white">{workspace.memberCount}</dd></div>
                  <div className="rounded-2xl border border-white/8 bg-black/20 p-3"><dt className="text-[10px] text-white/35">{t("workspace.teams")}</dt><dd className="mt-1 text-sm font-black text-white">{workspace.teams.length}</dd></div>
                  <div className="rounded-2xl border border-white/8 bg-black/20 p-3"><dt className="text-[10px] text-white/35">{t("workspace.status")}</dt><dd className="mt-1 text-sm font-black text-emerald-200">{workspace.currentMembership.status}</dd></div>
                </dl>
                <div className="mt-4 rounded-2xl border border-sky-300/12 bg-sky-300/[.035] p-4">
                  <strong className="text-xs text-sky-100">{t("workspace.projectScope")}</strong>
                  <p className="mt-2 text-xs leading-5 text-sky-100/50">{t("workspace.projectScopeDescription")}</p>
                </div>
              </article>
              <article className="rounded-[26px] border border-white/10 bg-white/[.025] p-5">
                <span className="text-[10px] font-black uppercase tracking-[.17em] text-[#d9b56d]">{t("workspace.permissions")}</span>
                <div className="mt-4 flex flex-wrap gap-2">
                  {visiblePermissionLabels.length ? visiblePermissionLabels.map((label) => <span className="rounded-full border border-violet-300/15 bg-violet-300/[.05] px-3 py-1.5 text-[10px] font-bold text-violet-100" key={label}>{label}</span>) : <span className="text-sm text-white/40">{t("workspace.permission.none")}</span>}
                </div>
                {workspace.teams.length ? <div className="mt-5 grid gap-2 sm:grid-cols-2">{workspace.teams.map((team) => <div className="rounded-2xl border border-white/8 bg-black/20 p-3" key={team.teamId}><strong className="text-sm text-white">{team.name}</strong><span className="mt-1 block text-xs text-white/38">{tf("workspace.members.count", { count: team.members.length })}</span></div>)}</div> : null}
              </article>
            </section>

            <section className="rounded-[26px] border border-white/10 bg-white/[.025] p-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div><span className="text-[10px] font-black uppercase tracking-[.17em] text-[#d9b56d]">{t("workspace.members.title")}</span><p className="mt-2 text-sm text-white/45">{t("workspace.members.description")}</p></div>
                <strong className="text-xs text-white/45">{canViewMembers && members ? tf("workspace.members.count", { count: members.members.length }) : t("workspace.members.restricted")}</strong>
              </div>
              {canViewMembers && members ? <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{members.members.map((member) => <article className="rounded-2xl border border-white/8 bg-black/20 p-4" key={member.membershipId}><div className="flex items-center justify-between gap-3"><strong className="text-sm text-white">{tf("workspace.member.identifier", { id: maskedMemberId(member.userId) })}</strong><span className="rounded-full border border-emerald-300/15 bg-emerald-300/[.05] px-2 py-1 text-[9px] font-black text-emerald-200">{member.status === "ACTIVE" ? t("workspace.member.active") : member.status}</span></div><p className="mt-2 text-xs font-bold text-[#f2d899]">{t(roleKeys[member.role])}</p><div className="mt-3 flex flex-wrap gap-1.5">{member.permissions.slice(0, 4).map((permission) => <span className="rounded-full bg-white/[.04] px-2 py-1 text-[9px] text-white/38" key={permission}>{t(permissionKeys[permission])}</span>)}</div></article>)}</div> : <div className="mt-5 rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-white/40">{t("workspace.members.restricted")}</div>}
              <div className="mt-6"><span className="text-[10px] font-black uppercase tracking-[.17em] text-white/35">{t("workspace.roles.title")}</span><div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{WORKSPACE_ROLES.map((role) => <article className={`rounded-2xl border p-3 ${role === workspace.currentMembership.role ? "border-[#d9b56d]/25 bg-[#d9b56d]/[.055]" : "border-white/8 bg-black/15"}`} key={role}><strong className="text-sm text-white">{t(roleKeys[role])}</strong><p className="mt-1 text-xs leading-5 text-white/40">{t(roleDetailKeys[role])}</p></article>)}</div></div>
            </section>

            <section className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
              <article className="rounded-[26px] border border-white/10 bg-white/[.025] p-5">
                <span className="text-[10px] font-black uppercase tracking-[.17em] text-[#d9b56d]">{t("workspace.usage.title")}</span>
                <p className="mt-2 text-sm text-white/45">{t("workspace.usage.description")}</p>
                {canViewUsage && usage ? <><div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3"><div className="rounded-2xl border border-white/8 bg-black/20 p-3"><span className="text-[10px] text-white/35">{t("workspace.usage.credits")}</span><strong className="mt-1 block text-xl text-white">{usage.summary.shadowCredits}</strong></div><div className="rounded-2xl border border-white/8 bg-black/20 p-3"><span className="text-[10px] text-white/35">{t("workspace.usage.images")}</span><strong className="mt-1 block text-xl text-white">{usageValue(usage, "IMAGE_GENERATION")}</strong></div><div className="rounded-2xl border border-white/8 bg-black/20 p-3"><span className="text-[10px] text-white/35">{t("workspace.usage.videos")}</span><strong className="mt-1 block text-xl text-white">{usageValue(usage, "VIDEO_GENERATION")}</strong></div><div className="rounded-2xl border border-white/8 bg-black/20 p-3"><span className="text-[10px] text-white/35">{t("workspace.usage.events")}</span><strong className="mt-1 block text-xl text-white">{usage.summary.totalEvents}</strong></div><div className="rounded-2xl border border-white/8 bg-black/20 p-3"><span className="text-[10px] text-white/35">{t("workspace.usage.projects")}</span><strong className="mt-1 block text-xl text-white">{usage.summary.projects}</strong></div><div className="rounded-2xl border border-white/8 bg-black/20 p-3"><span className="text-[10px] text-white/35">{t("workspace.usage.users")}</span><strong className="mt-1 block text-xl text-white">{usage.summary.users}</strong></div></div><div className="mt-5"><strong className="text-xs text-white/60">{t("workspace.usage.projectBreakdown")}</strong>{usage.byProject.length ? <div className="mt-2 space-y-2">{usage.byProject.slice(0, 6).map((item) => <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-black/20 px-4 py-3" key={item.projectId}><span className="truncate text-xs text-white/55">{tf("workspace.usage.project", { id: maskedMemberId(item.projectId || "") })}</span><strong className="text-xs text-white">{tf("workspace.usage.quantity", { quantity: item.quantity, credits: item.shadowCredits })}</strong></div>)}</div> : <p className="mt-2 text-sm text-white/38">{t("workspace.usage.empty")}</p>}</div></> : <div className="mt-5 rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-white/40">{t("workspace.usage.restricted")}</div>}
              </article>

              <article className="rounded-[26px] border border-amber-300/18 bg-amber-300/[.04] p-5">
                <span className="text-[10px] font-black uppercase tracking-[.17em] text-amber-200">{t("workspace.plan")}</span>
                {canViewPlan && plan ? <><h2 className="mt-3 text-2xl font-black text-white">{plan.plan.name}</h2><div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-2xl border border-white/8 bg-black/15 p-3"><span className="text-[10px] text-white/35">{t("workspace.plan.usageLimit")}</span><strong className="mt-1 block text-white">{formatLimit(plan.plan.limits.usage, t("workspace.plan.unlimited"))}</strong></div><div className="rounded-2xl border border-white/8 bg-black/15 p-3"><span className="text-[10px] text-white/35">{t("workspace.plan.memberLimit")}</span><strong className="mt-1 block text-white">{formatLimit(plan.plan.limits.members, t("workspace.plan.unlimited"))}</strong></div></div><strong className="mt-5 block text-xs text-white/60">{t("workspace.plan.features")}</strong><div className="mt-2 flex flex-wrap gap-2">{plan.plan.features.map((feature) => <span className="rounded-full border border-amber-300/15 bg-amber-300/[.06] px-2.5 py-1 text-[9px] font-bold text-amber-100" key={feature}>{featureKeys[feature] ? t(featureKeys[feature]) : feature.replaceAll("_", " ")}</span>)}</div></> : <div className="mt-5 rounded-2xl border border-dashed border-amber-300/15 p-6 text-center text-sm text-amber-100/45">{t("workspace.plan.restricted")}</div>}
                <p className="mt-5 text-xs leading-5 text-amber-100/45">{t("workspace.plan.noPayment")}</p>
              </article>
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}
