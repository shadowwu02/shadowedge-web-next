import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  STUDIO_CANVAS_OPTIMIZATION_TYPES,
  studioCanvasOptimizationLabel,
} from "../src/features/studio/capabilities/studioCreativeCanvasOptimization.ts";

const schemaSource = fs.readFileSync(
  new URL("../src/features/studio/capabilities/studioCreativeCanvasOptimization.ts", import.meta.url),
  "utf8",
);
const apiSource = fs.readFileSync(
  new URL("../src/lib/studio-creative-canvas-optimization-api.ts", import.meta.url),
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
const actionCenterSource = fs.readFileSync(
  new URL("../src/features/studio/capabilities/studioProjectCopilot.ts", import.meta.url),
  "utf8",
);

test("Canvas Optimization contracts expose Request, optimized Draft, Changes, Reasons, Evidence, and Confidence", () => {
  assert.match(schemaSource, /StudioCanvasOptimizationRequest/);
  assert.match(schemaSource, /StudioAIOptimizedCanvasDraft/);
  assert.match(schemaSource, /optimizedGraph/);
  assert.match(schemaSource, /changes:/);
  assert.match(schemaSource, /reasons:/);
  assert.match(schemaSource, /evidence:/);
  assert.match(schemaSource, /"HIGH" \| "MEDIUM" \| "LOW"/);
  assert.deepEqual(STUDIO_CANVAS_OPTIMIZATION_TYPES, [
    "QUALITY_IMPROVEMENT",
    "COST_REDUCTION",
    "WORKFLOW_SIMPLIFICATION",
    "REVISION_REDUCTION",
    "DELIVERY_SPEED",
  ]);
  assert.equal(studioCanvasOptimizationLabel("REVISION_REDUCTION"), "Revision reduction");
});

test("Canvas Optimization uses exact authenticated project APIs and capability handshake", () => {
  assert.match(apiSource, /\/creative-canvas\/optimize/);
  assert.match(apiSource, /method: "POST"/);
  assert.match(apiSource, /getStudioCreativeCanvasOptimization/);
  assert.match(versionSource, /"creative_canvas_workflow_optimization"/);
});

test("Optimize with Copilot exposes targets, analysis evidence, confidence, and Diff Review", () => {
  assert.match(componentSource, /Optimize with Copilot/);
  assert.match(componentSource, /Workflow Optimization/);
  assert.match(componentSource, /Production, Quality, Revision, Cost, Historical Success, Governance Knowledge, and Project Memory/);
  assert.match(componentSource, /Why this refinement/);
  assert.match(componentSource, /Evidence used/);
  assert.match(componentSource, /CONFIDENCE/);
  assert.match(componentSource, /Optimization Draft is ready for Diff Review and human confirmation/);
});

test("Optimization remains in the existing Edit Session and Action Center Draft boundary", () => {
  assert.match(schemaSource, /confirmationTarget: "CREATIVE_CANVAS_EDIT_SESSION"/);
  assert.match(schemaSource, /CANVAS_WORKFLOW_OPTIMIZATION_DRAFT/);
  assert.match(actionCenterSource, /CANVAS_WORKFLOW_OPTIMIZATION_DRAFT/);
  assert.match(componentSource, /setSession\(value\.editSession\)/);
  assert.match(componentSource, /confirmStudioCreativeCanvasEditSession/);
  assert.match(componentSource, /No production Graph mutation, task creation, Provider call, execution, or Credits action occurred/);
  assert.doesNotMatch(
    apiSource + componentSource,
    /executeNode|generateVideo|submitProvider|deductCredits|chargeCredits|startQueue|createJob/,
  );
});
