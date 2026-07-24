import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("Canvas exposes all controlled Draft Action types and node mappings", () => {
  const contract = fs.readFileSync("src/features/studio/capabilities/studioAgentCanvas.ts", "utf8");
  for (const type of [
    "GOAL_REVIEW",
    "STRATEGY_REVIEW",
    "AGENT_EXPANSION",
    "WORKFLOW_IMPROVEMENT",
    "QUALITY_IMPROVEMENT",
    "COST_OPTIMIZATION",
  ]) {
    assert.match(contract, new RegExp(`"${type}"`));
  }
  for (const nodeType of ["GOAL", "STRATEGY", "AGENT_TEAM", "TASK", "EXECUTION", "ASSET"]) {
    assert.match(contract, new RegExp(`${nodeType}:`));
  }
});

test("Canvas Draft APIs preserve Preview then explicit Confirm", () => {
  const api = fs.readFileSync("src/lib/studio-agent-canvas-api.ts", "utf8");
  assert.match(api, /agent-canvas\/actions\/\$\{encodeURIComponent\(nodeId\)\}\/preview/);
  assert.match(api, /agent-canvas\/actions\/\$\{encodeURIComponent\(nodeId\)\}\/confirm/);
  assert.match(api, /method: "POST"/);
  assert.match(api, /JSON\.stringify\(\{ actionId, confirm: true \}\)/);
});

test("Canvas UI offers Insight and Draft controls without direct execution or graph mutation", () => {
  const component = fs.readFileSync("src/features/studio/components/StudioAgentCanvas.tsx", "utf8");
  assert.match(component, />View Insight</);
  assert.match(component, />Create Draft</);
  assert.match(component, />Confirm Create Draft</);
  assert.match(component, /existing Copilot Action Center/i);
  assert.match(component, /nodesDraggable=\{false\}/);
  assert.match(component, /nodesConnectable=\{false\}/);
  assert.match(component, /deleteKeyCode=\{null\}/);
  assert.doesNotMatch(component, /executeNode|runStudioGraph|generateVideo|deleteNode|onConnect|onNodesChange/);
});

test("Canvas Draft confirmation remains a Draft-only handoff", () => {
  const contract = fs.readFileSync("src/features/studio/capabilities/studioAgentCanvas.ts", "utf8");
  assert.match(contract, /PREVIEW_ONLY_NO_PROJECT_MUTATION/);
  assert.match(contract, /DRAFT_CREATED_EXISTING_ACTION_CENTER/);
  assert.match(contract, /existingFlowTarget: "PROJECT_COPILOT_ACTION_CENTER"/);
  assert.match(contract, /status: "DRAFT"/);
});
