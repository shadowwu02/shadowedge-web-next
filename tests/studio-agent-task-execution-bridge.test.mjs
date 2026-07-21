import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("Studio defines AgentTaskExecutionBinding and bounded lifecycle statuses", () => {
  const schema = fs.readFileSync("src/features/studio/capabilities/studioAgentTaskExecutionBinding.ts", "utf8");
  assert.match(schema, /taskId: string/);
  assert.match(schema, /executionNodeId: string/);
  assert.match(schema, /executionPlanId: string/);
  assert.match(schema, /"PREVIEW_READY"[\s\S]*"CONFIRMED"[\s\S]*"EXECUTING"[\s\S]*"COMPLETED"[\s\S]*"FAILED"/);
  assert.match(schema, /automaticExecution: false/);
  assert.match(schema, /autoRetry: false/);
});

test("Task Execution API exposes Preview and read-only status without execute", () => {
  const api = fs.readFileSync("src/lib/studio-agent-task-execution-api.ts", "utf8");
  assert.match(api, /\/api\/agent\/tasks\/\$\{encodeURIComponent\(input\.runtimeTaskId\)\}\/execution-preview/);
  assert.match(api, /\/api\/agent\/tasks\/\$\{encodeURIComponent\(runtimeTaskId\)\}\/execution-status/);
  assert.doesNotMatch(api, /EXECUTE_NODE|\/execute|provider|billing|credits|retry/i);
});

test("Agent Task Control Center shows Execution Node, Runtime, Result, and Preview action", () => {
  const component = fs.readFileSync("src/features/studio/components/StudioModelRecommendation.tsx", "utf8");
  assert.match(component, /Execution Node:/);
  assert.match(component, /Runtime:/);
  assert.match(component, /Result:/);
  assert.match(component, /Create Execution Preview/);
  assert.match(component, /Refresh Execution Status/);
  assert.match(component, /capabilityPlan\?\.status !== "CONFIRMED"/);
});

test("Human Confirm and controlled execution remain in the existing Execution Runtime", () => {
  const component = fs.readFileSync("src/features/studio/components/StudioModelRecommendation.tsx", "utf8");
  assert.match(component, /Confirm Execution Plan/);
  assert.match(component, /confirmStudioWorkflowExecutionPlan/);
  assert.match(component, /executeStudioWorkflowNode/);
  assert.match(component, /Checkpoints govern approval metadata only/);
  const taskApi = fs.readFileSync("src/lib/studio-agent-task-execution-api.ts", "utf8");
  assert.doesNotMatch(taskApi, /confirmStudioWorkflowExecutionPlan|executeStudioWorkflowNode/);
});
