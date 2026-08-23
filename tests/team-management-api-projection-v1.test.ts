import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const contract = readFileSync(
  new URL("../docs/runbooks/team-management-api-projection-v1.md", import.meta.url),
  "utf8",
);

function section(title: string, nextTitle?: string) {
  const start = contract.indexOf(title);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = nextTitle ? contract.indexOf(nextTitle, start + title.length) : contract.length;
  expect(end).toBeGreaterThan(start);
  return contract.slice(start, end);
}

describe("Team Management P1.1 Backend Permission Projection contract", () => {
  it("defines safe Member identity, role, status and Backend allowedActions", () => {
    const member = section("## 3. Member Projection", "## 4. Permission Projection");
    expect(member).toContain("identityDisplay");
    expect(member).toContain('role: "OWNER" | "ADMIN" | "MEMBER"');
    expect(member).toContain('status: "ACTIVE" | "SUSPENDED" | "REVOKED"');
    expect(member).toContain("allowedActions");
    expect(member).toContain("canChangeRole");
    expect(member).toContain("assignableRoles");
    expect(member).toContain("canRemove");
    expect(member).toContain("Backend computes each member row independently");
  });

  it("blocks Frontend role inference and Owner escalation", () => {
    expect(contract).toContain("Frontend never infers an action from `OWNER`, `ADMIN`, `MEMBER`");
    expect(contract).toContain("A Member always receives `canChangeRole=false`");
    expect(contract).toContain("An Admin cannot change/remove Owner");
    expect(contract).toContain("ownership-transfer, not RoleSelector");
    expect(contract).toContain("mutation re-checks");
  });

  it("defines Permission Projection for PermissionMatrix and RoleSelector", () => {
    const permission = section("## 4. Permission Projection", "## 5. Invitation Projection");
    expect(permission).toContain("permissionDisplay");
    expect(permission).toContain("availableActions");
    expect(permission).toContain("assignableRoles");
    expect(permission).toContain('state: "ALLOWED" | "DENIED" | "UNAVAILABLE"');
    expect(permission).toContain("Target-specific member actions still come from each Member Projection");
    expect(permission).toContain("never contain `OWNER`");
  });

  it("keeps Billing and Organization Credits unavailable", () => {
    const permission = section("## 4. Permission Projection", "## 5. Invitation Projection");
    expect(permission).toContain("Organization Credits and Billing remain `UNAVAILABLE`");
    expect(permission).toContain("`canManageBilling=false`");
    expect(permission).toContain("`billingEnabled=false`");
    expect(contract).toContain("not an activated permission catalog row or Billing authorization");
  });

  it("defines safe Pending, Expired and Accepted invitation projections", () => {
    const invite = section("## 5. Invitation Projection", "## 6. Organization Capability Projection");
    expect(invite).toContain("`PENDING`");
    expect(invite).toContain("`EXPIRED`");
    expect(invite).toContain("`ACCEPTED`");
    expect(invite).toContain("server-masked label");
    expect(invite).toContain("computed by Backend");
    expect(invite).toContain("`GET /api/organizations/:id/invites`");
  });

  it("never returns invitation tokens, hashes, secrets or raw data", () => {
    const invite = section("## 5. Invitation Projection", "## 6. Organization Capability Projection");
    expect(invite).toContain("plaintext token or acceptance URL");
    expect(invite).toContain("token hash/HMAC");
    expect(invite).toContain("HMAC key version or secret");
    expect(invite).toContain("raw invitation row, raw metadata or audit payload");
    expect(invite).toContain("email HMAC/ciphertext");
  });

  it("makes canCreateOrganization an authoritative Backend capability", () => {
    const capability = section("## 6. Organization Capability Projection", "## 7. Projection consistency and invalidation");
    expect(capability).toContain("canCreateOrganization");
    expect(capability).toContain("exactly one active customer Tenant Membership");
    expect(capability).toContain("DB/RLS/migration authority availability");
    expect(capability).toContain("cannot replace this with `organizations.length === 0`");
    expect(capability).toContain('createAvailability="UNAVAILABLE"');
  });

  it("enforces Tenant, Organization, RLS and hidden 403/404 boundaries", () => {
    const security = section("## 8. Security and RLS compatibility", "## 9. Projection audit contract");
    expect(security).toContain("Resolve active Tenant from authenticated user");
    expect(security).toContain("Active customer Tenant Membership alone is insufficient");
    expect(security).toContain("API authorization and RLS both validate");
    expect(security).toContain("404 | `ORGANIZATION_NOT_FOUND`");
    expect(security).toContain("404 | `MEMBER_NOT_FOUND`");
    expect(security).toContain("403 | `ORGANIZATION_PERMISSION_DENIED`");
    expect(security).toContain("fails closed");
  });

  it("defines all four privacy-safe audit events", () => {
    const audit = section("## 9. Projection audit contract", "## 10. Error and conflict behavior");
    for (const event of ["member_viewed", "invite_created", "role_changed", "permission_changed"]) {
      expect(audit).toContain(`\`${event}\``);
    }
    expect(audit).toContain("not once per member row");
    expect(audit).toContain("Never records the returned identities");
    expect(audit).toContain("Never records email");
    expect(audit).toContain("It is not emitted by `GET /permissions`");
    expect(audit).toContain("P1.1 provides no runtime route that can emit this event");
  });

  it("unblocks Frontend contract implementation but not runtime activation", () => {
    const readiness = section("## 11. Frontend implementation readiness", "## 12. Projection validation matrix");
    expect(readiness).toContain("closes the P2 specification gaps");
    expect(readiness).toContain("Frontend implementation against typed fixtures/contracts is unblocked at design level");
    expect(readiness).toContain("Runtime integration and production enablement remain blocked");
  });

  it("is design-only with no migration, Billing, Credit or production change", () => {
    expect(contract).toContain("Status: `DESIGN_ONLY_NOT_PRODUCTION`");
    const safety = section("## 13. Candidate safety statement");
    expect(safety).toContain("Projection API implemented: `NO`");
    expect(safety).toContain("Migration created/applied: `NO`");
    expect(safety).toContain("Production schema/RLS changed: `NO`");
    expect(safety).toContain("Billing/Stripe changed: `NO`");
    expect(safety).toContain("Credit ledger/balance changed: `NO`");
    expect(safety).toContain("Production changed: `NO`");
  });
});
