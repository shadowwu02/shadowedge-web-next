import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(path, "utf8");
const component = read("src/components/feedback/BetaFeedbackCenter.tsx");
const api = read("src/lib/beta-feedback-api.ts");
const dictionary = read("src/i18n/betaFeedbackDictionary.ts");
const dashboard = read("src/features/dashboard/components/UserDashboard.tsx");
const studio = read("src/features/studio/components/StudioWorkspace.tsx");
const account = read("src/components/account/AccountCreditsPage.tsx");

test("Feedback Center is available from Dashboard, Studio, and Account", () => {
  assert.match(dashboard, /BetaFeedbackCenter appearance="card" entry="dashboard"/);
  assert.match(studio, /BetaFeedbackCenter appearance="compact" entry="studio"/);
  assert.match(account, /BetaFeedbackCenter appearance="card" entry="account"/);
});

test("Feedback Center supports all three commercial Beta feedback categories", () => {
  for (const category of ["BUG_REPORT", "FEATURE_REQUEST", "UX_FEEDBACK"]) {
    assert.match(component, new RegExp(category));
  }
  assert.match(component, /beta\.feedback\.errorType/);
  assert.match(component, /beta\.feedback\.pageSource/);
  assert.match(component, /beta\.feedback\.occurredAt/);
  assert.match(component, /beta\.feedback\.actionPath/);
});

test("Beta status shows a release version and a direct feedback entry", () => {
  assert.match(component, /export function BetaBadge/);
  assert.match(component, /getBetaReleaseVersion/);
  assert.match(component, /beta\.status\.title/);
  assert.match(component, /beta\.feedback\.open/);
});

test("signed-out feedback is restricted and authenticated feedback uses the shared API client", () => {
  assert.match(component, /useAuthSession/);
  assert.match(component, /!isSignedIn/);
  assert.match(component, /href=\{`\/sign-in\?next=/);
  assert.match(api, /apiRequest<[\s\S]*?>\("\/api\/feedback"/);
});

test("privacy boundary excludes browser secrets and query parameters", () => {
  assert.match(api, /getSafeFeedbackPath/);
  assert.match(api, /REDACTED_JWT/);
  assert.match(component, /beta\.feedback\.privacyMessage/);
  assert.doesNotMatch(component, /document\.cookie|localStorage|getStoredAuthToken|Authorization/);
});

test("all Feedback Center copy is localized in English and Chinese", () => {
  const keys = [...dictionary.matchAll(/"((?:beta\.)[^"]+)":/g)].map((match) => match[1]);
  const uniqueKeys = new Set(keys);
  assert.ok(uniqueKeys.size >= 40);
  for (const key of uniqueKeys) {
    assert.equal(keys.filter((candidate) => candidate === key).length, 2, `${key} must exist in both locales`);
  }
  assert.match(dictionary, /Bug report/);
  assert.match(dictionary, /问题报告/);
});

test("Beta feedback adds no Provider, Runtime, Billing, Credits, or generation behavior", () => {
  const surface = `${component}\n${api}\n${dashboard}\n${studio}\n${account}`;
  assert.doesNotMatch(surface, /providerRequest|createJob|startRuntime|deductCredits|generateImage|generateVideo/i);
});
