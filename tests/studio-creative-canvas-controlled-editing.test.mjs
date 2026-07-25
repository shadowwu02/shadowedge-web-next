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
const versionSource = fs.readFileSync(
  new URL("../src/lib/studio-api-version.ts", import.meta.url),
  "utf8",
);

test("Canvas Edit Session exposes the controlled lifecycle and Graph changes", () => {
  for (const status of ["DRAFT", "REVIEW", "CONFIRMED", "REJECTED", "EXPIRED"]) {
    assert.match(schemaSource, new RegExp(`"${status}"`));
  }
  for (const change of [
    "ADD_NODE", "REMOVE_NODE", "MOVE_NODE",
    "CONNECT_EDGE", "DISCONNECT_EDGE", "UPDATE_CONFIG",
  ]) {
    assert.match(schemaSource, new RegExp(`"${change}"`));
  }
});

test("Canvas editing provides View and Edit Draft modes with a visible Graph Diff", () => {
  assert.match(componentSource, /"VIEW" \| "EDIT_DRAFT"/);
  assert.match(componentSource, /Edit Canvas/);
  assert.match(componentSource, /Graph Diff/);
  assert.match(componentSource, /Added nodes/);
  assert.match(componentSource, /Removed nodes/);
  assert.match(componentSource, /Changed edges/);
  assert.match(componentSource, /Config changes/);
});

test("Validation surfaces every fail-closed gate before human confirmation", () => {
  for (const check of [
    "CYCLE_DETECTION", "MISSING_DEPENDENCY", "CAPABILITY", "POLICY", "SCOPE",
  ]) {
    assert.match(schemaSource, new RegExp(`"${check}"`));
  }
  assert.match(componentSource, /session\.validation\.status !== "READY"/);
  assert.match(componentSource, /Confirm draft/);
});

test("Edit API is version-gated and only writes append-only Draft state", () => {
  assert.match(versionSource, /"creative_canvas_editing"/);
  assert.match(apiSource, /createStudioCreativeCanvasEditSession/);
  assert.match(apiSource, /getStudioCreativeCanvasEditSession/);
  assert.match(apiSource, /confirmStudioCreativeCanvasEditSession/);
  assert.doesNotMatch(apiSource + componentSource, /executeNode|generateVideo|submitProvider|deductCredits|chargeCredits/);
  assert.match(componentSource, /Production Graph, Runtime, Provider, Billing, and Credits remain unchanged/);
});
