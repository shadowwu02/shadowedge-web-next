import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("Agent Canvas UI renders the seven read-only project graph node types", () => {
  const contract = fs.readFileSync("src/features/studio/capabilities/studioAgentCanvas.ts", "utf8");
  const component = fs.readFileSync("src/features/studio/components/StudioAgentCanvas.tsx", "utf8");
  for (const type of ["GOAL", "STRATEGY", "STORYBOARD", "AGENT_TEAM", "TASK", "EXECUTION", "ASSET"]) {
    assert.match(contract, new RegExp(`"${type}"`));
  }
  assert.match(component, /nodesDraggable=\{false\}/);
  assert.match(component, /nodesConnectable=\{false\}/);
  assert.match(component, /deleteKeyCode=\{null\}/);
  assert.doesNotMatch(component, /executeNode|runStudioGraph|deleteNode|onConnect|onNodesChange/);
});

test("Studio preserves Workflow Draft and Agent tools behind the unified Creative Canvas", () => {
  const canvas = fs.readFileSync("src/features/studio/components/StudioCanvas.tsx", "utf8");
  assert.match(canvas, />Creative Canvas</);
  assert.match(canvas, />Workflow Draft</);
  assert.match(canvas, />Agent Tools</);
  assert.match(canvas, /<StudioAgentCanvas projectId=\{projectId\}/);
  assert.match(canvas, /<ReactFlow<StudioNode, StudioEdge>/);
});

test("Agent Canvas details include source, status, evidence, update time, and insight navigation", () => {
  const component = fs.readFileSync("src/features/studio/components/StudioAgentCanvas.tsx", "utf8");
  for (const label of ["Source", "Reference", "Updated", "evidence", "View insight"]) {
    assert.match(component, new RegExp(label, "i"));
  }
  assert.match(component, /read-only/i);
});
