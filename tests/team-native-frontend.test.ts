import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemberList } from "@/components/team/MemberList";
import {
  classifyTeamUiError,
  hasProjectedAction,
  normalizeInvitations,
  normalizeMembers,
  normalizeOrganizationList,
  normalizePermissionProjection,
} from "@/lib/team-management-api";
import { ApiError } from "@/types/api";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Team-native projection normalization", () => {
  it("keeps organization authority and creation capability server-authored", () => {
    const result = normalizeOrganizationList({
      organizations: [
        {
          organizationId: "org-internal-reference",
          name: "Design Studio",
          slug: "design-studio",
          status: "ACTIVE",
          role: "MEMBER",
          authorityOrigin: "TEAM_NATIVE_V1",
          allowedActions: ["ORGANIZATION_VIEW"],
        },
      ],
      canCreateOrganization: false,
      boundary: { teamNativeWritesOnly: true, legacyServingUnchanged: true },
    });

    expect(result.canCreateOrganization).toBe(false);
    expect(result.organizations[0]).toMatchObject({
      authorityOrigin: "TEAM_NATIVE",
      role: "MEMBER",
      allowedActions: ["ORGANIZATION_VIEW"],
    });
  });

  it("renders Owner, Admin, and Member controls only from projected actions", () => {
    const ownerWithoutActions = normalizePermissionProjection({ role: "OWNER", availableActions: [], assignableRoles: [] });
    const memberWithInviteProjection = normalizePermissionProjection({ role: "MEMBER", availableActions: ["MEMBER_INVITE"], assignableRoles: ["MEMBER"] });
    const adminProjection = normalizePermissionProjection({ role: "ADMIN", availableActions: ["ROLE_MANAGE"], assignableRoles: ["MEMBER"] });

    expect(hasProjectedAction(ownerWithoutActions.availableActions, "MEMBER_INVITE")).toBe(false);
    expect(hasProjectedAction(memberWithInviteProjection.availableActions, "MEMBER_INVITE")).toBe(true);
    expect(hasProjectedAction(adminProjection.availableActions, "ROLE_MANAGE")).toBe(true);
    expect(adminProjection.assignableRoles).toEqual(["MEMBER"]);
  });

  it("fails closed for malformed roles and unknown projection fields", () => {
    const permission = normalizePermissionProjection({
      role: "SUPER_ADMIN",
      availableActions: ["MEMBER_VIEW", null, 3],
      assignableRoles: ["OWNER", "SUPER_ADMIN"],
      privateToken: "must-not-propagate",
    });
    expect(permission.role).toBe("UNKNOWN");
    expect(permission.assignableRoles).toEqual([]);
    expect(permission).not.toHaveProperty("privateToken");
  });

  it("normalizes member and invitation displays without leaking backend records", () => {
    const members = normalizeMembers([{ memberId: "member-internal-reference", identityDisplay: "A. Member", role: "MEMBER", status: "ACTIVE", allowedActions: [] }]);
    const invitations = normalizeInvitations([{ invitationId: "invite-internal-reference", role: "MEMBER", status: "EXPIRED", expiresAt: "2026-08-23T00:00:00Z", tokenHash: "secret" }]);
    expect(members[0].identityDisplay).toBe("A. Member");
    expect(invitations[0].status).toBe("EXPIRED");
    expect(invitations[0]).not.toHaveProperty("tokenHash");
  });
});

