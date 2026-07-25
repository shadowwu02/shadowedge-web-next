export const PROJECT_MEMBER_ROLES = [
  "OWNER",
  "CREATIVE_DIRECTOR",
  "EDITOR",
  "REVIEWER",
  "VIEWER",
] as const;

export const PROJECT_PERMISSIONS = ["VIEW", "COMMENT", "DRAFT_EDIT", "APPROVE", "MANAGE"] as const;

export type ProjectMemberRole = typeof PROJECT_MEMBER_ROLES[number];
export type ProjectPermission = typeof PROJECT_PERMISSIONS[number];

export type StudioProjectMember = Readonly<{
  memberId: string;
  projectId: string;
  userId: string;
  role: ProjectMemberRole;
  permissions: readonly ProjectPermission[];
  createdAt: string;
}>;

export type StudioProjectMembers = Readonly<{
  projectId: string;
  members: readonly StudioProjectMember[];
  currentUser: StudioProjectMember;
  roles: readonly ProjectMemberRole[];
  permissions: readonly ProjectPermission[];
  rolePermissions: Readonly<Record<ProjectMemberRole, readonly ProjectPermission[]>>;
  boundary: Readonly<{
    explicitAssignmentOnly: true;
    automaticAuthorization: false;
    executionPermissionGranted: false;
    creditsDeducted: false;
  }>;
}>;
