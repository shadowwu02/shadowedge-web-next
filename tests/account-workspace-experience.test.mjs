import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(path, "utf8");
const route = read("src/app/workspace/page.tsx");
const center = read("src/features/workspace/components/WorkspaceCenter.tsx");
const permissions = read("src/features/workspace/workspacePermissions.ts");
const api = read("src/lib/enterprise-workspace-api.ts");
const account = read("src/components/account/AccountCreditsPage.tsx");
const accountSummary = read("src/components/account/AccountWorkspaceSummary.tsx");
const shell = read("src/components/layout/AppShell.tsx");
const dictionary = read("src/i18n/workspaceExperienceDictionary.ts");

test("Account exposes Profile, status, Beta, current plan, usage, Workspace, and feedback", () => {
  assert.match(account, /workspace\.account\.profile/);
  assert.match(account, /account\.accountStatus/);
  assert.match(account, /workspace\.account\.betaStatus/);
  assert.match(account, /AccountWorkspaceSummary/);
  assert.match(account, /account\.creditsSummary/);
  assert.match(account, /BetaFeedbackCenter appearance="card" entry="account"/);
  assert.match(accountSummary, /getEnterpriseOrganizationPlan/);
});

test("Workspace is a first-class authenticated product route and navigation entry", () => {
  assert.match(route, /<WorkspaceCenter \/>/);
  assert.match(route, /workspaceNav/);
  assert.match(shell, /label: t\("workspace\.nav"\), href: "\/workspace"/);
  assert.match(center, /useAuthSession/);
  assert.match(center, /router\.replace\("\/sign-in\?next=%2Fworkspace"\)/);
});

test("Workspace shows the current scope, members, all roles, permissions, usage, and plan", () => {
  for (const role of ["OWNER", "ADMIN", "MANAGER", "CREATOR", "REVIEWER", "VIEWER"]) {
    assert.match(permissions, new RegExp(role));
  }
  assert.match(center, /workspace\.members\.title/);
  assert.match(center, /workspace\.roles\.title/);
  assert.match(center, /workspace\.permissions/);
  assert.match(center, /workspace\.usage\.projectBreakdown/);
  assert.match(center, /IMAGE_GENERATION/);
  assert.match(center, /VIDEO_GENERATION/);
  assert.match(center, /workspace\.plan\.noPayment/);
});

test("Member, usage, and plan reads stay behind the server-aligned permission boundary", () => {
  assert.match(center, /hasWorkspacePermission\(membershipPermissions, "MEMBER_VIEW"\)/);
  assert.match(center, /hasWorkspacePermission\(membershipPermissions, "USAGE_VIEW"\)/);
  assert.match(center, /hasWorkspacePermission\(organizationPermissions, "PLAN_VIEW"\)/);
  assert.match(center, /workspace\.members\.restricted/);
  assert.match(center, /workspace\.usage\.restricted/);
  assert.match(center, /workspace\.plan\.restricted/);
});

test("Enterprise experience consumes only the existing authenticated read APIs", () => {
  for (const path of [
    "/api/organizations",
    "/api/workspaces/",
    "/members",
    "/usage",
    "/plan",
  ]) {
    assert.ok(api.includes(path), `missing ${path}`);
  }
  assert.doesNotMatch(api, /method:\s*["']POST|method:\s*["']PUT|method:\s*["']PATCH|method:\s*["']DELETE/);
  assert.doesNotMatch(`${center}\n${accountSummary}`, /stripe|checkoutSession|paymentIntent|providerRequest|startRuntime|deductCredits/i);
});

test("Workspace and Account experience is localized in English and Chinese", () => {
  const keys = [...dictionary.matchAll(/"((?:workspace\.)[^"]+)":/g)].map((match) => match[1]);
  const uniqueKeys = new Set(keys);
  assert.ok(uniqueKeys.size >= 80);
  for (const key of uniqueKeys) {
    assert.equal(keys.filter((candidate) => candidate === key).length, 2, `${key} must exist in both locales`);
  }
  assert.match(dictionary, /Workspace Center/);
  assert.match(dictionary, /Workspace 中心/);
});

test("Workspace experience does not modify Studio behavior", () => {
  const workspaceSurface = `${center}\n${account}\n${accountSummary}\n${shell}\n${api}`;
  assert.doesNotMatch(workspaceSurface, /StudioWorkspace|creative-canvas|confirmExecution|createJob|generateImage|generateVideo/i);
});