describe("Team-native state contract", () => {
  it("distinguishes 403, 404, expired, conflict, and network states", () => {
    expect(classifyTeamUiError(new ApiError("Denied", { status: 403 }))).toBe("forbidden");
    expect(classifyTeamUiError(new ApiError("Hidden", { status: 404 }))).toBe("not_found");
    expect(classifyTeamUiError(new ApiError("Expired", { status: 404, code: "TEAM_INVITE_EXPIRED" }))).toBe("invite_expired");
    expect(classifyTeamUiError(new ApiError("Conflict", { status: 409, code: "TEAM_INVITATION_CONFLICT" }))).toBe("invite_conflict");
    expect(classifyTeamUiError(new ApiError("Offline", { kind: "network" }))).toBe("network");
  });

  it("implements the five required components and route", () => {
    expect(read("src/app/team/page.tsx")).toContain("<TeamManagementPage />");
    for (const component of ["TeamHeader", "MemberList", "InviteDialog", "RoleSelector", "PermissionMatrix"]) {
      expect(read(`src/components/team/${component}.tsx`)).toContain(`function ${component}`);
    }
  });

  it("keeps permission decisions projection-only", () => {
    const page = read("src/components/team/TeamManagementPage.tsx");
    const members = read("src/components/team/MemberList.tsx");
    expect(page).toContain('hasProjectedAction(permissions.availableActions, "MEMBER_INVITE")');
    expect(page).toContain("permissions?.assignableRoles.includes(role)");
    expect(members).toContain('hasProjectedAction(member.allowedActions, "ROLE_MANAGE")');
    expect(members).toContain('hasProjectedAction(member.allowedActions, "MEMBER_REMOVE")');
    expect(page).not.toMatch(/selected\.role\s*===/);
    expect(members).not.toMatch(/member\.role\s*===/);
  });

  it("hides member controls when the member projection does not allow them", () => {
    const html = renderToStaticMarkup(createElement(MemberList, {
      assignableRoles: ["ADMIN", "MEMBER"],
      busyMemberRef: "",
      members: [{
        memberRef: "internal-member-reference",
        identityDisplay: "Visible member",
        role: "OWNER",
        status: "ACTIVE",
        allowedActions: [],
        joinedAt: "2026-08-23T00:00:00Z",
      }],
      onRemove: () => undefined,
      onRoleChange: () => undefined,
    }));
    expect(html).toContain("Visible member");
    expect(html).not.toContain("Change role");
    expect(html).not.toContain(">Remove<");
    expect(html).not.toContain("internal-member-reference");
  });

  it("supports invite flow and safe failure states", () => {
    const api = read("src/lib/team-management-api.ts");
    const page = read("src/components/team/TeamManagementPage.tsx");
    expect(api).toContain('/invites`');
    expect(api).toContain('method: "POST"');
    expect(page).toContain('classification === "invite_conflict"');
    expect(page).toContain('classification === "invite_expired"');
    expect(page).toContain('classification === "network"');
  });

  it("keeps internal references and sensitive invitation fields out of rendered copy", () => {
    const ui = [
      "src/components/team/TeamManagementPage.tsx",
      "src/components/team/TeamHeader.tsx",
      "src/components/team/MemberList.tsx",
      "src/components/team/InviteDialog.tsx",
      "src/components/team/PermissionMatrix.tsx",
    ].map(read).join("\n");
    expect(ui).not.toMatch(/tokenHash|inviteHash|auditPayload|rawAudit|organizationId|memberId|invitationId/);
    expect(ui).not.toContain("data-member-ref");
    expect(ui).not.toContain("data-organization-ref");
    expect(read("src/components/team/TeamHeader.tsx")).toContain("value={String(index)}");
  });

  it("contains mobile, tablet, and desktop containment rules", () => {
    const page = read("src/components/team/TeamManagementPage.tsx");
    const header = read("src/components/team/TeamHeader.tsx");
    const members = read("src/components/team/MemberList.tsx");
    expect(page).toContain("overflow-x-hidden");
    expect(page).toContain("xl:grid-cols-[minmax(280px,.8fr)_minmax(0,1.7fr)]");
    expect(header).toContain("sm:flex-row");
    expect(header).toContain("xl:flex-row");
    expect(members).toContain("sm:flex-row");
  });

  it("does not wire Billing, credits, legacy writes, or authority switching", () => {
    const page = read("src/components/team/TeamManagementPage.tsx");
    const api = read("src/lib/team-management-api.ts");
    expect(page).not.toContain("enterprise-workspace-api");
    expect(api).not.toMatch(/\/api\/(billing|credits|workspaces)/);
    expect(api).not.toContain("AUTHORITY_MODE");
    expect(api).not.toContain("TEAM_READY");
  });
});
