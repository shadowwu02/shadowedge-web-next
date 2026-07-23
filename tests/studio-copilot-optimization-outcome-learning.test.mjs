import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  STUDIO_OPTIMIZATION_DECISIONS,
  STUDIO_OPTIMIZATION_IMPACT_STATUSES,
  STUDIO_OPTIMIZATION_LEARNING_SIGNALS,
  studioOptimizationDelta,
  studioOptimizationLearningLabel,
} from "../src/features/studio/capabilities/studioOptimizationLearning.ts";

test("Optimization Outcome Learning contract covers decisions, impact, and signals", () => {
  assert.deepEqual(STUDIO_OPTIMIZATION_DECISIONS, ["ACCEPTED", "REJECTED", "MODIFIED", "IGNORED"]);
  assert.deepEqual(STUDIO_OPTIMIZATION_LEARNING_SIGNALS, ["EFFECTIVE", "INEFFECTIVE", "MIXED", "INSUFFICIENT_DATA"]);
  assert.deepEqual(STUDIO_OPTIMIZATION_IMPACT_STATUSES, ["IMPROVED", "DECLINED", "MIXED", "UNCHANGED", "INSUFFICIENT_DATA"]);
  assert.equal(studioOptimizationLearningLabel("INSUFFICIENT_DATA"), "Insufficient Data");
  assert.equal(studioOptimizationDelta(12.5, "%"), "+12.5%");
  assert.equal(studioOptimizationDelta(null), "Not measured");
  const contract = fs.readFileSync("src/features/studio/capabilities/studioOptimizationLearning.ts", "utf8");
  for (const metric of ["cost", "quality", "efficiency", "revisionRate", "beforeMetrics", "afterMetrics", "qualityChange"]) {
    assert.match(contract, new RegExp(metric));
  }
});

test("Optimization History Panel shows Proposal, Decision, Outcome, Impact, and Learning Signal", () => {
  const component = fs.readFileSync("src/features/studio/components/StudioOptimizationHistoryPanel.tsx", "utf8");
  assert.match(component, /Optimization History Panel/);
  assert.match(component, /item\.proposal/);
  assert.match(component, /item\.decision/);
  assert.match(component, /item\.outcomes/);
  assert.match(component, /item\.learningSignal/);
  assert.match(component, /impact\.costChange/);
  assert.match(component, /qualityChange/);
  assert.match(component, /impact\.efficiencyChange/);
  assert.match(component, /impact\.revisionRateChange/);
  assert.match(component, /analytics only/);
  assert.doesNotMatch(component, /onClick=|executeStudio|generateVideo|switchModel|updateProject|deductCredits/);
});

test("Optimization History API and Copilot refresh remain read-only", () => {
  const api = fs.readFileSync("src/lib/studio-optimization-history-api.ts", "utf8");
  const copilot = fs.readFileSync("src/features/studio/components/StudioProjectCopilot.tsx", "utf8");
  assert.match(api, /\/api\/projects\/\$\{encodeURIComponent\(projectId\)\}\/optimization-history/);
  assert.doesNotMatch(api, /method:\s*["']POST/);
  assert.match(copilot, /StudioOptimizationHistoryPanel/);
  assert.match(copilot, /studio:optimization-history-updated/);
  assert.match(copilot, /OPTIMIZATION_DRAFT/);
});
