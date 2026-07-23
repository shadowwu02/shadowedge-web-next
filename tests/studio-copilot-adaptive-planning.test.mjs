import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  STUDIO_ADAPTATION_TYPES,
  studioAdaptationLabel,
} from "../src/features/studio/capabilities/studioAdaptivePlanning.ts";

test("Adaptive Plan contract exposes the five bounded adaptation types", () => {
  assert.deepEqual(STUDIO_ADAPTATION_TYPES, [
    "WORKFLOW_STYLE_ADAPTATION",
    "QUALITY_LEVEL_ADAPTATION",
    "COST_LEVEL_ADAPTATION",
    "SPEED_LEVEL_ADAPTATION",
    "MODEL_PREFERENCE_ALIGNMENT",
  ]);
  assert.equal(studioAdaptationLabel("MODEL_PREFERENCE_ALIGNMENT"), "Model alignment");
  const contract = fs.readFileSync("src/features/studio/capabilities/studioAdaptivePlanning.ts", "utf8");
  assert.match(contract, /PREFERENCE_CONFLICT/);
  assert.match(contract, /USER_REVIEW_REQUIRED_NO_AUTOMATIC_CHOICE/);
});

test("Personalized Suggestions shows Preference signals, reason, Confidence, and conflict", () => {
  const component = fs.readFileSync("src/features/studio/components/StudioAdaptiveSuggestionsPanel.tsx", "utf8");
  const parent = fs.readFileSync("src/features/studio/components/StudioProjectCopilot.tsx", "utf8");
  assert.match(component, /Personalized Suggestions/);
  assert.match(component, /preferenceSignals/);
  assert.match(component, /suggestion\.reason/);
  assert.match(component, /suggestion\.confidence/);
  assert.match(component, /PREFERENCE_CONFLICT/);
  assert.match(component, /evidence\.goalIds/);
  assert.match(component, /evidence\.experienceIds/);
  assert.match(parent, /<StudioAdaptiveSuggestionsPanel projectId=\{projectId\}/);
});

test("Adaptive Suggestions API is an authenticated project GET", () => {
  const api = fs.readFileSync("src/lib/studio-adaptive-planning-api.ts", "utf8");
  assert.match(api, /\/api\/projects\/\$\{encodeURIComponent\(projectId\)\}\/adaptive-suggestions/);
  assert.doesNotMatch(api, /method: "POST"|method: "PUT"|method: "DELETE"/);
});

test("ADAPTIVE_PLAN_DRAFT remains behind Preview and Confirm with no automatic mutation", () => {
  const contract = fs.readFileSync("src/features/studio/capabilities/studioProjectCopilot.ts", "utf8");
  const panel = fs.readFileSync("src/features/studio/components/StudioAdaptiveSuggestionsPanel.tsx", "utf8");
  const parent = fs.readFileSync("src/features/studio/components/StudioProjectCopilot.tsx", "utf8");
  assert.match(contract, /ADAPTIVE_PLAN_DRAFT/);
  assert.match(contract, /REVIEW_ADAPTIVE_PLAN/);
  assert.match(parent, /Preview Action/);
  assert.match(parent, /Create Draft/);
  assert.doesNotMatch([contract, panel, parent].join("\n"), /\/api\/video\/generate|providerTransport|deductCredits|executeStudioWorkflowNode|switchModel/i);
});
