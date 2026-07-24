import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const schema = fs.readFileSync(
  "src/features/studio/capabilities/studioAgentWorkflowGraph.ts",
  "utf8",
);
const api = fs.readFileSync("src/lib/studio-agent-workflow-graph-api.ts", "utf8");
const component = fs.readFileSync(
  "src/features/studio/components/StudioAgentCanvas.tsx",
  "utf8",
);

test("Agent Workflow Graph exposes roles, checkpoints, dependency modes, and Draft changes", () => {
  for (const role of [
    "CREATIVE_DIRECTOR",
    "STORYBOARD_AGENT",
    "VIDEO_AGENT",
    "QUALITY_AGENT",
    "CHARACTER_AGENT",
    "HUMAN_CHECKPOINT",
  ]) {
    assert.match(schema, new RegExp(`"${role}"`));
  }
  for (const dependency of ["SEQUENTIAL", "PARALLEL", "CHECKPOINT"]) {
    assert.match(schema, new RegExp(`"${dependency}"`));
  }
  for (const change of ["ADD_AGENT", "REMOVE_AGENT", "CHANGE_DEPENDENCY", "ADD_CHECKPOINT"]) {
    assert.match(schema, new RegExp(`"${change}"`));
  }
  for (const field of [
    "graphId",
    "projectId",
    "agents",
    "tasks",
    "dependencies",
    "checkpoints",
    "createdAt",
  ]) {
    assert.match(schema, new RegExp(`${field}:`));
  }
});

test("Agent Workflow Graph API is project-scoped and keeps Preview and Confirm separate", () => {
  assert.match(api, /getStudioAgentWorkflowGraph/);
  assert.match(api, /createStudioAgentWorkflowDraft/);
  assert.match(api, /getStudioAgentWorkflowDraft/);
  assert.match(api, /confirmStudioAgentWorkflowDraft/);
  assert.match(api, /\/api\/projects\/\$\{encodeURIComponent\(projectId\)\}\/agent-workflow-graph/);
  assert.match(api, /JSON\.stringify\(\{ changes \}\)/);
  assert.match(api, /JSON\.stringify\(\{ confirm: true \}\)/);
});

test("Agent Workflow Mode visualizes order, parallel work, waiting tasks, and checkpoints", () => {
  for (const label of [
    "Agent Workflow Mode",
    "Multi-Agent Workflow",
    "Agent order",
    "Parallel groups",
    "Human Checkpoints",
    "Waiting nodes",
    "Add Agent to Draft",
    "Change Dependency in Draft",
    "Add Human Checkpoint",
    "Preview Multi-Agent Workflow",
    "Confirm Human Review",
  ]) {
    assert.match(component, new RegExp(label, "i"));
  }
  assert.match(component, /dependency\.type === "PARALLEL"/);
  assert.match(component, /animated: dependency\.type === "PARALLEL"/);
  assert.match(component, /dependency\.type === "CHECKPOINT"/);
});

test("Canvas orchestration is design-only and cannot execute Agents, Tasks, or Providers", () => {
  const start = component.indexOf('aria-label="Agent Workflow Preview"');
  const end = component.indexOf('aria-label="Workflow Templates"');
  const workflowPanel = component.slice(start, end);
  assert.match(workflowPanel, /Design only/i);
  assert.match(workflowPanel, /Execution allowed: no/i);
  assert.match(workflowPanel, /Execution confirmation still required/i);
  assert.doesNotMatch(
    `${workflowPanel}\n${api}`,
    /executeStudioWorkflowNode|executeAgentTask|generateVideo|providerTransport|deductCredits/,
  );
  assert.match(component, /nodesDraggable=\{false\}/);
  assert.match(component, /nodesConnectable=\{false\}/);
});
