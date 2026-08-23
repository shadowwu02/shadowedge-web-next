"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { InviteDialog } from "@/components/team/InviteDialog";
import { MemberList } from "@/components/team/MemberList";
import { PermissionMatrix } from "@/components/team/PermissionMatrix";
import { TeamHeader } from "@/components/team/TeamHeader";
import { roleKey } from "@/components/team/RoleSelector";
import { useI18n } from "@/i18n/useI18n";
import {
  archiveTeamOrganization,
  changeTeamMemberRole,
  classifyTeamUiError,
  createTeamOrganization,
  getTeamOrganization,
  getTeamPermissionProjection,
  hasProjectedAction,
  inviteTeamMember,
  listTeamInvitations,
  listTeamMembers,
  listTeamOrganizations,
  removeTeamMember,
  updateTeamOrganization,
  type TeamInvitation,
  type TeamMember,
  type TeamOrganization,
  type TeamOrganizationList,
  type TeamPermissionProjection,
  type TeamRole,
  type TeamUiErrorState,
} from "@/lib/team-management-api";

type PageState = "loading" | "ready" | "empty" | "error";
type EditorMode = "create" | "edit" | null;

const emptyBoundary: TeamOrganizationList["boundary"] = {
  billingEnabled: false,
  legacyServingUnchanged: true,
  organizationCreditsEnabled: false,
  teamNativeWritesOnly: true,
  workspaceBindingEnabled: false,
};

function formatDate(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

function ErrorPanel({ error, onRetry }: { error: TeamUiErrorState; onRetry: () => void }) {
  const { t } = useI18n();
  const titleKey = error === "forbidden"
    ? "team.state.forbidden.title"
    : error === "not_found"
      ? "team.state.notFound.title"
      : error === "network"
        ? "team.state.network.title"
        : "team.state.unavailable.title";
  const messageKey = error === "forbidden"
    ? "team.state.forbidden.message"
    : error === "not_found"
      ? "team.state.notFound.message"
      : error === "network"
        ? "team.state.network.message"
        : "team.state.unavailable.message";

  return (
    <div className="mx-auto flex min-h-[420px] max-w-xl flex-col items-center justify-center rounded-[28px] border border-white/10 bg-white/[.03] px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-300/20 bg-red-400/[.08] text-xl text-red-100" aria-hidden="true">!</div>
      <h1 className="mt-5 text-xl font-black text-white">{t(titleKey)}</h1>
      <p className="mt-2 max-w-md text-sm leading-6 text-white/52">{t(messageKey)}</p>
      <button className="mt-6 rounded-xl bg-[#ffcf83] px-4 py-2.5 text-sm font-black text-[#201306]" onClick={onRetry} type="button">{t("team.retry")}</button>
    </div>
  );
}

function OrganizationEditor({
  busy,
  mode,
  onClose,
  onSubmit,
  organization,
}: {
  busy: boolean;
  mode: Exclude<EditorMode, null>;
  onClose: () => void;
  onSubmit: (input: { name: string; slug?: string }) => void;
  organization: TeamOrganization | null;
}) {
  const { t } = useI18n();
  const [name, setName] = useState(mode === "edit" ? organization?.name || "" : "");
  const [slug, setSlug] = useState(mode === "edit" ? organization?.slug || "" : "");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (name.trim().length < 2) return;
    onSubmit({ name: name.trim(), slug: slug.trim() || undefined });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center" onMouseDown={(event) => { if (event.currentTarget === event.target && !busy) onClose(); }}>
      <form aria-labelledby="team-editor-title" aria-modal="true" className="w-full max-w-md rounded-[26px] border border-white/12 bg-[#11131a] p-5 shadow-2xl md:p-6" onSubmit={submit} role="dialog">
        <h2 className="text-xl font-black text-white" id="team-editor-title">{mode === "create" ? t("team.create.title") : t("team.edit")}</h2>
        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-white/62">{t("team.create.name")}</span>
            <input autoFocus className="w-full rounded-2xl border border-white/12 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-[#ffcf83]/55" disabled={busy} maxLength={120} onChange={(event) => setName(event.target.value)} required value={name} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-white/62">{t("team.create.slug")}</span>
            <input className="w-full rounded-2xl border border-white/12 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-[#ffcf83]/55" disabled={busy} maxLength={64} onChange={(event) => setSlug(event.target.value)} value={slug} />
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button className="rounded-xl border border-white/12 px-4 py-2.5 text-sm font-bold text-white/70 disabled:opacity-50" disabled={busy} onClick={onClose} type="button">{t("team.cancel")}</button>
          <button className="rounded-xl bg-[#ffcf83] px-4 py-2.5 text-sm font-black text-[#201306] disabled:opacity-50" disabled={busy || name.trim().length < 2} type="submit">{busy ? t("team.action.saving") : mode === "create" ? t("team.create.submit") : t("team.save")}</button>
        </div>
      </form>
    </div>
  );
}

