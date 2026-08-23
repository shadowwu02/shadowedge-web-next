import { apiRequest } from "@/lib/api";
import { ApiError } from "@/types/api";

export const teamRoles = ["OWNER", "ADMIN", "MEMBER"] as const;
export type TeamRole = (typeof teamRoles)[number];
export type TeamStatus = "ACTIVE" | "PENDING" | "EXPIRED" | "ACCEPTED" | "REVOKED" | "REMOVED" | "UNKNOWN";

export type TeamOrganization = {
  organizationRef: string;
  name: string;
  slug: string;
  status: TeamStatus;
  role: TeamRole | "UNKNOWN";
  authorityOrigin: "TEAM_NATIVE" | "LEGACY_ONLY" | "UNKNOWN";
  allowedActions: string[];
  createdAt: string;
  updatedAt: string;
};

export type TeamOrganizationList = {
  organizations: TeamOrganization[];
  canCreateOrganization: boolean;
  boundary: {
    billingEnabled: boolean;
    legacyServingUnchanged: boolean;
    organizationCreditsEnabled: boolean;
    teamNativeWritesOnly: boolean;
    workspaceBindingEnabled: boolean;
  };
};

export type TeamMember = {
  memberRef: string;
  identityDisplay: string;
  role: TeamRole | "UNKNOWN";
  status: TeamStatus;
  allowedActions: string[];
  joinedAt: string;
};

export type TeamInvitation = {
  invitationRef: string;
  role: TeamRole | "UNKNOWN";
  status: TeamStatus;
  createdAt: string;
  expiresAt: string;
};

export type TeamPermission = {
  key: string;
  granted: boolean;
};

export type TeamPermissionProjection = {
  role: TeamRole | "UNKNOWN";
  permissionDisplay: TeamPermission[];
  availableActions: string[];
  assignableRoles: TeamRole[];
  unavailableActions: string[];
  boundaries: {
    billingEnabled: boolean;
    organizationCreditsEnabled: boolean;
    organizationIsolated: boolean;
    tenantIsolated: boolean;
  };
};

export type TeamUiErrorState = "forbidden" | "not_found" | "invite_expired" | "invite_conflict" | "network" | "unavailable";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function cleanText(value: unknown, maximum = 160) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, maximum) : "";
}

function asBoolean(value: unknown) {
  return value === true;
}

function asStringList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((entry) => cleanText(entry, 80)).filter(Boolean))];
}

function asRole(value: unknown): TeamRole | "UNKNOWN" {
  const role = cleanText(value, 20).toUpperCase();
  return teamRoles.includes(role as TeamRole) ? (role as TeamRole) : "UNKNOWN";
}

function asAssignableRoles(value: unknown): TeamRole[] {
  return asStringList(value).map(asRole).filter((role): role is TeamRole => role !== "UNKNOWN" && role !== "OWNER");
}

function asStatus(value: unknown): TeamStatus {
  const status = cleanText(value, 24).toUpperCase();
  const statuses: TeamStatus[] = ["ACTIVE", "PENDING", "EXPIRED", "ACCEPTED", "REVOKED", "REMOVED"];
  return statuses.includes(status as TeamStatus) ? (status as TeamStatus) : "UNKNOWN";
}

function requireOpaqueReference(value: unknown, resource: string) {
  const reference = cleanText(value, 120);
  if (!reference) {
    throw new ApiError(`${resource} projection is incomplete.`, {
      code: "TEAM_PROJECTION_INVALID",
      kind: "server",
    });
  }
  return reference;
}

function normalizeOrganization(value: unknown): TeamOrganization {
  const row = asRecord(value);
  const authority = cleanText(row.authorityOrigin, 40).toUpperCase();
  return {
    organizationRef: requireOpaqueReference(row.organizationId ?? row.organizationRef, "Organization"),
    name: cleanText(row.name, 120) || "Organization",
    slug: cleanText(row.slug, 80),
    status: asStatus(row.status),
    role: asRole(row.role),
    authorityOrigin: authority === "LEGACY_ONLY" ? "LEGACY_ONLY" : authority === "TEAM_NATIVE" || authority === "TEAM_NATIVE_V1" ? "TEAM_NATIVE" : "UNKNOWN",
    allowedActions: asStringList(row.allowedActions),
    createdAt: cleanText(row.createdAt, 60),
    updatedAt: cleanText(row.updatedAt, 60),
  };
}

export function normalizeOrganizationList(value: unknown): TeamOrganizationList {
  const data = asRecord(value);
  const boundary = asRecord(data.boundary);
  return {
    organizations: Array.isArray(data.organizations) ? data.organizations.map(normalizeOrganization) : [],
    canCreateOrganization: asBoolean(data.canCreateOrganization),
    boundary: {
      billingEnabled: asBoolean(boundary.billingEnabled),
      legacyServingUnchanged: boundary.legacyServingUnchanged !== false,
      organizationCreditsEnabled: asBoolean(boundary.organizationCreditsEnabled),
      teamNativeWritesOnly: boundary.teamNativeWritesOnly !== false,
      workspaceBindingEnabled: asBoolean(boundary.workspaceBindingEnabled),
    },
  };
}

export function normalizeMembers(value: unknown): TeamMember[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => {
    const row = asRecord(entry);
    return {
      memberRef: requireOpaqueReference(row.memberId ?? row.memberRef, "Member"),
      identityDisplay: cleanText(row.identityDisplay, 120) || "Team member",
      role: asRole(row.role),
      status: asStatus(row.status),
      allowedActions: asStringList(row.allowedActions),
      joinedAt: cleanText(row.joinedAt, 60),
    };
  });
}

