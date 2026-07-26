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
const studioWorkspace = fs.readFileSync("src/features/studio/components/StudioWorkspace.tsx", "utf8");

test("recommended Canvas entry points converge on Studio Creative Canvas", () => {
  assert.match(canvasRoutes, /CREATIVE_CANVAS_ENTRY = "\/studio\?canvas=creative"/);
  assert.match(appShell, /label: t\("nav\.canvas"\), href: CREATIVE_CANVAS_ENTRY/);
  assert.doesNotMatch(appShell, /href: "\/workspace\/canvas"/);
  assert.doesNotMatch(homePage, /href[:=]\s*["']\/workspace\/canvas/);
  assert.match(
    studioWorkspace,
    /useState<StudioWorkspaceModule>\(\(\) => \{[\s\S]*?: "canvas";[\s\S]*?\}\)/,
  );
});

test("legacy Canvas remains available with a clear migration banner", () => {
  assert.match(legacyPage, /CanvasWorkspace/);
  assert.match(legacyCanvas, /data-canvas-product="legacy"/);
  assert.match(legacyCanvas, /data-primary-product="false"/);
  assert.match(legacyCanvas, /href=\{CREATIVE_CANVAS_ENTRY\}/);
  assert.match(dictionary, /"canvas\.legacyNoticeTitle": "这是旧版 Canvas。"/);
  assert.match(dictionary, /"canvas\.legacyNoticeBody": "Creative Canvas 已迁移到 Studio。"/);
  assert.match(dictionary, /"canvas\.openCreativeCanvas": "打开 Creative Canvas"/);
});

test("legacy workflow persistence remains unchanged and local", () => {
  assert.match(canvasStorage, /CANVAS_WORKFLOW_STORAGE_KEY = "shadowedge_next_canvas_workflow_v1"/);
  assert.match(canvasStorage, /localStorage\.getItem\(CANVAS_WORKFLOW_STORAGE_KEY\)/);
  assert.match(canvasStorage, /localStorage\.setItem\(CANVAS_WORKFLOW_STORAGE_KEY/);
  assert.doesNotMatch(legacyCanvas, /removeItem|clear\(\)|migrat/i);
});

test("consolidation does not introduce primary-product analytics or auth divergence", () => {
  assert.doesNotMatch(legacyCanvas, /trackEvent|analytics\.track|gtag\(/);
  assert.match(legacyPage, /<AppShell hideSidebar workspaceNav>/);
  assert.match(appShell, /<TopBar/);
});
