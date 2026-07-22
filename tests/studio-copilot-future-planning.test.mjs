import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  STUDIO_PROJECT_FUTURE_PLAN_CONFIDENCE,
  STUDIO_PROJECT_FUTURE_PLAN_TYPES,
  studioProjectFuturePlanLabel,
} from "../src/features/studio/capabilities/studioProjectFuturePlans.ts";

test("Future Plan contracts expose five bounded planning types", () => {
  assert.deepEqual(STUDIO_PROJECT_FUTURE_PLAN_TYPES, ["NEXT_PHASE", "CONTENT_EXPANSION", "QUALITY_IMPROVEMENT", "WORKFLOW_EVOLUTION", "COST_OPTIMIZATION"]);
  assert.deepEqual(STUDIO_PROJECT_FUTURE_PLAN_CONFIDENCE, ["HIGH", "MEDIUM", "LOW"]);
  assert.equal(studioProjectFuturePlanLabel("WORKFLOW_EVOLUTION"), "Workflow evolution");
});

test("Future Planning Panel shows current stage, next goal, steps, evidence, and confidence", () => {
  const component = fs.readFileSync("src/features/studio/components/StudioFuturePlanningPanel.tsx", "utf8");
  const parent = fs.readFileSync("src/features/studio/components/StudioProjectCopilot.tsx", "utf8");
  assert.match(component, /Future Planning Panel/);
  assert.match(component, /Current stage/);
  assert.match(component, /Next-stage goal/);
  assert.match(component, /recommendedSteps/);
  assert.match(component, /supportingEvidence\.length/);
  assert.match(component, /plan\.confidence/);
  assert.match(component, /Preview, then Confirm a Future Plan Draft/);
  assert.match(parent, /<StudioFuturePlanningPanel projectId=\{projectId\}/);
});

test("Action Center exposes FUTURE_PLAN_DRAFT behind Preview and Confirm", () => {
  const schema = fs.readFileSync("src/features/studio/capabilities/studioProjectCopilot.ts", "utf8");
  const component = fs.readFileSync("src/features/studio/components/StudioProjectCopilot.tsx", "utf8");
  const api = fs.readFileSync("src/lib/studio-project-future-plans-api.ts", "utf8");
  const sources = [schema, component, api].join("\n");
  assert.match(schema, /FUTURE_PLAN_PROPOSAL/);
  assert.match(schema, /REVIEW_FUTURE_PLAN/);
  assert.match(schema, /FUTURE_PLAN_DRAFT/);
  assert.match(component, /Preview Action/);
  assert.match(component, /Create Draft/);
  assert.match(api, /\/api\/projects\/\$\{encodeURIComponent\(projectId\)\}\/future-plans/);
  assert.doesNotMatch(sources, /\/api\/video\/generate|executeStudioWorkflowNode|providerTransport|deductCredits|createUsageRecord/i);
});
