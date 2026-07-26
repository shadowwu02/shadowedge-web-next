import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const schemaSource = fs.readFileSync(
  new URL("../src/features/studio/capabilities/studioCreativeCanvas.ts", import.meta.url),
  "utf8",
);
const apiSource = fs.readFileSync(
  new URL("../src/lib/studio-creative-canvas-api.ts", import.meta.url),
  "utf8",
);
const componentSource = fs.readFileSync(
  new URL("../src/features/studio/components/StudioCreativeCanvas.tsx", import.meta.url),
  "utf8",
);
const studioCanvasSource = fs.readFileSync(
  new URL("../src/features/studio/components/StudioCanvas.tsx", import.meta.url),
  "utf8",
);
const legacyCanvasSource = fs.readFileSync(
  new URL("../src/components/canvas/CanvasWorkspace.tsx", import.meta.url),
  "utf8",
);

test("Unified Creative Canvas declares the converged node and edge schema", () => {
  for (const type of [
    "GOAL", "STRATEGY", "AGENT", "SCENE", "STORYBOARD",
    "SHOT", "ASSET", "EXECUTION", "OUTPUT", "DELIVERY",
  ]) {
    assert.match(schemaSource, new RegExp(`"${type}"`));
  }
  for (const type of ["INFORMS", "PLANS", "CONTAINS", "GENERATES", "PRODUCES", "DELIVERS"]) {
    assert.match(schemaSource, new RegExp(`"${type}"`));
  }
  assert.match(schemaSource, /creative-canvas\/v1/);
});

test("Creative Canvas reads the authenticated project graph and renders every layer", () => {
  assert.match(apiSource, /\/creative-canvas/);
  assert.match(componentSource, /ReactFlow/);
  assert.match(componentSource, /nodesDraggable=\{mode === "EDIT_DRAFT"\}/);
  assert.match(componentSource, /nodesConnectable=\{mode === "EDIT_DRAFT"\}/);
  assert.match(componentSource, /Creative Operating Canvas/);
  assert.match(componentSource, /Timeline/);
  assert.match(componentSource, /Delivery/);
});

test("Studio converges on Creative Canvas while preserving draft compatibility", () => {
  assert.match(studioCanvasSource, /StudioCreativeCanvas/);
  assert.match(studioCanvasSource, /feature="creative_canvas"/);
  assert.match(studioCanvasSource, /Workflow Draft/);
  assert.match(studioCanvasSource, /Agent Tools/);
  assert.match(legacyCanvasSource, /canvas\.legacyNoticeTitle/);
  assert.match(legacyCanvasSource, /canvas\.openCreativeCanvas/);
});

test("Unified Canvas can only create and confirm a draft edit session", () => {
  const combined = apiSource + componentSource;
  assert.doesNotMatch(combined, /executeNode|generateVideo|submitProvider|deductCredits|saveProject/);
  assert.match(apiSource, /creative-canvas\/edit-session/);
  assert.match(apiSource, /JSON\.stringify\(\{ confirm: true \}\)/);
  assert.match(componentSource, /Production Graph and Execution Runtime remain unchanged/);
  assert.match(componentSource, /No production Graph, Execution, Provider, or Credits action occurred/);
});
