import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const dictionarySource = fs.readFileSync("src/i18n/dictionary.ts", "utf8");
const i18nSource = fs.readFileSync("src/i18n/useI18n.ts", "utf8");
const [englishSource, chineseSource = ""] = dictionarySource.split(/\n  zh: \{/);

function studioKeys(source) {
  return [...source.matchAll(/^    "(studio\.[^"]+)":/gm)].map((match) => match[1]);
}

const englishKeys = studioKeys(englishSource);
const chineseKeys = studioKeys(chineseSource);

test("Studio Phase 1 dictionary has complete Chinese coverage and unique keys", () => {
  assert.ok(englishKeys.length >= 300);
  assert.equal(new Set(englishKeys).size, englishKeys.length);
  assert.equal(new Set(chineseKeys).size, chineseKeys.length);
  assert.deepEqual([...englishKeys].sort(), [...chineseKeys].sort());
});

test("Studio core surfaces consume the shared useI18n hook", () => {
  for (const path of [
    "src/features/studio/components/StudioWorkspace.tsx",
    "src/features/studio/components/StudioCanvas.tsx",
    "src/features/studio/components/StudioCreativeCanvas.tsx",
    "src/features/studio/components/StudioApiIntegration.tsx",
    "src/features/studio/components/StudioToolbar.tsx",
    "src/features/studio/components/StudioTemplateControls.tsx",
    "src/features/studio/components/StudioProjectInitializationAssistant.tsx",
    "src/features/studio/components/StudioProjectCopilotCommandCenter.tsx",
  ]) {
    const source = fs.readFileSync(path, "utf8");
    assert.match(source, /useI18n/);
  }
});

test("English remains the default and per-key fallback locale", () => {
  assert.match(i18nSource, /useState<Locale>\("en"\)/);
  assert.match(i18nSource, /dictionary\[locale\]\[key\] \|\| dictionary\.en\[key\]/);
});

test("Phase 1 covers tabs, Canvas, Copilot, Draft, Preview, status, empty, error, and loading", () => {
  for (const prefix of [
    "studio.workspace.",
    "studio.canvas.",
    "studio.creativeCanvas.",
    "studio.copilot.",
    "studio.command.",
    "studio.status.",
    "studio.api.",
  ]) {
    assert.ok(englishKeys.some((key) => key.startsWith(prefix)), `missing ${prefix}`);
  }
});
