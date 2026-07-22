import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  STUDIO_PROJECT_INSIGHT_CONFIDENCE,
  STUDIO_PROJECT_INSIGHT_TYPES,
  studioProjectInsightAction,
  studioProjectInsightLabel,
} from "../src/features/studio/capabilities/studioProjectInsights.ts";

test("Project Insight schema exposes six bounded rules and confidence levels", () => {
  assert.deepEqual(STUDIO_PROJECT_INSIGHT_TYPES, ["STYLE_INCONSISTENCY", "MISSING_REFERENCE", "WORKFLOW_RISK", "QUALITY_RISK", "COST_RISK", "CHARACTER_INCONSISTENCY"]);
  assert.deepEqual(STUDIO_PROJECT_INSIGHT_CONFIDENCE, ["HIGH", "MEDIUM", "LOW"]);
  assert.equal(studioProjectInsightLabel("CHARACTER_INCONSISTENCY"), "Character consistency");
  assert.equal(studioProjectInsightAction("COST_RISK"), "Check cost Draft");
});

test("Project Insights Panel renders source, severity, confidence, and suggested action", () => {
  const component = fs.readFileSync("src/features/studio/components/StudioProjectInsights.tsx", "utf8");
  const parent = fs.readFileSync("src/features/studio/components/StudioProjectCopilot.tsx", "utf8");
  assert.match(component, /Project Insights Panel/);
  assert.match(component, /sourceNodes\.length/);
  assert.match(component, /insight\.severity/);
  assert.match(component, /insight\.confidence/);
  assert.match(component, /Suggested action/);
  assert.match(component, /require Preview and Confirm/);
  assert.match(parent, /<StudioProjectInsights projectId=\{projectId\}/);
});

test("Project Insights API uses the authenticated project route", () => {
  const api = fs.readFileSync("src/lib/studio-project-insights-api.ts", "utf8");
  assert.match(api, /\/api\/projects\/\$\{encodeURIComponent\(projectId\)\}\/insights/);
  assert.match(api, /apiRequest/);
});

test("Copilot displays Project Insight references without execution or charging hooks", () => {
  const schema = fs.readFileSync("src/features/studio/capabilities/studioCopilotConversation.ts", "utf8");
  const sources = [
    fs.readFileSync("src/features/studio/components/StudioProjectInsights.tsx", "utf8"),
    fs.readFileSync("src/lib/studio-project-insights-api.ts", "utf8"),
  ].join("\n");
  assert.match(schema, /PROJECT_INSIGHT/);
  assert.match(schema, /Project Insight/);
  assert.doesNotMatch(sources, /\/api\/video\/generate|executeStudioWorkflowNode|providerTransport|deductCredits|createUsageRecord/i);
});
