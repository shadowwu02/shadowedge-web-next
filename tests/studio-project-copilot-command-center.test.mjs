import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const schema = fs.readFileSync("src/features/studio/capabilities/studioProjectCopilotCenter.ts", "utf8");
const api = fs.readFileSync("src/lib/studio-project-copilot-center-api.ts", "utf8");
const center = fs.readFileSync("src/features/studio/components/StudioProjectCopilotCommandCenter.tsx", "utf8");
const workspace = fs.readFileSync("src/features/studio/components/StudioWorkspace.tsx", "utf8");
const projectCopilot = fs.readFileSync("src/features/studio/capabilities/studioProjectCopilot.ts", "utf8");
const styles = fs.readFileSync("src/features/studio/studio.css", "utf8");

test("Project Copilot Snapshot covers health, insights, risks, recommendations and evidence", () => {
  for (const field of ["projectId", "health", "insights", "risks", "recommendations", "updatedAt"]) {
    assert.match(schema, new RegExp(`${field}:`));
  }
  for (const type of ["QUALITY_ACTION", "COST_ACTION", "WORKFLOW_ACTION", "REVISION_ACTION", "DELIVERY_ACTION"]) {
    assert.match(schema, new RegExp(`"${type}"`));
  }
  assert.match(schema, /evidence: readonly StudioProjectRecommendationEvidence\[\]/);
  assert.match(schema, /actionType: "PROJECT_ACTION_DRAFT"/);
});

test("Copilot Center API preserves GET, Preview and explicit Confirm boundaries", () => {
  assert.match(api, /\/copilot-center`/);
  assert.match(api, /\/copilot-center\/actions\/\$\{encodeURIComponent\(recommendationId\)\}\/preview/);
  assert.match(api, /\/copilot-center\/actions\/\$\{encodeURIComponent\(recommendationId\)\}\/confirm/);
  assert.match(api, /JSON\.stringify\(\{ confirm: true \}\)/);
  assert.doesNotMatch(api, /execute|generate|publish|deductCredits|provider/i);
});

test("Project Copilot Center renders localized health, risks, evidence, confidence and recommendations", () => {
  for (const key of [
    "studio.command.title",
    "studio.command.health",
    "studio.command.riskRadar",
    "studio.command.insightTitle",
    "studio.command.recommendations",
    "studio.command.flowPreview",
    "studio.command.previewTitle",
  ]) {
    assert.match(center, new RegExp(key.replaceAll(".", "\\.")));
  }
  assert.match(center, /useI18n\(\)/);
  assert.match(workspace, /<StudioProjectCopilotCommandCenter \/>/);
  assert.match(styles, /\.studio-project-command-center/);
  assert.match(styles, /\.studio-project-command-recommendations/);
});

test("PROJECT_ACTION_DRAFT is shared with the existing Draft System and cannot execute", () => {
  assert.match(projectCopilot, /"PROJECT_ACTION_DRAFT"/);
  assert.match(center, /studio\.command\.boundary\.drafts/);
  assert.match(center, /studio\.command\.boundary\.mutation/);
  assert.match(center, /studio\.command\.boundary\.execution/);
  assert.doesNotMatch(center, />Execute</);
  assert.doesNotMatch(center, />Generate</);
  assert.doesNotMatch(center, />Publish</);
  assert.doesNotMatch(center, />Charge</);
});
