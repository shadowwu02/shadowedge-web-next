import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const workspace = fs.readFileSync("src/features/studio/components/StudioWorkspace.tsx", "utf8");
const toolbar = fs.readFileSync("src/features/studio/components/StudioToolbar.tsx", "utf8");
const canvas = fs.readFileSync("src/features/studio/components/StudioCanvas.tsx", "utf8");
const creativeCanvas = fs.readFileSync("src/features/studio/components/StudioCreativeCanvas.tsx", "utf8");
const commandCenter = fs.readFileSync("src/features/studio/components/StudioProjectCopilotCommandCenter.tsx", "utf8");
const experienceMode = fs.readFileSync("src/features/studio/lib/studioExperienceMode.ts", "utf8");
const dictionary = fs.readFileSync("src/i18n/dictionary.ts", "utf8");

test("Creator Mode is the safe default and remains a local display preference", () => {
  assert.match(experienceMode, /type StudioExperienceMode = "CREATOR" \| "ADVANCED"/);
  assert.match(experienceMode, /return "CREATOR"/);
  assert.match(experienceMode, /window\.localStorage\.setItem/);
  assert.doesNotMatch(experienceMode, /fetch\(|\/api\//);
  assert.match(workspace, /useState<StudioExperienceMode>\("CREATOR"\)/);
  assert.match(workspace, /data-studio-experience=\{experienceMode\.toLowerCase\(\)\}/);
});

test("Creator toolbar hides runtime and node-debug operations while Advanced keeps them", () => {
  assert.match(toolbar, /experienceMode === "ADVANCED"[\s\S]*?runNodes\(\)/);
  assert.match(toolbar, /experienceMode === "ADVANCED"[\s\S]*?studio\.toolbar\.newNode/);
  assert.match(toolbar, /experienceMode === "ADVANCED"[\s\S]*?<StudioTemplateControls/);
  assert.match(toolbar, /studio\.mode\.creator/);
  assert.match(toolbar, /studio\.mode\.advanced/);
  assert.match(workspace, /experienceMode === "ADVANCED"[\s\S]*?<NodeInspector \/>/);
  assert.match(workspace, /experienceMode === "ADVANCED"[\s\S]*?<StudioRunHistoryPanel \/>/);
});

test("Creator Canvas stays on the unified view and hides technical identity metadata", () => {
  assert.match(canvas, /experienceMode === "CREATOR" \? "creative" : canvasView/);
  assert.match(canvas, /experienceMode === "ADVANCED"[\s\S]*?studio\.canvas\.switch\.workflow/);
  assert.match(canvas, /experienceMode === "ADVANCED"[\s\S]*?studio\.canvas\.switch\.agent/);
  assert.match(creativeCanvas, /experienceMode === "ADVANCED" \? <span>\{graph\.schemaVersion\}<\/span>/);
  assert.match(creativeCanvas, /experienceMode === "ADVANCED"[\s\S]*?activeDraft\.draftId/);
  assert.match(creativeCanvas, /experienceMode === "ADVANCED"[\s\S]*?selected\.referenceId/);
  assert.match(creativeCanvas, /experienceMode === "ADVANCED"[\s\S]*?selected\.metadata\.timelineRef/);
});

test("Canvas Draft behavior is preserved across Creator and Advanced modes", () => {
  for (const boundary of [
    "recoverStudioCreativeCanvasDraft",
    "saveActiveStudioCreativeCanvasDraft",
    "createStudioCreativeCanvasEditSession",
    "confirmStudioCreativeCanvasEditSession",
    "createStudioCreativeCanvasPlan",
  ]) {
    assert.match(creativeCanvas, new RegExp(boundary));
  }
  assert.doesNotMatch(experienceMode, /draftGraph|graphVersion|projectId/);
});

test("Creator Copilot wording and first-entry guidance are localized in English and Chinese", () => {
  for (const key of [
    "studio.creator.copilot.suggestion",
    "studio.creator.copilot.reasons",
    "studio.creator.copilot.nextStep",
    "studio.creator.copilot.guidance",
    "studio.creator.empty.steps",
  ]) {
    assert.equal(dictionary.split(`"${key}"`).length - 1, 2, `${key} must exist in both locales`);
  }
  assert.match(commandCenter, /studio\.creator\.copilot\.attention/);
  assert.match(commandCenter, /studio\.creator\.copilot\.reasons/);
  assert.match(commandCenter, /studio\.creator\.copilot\.nextStep/);
  assert.match(workspace, /studio\.creator\.empty\.steps/);
});

test("UX mode adds no backend, Provider, Runtime, Billing, or Credits behavior", () => {
  const changedSurface = [workspace, toolbar, canvas, commandCenter, experienceMode].join("\n");
  assert.doesNotMatch(changedSurface, /providerCost|deductCredits|createJob|startQueue|\/api\/runtime/i);
});
