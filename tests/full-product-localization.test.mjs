import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const catalogSource = fs.readFileSync("src/i18n/productPhase2Dictionary.ts", "utf8");
const dictionarySource = fs.readFileSync("src/i18n/dictionary.ts", "utf8");
const [englishSource, chineseSource = ""] = catalogSource.split(/export const productPhase2Zh = \{/);

function catalogKeys(source) {
  return [...source.matchAll(/^  "([^"]+)":/gm)].map((match) => match[1]);
}

const englishKeys = catalogKeys(englishSource);
const chineseKeys = catalogKeys(chineseSource);

test("Phase 2 product dictionary has complete and unique Chinese coverage", () => {
  assert.ok(englishKeys.length >= 400);
  assert.equal(new Set(englishKeys).size, englishKeys.length);
  assert.equal(new Set(chineseKeys).size, chineseKeys.length);
  assert.deepEqual([...englishKeys].sort(), [...chineseKeys].sort());
  assert.match(dictionarySource, /\.\.\.productPhase2En/);
  assert.match(dictionarySource, /\.\.\.productPhase2Zh/);
});

test("Phase 2 product surfaces consume the shared useI18n hook", () => {
  for (const path of [
    "src/features/dashboard/components/UserDashboard.tsx",
    "src/features/dashboard/components/DemoProjectWorkspace.tsx",
    "src/features/studio/components/StudioStoryboardPanel.tsx",
    "src/features/client-review/ExternalClientReviewPortal.tsx",
  ]) {
    const source = fs.readFileSync(path, "utf8");
    assert.match(source, /useI18n/);
  }
});

test("Phase 2 covers Dashboard, Storyboard, Production, Review, Delivery, and Client Review", () => {
  for (const prefix of [
    "dashboard.",
    "studio.storyboard.",
    "studio.production.",
    "studio.review.",
    "studio.delivery.",
    "studio.clientReview.",
    "clientReview.",
  ]) {
    assert.ok(englishKeys.some((key) => key.startsWith(prefix)), `missing ${prefix}`);
  }
});

test("Phase 2 target components contain no directly rendered English UI copy", () => {
  for (const path of [
    "src/features/dashboard/components/UserDashboard.tsx",
    "src/features/dashboard/components/DemoProjectWorkspace.tsx",
    "src/features/studio/components/StudioStoryboardPanel.tsx",
    "src/features/client-review/ExternalClientReviewPortal.tsx",
  ]) {
    const source = fs.readFileSync(path, "utf8");
    assert.doesNotMatch(source, /<[A-Za-z][^>]*>[ \t]*[A-Za-z][^<{\n]*</, `${path} contains hard-coded JSX copy`);
    assert.doesNotMatch(source, /(?:aria-label|placeholder)="[A-Za-z]/, `${path} contains a hard-coded accessible label`);
  }
});
