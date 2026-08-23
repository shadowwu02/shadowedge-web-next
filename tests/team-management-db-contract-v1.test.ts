import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { WORKSPACE_ROLES } from "../src/features/workspace/workspacePermissions";

const contract = readFileSync(
  new URL("../docs/runbooks/team-management-db-contract-v1.md", import.meta.url),
  "utf8",
);

function section(title: string, nextTitle?: string) {
  const start = contract.indexOf(title);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = nextTitle ? contract.indexOf(nextTitle, start + title.length) : contract.length;
  expect(end).toBeGreaterThan(start);
  return contract.slice(start, end);
}

describe("Team Management P0 database contract", () => {
  it("defines every required core and reserved table", () => {
    for (const table of [
      "organizations",
      "organization_members",
      "organization_roles",
      "organization_invites",
      "organization_permissions",
      "organization_role_permissions",
      "organization_credit_accounts",
      "organization_asset_permissions",
      "organization_project_permissions",
    ]) {
      expect(contract).toContain(`\`${table}\``);
    }
  });

  it("specifies keys, constraints, indexes, soft deletion and audit fields", () => {
    expect(contract).toContain("## 2. Conventions");
    expect(contract).toContain("Primary key:");
    expect(contract).toContain("Foreign keys:");
    expect(contract).toContain("Unique constraints:");
    expect(contract).toContain("Indexes:");
    expect(contract).toContain("### Soft deletion");
    expect(contract).toContain("`created_at timestamptz not null`");
    expect(contract).toContain("`row_version bigint not null default 1`");
    expect(contract).toContain("`organization_audit_events`");
  });

  it("uses exactly Owner, Admin and Member as immutable v1 Organization roles", () => {
    const roles = section("### 3.2 `organization_roles`", "### 3.3 `organization_permissions`");
    expect(roles).toContain("`OWNER`, `ADMIN`, `MEMBER` only in v1");
    expect(roles).toContain("Soft delete: prohibited");
    expect(contract).toContain("Exactly one active Owner");
  });

  it("covers invite, remove, project, asset and Credit management permissions", () => {
    const matrix = section("## 4. Permission matrix", "## 5. Future reserved contracts");
    expect(matrix).toContain("`MEMBER_INVITE`");
    expect(matrix).toContain("`MEMBER_REMOVE`");
    expect(matrix).toContain("`PROJECT_MANAGE`");
    expect(matrix).toContain("`ASSET_MANAGE`");
    expect(matrix).toContain("`CREDIT_POLICY_MANAGE`");
    expect(matrix).toContain("Admin cannot remove Owner");
    expect(matrix).toContain("not minting, Billing or direct balance writes");
  });

  it("defines fail-closed RLS for Tenant and Organization isolation", () => {
    const rls = section("## 6. RLS proposal", "## 7. Migration plan");
    expect(rls).toContain("Enable RLS on every Organization table");
    expect(rls).toContain("`anon`: no access");
    expect(rls).toContain("direct writes revoked");
    expect(rls).toContain("current_customer_tenant_id_v1()");
    expect(rls).toContain("has_organization_permission_v1(organization_id, permission_key)");
    expect(rls).toContain("Same Tenant, different Organization: access denied");
    expect(rls).toContain("Tenant member but not Organization member");
    expect(rls).toContain("Product Organization Owner cannot access platform Admin routes");
  });

  it("never auto-shares Tenant resources or grants cross-Organization access", () => {
    expect(contract).toContain("Tenant membership never shares every Tenant resource");
    expect(contract).toContain("Assets and Projects are shared only by explicit future permission rows");
    expect(contract).toContain("Explicit Asset/Project permission in Organization A cannot be used in Organization B");
    expect(contract).toContain("No backfill from Tenant, past Jobs, email domain or current Asset/Project ownership");
  });

  it("preserves customer Tenant membership, Workspace roles and the Credit ledger", () => {
    expect(contract).toContain("`customer_tenant_memberships`: unchanged and not backfilled");
    expect(WORKSPACE_ROLES).toEqual([
      "OWNER",
      "ADMIN",
      "MANAGER",
      "CREATOR",
      "REVIEWER",
      "VIEWER",
    ]);
    expect(contract).toContain("`tenant_credit_accounts`, `credit_transactions`, consume/refund RPCs: unchanged");
    expect(contract).toContain("Must never reuse `tenant_credit_accounts`, modify `credit_transactions`");
  });

  it("contains additive migration and non-destructive rollback plans", () => {
    const migration = section("## 7. Migration plan", "## 8. Rollback plan");
    const rollback = section("## 8. Rollback plan", "## 9. Compatibility guarantees");
    expect(migration).toContain("this P0 document does not execute it");
    expect(migration).toContain("Do not create Organization rows, members or invites automatically");
    expect(migration).toContain("Do not authorize from shadow results");
    expect(rollback).toContain("Never delete Organizations, members, invites or audit rows");
    expect(rollback).toContain("Never update balances directly or move a charge to Personal Credits");
  });

  it("is documentation only with no production, Billing or Credit mutation", () => {
    expect(contract).toContain("Status: `DESIGN_ONLY_NOT_PRODUCTION`");
    const safety = section("## 10. Candidate safety statement");
    expect(safety).toContain("Migration file created: `NO`");
    expect(safety).toContain("Migration applied: `NO`");
    expect(safety).toContain("Production schema changed: `NO`");
    expect(safety).toContain("Billing changed: `NO`");
    expect(safety).toContain("Credit ledger changed: `NO`");
    expect(safety).toContain("Production changed: `NO`");
  });
});
