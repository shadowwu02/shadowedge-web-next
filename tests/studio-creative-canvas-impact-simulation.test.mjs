import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  STUDIO_CANVAS_IMPACT_METRICS,
  STUDIO_CANVAS_SIMULATION_RISK_TYPES,
  studioCanvasImpactLabel,
} from "../src/features/studio/capabilities/studioCreativeCanvasSimulation.ts";

const schemaSource = fs.readFileSync(
  new URL("../src/features/studio/capabilities/studioCreativeCanvasSimulation.ts", import.meta.url),
  "utf8",
);
const apiSource = fs.readFileSync(
  new URL("../src/lib/studio-creative-canvas-simulation-api.ts", import.meta.url),
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

test("CanvasChangeSimulation exposes Before, After, Impact, Risks, and Confidence", () => {
  assert.match(schemaSource, /StudioCanvasChangeSimulation/);
  assert.match(schemaSource, /simulationId/);
  assert.match(schemaSource, /draftId/);
  assert.match(schemaSource, /beforeState/);
  assert.match(schemaSource, /afterState/);
  assert.match(schemaSource, /impact:/);
  assert.match(schemaSource, /risks:/);
  assert.match(schemaSource, /"HIGH" \| "MEDIUM" \| "LOW"/);
});

test("Impact and Risk contracts expose every bounded analysis dimension", () => {
  assert.deepEqual(STUDIO_CANVAS_IMPACT_METRICS, [
    "QUALITY_IMPACT",
    "COST_IMPACT",
    "SPEED_IMPACT",
    "REVISION_IMPACT",
    "RISK_IMPACT",
  ]);
  assert.deepEqual(STUDIO_CANVAS_SIMULATION_RISK_TYPES, [
    "COST_RISK",
    "COMPLEXITY_RISK",
    "EXECUTION_RISK",
    "QUALITY_RISK",
  ]);
  assert.equal(studioCanvasImpactLabel("REVISION_IMPACT"), "Revision impact");
});

test("Simulation uses exact project APIs and the version capability handshake", () => {
  assert.match(apiSource, /\/creative-canvas\/simulation/);
  assert.match(apiSource, /method: "POST"/);
  assert.match(apiSource, /getStudioCreativeCanvasSimulation/);
  assert.match(versionSource, /"creative_canvas_impact_simulation"/);
});

test("Canvas renders Simulate Change, Before/After comparison, Impact, Risk, and Draft-only boundary", () => {
  assert.match(componentSource, /Simulate Change/);
  assert.match(componentSource, /Canvas Change Simulation/);
  assert.match(componentSource, />Before</);
  assert.match(componentSource, />After</);
  assert.match(componentSource, /Risk analysis/);
  assert.match(componentSource, /Comparison Preview only/);
  assert.match(componentSource, /No change was applied/);
  assert.doesNotMatch(
    apiSource + componentSource,
    /executeNode|generateVideo|submitProvider|deductCredits|chargeCredits|startQueue|createJob|confirmSimulation/,
  );
});
