import { apiRequest } from "@/lib/api";
import type { WorkspacePermission, WorkspaceRole } from "@/features/workspace/workspacePermissions";

export type EnterpriseOrganization = {
  organizationId: string;
  name: string;
  slug: string;
  ownerId: string;
  status: string;
  createdAt: string | null;
  source?: string;
};

export type EnterpriseWorkspace = {
  workspaceId: string;
  organizationId: string;
  name: string;
  settings?: Record<string, unknown>;
  createdAt: string | null;
};

export type EnterpriseWorkspaceMember = {
  membershipId: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  status: string;
  permissions: readonly WorkspacePermission[];
  createdAt: string | null;
  updatedAt?: string;
  source?: string;
};

export type EnterpriseTeam = {
  teamId: string;
  workspaceId: string;
  name: string;
  members: readonly string[];
  createdAt: string;
};

export type EnterpriseOrganizationsResponse = {
  organizations: EnterpriseOrganization[];
  roles: WorkspaceRole[];
  boundary: {
    tenantIsolation: boolean;
    automaticInvitation: boolean;
    automaticAuthorization: boolean;
    billingMutation: boolean;
    productionMigration: boolean;
  };
};

export type EnterpriseOrganizationResponse = {
  organization: EnterpriseOrganization;
  workspaces: EnterpriseWorkspace[];
  currentAccess: {
    role: WorkspaceRole;
    permissions: WorkspacePermission[];
  };
  compatibility: {
    source: string;
    existingProjectsUnchanged: boolean;
    automaticMigration: boolean;
  };
};

export type EnterpriseWorkspaceResponse = {
  organization: EnterpriseOrganization;
  workspace: EnterpriseWorkspace;
  teams: EnterpriseTeam[];
  memberCount: number;
  currentMembership: EnterpriseWorkspaceMember;
  projectScope: {
    organizationId: string;
    workspaceId: string;
    mode: string;
    automaticProjectMigration: boolean;
  };
  boundary: {
    organizationValidationRequired: boolean;
    automaticInvitation: boolean;
    automaticAuthorization: boolean;
    automaticPlanUpgrade: boolean;
    automaticCharge: boolean;
    billingMutation: boolean;
  };
};

export type EnterpriseWorkspaceMembersResponse = {
  organizationId: string;
  workspaceId: string;
  members: EnterpriseWorkspaceMember[];
  roles: WorkspaceRole[];
  permissions: WorkspacePermission[];
  rolePermissions: Record<WorkspaceRole, WorkspacePermission[]>;
};

export type EnterpriseUsageGroup = {
  events: number;
  quantity: number;
  shadowCredits: number;
  type?: string;
  projectId?: string;
  userId?: string;
  workspaceId?: string;
};

export type EnterpriseUsageResponse = {
  scope: {
    organizationId: string;
    workspaceId: string | null;
    visibleWorkspaceIds: string[];
    tenantIsolation: boolean;
  };
  summary: {
    totalEvents: number;
    totalQuantity: number;
    projects: number;
    users: number;
    workspaces: number;
    shadowCredits: number;
    providerCost: number | null;
    costCurrency: string | null;
  };
  byWorkspace: EnterpriseUsageGroup[];
  byProject: EnterpriseUsageGroup[];
  byUser: EnterpriseUsageGroup[];
  byType: EnterpriseUsageGroup[];
  compatibility: {
    providerLedgerReadOnly: boolean;
    creditsRuleChanged: boolean;
    billingMutation: boolean;
  };
};

export type EnterprisePlan = {
  planId: "FREE" | "TEAM" | "BUSINESS" | "ENTERPRISE";
  name: string;
  features: string[];
  limits: {
    usage: number | null;
    members: number | null;
    storage: number | null;
  };
  createdAt: string;
};

export type EnterprisePlanResponse = {
  organizationId: string;
  plan: EnterprisePlan;
  subscription: {
    subscriptionId: string;
    organizationId: string;
    planId: string;
    status: string;
    createdAt: string;
  } | null;
  effectiveStatus: string;
  boundary: {
    paymentIntegration: boolean;
    automaticPlanUpgrade: boolean;
    automaticCharge: boolean;
    billingMutation: boolean;
    creditsRuleChanged: boolean;
  };
};

async function requireData<T>(path: string) {
  const response = await apiRequest<T>(path);
  if (!response.data) throw new Error("Enterprise Workspace response is unavailable.");
  return response.data;
}

export function listEnterpriseOrganizations() {
  return requireData<EnterpriseOrganizationsResponse>("/api/organizations");
}

export function getEnterpriseOrganization(organizationId: string) {
  return requireData<EnterpriseOrganizationResponse>(
    `/api/organizations/${encodeURIComponent(organizationId)}`,
  );
}

export function getEnterpriseWorkspace(workspaceId: string) {
  return requireData<EnterpriseWorkspaceResponse>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}`,
  );
}

export function getEnterpriseWorkspaceMembers(workspaceId: string) {
  return requireData<EnterpriseWorkspaceMembersResponse>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/members`,
  );
}

export function getEnterpriseWorkspaceUsage(workspaceId: string) {
  return requireData<EnterpriseUsageResponse>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/usage`,
  );
}

export function getEnterpriseOrganizationUsage(organizationId: string) {
  return requireData<EnterpriseUsageResponse>(
    `/api/organizations/${encodeURIComponent(organizationId)}/usage`,
  );
}

export function getEnterpriseOrganizationPlan(organizationId: string) {
  return requireData<EnterprisePlanResponse>(
    `/api/organizations/${encodeURIComponent(organizationId)}/plan`,
  );
}
