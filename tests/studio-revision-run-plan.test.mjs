import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const schema = fs.readFileSync(
  "src/features/studio/capabilities/studioRevisionRunPlan.ts",
  "utf8",
);
const api = fs.readFileSync(
  "src/lib/studio-revision-run-plan-api.ts",
  "utf8",
);
const panel = fs.readFileSync(
  "src/features/studio/components/StudioStoryboardPanel.tsx",
  "utf8",
);
const styles = fs.readFileSync(
  "src/features/studio/studio.css",
  "utf8",
);

test("Revision Run Plan schema exposes scope, impact, cost, risk, and version loop", () => {
  for (const field of [
    "revisionRunId",
    "proposalId",
    "affectedShots",
    "preservedShots",
    "estimatedCost",
    "riskFlags",
    "createdAt",
    "revisionScope",
    "impact",
    "versionPlan",
  ]) {
    assert.match(schema, new RegExp(`${field}:`));
  }
  for (const scope of [
    "MODIFY_SHOT",
    "ADD_SHOT",
    "REMOVE_SHOT",
    "UPDATE_ASSET",
    "UPDATE_AUDIO",
    "UPDATE_TIMING",
  ]) {
    assert.match(schema, new RegExp(`"${scope}"`));
  }
  assert.match(schema, /sourceDeliveryMutation: false/);
  assert.match(schema, /creditsDeducted: false/);
});

test("Revision Run Plan API supports create, read, and explicit confirmation", () => {
  assert.match(api, /\/revision-run-plan\?deliveryPackageId=/);
  assert.match(api, /method: "POST"/);
  assert.match(api, /JSON\.stringify\(\{ revisionRunId, deliveryPackageId, confirm: true \}\)/);
  assert.doesNotMatch(api, /execute|generate|publish|deductCredits|provider/i);
});

test("Client Review renders Revision Planner scope, impact, cost, and next version", () => {
  for (const label of [
    "Revision Planner",
    "Plan Revision Run",
    "Modified Shots",
    "Preserved Content",
    "Timeline Impact",
    "Asset Impact",
    "Estimated Cost",
    "Cost Confidence",
    "Confirm Revision Plan",
    "Delivery Version Loop",
  ]) {
    assert.match(panel, new RegExp(label));
  }
  assert.match(panel, /Feedback → Revision Plan → New Version/);
  assert.match(panel, /Delivery \{activeRevisionRunPlan\.versionPlan\.sourceVersion\}/);
  assert.match(panel, /Delivery \{activeRevisionRunPlan\.versionPlan\.targetVersion\}/);
  assert.match(styles, /\.studio-revision-planner/);
  assert.match(styles, /\.studio-revision-version-loop/);
});

test("Revision Planner preserves delivered versions and never starts production", () => {
  assert.match(panel, /Source Delivery is immutable/);
  assert.match(panel, /New Delivery version remains planned, not created or published/);
  assert.match(panel, /no automatic execution, generation, publish, or Credits deduction/);
  assert.doesNotMatch(panel, />Execute Revision</);
  assert.doesNotMatch(panel, />Generate Revision</);
  assert.doesNotMatch(panel, />Publish Revision</);
  assert.doesNotMatch(panel, />Charge Revision</);
});
