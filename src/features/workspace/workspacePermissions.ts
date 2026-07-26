export const WORKSPACE_ROLES = [
  "OWNER",
  "ADMIN",
  "MANAGER",
  "CREATOR",
  "REVIEWER",
  "VIEWER",
] as const;

export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

export const WORKSPACE_PERMISSIONS = [
  "WORKSPACE_VIEW",
  "WORKSPACE_MANAGE",
  "MEMBER_VIEW",
  "MEMBER_MANAGE",
  "TEAM_VIEW",
  "TEAM_MANAGE",
  "PROJECT_SCOPE_VIEW",
  "USAGE_VIEW",
  "PLAN_VIEW",
  "PLAN_MANAGE",
] as const;

export type WorkspacePermission = (typeof WORKSPACE_PERMISSIONS)[number];

export const WORKSPACE_ROLE_PERMISSIONS: Readonly<Record<WorkspaceRole, readonly WorkspacePermission[]>> = {
  OWNER: WORKSPACE_PERMISSIONS,
  ADMIN: WORKSPACE_PERMISSIONS,
  MANAGER: [
    "WORKSPACE_VIEW",
    "MEMBER_VIEW",
    "MEMBER_MANAGE",
    "TEAM_VIEW",
    "TEAM_MANAGE",
    "PROJECT_SCOPE_VIEW",
    "USAGE_VIEW",
    "PLAN_VIEW",
  ],
  CREATOR: ["WORKSPACE_VIEW", "TEAM_VIEW", "PROJECT_SCOPE_VIEW"],
  REVIEWER: ["WORKSPACE_VIEW", "TEAM_VIEW", "PROJECT_SCOPE_VIEW"],
  VIEWER: ["WORKSPACE_VIEW", "TEAM_VIEW", "PROJECT_SCOPE_VIEW"],
};

export function hasWorkspacePermission(
  permissions: readonly string[] | null | undefined,
  permission: WorkspacePermission,
) {
  return Boolean(permissions?.includes(permission));
}

export function workspaceRolePermissions(role: WorkspaceRole) {
  return WORKSPACE_ROLE_PERMISSIONS[role];
}
