import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const schema = fs.readFileSync(
  "src/features/studio/capabilities/studioAgentRunPlan.ts",
  "utf8",
);
const api = fs.readFileSync("src/lib/studio-agent-run-plan-api.ts", "utf8");
const component = fs.readFileSync(
  "src/features/studio/components/StudioAgentCanvas.tsx",
  "utf8",
);

test("Agent Run Plan exposes the governed Plan, Step, Queue, Cost, and checkpoint contracts", () => {
  for (const field of [
    "runPlanId",
    "projectId",
    "graphId",
    "steps",
    "dependencies",
    "checkpoints",
    "estimatedCost",
    "createdAt",
  ]) {
    assert.match(schema, new RegExp(`${field}:`));
  }
  for (const field of ["stepId", "agentId", "taskId", "order", "status", "dependencies"]) {
    assert.match(schema, new RegExp(`${field}:`));
  }
  for (const status of ["READY", "WAITING", "BLOCKED", "HUMAN_REVIEW_REQUIRED"]) {
    assert.match(schema, new RegExp(`"${status}"`));
  }
  assert.match(schema, /queueStarted: false/);
  assert.match(schema, /providerCalled: false/);
  assert.match(schema, /creditsDeducted: false/);
});

test("Run Plan API supports authenticated create and project-scoped read", () => {
  assert.match(api, /createStudioAgentRunPlan/);
  assert.match(api, /getStudioAgentRunPlan/);
  assert.match(api, /agent-canvas\/run-plan/);
  assert.match(api, /JSON\.stringify\(\{ graphId \}\)/);
  assert.match(api, /encodeURIComponent\(runPlanId\)/);
});

test("Agent Canvas renders Run Summary, Queue dependencies, checkpoints, cost, and risks", () => {
  for (const label of [
    "Preview Run Plan",
    "Run Summary",
    "Queue Visualization",
    "Queue waves",
    "Estimated Credits",
    "Cost Confidence",
    "Risk Flags",
    "Human Review required",
    "Existing Execution Preview",
    "Queue not started",
    "Credits not deducted",
  ]) {
    assert.match(component, new RegExp(label, "i"));
  }
  assert.match(component, /Waits for/);
  assert.match(component, /Unscheduled/);
  assert.match(component, /step\.blockers/);
  assert.match(component, /wave\.parallel/);
});

test("Run Plan remains Preview-only and has no Queue, Agent, Task, Provider, or charge execution hook", () => {
  const start = component.indexOf('aria-label="Agent Run Plan Preview"');
  const end = component.indexOf('className="studio-agent-workflow-draft-editor"');
  const runPlanPanel = component.slice(start, end);
  assert.match(runPlanPanel, /Preview only/);
  assert.match(runPlanPanel, /cannot start Queue, Agent, Task, Provider, or Credits/);
  assert.doesNotMatch(
    `${runPlanPanel}\n${api}`,
    /startQueue|executeAgent|executeTask|executeStudioWorkflowNode|generateVideo|providerTransport|deductCredits/,
  );
});
