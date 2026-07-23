import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  STUDIO_OPTIMIZATION_TYPES,
  studioOptimizationImpactLabel,
  studioOptimizationLabel,
} from "../src/features/studio/capabilities/studioCreativeOptimizations.ts";

test("Optimization Intelligence contract exposes the five governed optimization types", () => {
  assert.deepEqual(STUDIO_OPTIMIZATION_TYPES, [
    "QUALITY_OPTIMIZATION",
    "COST_OPTIMIZATION",
    "WORKFLOW_OPTIMIZATION",
    "RESOURCE_OPTIMIZATION",
    "STYLE_OPTIMIZATION",
  ]);
  assert.equal(studioOptimizationLabel("WORKFLOW_OPTIMIZATION"), "Workflow");
  assert.equal(studioOptimizationImpactLabel("reduce_revision_rate"), "Reduce Revision Rate");
  const contract = fs.readFileSync("src/features/studio/capabilities/studioCreativeOptimizations.ts", "utf8");
  for (const source of ["QUALITY_EVALUATION", "EFFICIENCY_INSIGHT", "PROJECT_COST_RECORD", "RESOURCE_INSIGHT", "USER_FEEDBACK", "STRATEGY_OUTCOME"]) {
    assert.match(contract, new RegExp(source));
  }
});

test("Optimization Center displays issues, recommendations, impact, evidence, and confidence as read-only proposals", () => {
  const component = fs.readFileSync("src/features/studio/components/StudioOptimizationCenter.tsx", "utf8");
  assert.match(component, /Creative Optimization Center/);
  assert.match(component, /proposal\.issues/);
  assert.match(component, /proposal\.recommendations/);
  assert.match(component, /proposal\.expectedImpact/);
  assert.match(component, /proposal\.evidence/);
  assert.match(component, /proposal\.confidence/);
  assert.match(component, /not a guaranteed result/);
  assert.match(component, /Optimization Draft only/);
  assert.doesNotMatch(component, /onClick=|executeStudio|generateVideo|switchModel|updateProject|deductCredits/);
});

test("Optimization API and Copilot preserve Preview to OPTIMIZATION_DRAFT boundary", () => {
  const api = fs.readFileSync("src/lib/studio-creative-optimizations-api.ts", "utf8");
  const contract = fs.readFileSync("src/features/studio/capabilities/studioProjectCopilot.ts", "utf8");
  const copilot = fs.readFileSync("src/features/studio/components/StudioProjectCopilot.tsx", "utf8");
  assert.match(api, /\/api\/projects\/\$\{encodeURIComponent\(projectId\)\}\/optimizations/);
  assert.match(contract, /CREATIVE_OPTIMIZATION_SUGGESTION/);
  assert.match(contract, /REVIEW_OPTIMIZATION/);
  assert.match(contract, /OPTIMIZATION_DRAFT/);
  assert.match(contract, /optimizationContext/);
  assert.match(copilot, /StudioOptimizationCenter/);
  assert.match(copilot, /Preview Action/);
  assert.match(copilot, /Create Draft/);
});
