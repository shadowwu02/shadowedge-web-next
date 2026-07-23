import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  STUDIO_EFFICIENCY_INSIGHT_TYPES,
  studioEfficiencyDuration,
  studioEfficiencyInsightLabel,
} from "../src/features/studio/capabilities/studioProductionEfficiency.ts";

test("Production Efficiency contract covers all governed metrics and bottleneck types", () => {
  assert.deepEqual(STUDIO_EFFICIENCY_INSIGHT_TYPES, ["WORKFLOW_BOTTLENECK", "TASK_DELAY", "HIGH_REVISION_AREA", "COST_INEFFICIENCY", "QUALITY_DROP"]);
  assert.equal(studioEfficiencyInsightLabel("HIGH_REVISION_AREA"), "High Revision Area");
  assert.equal(studioEfficiencyDuration(90_000), "2m");
  const schema = fs.readFileSync("src/features/studio/capabilities/studioProductionEfficiency.ts", "utf8");
  for (const field of ["workflowMetrics", "taskMetrics", "executionMetrics", "costMetrics", "qualityMetrics", "assetMetrics"]) assert.match(schema, new RegExp(field));
  assert.match(schema, /averageProviderLatencyMs/);
  assert.match(schema, /humanInterventions/);
  assert.match(schema, /creditsPerCompletedExecution/);
});

test("Production Efficiency Panel renders metrics, bottlenecks, and read-only optimization guidance", () => {
  const component = fs.readFileSync("src/features/studio/components/StudioProductionEfficiencyPanel.tsx", "utf8");
  assert.match(component, /Production Efficiency Panel/);
  assert.match(component, /workflowMetrics\.averageCompletionMs/);
  assert.match(component, /taskMetrics\.averageWaitMs/);
  assert.match(component, /executionMetrics\.averageProviderLatencyMs/);
  assert.match(component, /costMetrics\.creditsPerCompletedExecution/);
  assert.match(component, /qualityMetrics\.averageRating/);
  assert.match(component, /assetMetrics\.reuseOpportunityCount/);
  assert.match(component, /Optimization remains a suggestion/);
  assert.doesNotMatch(component, /onClick=|updateWorkflow|switchModel|executeStudio|generateVideo|deductCredits/);
});

test("Efficiency API and Copilot integration preserve Preview to Draft boundary", () => {
  const api = fs.readFileSync("src/lib/studio-production-efficiency-api.ts", "utf8");
  const copilot = fs.readFileSync("src/features/studio/capabilities/studioProjectCopilot.ts", "utf8");
  const panel = fs.readFileSync("src/features/studio/components/StudioProjectCopilot.tsx", "utf8");
  assert.match(api, /"\/api\/portfolio\/efficiency"/);
  assert.match(copilot, /PRODUCTION_EFFICIENCY_SUGGESTION/);
  assert.match(copilot, /REVIEW_EFFICIENCY/);
  assert.match(copilot, /EFFICIENCY_OPTIMIZATION_DRAFT/);
  assert.match(copilot, /efficiencyContext/);
  assert.match(panel, /StudioProductionEfficiencyPanel/);
  assert.match(panel, /Preview Action/);
  assert.match(panel, /Create Draft/);
});
