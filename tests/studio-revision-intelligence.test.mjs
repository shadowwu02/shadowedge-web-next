import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const schema = fs.readFileSync(
  "src/features/studio/capabilities/studioRevisionIntelligence.ts",
  "utf8",
);
const api = fs.readFileSync(
  "src/lib/studio-revision-intelligence-api.ts",
  "utf8",
);
const panel = fs.readFileSync(
  "src/features/studio/components/StudioStoryboardPanel.tsx",
  "utf8",
) + fs.readFileSync("src/i18n/productPhase2Dictionary.ts", "utf8");
const styles = fs.readFileSync(
  "src/features/studio/studio.css",
  "utf8",
);

test("Feedback Intent and Revision Proposal schemas expose controlled revision analysis", () => {
  for (const field of [
    "intentId",
    "commentId",
    "type",
    "affectedRefs",
    "confidence",
    "proposalId",
    "feedbackIntent",
    "affectedShots",
    "recommendedChanges",
    "createdAt",
  ]) {
    assert.match(schema, new RegExp(`${field}:`));
  }
  for (const type of [
    "STYLE_CHANGE",
    "CHARACTER_CHANGE",
    "CAMERA_CHANGE",
    "TIMING_CHANGE",
    "AUDIO_CHANGE",
    "CONTENT_CHANGE",
    "QUALITY_FIX",
  ]) {
    assert.match(schema, new RegExp(`"${type}"`));
  }
  assert.match(schema, /workflowDraftOnly: true/);
  assert.match(schema, /automaticExecution: false/);
});

test("Revision Intelligence API loads proposals and requires explicit Confirm", () => {
  assert.match(api, /\/revision-proposals\?deliveryPackageId=/);
  assert.match(api, /\/revision-proposals\/\$\{encodeURIComponent\(proposalId\)\}\/confirm/);
  assert.match(api, /JSON\.stringify\(\{ deliveryPackageId, confirm: true \}\)/);
  assert.doesNotMatch(api, /generate|executeWorkflow|publish|deductCredits|provider/i);
});

test("Client Review renders original feedback, understood intent, scope, and confidence", () => {
  for (const label of [
    "AI Revision Suggestion",
    "Original Comment",
    "Understood Intent",
    "Modification Scope",
    "CONFIDENCE",
    "Confirm AI Revision Draft",
    "New Workflow Draft only",
  ]) {
    assert.match(panel, new RegExp(label));
  }
  assert.match(panel, /Feedback → Intent → Proposal/);
  assert.match(styles, /\.studio-revision-intelligence/);
});

test("Revision Proposal remains Preview then Confirm and cannot execute or mutate results", () => {
  assert.match(panel, /not executed, generated, published, or charged/);
  assert.match(panel, /no result mutation, generation, execution, publish, or Credits action/);
  assert.doesNotMatch(panel, />Run Revision</);
  assert.doesNotMatch(panel, />Generate Revision</);
  assert.doesNotMatch(panel, />Publish Revision</);
  assert.doesNotMatch(panel, />Replace Output</);
});
