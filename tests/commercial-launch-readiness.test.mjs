import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(path, "utf8");

const home = read("src/components/home/HomePage.tsx");
const pricing = read("src/components/pricing/PricingBillingPage.tsx");
const signUp = read("src/components/auth/SignUpForm.tsx");
const dashboard = read("src/features/dashboard/components/UserDashboard.tsx");
const legal = read("src/components/legal/CommercialBetaLegalPage.tsx");
const launchDictionary = read("src/i18n/commercialLaunchDictionary.ts");
const termsPage = read("src/app/terms/page.tsx");
const privacyPage = read("src/app/privacy/page.tsx");

test("commercial beta legal routes expose localized Terms and Privacy content", () => {
  assert.match(termsPage, /CommercialBetaLegalPage kind="terms"/);
  assert.match(privacyPage, /CommercialBetaLegalPage kind="privacy"/);
  assert.match(legal, /legal\.terms\.title/);
  assert.match(legal, /legal\.privacy\.title/);
  assert.match(launchDictionary, /AI-assisted results/);
  assert.match(launchDictionary, /We do not sell personal information/);
});

test("registration requires explicit legal consent and guides a new account to onboarding", () => {
  assert.match(signUp, /acceptedLegal/);
  assert.match(signUp, /id="accept-commercial-beta-legal"/);
  assert.match(signUp, /href="\/terms"/);
  assert.match(signUp, /href="\/privacy"/);
  assert.match(signUp, /\/dashboard\?welcome=1/);
  assert.match(dashboard, /registrationWelcome/);
  assert.match(dashboard, /href="\/dashboard\/demo"/);
});

test("pricing clearly presents beta access without checkout or payment integration", () => {
  assert.match(pricing, /pricing\.beta\.noticeTitle/);
  assert.match(pricing, /pricing\.beta\.noticeBody/);
  assert.match(pricing, /pricing\.beta\.billingBody/);
  assert.match(pricing, /href=\{plan\.ctaHref\}/);
  assert.doesNotMatch(pricing, /stripe|checkoutSession|paymentIntent|subscribe\(/i);
});

test("homepage leads with the commercial beta lifecycle and a read-only demo", () => {
  assert.match(home, /home\.launch\.heroEyebrow/);
  assert.match(home, /href: "\/dashboard\/demo"/);
  for (const stage of ["project", "canvas", "production", "delivery"]) {
    assert.ok(home.includes(`home.launch.flow.${stage}.title`));
  }
  assert.match(home, /home\.launch\.demoCta/);
  assert.match(home, /href="\/terms"/);
  assert.match(home, /href="\/privacy"/);
});

test("launch surfaces remain presentation-only", () => {
  const launchSurface = `${home}\n${pricing}\n${legal}\n${dashboard}`;
  assert.doesNotMatch(launchSurface, /providerRequest|createJob|startRuntime|deductCredits|stripe/i);
});
