import { describe, expect, it } from "vitest";
import { canManageBetaUpgrade } from "@/components/subscription/BetaUpgradeRequestCard";
import { workspaceRolePermissions, type WorkspaceRole } from "@/features/workspace/workspacePermissions";

describe("Beta upgrade permission boundary", () => {
  it.each(["OWNER", "ADMIN"] satisfies WorkspaceRole[])("allows %s with PLAN_MANAGE", (role) => {
    expect(canManageBetaUpgrade(role, workspaceRolePermissions(role), true)).toBe(true);
  });

  it.each(["MANAGER", "CREATOR", "REVIEWER", "VIEWER"] satisfies WorkspaceRole[])(
    "hides upgrade management for %s",
    (role) => {
      expect(canManageBetaUpgrade(role, workspaceRolePermissions(role), true)).toBe(false);
    },
  );

  it("fails closed when the permission is missing", () => {
    expect(canManageBetaUpgrade("OWNER", ["PLAN_VIEW"])).toBe(false);
    expect(canManageBetaUpgrade("ADMIN", workspaceRolePermissions("ADMIN"), false)).toBe(false);
    expect(canManageBetaUpgrade(undefined, undefined)).toBe(false);
  });
});
