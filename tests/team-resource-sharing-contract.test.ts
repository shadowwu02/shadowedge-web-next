import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const contract = readFileSync(
  new URL("../docs/runbooks/team-resource-sharing-contract-v1.md", import.meta.url),
  "utf8",
);

describe("Team resource sharing design contract", () => {
  it("is explicitly design-only with no production or financial mutation", () => {
    expect(contract).toContain("Status: `DESIGN_ONLY_NOT_PRODUCTION`");
    expect(contract).toContain("Production schema/migration | No");
    expect(contract).toContain("Billing/Stripe | No");
    expect(contract).toContain("Credit accounts/ledger | No");
    expect(contract).toContain("PRODUCTION_CHANGE=NO");
  });

  it("defines separate Project and Asset resource and grant models", () => {
    for (const table of [
      "organization_project_resources",
      "organization_project_permissions",
      "organization_asset_resources",
      "organization_asset_permissions",
    ]) {
      expect(contract).toContain(`\`${table}\``);
    }
    expect(contract).toContain("VIEW < EDIT < MANAGE");
    expect(contract).toContain("`ROLE` or `MEMBER`");
  });

  it("requires explicit grants and prohibits Project-to-Asset inheritance", () => {
    expect(contract).toContain("explicit resource link -> explicit permission grant");
    expect(contract).toContain("A Project grant does not automatically grant access to Assets");
    expect(contract).toContain("Project `MANAGE` does not imply Asset `VIEW`");
    expect(contract).toContain("Organization role membership alone is not a resource grant");
    expect(contract).toContain("Absence of an active grant is denial");
  });

  it("preserves Canonical ownership and rejects unsafe Assets", () => {
    expect(contract).toContain("Canonical Project/Asset owner, Tenant, storage, source Job and lineage remain unchanged");
    expect(contract).toContain("Canonical `READY`");
    expect(contract).toContain("Legacy tenant-null");
    expect(contract).toContain("URL-only");
    expect(contract).toContain("cross-Tenant Asset cannot be linked");
    expect(contract).toContain("Team-native Asset authority marker");
  });

  it("defines server-projected permissions without Browser role inference", () => {
    expect(contract).toContain("allowedActions");
    expect(contract).toContain("assignableResourcePermissions");
    expect(contract).toContain("per-resource `availableActions`");
    expect(contract).toContain("never derives authority from the role label");
  });

  it("defines scoped Project and Asset APIs", () => {
    expect(contract).toContain("GET /api/organizations/:organizationRef/projects");
    expect(contract).toContain("projects/:projectRef/permissions");
    expect(contract).toContain("GET /api/organizations/:organizationRef/assets");
    expect(contract).toContain("assets/:assetRef/permissions");
    expect(contract).toContain("assets/:assetRef/delivery");
    expect(contract).toContain("Mutations require `Idempotency-Key`");
  });

  it("keeps Tenant and Organization isolation fail-closed", () => {
    expect(contract).toContain("same-Tenant Organization membership plus active explicit resource grant");
    expect(contract).toContain("different Organization");
    expect(contract).toContain("different Tenant/guessed reference denial");
    expect(contract).toContain("hidden-resource `404`");
  });

  it("keeps Legacy resources isolated without backfill or dual write", () => {
    expect(contract).toContain("Legacy Workspace Project routes remain authoritative");
    expect(contract).toContain("Legacy Asset library/owner routes remain authoritative");
    expect(contract).toContain("No dual write exists");
    expect(contract).toContain("existing resource without an approved Team-native authority marker is not Team-shareable in v1");
    expect(contract).toContain("Do not inventory, import or backfill");
  });

  it("defines a non-destructive rollback", () => {
    expect(contract).toContain("Rollback is authority disablement, not data deletion or reverse migration");
    expect(contract).toContain("Preserve Team resource/grant/audit rows read-only");
    expect(contract).toContain("Preserve Legacy Workspace/Asset behavior unchanged");
    expect(contract).toContain("Do not copy Team resource grants into Legacy authority");
  });

  it("publishes the requested readiness classification", () => {
    expect(contract).toContain("TEAM_RESOURCE_CONTRACT_READY=YES");
    expect(contract).toContain("PROJECT_PERMISSION_MODEL_READY=YES");
    expect(contract).toContain("ASSET_PERMISSION_MODEL_READY=YES");
    expect(contract).toContain("LEGACY_RESOURCE_ISOLATION_READY=YES");
  });
});
