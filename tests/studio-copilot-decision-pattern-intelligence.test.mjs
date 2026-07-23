import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  STUDIO_DECISION_PATTERN_CONFIDENCE,
  STUDIO_DECISION_PATTERN_TYPES,
  studioDecisionPatternConfidenceLabel,
  studioDecisionPatternLabel,
} from "../src/features/studio/capabilities/studioDecisionPattern.ts";

test("Decision Pattern contract exposes six Decision Types and three confidence levels", () => {
  assert.deepEqual(STUDIO_DECISION_PATTERN_TYPES, [
    "QUALITY_VS_COST",
    "QUALITY_VS_SPEED",
    "COST_VS_SPEED",
    "STYLE_CHOICE",
    "WORKFLOW_CHOICE",
    "RESOURCE_CHOICE",
  ]);
  assert.deepEqual(STUDIO_DECISION_PATTERN_CONFIDENCE, ["EXPLICIT", "STRONG_PATTERN", "EARLY_SIGNAL"]);
  assert.equal(studioDecisionPatternLabel("QUALITY_VS_COST"), "Quality vs cost");
  assert.equal(studioDecisionPatternConfidenceLabel("STRONG_PATTERN"), "Strong pattern");
});

test("My Decision Patterns displays choices, sources, confidence, and two-step delete", () => {
  const panel = fs.readFileSync("src/features/studio/components/StudioDecisionPatternsPanel.tsx", "utf8");
  const parent = fs.readFileSync("src/features/studio/components/StudioProjectCopilot.tsx", "utf8");
  assert.match(panel, /My Decision Patterns/);
  assert.match(panel, /choiceSignals\.selectedValue/);
  assert.match(panel, /pattern\.sources\.map/);
  assert.match(panel, /studioDecisionPatternConfidenceLabel/);
  assert.match(panel, /Confirm remove/);
  assert.match(panel, /No preferences or project data changed/);
  assert.match(parent, /<StudioDecisionPatternsPanel/);
});

test("Decision Pattern API is private user GET with explicit user delete", () => {
  const api = fs.readFileSync("src/lib/studio-decision-patterns-api.ts", "utf8");
  assert.match(api, /\/api\/user\/decision-patterns/);
  assert.match(api, /method: "DELETE"/);
  assert.doesNotMatch(api, /method: "POST"|method: "PUT"/);
});

test("DECISION_PATTERN_REVIEW_DRAFT stays behind Action Center Preview and Confirm", () => {
  const contract = fs.readFileSync("src/features/studio/capabilities/studioProjectCopilot.ts", "utf8");
  const panel = fs.readFileSync("src/features/studio/components/StudioDecisionPatternsPanel.tsx", "utf8");
  const parent = fs.readFileSync("src/features/studio/components/StudioProjectCopilot.tsx", "utf8");
  assert.match(contract, /DECISION_PATTERN_REVIEW_DRAFT/);
  assert.match(contract, /REVIEW_DECISION_PATTERN/);
  assert.match(parent, /Preview Action/);
  assert.match(parent, /Create Draft/);
  assert.doesNotMatch([contract, panel, parent].join("\n"), /selectOption|executeStudioWorkflowNode|\/api\/video\/generate|providerTransport|deductCredits|updatePreference/i);
});
