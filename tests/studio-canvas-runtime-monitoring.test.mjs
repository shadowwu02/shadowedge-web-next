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

test("Canvas Execution Status exposes the governed Runtime projection", () => {
  for (const field of [
    "executionId",
    "nodeId",
    "status",
    "progress",
    "startedAt",
    "updatedAt",
  ]) {
    assert.match(schema, new RegExp(`${field}:`));
  }
  for (const status of ["PENDING", "READY", "EXECUTING", "COMPLETED", "FAILED"]) {
    assert.match(schema, new RegExp(`"${status}"`));
  }
  assert.match(schema, /currentNodeIds/);
  assert.match(schema, /completedNodeIds/);
  assert.match(schema, /waitingNodeIds/);
  assert.match(schema, /failedNodeIds/);
});

test("Runtime Status API is authenticated read-only polling", () => {
  assert.match(api, /getStudioCanvasExecutionStatus/);
  assert.match(api, /agent-canvas\/execution-status/);
  assert.doesNotMatch(api, /execution-status[\s\S]{0,200}method:\s*"POST"/);
  assert.match(component, /setInterval\(refresh, 5000\)/);
});

test("Live Execution Mode renders progress, status, current step, and result references", () => {
  for (const label of [
    "Live Execution Mode",
    "Live Execution Monitoring",
    "Current Step",
    "Running",
    "Completed",
    "Waiting",
    "Failed",
    "Live Timeline",
    "Result Preview",
    "Timeline",
    "Asset",
    "Output",
  ]) {
    assert.match(component, new RegExp(label));
  }
  assert.match(component, /role="progressbar"/);
  assert.match(component, /execution\.agent\.roleId/);
  assert.match(component, /execution\.progress/);
});

test("Canvas Runtime monitoring exposes no Execute, Retry, Cancel, Provider, or Credits control", () => {
  const start = component.indexOf('aria-label="Live Execution Monitoring"');
  const end = component.indexOf(") : (", start);
  const panel = component.slice(start, end);
  assert.match(panel, /Read-only monitoring/);
  assert.match(panel, /no Execute, Retry, Cancel, Provider, or Credits control/);
  assert.doesNotMatch(panel, /onClick=.*(?:execute|retry|cancel)/i);
  assert.doesNotMatch(
    `${panel}\n${api}`,
    /executeStudioWorkflowNode|retryExecution|cancelExecution|generateVideo|deductCredits/,
  );
});
