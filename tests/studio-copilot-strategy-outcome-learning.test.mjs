import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  STUDIO_STRATEGY_DECISIONS,
  STUDIO_STRATEGY_EXECUTION_RESULTS,
  STUDIO_STRATEGY_QUALITY_SIGNALS,
} from "../src/features/studio/capabilities/studioStrategyLearning.ts";

test("Strategy Decision and Outcome contracts remain bounded", () => {
  assert.deepEqual(STUDIO_STRATEGY_DECISIONS, ["ACCEPTED", "REJECTED", "MODIFIED", "IGNORED"]);
  assert.deepEqual(STUDIO_STRATEGY_EXECUTION_RESULTS, ["COMPLETED", "FAILED", "PARTIAL", "UNKNOWN"]);
  assert.deepEqual(STUDIO_STRATEGY_QUALITY_SIGNALS, ["IMPROVED", "STABLE", "DECLINED", "UNKNOWN"]);
});

test("Project Strategy History renders decisions, outcomes, effects, metrics, and signals", () => {
  const component = fs.readFileSync("src/features/studio/components/StudioProjectStrategyHistory.tsx", "utf8");
  const parent = fs.readFileSync("src/features/studio/components/StudioProjectCopilot.tsx", "utf8");
  assert.match(component, /Project Strategy History/);
  assert.match(component, /acceptanceRate/);
  assert.match(component, /successRate/);
  assert.match(component, /qualityImprovement/);
  assert.match(component, /userRating/);
  assert.match(component, /revisionRate/);
  assert.match(component, /Learning signal/);
  assert.match(component, /read-only/);
  assert.match(parent, /<StudioProjectStrategyHistory projectId=\{projectId\}/);
});

test("Strategy History API is authenticated and UI contains no execution or charging hook", () => {
  const api = fs.readFileSync("src/lib/studio-strategy-history-api.ts", "utf8");
  const sources = [api, fs.readFileSync("src/features/studio/components/StudioProjectStrategyHistory.tsx", "utf8")].join("\n");
  assert.match(api, /\/api\/projects\/\$\{encodeURIComponent\(projectId\)\}\/strategy-history/);
  assert.match(api, /apiRequest/);
  assert.doesNotMatch(sources, /method:\s*"POST"|\/api\/video\/generate|executeStudioWorkflowNode|providerTransport|deductCredits|createUsageRecord/i);
});
