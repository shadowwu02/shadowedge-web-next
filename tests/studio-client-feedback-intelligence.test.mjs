import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const schema = fs.readFileSync(
  "src/features/studio/capabilities/studioClientFeedbackIntelligence.ts",
  "utf8",
);
const api = fs.readFileSync(
  "src/lib/studio-client-feedback-intelligence-api.ts",
  "utf8",
);
const panel = fs.readFileSync(
  "src/features/studio/components/StudioStoryboardPanel.tsx",
  "utf8",
) + fs.readFileSync("src/i18n/productPhase2Dictionary.ts", "utf8");
const version = fs.readFileSync("src/lib/studio-api-version.ts", "utf8");

test("Client Feedback schema exposes scoped patterns, evidence, confidence, and a Draft-only boundary", () => {
  for (const field of [
    "patternId",
    "projectId",
    "clientScope",
    "patterns",
    "evidence",
    "confidence",
    "createdAt",
  ]) assert.match(schema, new RegExp(`${field}:`));
  for (const type of [
    "STYLE_PREFERENCE",
    "TIMING_PREFERENCE",
    "QUALITY_EXPECTATION",
    "REVISION_PATTERN",
    "APPROVAL_PATTERN",
  ]) assert.match(schema, new RegExp(`"${type}"`));
  assert.match(schema, /crossClientLearning: false/);
  assert.match(schema, /boundary: "PROJECT_MEMORY_DRAFT_ONLY"/);
});

test("Client Insights API is read-only until explicit Project Memory Draft confirmation", () => {
  assert.match(api, /\/client-insights/);
  assert.match(api, /\/confirm/);
  assert.match(api, /JSON\.stringify\(\{ confirm: true \}\)/);
  assert.doesNotMatch(api, /execute|generate|provider|credits|updatePreference|updateProject/);
  assert.match(version, /"client_feedback_intelligence"/);
});

test("Client Review renders historical feedback patterns and evidence with human confirmation", () => {
  for (const label of [
    "Client Insights",
    "historical feedback items",
    "Evidence used",
    "Create Project Memory Draft",
    "Project Memory Draft",
  ]) assert.match(panel, new RegExp(label));
  assert.match(panel, /Each client scope is isolated/);
  assert.match(panel, /No project, preference, Revision, or Credits action occurred/);
  assert.doesNotMatch(panel, />Apply Client Preference<|>Run Revision<|>Execute Client Insight</);
});
