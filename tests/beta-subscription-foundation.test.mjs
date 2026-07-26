import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const api = read("src/lib/enterprise-workspace-api.ts");
const request = read("src/lib/beta-upgrade-request.ts");
const planUi = read("src/components/subscription/PlanEntitlementDetails.tsx");
const upgradeUi = read("src/components/subscription/BetaUpgradeRequestCard.tsx");
const account = read("src/components/account/AccountWorkspaceSummary.tsx");
const workspace = read("src/features/workspace/components/WorkspaceCenter.tsx");
const pricing = read("src/components/pricing/PricingBillingPage.tsx");
const dictionary = read("src/i18n/subscriptionFoundationDictionary.ts");

test("Account and Workspace consume current plan and entitlement snapshots", () => {
  assert.match(api, /\/api\/organizations\/\$\{encodeURIComponent\(organizationId\)\}\/entitlements/);
  assert.match(account, /getEnterpriseOrganizationEntitlements/);
  assert.match(account, /PlanEntitlementDetails/);
  assert.match(workspace, /getEnterpriseOrganizationEntitlements/);
  assert.match(workspace, /PlanEntitlementDetails/);
  for (const field of ["usageLimit", "memberLimit", "storageLimit", "featureAccess"]) {
    assert.match(planUi, new RegExp(field));
  }
});

test("Beta upgrade is a dedicated manual request with no Subscription mutation", () => {
  assert.match(request, /createEnterpriseBetaUpgradeRequest/);
  assert.match(api, /\/upgrade-requests/);
  assert.match(api, /subscriptionChanged:\s*false/);
  assert.match(api, /entitlementChanged:\s*false/);
  assert.doesNotMatch(request, /checkout|stripe|invoice/i);
  assert.match(upgradeUi, /request\.requestId/);
});

test("only Owner and Admin can see upgrade management", () => {
  assert.match(upgradeUi, /role === "OWNER" \|\| \(role === "ADMIN" && organizationWide\)/);
  assert.match(upgradeUi, /permissions\?\.includes\("PLAN_MANAGE"\)/);
  assert.match(workspace, /canManagePlan && entitlements/);
});

test("Pricing exposes Beta request and contact paths without checkout", () => {
  assert.match(pricing, /\/workspace\?upgrade=1/);
  assert.match(pricing, /subscription\.pricing\.contact/);
  assert.doesNotMatch(pricing, /stripe|checkout|paymentIntent|invoice/i);
});

test("subscription foundation is bilingual and complete", () => {
  const englishKeys = [...dictionary.matchAll(/^\s*"(subscription\.[^"]+)":/gm)].map((match) => match[1]);
  const unique = new Set(englishKeys);
  assert.ok(unique.size >= 35);
  for (const key of unique) {
    assert.equal(englishKeys.filter((item) => item === key).length, 2, `${key} must exist in both locales`);
  }
});

test("subscription UI does not modify Provider, Runtime, Credits, or billing", () => {
  const combined = [request, planUi, upgradeUi, account, workspace].join("\n");
  assert.doesNotMatch(combined, /\/api\/(generate|jobs|queue|runtime|billing|credits)/i);
  assert.doesNotMatch(combined, /assignPlan|automaticPlanUpgrade:\s*true|automaticCharge:\s*true/);
});
