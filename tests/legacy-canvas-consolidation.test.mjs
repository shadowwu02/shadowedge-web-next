import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const appShell = fs.readFileSync("src/components/layout/AppShell.tsx", "utf8");
const homePage = fs.readFileSync("src/components/home/HomePage.tsx", "utf8");
const legacyCanvas = fs.readFileSync("src/components/canvas/CanvasWorkspace.tsx", "utf8");
const legacyPage = fs.readFileSync("src/app/workspace/canvas/page.tsx", "utf8");
const canvasStorage = fs.readFileSync("src/lib/canvas/canvasStorage.ts", "utf8");
const canvasRoutes = fs.readFileSync("src/lib/canvas/canvasRoutes.ts", "utf8");
const dictionary = fs.readFileSync("src/i18n/dictionary.ts", "utf8");
const commercialDictionary = fs.readFileSync("src/i18n/commercialLaunchDictionary.ts", "utf8");
const studioCanvas = fs.readFileSync("src/features/studio/components/StudioCreativeCanvas.tsx", "utf8");
const studioWorkspace = fs.readFileSync("src/features/studio/components/StudioWorkspace.tsx", "utf8");

test("Studio is the only recommended creative workspace entry", () => {
  assert.match(canvasRoutes, /CREATIVE_CANVAS_ENTRY = "\/studio\?canvas=creative"/);
  assert.match(appShell, /label: "Studio", href: CREATIVE_CANVAS_ENTRY/);
  assert.doesNotMatch(appShell, /label: t\("nav\.canvas"\)/);
  assert.doesNotMatch(appShell, /href: "\/workspace\/canvas"/);
  assert.doesNotMatch(homePage, /href[:=]\s*["']\/workspace\/canvas/);
  assert.doesNotMatch(studioCanvas, /LEGACY_CANVAS_ROUTE|migrationPlan\.legacyRoute/);
  assert.match(
    studioWorkspace,
    /useState<StudioWorkspaceModule>\(\(\) => \{[\s\S]*?: "canvas";[\s\S]*?\}\)/,
  );
});

test("Home and legacy migration CTAs enter Studio", () => {
  assert.match(homePage, /href: CREATIVE_CANVAS_ENTRY, key: "home\.launch\.canvas"/);
  assert.match(homePage, /href: CREATIVE_CANVAS_ENTRY, key: "home\.openCanvas"/);
  assert.match(commercialDictionary, /"home\.launch\.canvas": "Enter Studio"/);
  assert.match(dictionary, /"home\.openCanvas": "Enter Studio"/);
  const migrationLabels = [...dictionary.matchAll(/"canvas\.openCreativeCanvas": "([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(migrationLabels, ["Enter Studio", "进入 Studio"]);
});

test("legacy Canvas remains available with a clear one-way migration banner", () => {
  assert.match(legacyPage, /CanvasWorkspace/);
  assert.match(legacyCanvas, /data-canvas-product="legacy"/);
  assert.match(legacyCanvas, /data-primary-product="false"/);
  assert.match(legacyCanvas, /canvas\.legacyNoticeTitle/);
  assert.match(legacyCanvas, /canvas\.legacyNoticeBody/);
  assert.match(legacyCanvas, /href=\{CREATIVE_CANVAS_ENTRY\}/);
  assert.match(dictionary, /"canvas\.legacyNoticeBody": "Creative Canvas has moved to Studio\."/);
});

test("legacy workflow persistence remains unchanged and local", () => {
  assert.match(canvasStorage, /CANVAS_WORKFLOW_STORAGE_KEY = "shadowedge_next_canvas_workflow_v1"/);
  assert.match(canvasStorage, /localStorage\.getItem\(CANVAS_WORKFLOW_STORAGE_KEY\)/);
  assert.match(canvasStorage, /localStorage\.setItem\(CANVAS_WORKFLOW_STORAGE_KEY/);
  assert.doesNotMatch(legacyCanvas, /removeItem|clear\(\)|migrat/i);
});

test("legacy Canvas is excluded from primary-product analytics and keeps shared auth", () => {
  assert.doesNotMatch(legacyCanvas, /trackEvent|analytics\.track|gtag\(/);
  assert.match(legacyCanvas, /data-primary-product="false"/);
  assert.match(legacyPage, /<AppShell hideSidebar workspaceNav>/);
  assert.match(appShell, /<TopBar/);
});
