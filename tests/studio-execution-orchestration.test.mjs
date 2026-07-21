import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { getStudioExecutionNodeSymbol } from "../src/features/studio/capabilities/studioWorkflowExecutionPlan.ts";

test("Execution Queue symbols cover terminal and waiting states", () => {
  assert.equal(getStudioExecutionNodeSymbol("COMPLETED"), "✓");
  assert.equal(getStudioExecutionNodeSymbol("RUNNING"), "●");
  assert.equal(getStudioExecutionNodeSymbol("FAILED"), "×");
  assert.equal(getStudioExecutionNodeSymbol("BLOCKED"), "!");
  assert.equal(getStudioExecutionNodeSymbol("PENDING"), "○");
});

test("Studio displays a read-only dependency queue after Execution confirmation", () => {
  const component = fs.readFileSync("src/features/studio/components/StudioModelRecommendation.tsx", "utf8");
  const schema = fs.readFileSync("src/features/studio/capabilities/studioWorkflowExecutionPlan.ts", "utf8");
  const api = fs.readFileSync("src/lib/studio-workflow-execution-api.ts", "utf8");
  assert.match(component, /Execution Queue/);
  assert.match(component, /executionStatus\.queue\.map/);
  assert.match(component, /dependenciesResolved/);
  assert.match(component, /Waiting for/);
  assert.match(component, /Refresh Status/);
  assert.match(schema, /"PENDING"/);
  assert.match(schema, /"RUNNING"/);
  assert.match(schema, /inputRefs/);
  assert.match(schema, /outputRefs/);
  assert.match(api, /\/api\/execution-plans\/\$\{encodeURIComponent\(executionPlanId\)\}\/status/);
});

test("Studio orchestration UI exposes no start, run, retry, Provider, or charge action", () => {
  const component = fs.readFileSync("src/features/studio/components/StudioModelRecommendation.tsx", "utf8");
  const api = fs.readFileSync("src/lib/studio-workflow-execution-api.ts", "utf8");
  assert.match(component, /Nodes never run automatically/);
  assert.match(component, /failed nodes are never retried/);
  assert.doesNotMatch(`${component}${api}`, /startExecution|transitionNode|retryExecution|\/api\/video\/generate|deductCredits/);
});
