import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const schema = fs.readFileSync(
  "src/features/studio/capabilities/studioAgentCanvas.ts",
  "utf8",
);
const api = fs.readFileSync("src/lib/studio-agent-canvas-api.ts", "utf8");
const component = fs.readFileSync(
  "src/features/studio/components/StudioAgentCanvas.tsx",
  "utf8",
);

test("Canvas Execution Approval exposes the governed approval contract", () => {
  for (const field of [
    "approvalId",
    "runPlanId",
    "executionPreviewId",
    "summary",
    "policyStatus",
    "costStatus",
    "riskFlags",
    "status",
    "createdAt",
  ]) {
    assert.match(schema, new RegExp(`${field}:`));
  }
  for (const status of ["PENDING", "APPROVED", "REJECTED", "EXPIRED"]) {
    assert.match(schema, new RegExp(`"${status}"`));
  }
  assert.match(schema, /delegatesToExistingExecutionConfirm: true/);
  assert.match(schema, /canvasOwnsRuntime: false/);
  assert.match(schema, /automaticExecution: false/);
  assert.match(schema, /providerCalled: false/);
  assert.match(schema, /creditsDeducted: false/);
});

test("Canvas Execution Approval APIs create a summary and require explicit confirmation", () => {
  assert.match(api, /createStudioCanvasExecutionApproval/);
  assert.match(api, /confirmStudioCanvasExecutionApproval/);
  assert.match(api, /agent-canvas\/execution-approval`/);
  assert.match(api, /execution-approval\/\$\{encodeURIComponent\(approvalId\)\}\/confirm/);
  assert.match(api, /JSON\.stringify\(\{ confirm: true \}\)/);
  assert.doesNotMatch(
    api,
    /executeStudioWorkflowNode|startQueue|generateVideo|providerTransport|deductCredits/,
  );
});

test("Execution Approval Panel shows human review, gate results, cost, and risk summary", () => {
  assert.match(component, /aria-label="Execution Approval Panel"/);
  for (const label of [
    "Execution Approval",
    "Agents",
    "Tasks",
    "Execution nodes",
    "Estimated Credits",
    "Cost Confidence",
    "Policy Result",
    "Cost Gate",
    "Risks",
    "Prepare Execution Approval",
    "Confirm through Existing Execution Confirm",
  ]) {
    assert.match(component, new RegExp(label));
  }
  assert.match(component, /Build and review an Agent Run Plan before requesting approval/);
});

test("Canvas approval remains a confirm-only boundary with no Runtime or charge action", () => {
  assert.match(component, /does not start Runtime, call a Provider, or deduct Credits/);
  assert.match(component, /separate Runtime control still required/);
  assert.doesNotMatch(component, />Confirm Execution Preview</);
  assert.doesNotMatch(
    component,
    /executeStudioWorkflowNode|startQueue|executeNode|generateVideo|providerTransport|deductCredits/,
  );
});