function InvitationList({ invitations }: { invitations: TeamInvitation[] }) {
  const { t } = useI18n();
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {invitations.map((invite) => (
        <article className="rounded-2xl border border-white/8 bg-black/10 p-4" key={invite.invitationRef}>
          <div className="flex items-start justify-between gap-3">
            <span className="text-sm font-black text-white">{t(roleKey(invite.role))}</span>
            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[.1em] ${invite.status === "EXPIRED" ? "border-red-300/20 bg-red-400/[.08] text-red-100" : invite.status === "ACCEPTED" ? "border-emerald-300/20 bg-emerald-400/[.08] text-emerald-100" : "border-[#ffcf83]/20 bg-[#ffcf83]/[.08] text-[#ffe6b8]"}`}>
              {invite.status === "EXPIRED" ? t("team.invite.expired") : invite.status === "ACCEPTED" ? t("team.invite.accepted") : t("team.invite.pending")}
            </span>
          </div>
          <p className="mt-3 text-xs text-white/42">{formatDate(invite.expiresAt)}</p>
        </article>
      ))}
    </div>
  );
}

export function TeamManagementPage() {
  const { t } = useI18n();
  const [pageState, setPageState] = useState<PageState>("loading");
  const [pageError, setPageError] = useState<TeamUiErrorState>("unavailable");
  const [organizationList, setOrganizationList] = useState<TeamOrganizationList>({ organizations: [], canCreateOrganization: false, boundary: emptyBoundary });
  const [selectedRef, setSelectedRef] = useState("");
  const [selected, setSelected] = useState<TeamOrganization | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [permissions, setPermissions] = useState<TeamPermissionProjection | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [mutationBusy, setMutationBusy] = useState(false);
  const [busyMemberRef, setBusyMemberRef] = useState("");
  const [editorMode, setEditorMode] = useState<EditorMode>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [notice, setNotice] = useState("");

  const loadOrganizations = useCallback(async () => {
    setPageState("loading");
    setNotice("");
    try {
      const result = await listTeamOrganizations();
      setOrganizationList(result);
      if (!result.organizations.length) {
        setSelected(null);
        setSelectedRef("");
        setPageState("empty");
        return;
      }
      const preferred = result.organizations.find((organization) => organization.authorityOrigin === "TEAM_NATIVE") || result.organizations[0];
      setSelectedRef((current) => result.organizations.some((organization) => organization.organizationRef === current) ? current : preferred.organizationRef);
      setPageState("ready");
    } catch (error) {
      setPageError(classifyTeamUiError(error));
      setPageState("error");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadOrganizations(), 0);
    return () => window.clearTimeout(timer);
  }, [loadOrganizations]);

  const loadSelected = useCallback(async (organization: TeamOrganization) => {
    setDetailLoading(true);
    setNotice("");
    setMembers([]);
    setInvitations([]);
    setPermissions(null);

    if (organization.authorityOrigin !== "TEAM_NATIVE") {
      setSelected(organization);
      setDetailLoading(false);
      return;
    }

    try {
      const [detail, nextMembers, nextInvitations, projection] = await Promise.all([
        getTeamOrganization(organization.organizationRef),
        listTeamMembers(organization.organizationRef),
        listTeamInvitations(organization.organizationRef),
        getTeamPermissionProjection(organization.organizationRef),
      ]);
      setSelected(detail);
      setMembers(nextMembers);
      setInvitations(nextInvitations);
      setPermissions(projection);
    } catch (error) {
      setPageError(classifyTeamUiError(error));
      setPageState("error");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    const organization = organizationList.organizations.find((item) => item.organizationRef === selectedRef);
    if (!organization) return;
    const timer = window.setTimeout(() => void loadSelected(organization), 0);
    return () => window.clearTimeout(timer);
  }, [loadSelected, organizationList.organizations, selectedRef]);

  const refreshSelected = useCallback(async () => {
    const organization = organizationList.organizations.find((item) => item.organizationRef === selectedRef);
    if (organization) await loadSelected(organization);
  }, [loadSelected, organizationList.organizations, selectedRef]);

  const canInvite = Boolean(permissions && hasProjectedAction(permissions.availableActions, "MEMBER_INVITE") && permissions.assignableRoles.length);
  const isLegacy = selected?.authorityOrigin !== "TEAM_NATIVE";

  const submitOrganization = async (input: { name: string; slug?: string }) => {
    if (editorMode === "edit" && (!selected || isLegacy || !hasProjectedAction(selected.allowedActions, "ORGANIZATION_MANAGE"))) return;
    if (editorMode === "create" && !organizationList.canCreateOrganization) return;
    setMutationBusy(true);
    try {
      const result = editorMode === "create"
        ? await createTeamOrganization(input)
        : await updateTeamOrganization(selected!.organizationRef, input);
      setEditorMode(null);
      setOrganizationList((current) => ({
        ...current,
        organizations: editorMode === "create"
          ? [...current.organizations, result]
          : current.organizations.map((organization) => organization.organizationRef === result.organizationRef ? result : organization),
      }));
      setSelectedRef(result.organizationRef);
      setPageState("ready");
      setNotice(t("team.action.success"));
    } catch (error) {
      setPageError(classifyTeamUiError(error));
      setPageState("error");
      setEditorMode(null);
    } finally {
      setMutationBusy(false);
    }
  };

  const archiveOrganization = async () => {
    if (!selected || isLegacy || !hasProjectedAction(selected.allowedActions, "ORGANIZATION_MANAGE")) return;
    if (!window.confirm(t("team.archive.confirm"))) return;
    setMutationBusy(true);
    try {
      await archiveTeamOrganization(selected.organizationRef);
      await loadOrganizations();
    } catch (error) {
      setPageError(classifyTeamUiError(error));
      setPageState("error");
    } finally {
      setMutationBusy(false);
    }
  };

  const submitInvite = async (input: { email: string; role: TeamRole }) => {
    if (!selected || isLegacy || !permissions?.assignableRoles.includes(input.role) || !canInvite) return;
    setMutationBusy(true);
    setInviteError("");
    try {
      await inviteTeamMember(selected.organizationRef, input);
      setInviteOpen(false);
      await refreshSelected();
      setNotice(t("team.action.success"));
    } catch (error) {
      const classification = classifyTeamUiError(error);
      setInviteError(classification === "invite_conflict" ? t("team.invite.conflict") : classification === "invite_expired" ? t("team.invite.expiredMessage") : classification === "network" ? t("team.state.network.message") : t("team.state.unavailable.message"));
    } finally {
      setMutationBusy(false);
    }
  };

  const changeRole = async (member: TeamMember, role: TeamRole) => {
    if (!selected || isLegacy || !permissions?.assignableRoles.includes(role) || !hasProjectedAction(member.allowedActions, "ROLE_MANAGE")) return;
    setBusyMemberRef(member.memberRef);
    try {
      await changeTeamMemberRole(selected.organizationRef, member.memberRef, role);
      await refreshSelected();
      setNotice(t("team.action.success"));
    } catch (error) {
      setPageError(classifyTeamUiError(error));
      setPageState("error");
    } finally {
      setBusyMemberRef("");
    }
  };

  const removeMember = async (member: TeamMember) => {
    if (!selected || isLegacy || !hasProjectedAction(member.allowedActions, "MEMBER_REMOVE")) return;
    if (!window.confirm(t("team.member.removeConfirm"))) return;
    setBusyMemberRef(member.memberRef);
    try {
      await removeTeamMember(selected.organizationRef, member.memberRef);
      await refreshSelected();
      setNotice(t("team.action.success"));
    } catch (error) {
      setPageError(classifyTeamUiError(error));
      setPageState("error");
    } finally {
      setBusyMemberRef("");
    }
  };

  const overview = useMemo(() => {
    if (!selected) return null;
    return (
      <section className="min-w-0 rounded-[24px] border border-white/10 bg-white/[.03] p-4 md:p-5">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-black text-white">{t("team.overview")}</h2>
            <p className="mt-2 truncate text-base font-black text-[#ffe6b8]">{selected.name}</p>
          </div>
          <span className="shrink-0 rounded-full border border-[#ffcf83]/20 bg-[#ffcf83]/[.08] px-2.5 py-1 text-[10px] font-black uppercase tracking-[.1em] text-[#ffe6b8]">{isLegacy ? t("team.overview.legacy") : t("team.overview.teamNative")}</span>
        </div>

        {isLegacy ? <p className="mt-4 rounded-2xl border border-white/8 bg-black/10 p-4 text-sm leading-6 text-white/52">{t("team.overview.legacyMessage")}</p> : (
          <>
            <dl className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/8 bg-black/10 p-3"><dt className="text-[10px] font-black uppercase tracking-[.12em] text-white/35">{t("team.overview.role")}</dt><dd className="mt-1.5 text-sm font-black text-white">{t(roleKey(selected.role))}</dd></div>
              <div className="rounded-2xl border border-white/8 bg-black/10 p-3"><dt className="text-[10px] font-black uppercase tracking-[.12em] text-white/35">{t("team.overview.status")}</dt><dd className="mt-1.5 text-sm font-black text-white">{selected.status}</dd></div>
            </dl>
            {permissions?.boundaries.tenantIsolated && permissions.boundaries.organizationIsolated ? <p className="mt-4 text-xs leading-5 text-emerald-100/72">{t("team.overview.isolation")}</p> : null}
            {!permissions?.boundaries.billingEnabled && !permissions?.boundaries.organizationCreditsEnabled ? <p className="mt-1 text-xs leading-5 text-white/40">{t("team.overview.billingBoundary")}</p> : null}
          </>
        )}
      </section>
    );
  }, [isLegacy, permissions, selected, t]);

  if (pageState === "loading") {
    return <div className="flex h-full min-h-[420px] items-center justify-center rounded-[28px] border border-white/10 bg-white/[.025] text-sm font-bold text-white/55" role="status">{t("team.loading")}</div>;
  }

  if (pageState === "error") return <ErrorPanel error={pageError} onRetry={() => void loadOrganizations()} />;

  return (
    <div className="h-full min-w-0 overflow-y-auto overflow-x-hidden" data-testid="team-native-workspace">
      <div className="mx-auto w-full max-w-[1500px] space-y-4 pb-8">
        <TeamHeader
          canCreate={organizationList.canCreateOrganization}
          disabled={mutationBusy || detailLoading}
          onArchive={() => void archiveOrganization()}
          onCreate={() => setEditorMode("create")}
          onEdit={() => setEditorMode("edit")}
          onSelect={setSelectedRef}
          organizations={organizationList.organizations}
          selected={selected}
        />

        {notice ? <p className="rounded-2xl border border-emerald-300/15 bg-emerald-400/[.06] px-4 py-3 text-sm text-emerald-100" role="status">{notice}</p> : null}

        {pageState === "empty" ? (
          <section className="rounded-[28px] border border-dashed border-white/12 bg-white/[.025] px-6 py-16 text-center">
            <h2 className="text-xl font-black text-white">{t("team.empty.title")}</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-white/48">{organizationList.canCreateOrganization ? t("team.empty.message") : t("team.create.unavailable")}</p>
            {organizationList.canCreateOrganization ? <button className="mt-6 rounded-xl bg-[#ffcf83] px-4 py-2.5 text-sm font-black text-[#201306]" onClick={() => setEditorMode("create")} type="button">{t("team.create")}</button> : null}
          </section>
        ) : detailLoading ? (
          <div className="flex min-h-[320px] items-center justify-center rounded-[24px] border border-white/10 bg-white/[.025] text-sm font-bold text-white/50" role="status">{t("team.loading")}</div>
        ) : selected ? (
          <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(280px,.8fr)_minmax(0,1.7fr)]">
            <div className="min-w-0 space-y-4">
              {overview}
              {!isLegacy && permissions ? <PermissionMatrix projection={permissions} /> : null}
            </div>
            {!isLegacy && permissions ? (
              <div className="min-w-0 space-y-4">
                <MemberList assignableRoles={permissions.assignableRoles} busyMemberRef={busyMemberRef} members={members} onRemove={(member) => void removeMember(member)} onRoleChange={(member, role) => void changeRole(member, role)} />
                <section aria-labelledby="team-invites-heading" className="min-w-0 rounded-[24px] border border-white/10 bg-white/[.03] p-4 md:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-lg font-black text-white" id="team-invites-heading">{t("team.invites")}</h2>
                    {canInvite ? <button className="rounded-xl bg-[#ffcf83] px-3.5 py-2.5 text-xs font-black text-[#201306]" onClick={() => { setInviteError(""); setInviteOpen(true); }} type="button">{t("team.invite")}</button> : null}
                  </div>
                  {!invitations.length ? <p className="mt-5 rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-white/48">{t("team.invites.empty")}</p> : <InvitationList invitations={invitations} />}
                </section>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {editorMode ? <OrganizationEditor busy={mutationBusy} mode={editorMode} onClose={() => setEditorMode(null)} onSubmit={(input) => void submitOrganization(input)} organization={selected} /> : null}
      {inviteOpen ? <InviteDialog busy={mutationBusy} errorMessage={inviteError} onClose={() => setInviteOpen(false)} onSubmit={(input) => void submitInvite(input)} roles={permissions?.assignableRoles || []} /> : null}
    </div>
  );
}
