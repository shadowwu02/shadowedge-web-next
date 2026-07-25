import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const schema = fs.readFileSync(
  "src/features/studio/capabilities/studioPortfolioResources.ts",
  "utf8",
);
const api = fs.readFileSync(
  "src/lib/studio-portfolio-resource-api.ts",
  "utf8",
);
const center = fs.readFileSync(
  "src/features/studio/components/StudioPortfolioResourceCenter.tsx",
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

test("Portfolio Resource Snapshot covers Assets, Agents, Workflows, usage, Cost and opportunities", () => {
  for (const field of ["portfolioId", "assets", "agents", "workflows", "usage", "cost", "opportunities", "confidence", "createdAt"]) {
    assert.match(schema, new RegExp(`${field}:`));
  }
  for (const type of ["ASSET_REUSE", "WORKFLOW_REUSE", "AGENT_CAPACITY", "COST_OPTIMIZATION", "PROJECT_PRIORITY"]) {
    assert.match(schema, new RegExp(`"${type}"`));
  }
});

test("Portfolio Resource contract preserves privacy and allocation boundaries", () => {
  assert.match(schema, /privacy: "CURRENT_USER_PORTFOLIO_RESOURCES_ONLY"/);
  assert.match(schema, /priorityMutation: false/);
  assert.match(schema, /resourceMovement: false/);
  assert.match(schema, /workflowMutation: false/);
  assert.match(schema, /automaticExecution: false/);
  assert.match(schema, /creditsDeducted: false/);
});

test("Portfolio Resource API uses exact intelligence route and explicit Confirm", () => {
  assert.match(api, /"\/api\/portfolio\/resources\/intelligence"/);
  assert.match(api, /"\/api\/portfolio\/resources\/intelligence\/preview"/);
  assert.match(api, /"\/api\/portfolio\/resources\/intelligence\/confirm"/);
  assert.match(api, /JSON\.stringify\(\{ confirm: true \}\)/);
  assert.doesNotMatch(api, /execute|generate|provider|moveAsset|deductCredits|billing/i);
});

test("Portfolio Resource Center renders utilization, opportunities, risks and Draft-only controls", () => {
  for (const label of [
    "Portfolio Resource Center",
    "Project allocation view",
    "Resource utilization",
    "Optimization opportunities",
    "PORTFOLIO_RESOURCE_DRAFT",
    "Allocation suggestions are not applied",
    "Current user portfolio only",
  ]) {
    assert.match(center, new RegExp(label));
  }
  assert.match(workspace, /<StudioPortfolioResourceCenter \/>/);
  assert.match(styles, /\.studio-portfolio-resource-center/);
  assert.match(styles, /\.studio-portfolio-resource-opportunities/);
  assert.doesNotMatch(center, />Execute</);
  assert.doesNotMatch(center, />Move Asset</);
  assert.doesNotMatch(center, />Apply Priority</);
  assert.doesNotMatch(center, />Charge</);
});
