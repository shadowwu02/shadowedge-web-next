import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const component = fs.readFileSync("src/features/studio/components/StudioModelRecommendation.tsx", "utf8");
const api = fs.readFileSync("src/lib/studio-workflow-execution-api.ts", "utf8");
const schema = fs.readFileSync("src/features/studio/capabilities/studioWorkflowExecutionPlan.ts", "utf8");

test("Studio exposes one explicit Execute Node action for READY video_generate nodes", () => {
  assert.match(component, /node\?\.status === "READY" && node\.capability === "video_generate"/);
  assert.match(component, /"Execute Node"/);
  assert.match(component, /executeStudioWorkflowNode\(executionNodeId, \{ prompt \}\)/);
  assert.match(component, /disabled=\{Boolean\(executingNodeId\)\}/);
});

test("Execution Node API always sends explicit confirmation", () => {
  assert.match(api, /\/api\/execution-nodes\/\$\{encodeURIComponent\(executionNodeId\)\}\/execute/);
  assert.match(api, /confirmation: "EXECUTE_NODE"/);
  assert.match(api, /method: "POST"/);
});

test("Studio status contract displays Runtime and Timeline/Output bindings", () => {
  assert.match(schema, /adapterKey: string/);
  assert.match(schema, /state: "EXECUTING" \| "COMPLETED" \| "FAILED"/);
  assert.match(schema, /timeline: \{ status: "BOUND" \| "PENDING" \| "UNCHANGED"/);
  assert.match(schema, /output: \{ status: "BOUND" \| "PENDING" \| "UNCHANGED"/);
  assert.match(component, /Timeline \{node\.resultBindings\.timeline\.status\}/);
  assert.match(component, /Output \{node\.resultBindings\.output\.status\}/);
});

test("UI bridge does not contain automatic batch, retry, Provider, or direct paid runtime calls", () => {
  assert.doesNotMatch(`${component}\n${api}`, /startGenerationPlan|createGenerationPlanFromNode|\/api\/video\/generate|providerTransport|deductCredits/);
  assert.match(component, /no batch execution is allowed/);
  assert.match(component, /failed nodes are never retried/);
  assert.doesNotMatch(component, /useEffect\([^)]*executeStudioWorkflowNode/);
});
