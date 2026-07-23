import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  STUDIO_CREATIVE_PREFERENCE_CONFIDENCE,
  STUDIO_CREATIVE_PREFERENCE_TYPES,
  studioCreativePreferenceConfidenceLabel,
  studioCreativePreferenceLabel,
} from "../src/features/studio/capabilities/studioCreativePreference.ts";

test("Creative Preference schema keeps bounded creative identity and Confidence types", () => {
  assert.deepEqual(STUDIO_CREATIVE_PREFERENCE_TYPES, [
    "STYLE_PREFERENCE",
    "WORKFLOW_PREFERENCE",
    "QUALITY_PREFERENCE",
    "COST_PREFERENCE",
    "SPEED_PREFERENCE",
    "MODEL_PREFERENCE",
  ]);
  assert.deepEqual(STUDIO_CREATIVE_PREFERENCE_CONFIDENCE, ["EXPLICIT", "STRONG_SIGNAL", "WEAK_SIGNAL"]);
  assert.equal(studioCreativePreferenceLabel("STYLE_PREFERENCE"), "Style");
  assert.equal(studioCreativePreferenceConfidenceLabel("EXPLICIT"), "Set by you");
  const schema = fs.readFileSync("src/features/studio/capabilities/studioCreativePreference.ts", "utf8");
  assert.match(schema, /CURRENT_USER_ONLY_NO_SENSITIVE_INFERENCE_NO_CROSS_USER_LEARNING/);
  assert.match(schema, /PROJECT_SCOPED_NOT_PROMOTED_AUTOMATICALLY/);
});

test("My Creative Preferences shows type, source, Confidence, and two-step delete control", () => {
  const component = fs.readFileSync("src/features/studio/components/StudioCreativePreferencesPanel.tsx", "utf8");
  const parent = fs.readFileSync("src/features/studio/components/StudioProjectCopilot.tsx", "utf8");
  assert.match(component, /My Creative Preferences/);
  assert.match(component, /preference\.sources/);
  assert.match(component, /studioCreativePreferenceConfidenceLabel/);
  assert.match(component, /Confirm remove/);
  assert.match(component, /setPendingDeleteId/);
  assert.match(parent, /<StudioCreativePreferencesPanel/);
});

test("Creative Preference API exposes authenticated GET and user delete", () => {
  const api = fs.readFileSync("src/lib/studio-creative-preferences-api.ts", "utf8");
  assert.match(api, /\/api\/user\/creative-preferences/);
  assert.match(api, /method: "DELETE"/);
  assert.match(api, /encodeURIComponent\(preferenceId\)/);
});

test("PREFERENCE_REVIEW_DRAFT stays behind Preview and Confirm without automatic execution", () => {
  const contract = fs.readFileSync("src/features/studio/capabilities/studioProjectCopilot.ts", "utf8");
  const component = fs.readFileSync("src/features/studio/components/StudioProjectCopilot.tsx", "utf8");
  const preferencePanel = fs.readFileSync("src/features/studio/components/StudioCreativePreferencesPanel.tsx", "utf8");
  assert.match(contract, /PREFERENCE_REVIEW_DRAFT/);
  assert.match(contract, /REVIEW_PREFERENCES/);
  assert.match(component, /Preview Action/);
  assert.match(component, /Create Draft/);
  assert.doesNotMatch([contract, component, preferencePanel].join("\n"), /\/api\/video\/generate|providerTransport|deductCredits|executeStudioWorkflowNode/i);
});
