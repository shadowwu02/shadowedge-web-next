import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const dashboard = fs.readFileSync("src/features/dashboard/components/UserDashboard.tsx", "utf8");
const demo = fs.readFileSync("src/features/dashboard/components/DemoProjectWorkspace.tsx", "utf8");
const signIn = fs.readFileSync("src/components/auth/SignInForm.tsx", "utf8");
const signUp = fs.readFileSync("src/components/auth/SignUpForm.tsx", "utf8");
const studio = fs.readFileSync("src/features/studio/components/StudioWorkspace.tsx", "utf8");
const phase2Catalog = fs.readFileSync("src/i18n/productPhase2Dictionary.ts", "utf8");

test("login and registration default to Dashboard while explicit next routes remain supported", () => {
  assert.match(signIn, /getSafeAuthNext\(searchParams\.get\("next"\), "\/dashboard"\)/);
  assert.match(signUp, /getSafeAuthNext\(searchParams\.get\("next"\), "\/dashboard"\)/);
});
test("Dashboard exposes onboarding, project, Canvas, template, and demo entry points", () => {
  for (const label of [
    "Welcome to ShadowEdge",
    "Start with Copilot",
    "Create Project",
    "Open Creative Canvas",
    "Browse Templates",
    "Open Demo Project",
  ]) assert.match(`${dashboard}\n${phase2Catalog}`, new RegExp(label));
  assert.match(dashboard, /listStudioProjects\(\)/);
  assert.match(dashboard, /createStudioProject\(t\("dashboard\.project\.untitled"\)\)/);
});

test("Studio accepts an owned project route and leaves ownership enforcement to the protected project API", () => {
  assert.match(studio, /searchParams\.get\("project"\)/);
  assert.match(studio, /getStudioProject\(requestedProjectId\)/);
  assert.match(studio, /isSignedIn/);
});

test("Demo stays read-only and does not call project, provider, runtime, billing, or generation APIs", () => {
  assert.match(phase2Catalog, /Read only/);
  assert.match(phase2Catalog, /Excluded from analytics/);
  assert.doesNotMatch(demo, /apiRequest|createStudioProject|updateStudioProject|fetch\(|Provider|Generate|Run|Credits/);
});
