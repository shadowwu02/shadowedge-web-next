import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const schema = fs.readFileSync(
  "src/features/studio/capabilities/studioPortfolioStrategy.ts",
  "utf8",
);
const api = fs.readFileSync(
  "src/lib/studio-portfolio-strategy-api.ts",
  "utf8",
);
const center = fs.readFileSync(
  "src/features/studio/components/StudioPortfolioStrategyCenter.tsx",
  "utf8",
);
const workspace = fs.readFileSync(
  "src/features/studio/components/StudioWorkspace.tsx",
  "utf8",
);
const styles = fs.readFileSync(
  "src/features/studio/studio.css",
  "utf8",
);

test("Portfolio Strategy Snapshot covers projects, vision, strategies, priorities, evidence and confidence", () => {
  for (const field of ["portfolioId", "projects", "vision", "strategies", "priorities", "evidence", "confidence", "createdAt"]) {
    assert.match(schema, new RegExp(`${field}:`));
  }
  for (const goal of ["BRAND_GROWTH", "CONTENT_SCALE", "MARKET_EXPANSION", "EFFICIENCY"]) {
    assert.match(schema, new RegExp(`"${goal}"`));
  }
});

test("Portfolio relationships cover conflict, resource and style analysis", () => {
  for (const relationship of ["PROJECT_RELATION", "GOAL_CONFLICT", "RESOURCE_OPPORTUNITY", "STYLE_CONSISTENCY"]) {
    assert.match(schema, new RegExp(`"${relationship}"`));
  }
  assert.match(schema, /privacy: "CURRENT_USER_PROJECTS_ONLY"/);
  assert.match(schema, /priorityMutation: false/);
  assert.match(schema, /crossUserRead: false/);
});

test("Portfolio Strategy API preserves GET, Preview and explicit Human Confirm", () => {
  assert.match(api, /"\/api\/portfolio\/strategy"/);
  assert.match(api, /"\/api\/portfolio\/strategy\/preview"/);
  assert.match(api, /"\/api\/portfolio\/strategy\/confirm"/);
  assert.match(api, /JSON\.stringify\(\{ confirm: true \}\)/);
  assert.doesNotMatch(api, /execute|generate|provider|deductCredits|billing/i);
});

test("Portfolio Strategy Center renders projects, goals, priorities, risks and Draft boundary", () => {
  for (const label of [
    "Portfolio Strategy Center",
    "Portfolio vision",
    "Project portfolio",
    "Relationships and risks",
    "Strategic suggestions",
    "PORTFOLIO_STRATEGY_DRAFT",
    "Priority suggestions are not applied",
    "Current user projects only",
  ]) {
    assert.match(center, new RegExp(label));
  }
  assert.match(workspace, /<StudioPortfolioStrategyCenter \/>/);
  assert.match(styles, /\.studio-portfolio-strategy/);
  assert.match(styles, /\.studio-portfolio-strategy-projects/);
  assert.doesNotMatch(center, />Execute</);
  assert.doesNotMatch(center, />Generate</);
  assert.doesNotMatch(center, />Apply Priority</);
  assert.doesNotMatch(center, />Charge</);
});
