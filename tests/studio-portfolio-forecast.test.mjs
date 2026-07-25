import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const contract = fs.readFileSync(
  new URL("../src/features/studio/capabilities/studioPortfolioForecast.ts", import.meta.url),
  "utf8",
);
const api = fs.readFileSync(
  new URL("../src/lib/studio-portfolio-forecast-api.ts", import.meta.url),
  "utf8",
);
const center = fs.readFileSync(
  new URL("../src/features/studio/components/StudioPortfolioForecastCenter.tsx", import.meta.url),
  "utf8",
);
const workspace = fs.readFileSync(
  new URL("../src/features/studio/components/StudioWorkspace.tsx", import.meta.url),
  "utf8",
);

test("Portfolio Forecast Snapshot exposes Trends, Forecasts, Scenarios, Confidence and Evidence", () => {
  for (const field of [
    "portfolioId",
    "trends",
    "forecasts",
    "scenarios",
    "confidence",
    "evidence",
    "createdAt",
  ]) {
    assert.match(contract, new RegExp(`\\b${field}:`));
  }
  for (const type of [
    "QUALITY_TREND",
    "DELIVERY_TREND",
    "COST_TREND",
    "RESOURCE_TREND",
    "GROWTH_TREND",
  ]) {
    assert.match(contract, new RegExp(`"${type}"`));
  }
});

test("Forecast Trend and Scenario contracts preserve uncertainty and Evidence", () => {
  assert.match(contract, /INSUFFICIENT_HISTORY/);
  assert.match(contract, /POSSIBLE_OUTCOME_NOT_GUARANTEED/);
  assert.match(contract, /Scenario outcomes are estimates, not guarantees/);
  assert.match(contract, /evidenceRefs: readonly string\[\]/);
  assert.match(contract, /CURRENT_USER_PORTFOLIO_FORECAST_ONLY/);
});

test("Portfolio Forecast preserves Draft-only safety boundaries", () => {
  assert.match(contract, /PORTFOLIO_FORECAST_DRAFT/);
  assert.match(contract, /outcomeGuarantee: false/);
  assert.match(contract, /strategyMutation: false/);
  assert.match(contract, /resourceAllocation: false/);
  assert.match(contract, /projectExecution: false/);
  assert.match(contract, /creditsDeducted: false/);
});

test("Portfolio Forecast API uses exact route and explicit Human Confirm", () => {
  assert.match(api, /"\/api\/portfolio\/forecast"/);
  assert.match(api, /"\/api\/portfolio\/forecast\/preview"/);
  assert.match(api, /"\/api\/portfolio\/forecast\/confirm"/);
  assert.match(api, /JSON\.stringify\(\{ confirm: true \}\)/);
});

test("Portfolio Forecast Center renders trends, outcomes, scenarios, Confidence and Evidence", () => {
  for (const copy of [
    "Portfolio Forecast Center",
    "Possible outcome forecasts",
    "Scenario suggestions",
    "Evidence coverage",
    "Outcomes not guaranteed",
    "Preview Forecast Scenarios",
    "Confirm Forecast Draft",
  ]) {
    assert.match(center, new RegExp(copy));
  }
  assert.match(center, /No guaranteed result, Strategy adjustment, resource allocation, execution, or Credits/);
  assert.doesNotMatch(center, />Execute</);
  assert.doesNotMatch(center, />Generate</);
  assert.match(workspace, /<StudioPortfolioForecastCenter \/>/);
});
