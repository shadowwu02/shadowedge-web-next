import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  STUDIO_SCENARIO_TYPES,
  studioScenarioTypeLabel,
} from "../src/features/studio/capabilities/studioScenarioSimulation.ts";

test("CreativeScenario contract exposes the five bounded Scenario Types", () => {
  assert.deepEqual(STUDIO_SCENARIO_TYPES, [
    "QUALITY_SCENARIO",
    "COST_SCENARIO",
    "SPEED_SCENARIO",
    "WORKFLOW_SCENARIO",
    "RESOURCE_SCENARIO",
  ]);
  assert.equal(studioScenarioTypeLabel("RESOURCE_SCENARIO"), "Resource");
});

test("Scenario Simulator shows option impact, assumptions, risks, and confidence", () => {
  const panel = fs.readFileSync("src/features/studio/components/StudioScenarioSimulatorPanel.tsx", "utf8");
  const parent = fs.readFileSync("src/features/studio/components/StudioProjectCopilot.tsx", "utf8");
  assert.match(panel, /Scenario Simulator/);
  assert.match(panel, /expectedImpact\.costImpact/);
  assert.match(panel, /expectedImpact\.qualityImpact/);
  assert.match(panel, /assumptions\.join/);
  assert.match(panel, /expectedImpact\.risks/);
  assert.match(panel, /scenario\.confidence/);
  assert.match(panel, /directional only/);
  assert.match(parent, /<StudioScenarioSimulatorPanel projectId=\{projectId\}/);
});

test("Scenario API is authenticated project GET only", () => {
  const api = fs.readFileSync("src/lib/studio-scenario-simulation-api.ts", "utf8");
  assert.match(api, /\/api\/projects\/\$\{encodeURIComponent\(projectId\)\}\/scenarios/);
  assert.doesNotMatch(api, /method: "POST"|method: "PUT"|method: "DELETE"/);
});

test("SCENARIO_DECISION_DRAFT stays behind Preview and Confirm without automatic selection", () => {
  const contract = fs.readFileSync("src/features/studio/capabilities/studioProjectCopilot.ts", "utf8");
  const panel = fs.readFileSync("src/features/studio/components/StudioScenarioSimulatorPanel.tsx", "utf8");
  const parent = fs.readFileSync("src/features/studio/components/StudioProjectCopilot.tsx", "utf8");
  assert.match(contract, /SCENARIO_DECISION_DRAFT/);
  assert.match(contract, /REVIEW_SCENARIO/);
  assert.match(parent, /Preview Action/);
  assert.match(parent, /Create Draft/);
  assert.doesNotMatch([contract, panel, parent].join("\n"), /selectOption|executeStudioWorkflowNode|\/api\/video\/generate|providerTransport|deductCredits/i);
});
