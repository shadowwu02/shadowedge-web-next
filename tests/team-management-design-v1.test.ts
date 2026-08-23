import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  WORKSPACE_ROLES,
  WORKSPACE_ROLE_PERMISSIONS,
} from "../src/features/workspace/workspacePermissions";

const design = readFileSync(
  new URL("../docs/runbooks/team-management-design-v1.md", import.meta.url),
  "utf8",
);

function section(title: string, nextTitle?: string) {
  const start = design.indexOf(title);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = nextTitle ? design.indexOf(nextTitle, start + title.length) : design.length;
  expect(end).toBeGreaterThan(start);
  return design.slice(start, end);
}

describe("Team Management Foundation architecture", () => {
  it("defines Organization as a same-Tenant product scope, not Tenant membership", () => {
    expect(design).toContain("Tenant -> Organization -> Workspace -> Team -> Project / Shared Asset / Generation");
    expect(design).toContain("not use Tenant as an Organization");
    expect(design).toContain("not reuse `customer_tenant_memberships` as team membership");
    expect(design).toContain("Organization membership never creates, moves, binds, removes, or repairs `customer_tenant_memberships`");
    expect(design).toContain("Cross-Tenant invites fail closed");
  });

  it("uses exactly Owner, Admin and Member as canonical Organization roles", () => {
    const roleSection = section("## 4. Organization role and permission model", "## 5. Database proposal");
    expect(roleSection).toContain("`OWNER`");
    expect(roleSection).toContain("`ADMIN`");
    expect(roleSection).toContain("`MEMBER`");
    expect(roleSection).toContain("Generate with Organization Credits");
    expect(roleSection).toContain("View shared Assets");
    expect(roleSection).toContain("Manage Organization Credits");
    expect(roleSection).toContain("Invite members");
    expect(roleSection).toContain("Manage Billing");
  });

  it("preserves the existing six Workspace roles without migration", () => {
    expect(WORKSPACE_ROLES).toEqual([
      "OWNER",
      "ADMIN",
      "MANAGER",
      "CREATOR",
      "REVIEWER",
      "VIEWER",
    ]);
    expect(WORKSPACE_ROLE_PERMISSIONS.OWNER).toEqual(WORKSPACE_ROLE_PERMISSIONS.ADMIN);
    expect(design).toContain("No existing six-role record is rewritten in v1");
  });

  it("preserves personal Credits and proposes a separate Organization ledger", () => {
    const creditSection = section("## 6. Shared Credit design", "## 7. API proposal");
    expect(creditSection).toContain("existing `tenant_credit_accounts` and `credit_transactions`");
    expect(creditSection).toContain("separately approved ledger phase");
    expect(creditSection).toContain("Never silently charge Personal Credits");
    expect(creditSection).toContain("Refund always returns exactly once to the account named by the original immutable receipt");
    expect(creditSection).toContain("No current Credit table, RPC, balance, price or transaction is changed");
  });

  it("shares Assets and Projects explicitly without changing canonical ownership", () => {
    expect(design).toContain("`organization_asset_grants`");
    expect(design).toContain("`organization_project_links`");
    expect(design).toContain("The original `media_assets.user_id`, Tenant, source Job lineage and storage contract never change");
    expect(design).toContain("Existing Projects are not auto-linked or backfilled");
    expect(design).toContain("they do not query all rows by `tenant_id`");
  });

  it("defines database, API, migration and rollback proposals", () => {
    expect(design).toContain("## 5. Database proposal");
    expect(design).toContain("## 7. API proposal");
    expect(design).toContain("## 10. Migration plan");
    expect(design).toContain("## 11. Rollback plan");
    expect(design).toContain("`organizations`");
    expect(design).toContain("`organization_members`");
    expect(design).toContain("`organization_invites`");
    expect(design).toContain("`organization_credit_accounts`");
    expect(design).toContain("`organization_credit_ledger_entries`");
  });

  it("keeps platform Admin permissions separate from product Organization roles", () => {
    const adminSection = section("## 8. Admin proposal", "## 9. Phased implementation plan");
    expect(adminSection).toContain("`ORGANIZATION_READ`");
    expect(adminSection).toContain("`ORGANIZATION_OPERATIONS`");
    expect(adminSection).toContain("`ORGANIZATION_CREDIT_OPERATIONS`");
    expect(adminSection).toContain("Product Organization Owner/Admin does not gain access");
  });

  it("is design-only with no billing, membership, ledger or production mutation", () => {
    expect(design).toContain("Status: `DESIGN_ONLY_NOT_PRODUCTION`");
    const safety = section("## 13. Candidate safety statement");
    expect(safety).toContain("Billing changed: `NO`");
    expect(safety).toContain("Stripe changed: `NO`");
    expect(safety).toContain("Customer Tenant Membership migrated or mutated: `NO`");
    expect(safety).toContain("Credit ledger changed: `NO`");
    expect(safety).toContain("Production changed: `NO`");
  });
});
