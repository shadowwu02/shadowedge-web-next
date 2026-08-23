import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const contract = readFileSync(
  new URL("../docs/runbooks/team-management-frontend-contract-v1.md", import.meta.url),
  "utf8",
);

function section(title: string, nextTitle?: string) {
  const start = contract.indexOf(title);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = nextTitle ? contract.indexOf(nextTitle, start + title.length) : contract.length;
  expect(end).toBeGreaterThan(start);
  return contract.slice(start, end);
}

describe("Team Management P2 Frontend UX contract", () => {
  it("defines the /team page and its four required sections", () => {
    expect(contract).toContain("`/team`");
    const structure = section("## 3. Page structure", "## 4. Component contracts");
    expect(structure).toContain("OrganizationOverview");
    expect(structure).toContain("MembersSection");
    expect(structure).toContain("InvitationsSection");
    expect(structure).toContain("PermissionsSection");
  });

  it("defines every required component contract", () => {
    for (const component of [
      "TeamHeader",
      "MemberList",
      "InviteDialog",
      "RoleSelector",
      "PermissionMatrix",
      "AuditPreview",
    ]) {
      expect(contract).toContain(`\`${component}\``);
    }
  });

  it("uses Backend role, permission and action authority only", () => {
    const authority = section("## 5. Backend-driven permission display", "## 6. State model");
    expect(authority).toContain("Frontend components consume");
    expect(authority).toContain("all mutation controls remain absent/disabled");
    expect(authority).toContain("not replaced by cached role inference");
    expect(authority).toContain("Revalidate permissions/member data");
    expect(authority).toContain("localStorage/sessionStorage/cookies must not persist roles");
    expect(contract).toContain("never derives authorization from `OWNER`, `ADMIN`, `MEMBER`");
  });

  it("displays Owner, Admin and Member without exposing Owner in RoleSelector", () => {
    expect(contract).toContain('| `OWNER` | Owner |');
    expect(contract).toContain('| `ADMIN` | Admin |');
    expect(contract).toContain('| `MEMBER` | Member |');
    const selector = section("### 4.4 `RoleSelector`", "### 4.5 `PermissionMatrix`");
    expect(selector).toContain("options come from per-member `allowedActions.assignableRoles`");
    expect(selector).toContain("exclude Owner");
    expect(selector).toContain("never derives assignable roles from the caller role");
  });

  it("defines loading, empty, permission, invitation, conflict and success states", () => {
    const states = section("## 6. State model", "## 7. API dependency map");
    expect(states).toContain("`LOADING_ORGANIZATIONS`");
    expect(states).toContain("`EMPTY`");
    expect(states).toContain("`PERMISSION_UNAVAILABLE`");
    expect(states).toContain("Pending");
    expect(states).toContain("Expired");
    expect(states).toContain("`CONFLICT`");
    expect(states).toContain("`SUCCESS`");
    expect(states).toContain("`NETWORK_AMBIGUOUS`");
  });

  it("keeps independent page sections available when another read fails", () => {
    expect(contract).toContain("A `forbidden` collection does not blank other successful sections");
    expect(contract).toContain("Overview and Permissions remain independently renderable");
    expect(contract).toContain("no write retry");
  });

  it("maps every P1 API and identifies safe P1.1 dependencies", () => {
    const api = section("## 7. API dependency map", "## 8. Invitation acceptance UX safety");
    for (const route of [
      "GET /api/organizations",
      "POST /api/organizations",
      "GET /api/organizations/:id",
      "GET /api/organizations/:id/members",
      "POST /api/organizations/:id/invites",
      "POST /api/organizations/invites/:token/accept",
      "DELETE /api/organizations/:id/members/:memberId",
      "PATCH /api/organizations/:id/members/:memberId/role",
      "GET /api/organizations/:id/permissions",
    ]) {
      expect(api).toContain(`\`${route}\``);
    }
    expect(api).toContain("P1.1 response dependencies required before Frontend implementation");
    expect(api).toContain("Frontend must not construct the role matrix");
    expect(api).toContain("implementation must remain off");
  });

  it("never renders invitation secrets, internal IDs or raw audit payloads", () => {
    const privacy = section("## 11. Privacy and display contract", "## 12. UX architecture validation matrix");
    expect(privacy).toContain("invitation token or token hash/HMAC");
    expect(privacy).toContain("raw invitation acceptance URL");
    expect(privacy).toContain("internal IDs");
    expect(privacy).toContain("raw audit payload or before/after JSON");
    expect(contract).toContain("token material remains memory-only");
    expect(contract).toContain("replace browser history with clean `/team`");
  });

  it("defines desktop, tablet, mobile and accessibility behavior", () => {
    const responsive = section("## 9. Responsive layout contract", "## 10. Accessibility and localization");
    expect(responsive).toContain("Desktop (`>= 1280px`)");
    expect(responsive).toContain("Tablet (`768px–1279px`)");
    expect(responsive).toContain("Mobile (`< 768px`)");
    expect(responsive).toContain("no horizontal page overflow");
    expect(contract).toContain("WAI-ARIA tab pattern");
    expect(contract).toContain("Minimum 44px mobile controls");
    expect(contract).toContain("ShadowEdge and Gold-Tide from one shared dictionary contract");
  });

  it("is design-only with no Backend, Billing, Credit or production mutation", () => {
    expect(contract).toContain("Status: `DESIGN_ONLY_NOT_PRODUCTION`");
    const safety = section("## 14. Candidate safety statement");
    expect(safety).toContain("Frontend page/component implemented: `NO`");
    expect(safety).toContain("Backend API implemented: `NO`");
    expect(safety).toContain("Migration created/applied: `NO`");
    expect(safety).toContain("Billing changed: `NO`");
    expect(safety).toContain("Credit ledger/balance changed: `NO`");
    expect(safety).toContain("Production changed: `NO`");
  });
});