export function normalizeInvitations(value: unknown): TeamInvitation[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => {
    const row = asRecord(entry);
    return {
      invitationRef: requireOpaqueReference(row.invitationId ?? row.inviteRef, "Invitation"),
      role: asRole(row.role),
      status: asStatus(row.status),
      createdAt: cleanText(row.createdAt, 60),
      expiresAt: cleanText(row.expiresAt, 60),
    };
  });
}

export function normalizePermissionProjection(value: unknown): TeamPermissionProjection {
  const data = asRecord(value);
  const boundaries = asRecord(data.boundaries);
  const permissionDisplay = Array.isArray(data.permissionDisplay)
    ? data.permissionDisplay.map((entry) => {
        const row = asRecord(entry);
        return { key: cleanText(row.key ?? row.permissionKey, 80), granted: asBoolean(row.granted) || row.state === "granted" };
      }).filter((entry) => entry.key)
    : [];

  return {
    role: asRole(data.role),
    permissionDisplay,
    availableActions: asStringList(data.availableActions),
    assignableRoles: asAssignableRoles(data.assignableRoles),
    unavailableActions: asStringList(data.unavailableActions),
    boundaries: {
      billingEnabled: asBoolean(boundaries.billingEnabled),
      organizationCreditsEnabled: asBoolean(boundaries.organizationCreditsEnabled),
      organizationIsolated: asBoolean(boundaries.organizationIsolated),
      tenantIsolated: asBoolean(boundaries.tenantIsolated),
    },
  };
}

export function hasProjectedAction(actions: readonly string[] | undefined, action: string) {
  return Boolean(actions?.includes(action));
}

export function classifyTeamUiError(error: unknown): TeamUiErrorState {
  if (!(error instanceof ApiError)) return "unavailable";
  const code = String(error.code || "").toUpperCase();
  if (error.kind === "network") return "network";
  if (error.status === 403) return "forbidden";
  if (error.status === 404) return code.includes("INVITE") ? "invite_expired" : "not_found";
  if (error.status === 409 || code.includes("CONFLICT") || code.includes("REPLAY")) return "invite_conflict";
  if (code.includes("EXPIRED")) return "invite_expired";
  return "unavailable";
}

function mutationHeaders(prefix: string) {
  const suffix = globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return { "Idempotency-Key": `${prefix}:${suffix}` };
}

function body(value: unknown) {
  return JSON.stringify(value);
}

export async function listTeamOrganizations() {
  const response = await apiRequest<unknown>("/api/organizations");
  return normalizeOrganizationList(response.data);
}

export async function getTeamOrganization(organizationRef: string) {
  const response = await apiRequest<unknown>(`/api/organizations/${encodeURIComponent(organizationRef)}`);
  return normalizeOrganization(response.data);
}

export async function createTeamOrganization(input: { name: string; slug?: string }) {
  const response = await apiRequest<unknown>("/api/organizations", {
    method: "POST",
    headers: mutationHeaders("team-create"),
    body: body(input),
  });
  return normalizeOrganization(response.data);
}

export async function updateTeamOrganization(organizationRef: string, input: { name: string; slug?: string }) {
  const response = await apiRequest<unknown>(`/api/organizations/${encodeURIComponent(organizationRef)}`, {
    method: "PATCH",
    headers: mutationHeaders("team-update"),
    body: body(input),
  });
  return normalizeOrganization(response.data);
}

export async function archiveTeamOrganization(organizationRef: string) {
  await apiRequest(`/api/organizations/${encodeURIComponent(organizationRef)}`, {
    method: "DELETE",
    headers: mutationHeaders("team-archive"),
  });
}

export async function listTeamMembers(organizationRef: string) {
  const response = await apiRequest<unknown>(`/api/organizations/${encodeURIComponent(organizationRef)}/members`);
  return normalizeMembers(response.data);
}

export async function listTeamInvitations(organizationRef: string) {
  const response = await apiRequest<unknown>(`/api/organizations/${encodeURIComponent(organizationRef)}/invites`);
  return normalizeInvitations(response.data);
}

export async function getTeamPermissionProjection(organizationRef: string) {
  const response = await apiRequest<unknown>(`/api/organizations/${encodeURIComponent(organizationRef)}/permissions`);
  return normalizePermissionProjection(response.data);
}

export async function inviteTeamMember(organizationRef: string, input: { email: string; role: TeamRole }) {
  const response = await apiRequest<unknown>(`/api/organizations/${encodeURIComponent(organizationRef)}/invites`, {
    method: "POST",
    headers: mutationHeaders("team-invite"),
    body: body(input),
  });
  return normalizeInvitations([response.data])[0];
}

export async function changeTeamMemberRole(organizationRef: string, memberRef: string, role: TeamRole) {
  await apiRequest(`/api/organizations/${encodeURIComponent(organizationRef)}/members/${encodeURIComponent(memberRef)}/role`, {
    method: "PATCH",
    headers: mutationHeaders("team-role"),
    body: body({ role }),
  });
}

export async function removeTeamMember(organizationRef: string, memberRef: string) {
  await apiRequest(`/api/organizations/${encodeURIComponent(organizationRef)}/members/${encodeURIComponent(memberRef)}`, {
    method: "DELETE",
    headers: mutationHeaders("team-member-remove"),
  });
}
