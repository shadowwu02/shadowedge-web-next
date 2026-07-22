import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  STUDIO_PROJECT_STRATEGY_CONFIDENCE,
  STUDIO_PROJECT_STRATEGY_TYPES,
  studioProjectStrategyLabel,
} from "../src/features/studio/capabilities/studioProjectStrategies.ts";

test("Project Strategy schema exposes five bounded planning strategy types", () => {
  assert.deepEqual(STUDIO_PROJECT_STRATEGY_TYPES, ["QUALITY_IMPROVEMENT", "COST_OPTIMIZATION", "STYLE_ALIGNMENT", "WORKFLOW_OPTIMIZATION", "CONTENT_DIRECTION"]);
  assert.deepEqual(STUDIO_PROJECT_STRATEGY_CONFIDENCE, ["HIGH", "MEDIUM", "LOW"]);
  assert.equal(studioProjectStrategyLabel("WORKFLOW_OPTIMIZATION"), "Workflow optimization");
});

test("Project Strategy Panel shows goal, recommendations, evidence, and confidence", () => {
  const component = fs.readFileSync("src/features/studio/components/StudioProjectStrategyPanel.tsx", "utf8");
  const parent = fs.readFileSync("src/features/studio/components/StudioProjectCopilot.tsx", "utf8");
  assert.match(component, /Project Strategy Panel/);
  assert.match(component, /Current goal/);
  assert.match(component, /strategy\.recommendations/);
  assert.match(component, /supportingInsights\.length/);
  assert.match(component, /strategy\.confidence/);
  assert.match(component, /Preview and Confirm are required/);
  assert.match(parent, /<StudioProjectStrategyPanel projectId=\{projectId\}/);
});

test("Project Strategy API is authenticated through the existing client and remains read only", () => {
  const api = fs.readFileSync("src/lib/studio-project-strategies-api.ts", "utf8");
  const sources = [
    api,
    fs.readFileSync("src/features/studio/components/StudioProjectStrategyPanel.tsx", "utf8"),
    fs.readFileSync("src/features/studio/capabilities/studioProjectStrategies.ts", "utf8"),
  ].join("\n");
  assert.match(api, /\/api\/projects\/\$\{encodeURIComponent\(projectId\)\}\/strategies/);
  assert.match(api, /apiRequest/);
  assert.match(sources, /STRATEGY_PREVIEW_CONFIRM_CREATES_DRAFT_ONLY|Preview and Confirm/);
  assert.doesNotMatch(sources, /\/api\/video\/generate|executeStudioWorkflowNode|providerTransport|deductCredits|createUsageRecord/i);
});
