import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("Canvas Workflow Draft exposes lifecycle and controlled change schemas", () => {
  const schema = fs.readFileSync("src/features/studio/capabilities/studioAgentCanvas.ts", "utf8");
  for (const status of ["DRAFT", "REVIEW", "CONFIRMED", "REJECTED", "EXPIRED"]) {
    assert.match(schema, new RegExp(`"${status}"`));
  }
  for (const type of ["ADD_NODE", "REMOVE_NODE", "CONNECT_NODE", "DISCONNECT_NODE", "UPDATE_NODE_CONFIG"]) {
    assert.match(schema, new RegExp(`"${type}"`));
  }
  for (const field of ["draftId", "projectId", "baseCanvasVersion", "nodes", "edges", "changes", "status", "createdAt"]) {
    assert.match(schema, new RegExp(`${field}:`));
  }
});

test("Workflow Draft API supports create, read, and explicit confirmation", () => {
  const api = fs.readFileSync("src/lib/studio-agent-canvas-api.ts", "utf8");
  assert.match(api, /createStudioCanvasWorkflowDraft/);
  assert.match(api, /getStudioCanvasWorkflowDraft/);
  assert.match(api, /confirmStudioCanvasWorkflowDraft/);
  assert.match(api, /agent-canvas\/workflow-draft/);
  assert.match(api, /JSON\.stringify\(\{ confirm: true \}\)/);
});

test("Canvas UI exposes Draft editing, Agent roles, connections, and Impact Analysis", () => {
  const component = fs.readFileSync("src/features/studio/components/StudioAgentCanvas.tsx", "utf8");
  for (const label of [
    "Edit Workflow",
    "Draft mode",
    "Storyboard Agent",
    "Quality Agent",
    "Connection source",
    "Connection target",
    "Connect in Draft",
    "Disconnect in Draft",
    "Preview Changes",
    "Impact Analysis",
    "Affected nodes",
    "Execution",
    "Cost",
    "Confirm Workflow Draft",
  ]) {
    assert.match(component, new RegExp(label));
  }
});

test("Controlled editor cannot mutate or execute the live Canvas", () => {
  const component = fs.readFileSync("src/features/studio/components/StudioAgentCanvas.tsx", "utf8");
  const api = fs.readFileSync("src/lib/studio-agent-canvas-api.ts", "utf8");
  const editor = component.slice(component.indexOf('aria-label="Canvas Workflow Draft editor"'));
  assert.match(editor, /Original Workflow remains read-only/);
  assert.match(editor, /Execution Preview still required/);
  assert.doesNotMatch(`${editor}\n${api}`, /updateProject|updatePlan|executeStudioWorkflowNode|executeNode|generateVideo|deductCredits|providerTransport/);
  assert.match(component, /nodesDraggable=\{false\}/);
  assert.match(component, /nodesConnectable=\{false\}/);
});
