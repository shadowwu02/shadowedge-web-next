import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const contract = fs.readFileSync(
  new URL("../src/features/studio/capabilities/studioPortfolioPerformance.ts", import.meta.url),
  "utf8",
);
const api = fs.readFileSync(
  new URL("../src/lib/studio-portfolio-performance-api.ts", import.meta.url),
  "utf8",
);
const center = fs.readFileSync(
  new URL("../src/features/studio/components/StudioPortfolioPerformanceCenter.tsx", import.meta.url),
  "utf8",
);
const workspace = fs.readFileSync(
  new URL("../src/features/studio/components/StudioWorkspace.tsx", import.meta.url),
  "utf8",
);

test("Portfolio Performance Snapshot covers projects, Quality, Cost, Delivery, Feedback and Revision", () => {
  for (const field of [
    "portfolioId",
    "projects",
    "quality",
    "cost",
    "delivery",
    "feedback",
    "revision",
    "successSignals",
    "confidence",
    "createdAt",
  ]) {
    assert.match(contract, new RegExp(`\\b${field}:`));
  }
  for (const metric of [
    "QUALITY_SCORE",
    "DELIVERY_SUCCESS",
    "CLIENT_FEEDBACK",
    "REVISION_RATE",
    "COST_EFFICIENCY",
    "WORKFLOW_SUCCESS",
  ]) {
    assert.match(contract, new RegExp(`"${metric}"`));
  }
});

test("Portfolio Performance contracts preserve privacy and Draft-only boundaries", () => {
  assert.match(contract, /CURRENT_USER_PORTFOLIO_PERFORMANCE_ONLY/);
  assert.match(contract, /READ_ONLY_BENCHMARK_SUGGESTIONS/);
  assert.match(contract, /PORTFOLIO_PERFORMANCE_DRAFT/);
  assert.match(contract, /projectClosure: false/);
  assert.match(contract, /priorityMutation: false/);
  assert.match(contract, /resourceMovement: false/);
  assert.match(contract, /workflowMutation: false/);
  assert.match(contract, /automaticExecution: false/);
  assert.match(contract, /creditsDeducted: false/);
});

test("Portfolio Performance API uses exact route and explicit Human Confirm", () => {
  assert.match(api, /"\/api\/portfolio\/performance"/);
  assert.match(api, /"\/api\/portfolio\/performance\/preview"/);
  assert.match(api, /"\/api\/portfolio\/performance\/confirm"/);
  assert.match(api, /JSON\.stringify\(\{ confirm: true \}\)/);
});

test("Portfolio Performance Center renders ranking, benchmarks, success, risks and controlled Draft actions", () => {
  for (const copy of [
    "Portfolio Performance Center",
    "Project ranking",
    "Project benchmarks",
    "Success and risk patterns",
    "Preview Performance Insight",
    "Confirm Performance Draft",
    "Benchmark suggestions are not applied",
  ]) {
    assert.match(center, new RegExp(copy));
  }
  assert.match(center, /No project closure, priority adjustment, resource movement, Workflow change, execution, or Credits/);
  assert.doesNotMatch(center, />Execute</);
  assert.doesNotMatch(center, />Generate</);
  assert.match(workspace, /<StudioPortfolioPerformanceCenter \/>/);
});
