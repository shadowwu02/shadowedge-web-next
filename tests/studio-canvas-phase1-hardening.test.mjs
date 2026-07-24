import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const component = fs.readFileSync(
  "src/features/studio/components/StudioAgentCanvas.tsx",
  "utf8",
);
const capability = fs.readFileSync(
  "src/features/studio/capabilities/studioAgentCanvas.ts",
  "utf8",
);
const api = fs.readFileSync("src/lib/studio-agent-canvas-api.ts", "utf8");

test("Large Canvas graphs use memoized nodes and viewport-only rendering", () => {
  assert.match(component, /memo\(function AgentNode/);
  assert.match(component, /memo\(function AgentWorkflowNode/);
  assert.match(component, /activeFlowNodeCount > 150/);
  assert.match(component, /onlyRenderVisibleElements/);
  assert.match(component, /Large workflow · \{activeFlowNodeCount\} nodes · viewport rendering optimized/);
  assert.match(component, /!largeGraph \? \(\s*<MiniMap/);
});

test("Canvas reads remain project-scoped, cancellable, and revision-aware", () => {
  assert.match(api, /getStudioAgentCanvas\(projectId: string, signal\?: AbortSignal\)/);
  assert.match(api, /getStudioCanvasExecutionStatus\(projectId: string, signal\?: AbortSignal\)/);
  assert.match(api, /\/api\/projects\/\$\{encodeURIComponent\(projectId\)\}\/agent-canvas\/execution-status/);
  assert.match(component, /current\.value\.revision === value\.revision/);
  assert.match(capability, /revision: string/);
});

test("Runtime sync preserves the last snapshot and backs off refresh failures", () => {
  for (const state of ["CURRENT", "STALE", "EXPIRED", "MISSING_RESULT"]) {
    assert.match(capability, new RegExp(`"${state}"`));
  }
  assert.match(component, /document\.visibilityState === "hidden"/);
  assert.match(component, /Math\.min\(30000, 5000 \* \(2 \*\*/);
  assert.match(component, /Showing the last successful snapshot/);
  assert.match(component, /Last synced/);
  assert.doesNotMatch(component, /setInterval\(/);
});

test("Canvas Error Panel exposes failed node, reason, and related Execution", () => {
  assert.match(component, />Canvas Error Panel</);
  assert.match(component, /<dt>Failed Node<\/dt>/);
  assert.match(component, /<dt>Reason<\/dt>/);
  assert.match(component, /<dt>Related Execution<\/dt>/);
  assert.match(component, /executionStatus\.issues\.map/);
});

test("New Project Canvas offers only draft and Copilot entry points", () => {
  assert.match(component, />Create Workflow</);
  assert.match(component, />Import Template</);
  assert.match(component, />Ask Copilot</);
  assert.match(component, /Draft only · Human Confirm required/);
  assert.doesNotMatch(component, />Retry</);
  assert.doesNotMatch(component, />Cancel</);
});
