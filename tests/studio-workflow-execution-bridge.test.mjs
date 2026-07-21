import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { STUDIO_EXECUTION_GATE_LABELS } from "../src/features/studio/capabilities/studioWorkflowExecutionPlan.ts";

test("Execution Preview exposes the five safety gates", () => {
  assert.deepEqual(Object.keys(STUDIO_EXECUTION_GATE_LABELS), [
    "capability",
    "modelAvailability",
    "readiness",
    "verifiedScope",
    "cost",
  ]);
});

test("Studio uses a two-confirmation Workflow to Execution handoff", () => {
  const component = fs.readFileSync("src/features/studio/components/StudioModelRecommendation.tsx", "utf8");
  const api = fs.readFileSync("src/lib/studio-workflow-execution-api.ts", "utf8");
  assert.match(component, /Build Execution Preview/);
  assert.match(component, /Execution Preview/);
  assert.match(component, /Confirm Execution Plan/);
  assert.match(component, /Node Count|nodes\.length/);
  assert.match(component, /estimatedCredits/);
  assert.match(component, /executionPlan\.models/);
  assert.match(component, /executionPlan\.risks/);
  assert.match(api, /\/api\/capabilities\/plans\/\$\{encodeURIComponent\(sourcePlanId\)\}\/execution-preview/);
  assert.match(api, /\/api\/execution-plans\/\$\{encodeURIComponent\(executionPlanId\)\}\/confirm/);
});

test("Execution confirmation never starts Generation, Queue, Provider, Usage, or Credits", () => {
  const component = fs.readFileSync("src/features/studio/components/StudioModelRecommendation.tsx", "utf8");
  const api = fs.readFileSync("src/lib/studio-workflow-execution-api.ts", "utf8");
  const schema = fs.readFileSync("src/features/studio/capabilities/studioWorkflowExecutionPlan.ts", "utf8");
  assert.match(schema, /automaticGeneration: false/);
  assert.match(schema, /generationPlanCreated: false/);
  assert.match(schema, /queueEntered: false/);
  assert.match(schema, /providerCalled: false/);
  assert.match(schema, /creditsDeducted: false/);
  assert.match(schema, /usageRecordCreated: false/);
  assert.doesNotMatch(`${component}${api}`, /startGenerationPlan|createGenerationPlan|\/api\/video\/generate|videoGenerateExecutor/);
});

test("Execution handoff preserves verified model, Timeline, Output, and Usage contracts", () => {
  const schema = fs.readFileSync("src/features/studio/capabilities/studioWorkflowExecutionPlan.ts", "utf8");
  assert.match(schema, /generationPlanCandidate/);
  assert.match(schema, /providerId/);
  assert.match(schema, /modelId/);
  assert.match(schema, /verifiedScope/);
  assert.match(schema, /resultBindings: \["timeline", "output"\]/);
  assert.match(schema, /usageLedger: "ON_REAL_JOB_ONLY"/);
});
