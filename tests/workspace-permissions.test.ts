import { describe, expect, it } from "vitest";
import {
  WORKSPACE_ROLE_PERMISSIONS,
  hasWorkspacePermission,
  workspaceRolePermissions,
} from "../src/features/workspace/workspacePermissions";

describe("Workspace role permissions", () => {
  it("gives Owner and Admin complete existing Workspace access", () => {
    expect(workspaceRolePermissions("OWNER")).toEqual(WORKSPACE_ROLE_PERMISSIONS.ADMIN);
    expect(hasWorkspacePermission(workspaceRolePermissions("OWNER"), "MEMBER_VIEW")).toBe(true);
    expect(hasWorkspacePermission(workspaceRolePermissions("OWNER"), "USAGE_VIEW")).toBe(true);
    expect(hasWorkspacePermission(workspaceRolePermissions("OWNER"), "PLAN_VIEW")).toBe(true);
  });

  it("lets Manager view members, usage, and plan without plan management", () => {
    const permissions = workspaceRolePermissions("MANAGER");
    expect(hasWorkspacePermission(permissions, "MEMBER_VIEW")).toBe(true);
    expect(hasWorkspacePermission(permissions, "USAGE_VIEW")).toBe(true);
    expect(hasWorkspacePermission(permissions, "PLAN_VIEW")).toBe(true);
    expect(hasWorkspacePermission(permissions, "PLAN_MANAGE")).toBe(false);
  });

  it("keeps Creator, Reviewer, and Viewer inside read-only project and team scope", () => {
    for (const role of ["CREATOR", "REVIEWER", "VIEWER"] as const) {
      const permissions = workspaceRolePermissions(role);
      expect(hasWorkspacePermission(permissions, "WORKSPACE_VIEW")).toBe(true);
      expect(hasWorkspacePermission(permissions, "PROJECT_SCOPE_VIEW")).toBe(true);
      expect(hasWorkspacePermission(permissions, "MEMBER_VIEW")).toBe(false);
      expect(hasWorkspacePermission(permissions, "USAGE_VIEW")).toBe(false);
      expect(hasWorkspacePermission(permissions, "PLAN_VIEW")).toBe(false);
    }
  });
});
