import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("Canvas Execution Preview exposes lifecycle, summary, cost, risk, and six gates", () => {
  const schema = fs.readFileSync("src/features/studio/capabilities/studioAgentCanvas.ts", "utf8");
  for (const status of ["DRAFT", "READY", "BLOCKED", "CONFIRMED", "EXPIRED"]) {
    assert.match(schema, new RegExp(`"${status}"`));
  }
  for (const gate of ["capability", "availability", "readiness", "verifiedScope", "cost", "agentPolicy"]) {
    assert.match(schema, new RegExp(`${gate}:`));
  }
  for (const field of ["previewId", "canvasProjectId", "nodes", "executionPlanCandidate", "estimatedCost", "riskFlags", "createdAt"]) {
    assert.match(schema, new RegExp(field));
  }
});

test("Canvas uses the dedicated Preview and Confirm APIs", () => {
  const api = fs.readFileSync("src/lib/studio-agent-canvas-api.ts", "utf8");
  assert.match(api, /agent-canvas\/execution-preview`/);
  assert.match(api, /agent-canvas\/execution-preview\/\$\{encodeURIComponent\(previewId\)\}\/confirm/);
  assert.match(api, /JSON\.stringify\(\{ confirm: true \}\)/);
  assert.doesNotMatch(api, /execution-nodes.*execute|\/api\/video\/generate|generateVideo/);
});

test("Canvas UI renders an Execution Summary without a direct Execute control", () => {
  const component = fs.readFileSync("src/features/studio/components/StudioAgentCanvas.tsx", "utf8");
  assert.match(component, /"Preview Execution"/);
  assert.match(component, /aria-label="Execution Summary"/);
  for (const label of ["Agent nodes", "Task nodes", "Execution nodes", "Capability", "Model", "Estimated Credits", "Risks"]) {
    assert.match(component, new RegExp(label));
  }
  assert.match(component, /Prepare Execution Approval/);
  assert.doesNotMatch(component, />Confirm Execution Preview</);
  assert.match(component, /separate Runtime confirmation required/i);
  assert.doesNotMatch(component, />Execute(?: Node| Plan)?</);
  assert.doesNotMatch(component, /executeStudioWorkflowNode|executeNode|runStudioGraph|generateVideo/);
});

test("Canvas confirmation preserves no generation and no Credits boundary", () => {
  const schema = fs.readFileSync("src/features/studio/capabilities/studioAgentCanvas.ts", "utf8");
  assert.match(schema, /canvasCanExecute: false/);
  assert.match(schema, /automaticGeneration: false/);
  assert.match(schema, /queueEntered: false/);
  assert.match(schema, /providerCalled: false/);
  assert.match(schema, /creditsDeducted: false/);
  assert.match(schema, /USE_EXISTING_RUNTIME_WITH_SEPARATE_EXECUTION_CONFIRM/);
});
