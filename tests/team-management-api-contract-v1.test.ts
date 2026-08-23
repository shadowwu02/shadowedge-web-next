import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const contract = readFileSync(
  new URL("../docs/runbooks/team-management-api-contract-v1.md", import.meta.url),
  "utf8",
);

function section(title: string, nextTitle?: string) {
  const start = contract.indexOf(title);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = nextTitle ? contract.indexOf(nextTitle, start + title.length) : contract.length;
  expect(end).toBeGreaterThan(start);
  return contract.slice(start, end);
}

describe("Team Management P1 Backend API contract", () => {
  it("defines all required Organization, Member, Invite, Role and Permission routes", () => {
    for (const route of [
      "POST /api/organizations",
      "GET /api/organizations",
      "GET /api/organizations/:id",
      "GET /api/organizations/:id/members",
      "POST /api/organizations/:id/invites",
      "POST /api/organizations/invites/:token/accept",
      "DELETE /api/organizations/:id/members/:memberId",
      "PATCH /api/organizations/:id/members/:memberId/role",
      "GET /api/organizations/:id/permissions",
    ]) {
      expect(contract).toContain(`\`${route}\``);
    }
  });

  it("adds Owner-only archive and ownership-transfer lifecycle contracts", () => {
    expect(contract).toContain("`DELETE /api/organizations/:id`");
    expect(contract).toContain("`POST /api/organizations/:id/ownership-transfer`");
    expect(contract).toContain("soft archive, never physical deletion");
    expect(contract).toContain("preserves exactly one active Owner");
    expect(contract).toContain("generic role PATCH cannot create Owner");
  });

  it("defines strict request/response envelopes and rejects identity authority from clients", () => {
    const transport = section("## 2. Transport and envelope", "## 3. Authentication and authorization pipeline");
    expect(transport).toContain("`Idempotency-Key` required");
    expect(transport).toContain("Unknown request properties: rejected");
    expect(transport).toContain('"correlationId"');
    expect(contract).toContain("Reject `tenantId`, `ownerId`, `role`, `permissions`, `credits`, `plan`, `billingCustomerId`");
    expect(contract).toContain("Client input never supplies authoritative `userId`, `tenantId`");
  });

  it("enforces Owner, Admin and Member permissions without self-elevation", () => {
    const matrix = section("## 8. Permission matrix", "## 9. Error contract");
    expect(matrix).toContain("Archive Organization | Yes | No | No");
    expect(matrix).toContain("Invite Admin/Member | Yes | Yes | No");
    expect(matrix).toContain("Manage all Project permissions | Yes | Yes | No");
    expect(matrix).toContain("Manage all Asset permissions | Yes | Yes | No");
    expect(matrix).toContain("Manage Organization Credit policy | Yes | Yes | No");
    expect(matrix).toContain("Manage Billing | Future Owner only | No | No");
    expect(matrix).toContain("Self-elevation, cross-Tenant access, cross-Organization access");
    expect(contract).toContain("Member cannot change any role or elevate itself");
  });

  it("specifies authenticated, authorized and RLS-protected request order", () => {
    const pipeline = section("## 3. Authentication and authorization pipeline", "## 4. Shared schemas");
    expect(pipeline).toContain("`requireUser`");
    expect(pipeline).toContain("exactly one active `customer_tenant_membership`");
    expect(pipeline).toContain("Load Organization inside the resolved Tenant only");
    expect(pipeline).toContain("RLS independently revalidates");
    expect(pipeline).toContain("Mutation and immutable audit event commit atomically");
    expect(contract).toContain("No endpoint falls back to JSONL authority, Browser roles, Tenant-wide access or Workspace permissions");
  });

  it("defines hashed, expiring, single-use Tenant-bound invitation tokens", () => {
    const invite = section(
      "### 6.2 `POST /api/organizations/:id/invites`",
      "### 6.4 `DELETE /api/organizations/:id/members/:memberId`",
    );
    expect(invite).toContain("at least 256 bits of random token entropy");
    expect(invite).toContain("stores only the token hash/HMAC");
    expect(invite).toContain("default 72 hours, maximum 7 days");
    expect(invite).toContain("single-use invitation acceptance");
    expect(invite).toContain("require exact invite `tenant_id` match");
    expect(invite).toContain("replay cannot create another member or event");
    expect(invite).toContain("logs, tracing, analytics and error reporting must redact the entire token segment");
  });

  it("uses 403, hidden 404 and invitation 409 errors safely", () => {
    const errors = section("## 9. Error contract", "## 10. Audit event contract");
    expect(errors).toContain("403 | `ORGANIZATION_PERMISSION_DENIED`");
    expect(errors).toContain("404 | `ORGANIZATION_NOT_FOUND`");
    expect(errors).toContain("409 | `INVITATION_ALREADY_PENDING`");
    expect(errors).toContain("409 | `INVITATION_ALREADY_USED`");
    expect(errors).toContain("Do not translate `404` to `403` for hidden resources");
  });

  it("defines atomic, exactly-once and privacy-safe audit events", () => {
    const audit = section("## 10. Audit event contract", "## 11. RLS boundary");
    expect(audit).toContain("Mutation and audit event commit in one transaction");
    expect(audit).toContain("Idempotent replay does not append a duplicate event");
    expect(audit).toContain("`ORGANIZATION_CREATED`");
    expect(audit).toContain("`ORGANIZATION_INVITE_ACCEPTED`");
    expect(audit).toContain("`ORGANIZATION_MEMBER_ROLE_CHANGED`");
    expect(audit).toContain("`ORGANIZATION_OWNERSHIP_TRANSFERRED`");
    expect(audit).toContain("plaintext invitation token or token hash");
    expect(audit).toContain("full email or email list");
  });

  it("gates DB-backed routes behind migration and single-authority cutover", () => {
    const dependency = section("## 12. Migration dependency and authority cutover", "## 13. API architecture validation matrix");
    expect(dependency).toContain("must remain unmounted");
    expect(dependency).toContain("Current Backend already mounts Enterprise JSONL-backed handlers");
    expect(dependency).toContain("never mount the new DB writer alongside the JSONL writer");
    expect(dependency).toContain("never dual-write Organization/membership authority");
    expect(dependency).toContain("disable JSONL mutation paths before enabling DB mutation paths");
  });

  it("is design-only and leaves Billing, Credits and production unchanged", () => {
    expect(contract).toContain("Status: `DESIGN_ONLY_NOT_PRODUCTION`");
    const safety = section("## 14. Candidate safety statement");
    expect(safety).toContain("Backend route implemented: `NO`");
    expect(safety).toContain("Migration created/applied: `NO`");
    expect(safety).toContain("Billing changed: `NO`");
    expect(safety).toContain("Credit ledger changed: `NO`");
    expect(safety).toContain("Production changed: `NO`");
  });
});
