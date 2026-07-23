import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  STUDIO_PORTFOLIO_GOALS,
  STUDIO_PORTFOLIO_INSIGHT_TYPES,
  studioPortfolioLabel,
} from "../src/features/studio/capabilities/studioPortfolioIntelligence.ts";

test("Portfolio contracts expose goals, relations, and approved insight types", () => {
  assert.deepEqual(STUDIO_PORTFOLIO_GOALS, ["GROWTH", "BRAND_BUILDING", "CONTENT_SCALE", "EFFICIENCY"]);
  assert.deepEqual(STUDIO_PORTFOLIO_INSIGHT_TYPES, ["PROJECT_OVERLAP", "RESOURCE_CONFLICT", "GOAL_ALIGNMENT", "CONTENT_OPPORTUNITY"]);
  assert.equal(studioPortfolioLabel("BRAND_BUILDING"), "Brand Building");
  const schema = fs.readFileSync("src/features/studio/capabilities/studioPortfolioIntelligence.ts", "utf8");
  assert.match(schema, /portfolioId: string/);
  assert.match(schema, /priority: "HIGH" \| "MEDIUM" \| "LOW"/);
  assert.match(schema, /priorityMode: "SUGGESTED_NOT_APPLIED"/);
});

test("Portfolio Intelligence Panel shows projects, priorities, goals, and insights without write controls", () => {
  const component = fs.readFileSync("src/features/studio/components/StudioPortfolioIntelligencePanel.tsx", "utf8");
  assert.match(component, /Portfolio Intelligence Panel/);
  assert.match(component, /Portfolio Goals/);
  assert.match(component, /relation\?\.priority/);
  assert.match(component, /portfolio\.insights\.map/);
  assert.match(component, /Priorities and resource notes are analysis only/);
  assert.doesNotMatch(component, /onClick=|updateProject\(|executeStudio|generateVideo\(|deductCredits\(/);
});

test("Portfolio API and Copilot contract preserve authentication and suggestion-only priority", () => {
  const api = fs.readFileSync("src/lib/studio-portfolio-intelligence-api.ts", "utf8");
  const copilot = fs.readFileSync("src/features/studio/capabilities/studioProjectCopilot.ts", "utf8");
  const panel = fs.readFileSync("src/features/studio/components/StudioProjectCopilot.tsx", "utf8");
  assert.match(api, /"\/api\/portfolio\/intelligence"/);
  assert.match(copilot, /PORTFOLIO_PRIORITY_SUGGESTION/);
  assert.match(copilot, /PORTFOLIO_STRATEGY_DRAFT/);
  assert.match(copilot, /portfolioContext/);
  assert.match(panel, /StudioPortfolioIntelligencePanel/);
});
