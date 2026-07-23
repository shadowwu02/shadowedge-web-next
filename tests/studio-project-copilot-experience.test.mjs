import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  STUDIO_COPILOT_ACTION_TYPES,
  STUDIO_COPILOT_DRAFT_TYPES,
  STUDIO_COPILOT_SUGGESTION_TYPES,
  studioCopilotActionLabel,
  studioCopilotDraftLabel,
  studioCopilotSuggestionLabel,
} from "../src/features/studio/capabilities/studioProjectCopilot.ts";

test("Project Copilot schema exposes the bounded suggestion types", () => {
  assert.deepEqual(STUDIO_COPILOT_SUGGESTION_TYPES, ["NEXT_STEP", "STYLE_IMPROVEMENT", "WORKFLOW_SUGGESTION", "COST_WARNING", "QUALITY_WARNING", "STRATEGY_PROPOSAL", "FUTURE_PLAN_PROPOSAL", "GOAL_ALIGNMENT_REVIEW", "PORTFOLIO_PRIORITY_SUGGESTION", "RESOURCE_REUSE_SUGGESTION", "PRODUCTION_EFFICIENCY_SUGGESTION"]);
  assert.equal(studioCopilotSuggestionLabel("WORKFLOW_SUGGESTION"), "Workflow suggestion");
  assert.deepEqual(STUDIO_COPILOT_ACTION_TYPES, ["CREATE_DRAFT", "IMPROVE_PLAN", "REVIEW_WORKFLOW", "CHECK_COST", "CHECK_QUALITY", "REVIEW_STRATEGY", "REVIEW_FUTURE_PLAN", "REVIEW_GOALS", "REVIEW_PORTFOLIO", "REVIEW_ASSET_REUSE", "REVIEW_EFFICIENCY"]);
  assert.deepEqual(STUDIO_COPILOT_DRAFT_TYPES, ["CHARACTER_DRAFT", "STORYBOARD_DRAFT", "WORKFLOW_DRAFT", "PROMPT_DRAFT", "STRATEGY_DRAFT", "FUTURE_PLAN_DRAFT", "GOAL_REVIEW_DRAFT", "PORTFOLIO_STRATEGY_DRAFT", "ASSET_REUSE_DRAFT", "EFFICIENCY_OPTIMIZATION_DRAFT"]);
  assert.equal(studioCopilotActionLabel("CHECK_COST"), "Check cost");
  assert.equal(studioCopilotDraftLabel("WORKFLOW_DRAFT"), "Workflow Draft");
  assert.equal(studioCopilotDraftLabel("STRATEGY_DRAFT"), "Strategy Draft");
  assert.equal(studioCopilotDraftLabel("FUTURE_PLAN_DRAFT"), "Future Plan Draft");
  assert.equal(studioCopilotDraftLabel("GOAL_REVIEW_DRAFT"), "Goal Review Draft");
  assert.equal(studioCopilotDraftLabel("PORTFOLIO_STRATEGY_DRAFT"), "Portfolio Strategy Draft");
  assert.equal(studioCopilotDraftLabel("ASSET_REUSE_DRAFT"), "Asset Reuse Draft");
  assert.equal(studioCopilotDraftLabel("EFFICIENCY_OPTIMIZATION_DRAFT"), "Efficiency Optimization Draft");
});

test("Creative Copilot Panel displays Context, Workflow, suggestions, and Task status", () => {
  const component = fs.readFileSync("src/features/studio/components/StudioProjectCopilot.tsx", "utf8");
  assert.match(component, /Creative Copilot/);
  assert.match(component, /Project summary/);
  assert.match(component, /Current goal/);
  assert.match(component, /memoryCount/);
  assert.match(component, /workflowTemplateCount/);
  assert.match(component, /strategyCount/);
  assert.match(component, /futurePlanCount/);
  assert.match(component, /goalCount/);
  assert.match(component, /goalAlignment\.status/);
  assert.match(component, /portfolio\.projectCount/);
  assert.match(component, /portfolioContext\.projectPriority/);
  assert.match(component, /resources\.highValueAssetCount/);
  assert.match(component, /resourceContext\.highestReuseScore/);
  assert.match(component, /efficiency\.bottleneckCount/);
  assert.match(component, /efficiencyContext\.bottleneckCount/);
  assert.match(component, /taskStatus\.waitingHuman/);
  assert.match(component, /pendingActions/);
  assert.match(component, /Action Center/);
});

test("Preview, Confirm, and Dismiss remain explicit user actions and Confirm creates Draft only", () => {
  const component = fs.readFileSync("src/features/studio/components/StudioProjectCopilot.tsx", "utf8");
  const api = fs.readFileSync("src/lib/studio-project-copilot-api.ts", "utf8");
  assert.match(component, /"DISMISS"/);
  assert.match(component, /Preview Action/);
  assert.match(component, /Create Draft/);
  assert.match(component, /User confirmation required/);
  assert.match(api, /\/copilot\/actions\/\$\{encodeURIComponent\(actionId\)\}\/preview/);
  assert.match(api, /\/copilot\/actions\/\$\{encodeURIComponent\(actionId\)\}\/confirm/);
  assert.match(api, /JSON\.stringify\(\{ confirm: true \}\)/);
  assert.match(api, /method: "POST"/);
});

test("Copilot is mounted in Studio without execution, Provider, or charging hooks", () => {
  const parent = fs.readFileSync("src/features/studio/components/StudioModelRecommendation.tsx", "utf8");
  const sources = [
    fs.readFileSync("src/features/studio/components/StudioProjectCopilot.tsx", "utf8"),
    fs.readFileSync("src/lib/studio-project-copilot-api.ts", "utf8"),
    fs.readFileSync("src/features/studio/capabilities/studioProjectCopilot.ts", "utf8"),
  ].join("\n");
  assert.match(parent, /<StudioProjectCopilot projectId=\{projectId\}/);
  assert.doesNotMatch(sources, /executeStudioWorkflowNode|\/api\/video\/generate|providerTransport|deductCredits|createUsageRecord/i);
});
