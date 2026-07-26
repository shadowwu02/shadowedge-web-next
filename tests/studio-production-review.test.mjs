import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const schema = fs.readFileSync(
  "src/features/studio/capabilities/studioProductionReview.ts",
  "utf8",
);
const api = fs.readFileSync(
  "src/lib/studio-production-review-api.ts",
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

test("Production Review and Shot Review schemas preserve result-only references", () => {
  for (const field of [
    "reviewId",
    "productionRunId",
    "results",
    "qualityChecks",
    "status",
    "createdAt",
    "shotId",
    "resultRef",
    "quality",
    "issues",
    "decision",
  ]) {
    assert.match(schema, new RegExp(`${field}:`));
  }
  for (const status of ["PENDING", "IN_REVIEW", "APPROVED", "REJECTED"]) {
    assert.match(schema, new RegExp(`"${status}"`));
  }
  assert.match(schema, /automaticPublish: false/);
  assert.match(schema, /assetReplacement: false/);
  assert.match(schema, /timelineMutation: false/);
});

test("Production Review API reads a session and requires explicit approve confirmation", () => {
  assert.match(api, /\/api\/projects\/\$\{encodeURIComponent\(projectId\)\}\/production-review/);
  assert.match(api, /\/approve/);
  assert.match(api, /method: "POST"/);
  assert.match(api, /JSON\.stringify\(\{ confirm: true \}\)/);
  assert.doesNotMatch(api, /publish|replaceAsset|regenerate|execute|deductCredits/);
});

test("Production Review Workspace renders Shot Grid, Quality Gate, Issues, and Human Approval", () => {
  for (const label of [
    "Production Review Workspace",
    "Quality Gate",
    "Shot Review Grid",
    "Quality",
    "Confidence",
    "Timeline",
    "Output",
    "Asset",
    "Confirm Production Review",
  ]) {
    assert.match(panel, new RegExp(label));
  }
  assert.match(panel, /REVIEW_SUGGESTION/);
  assert.match(panel, /Preview → Human Confirm/);
  assert.match(panel, /No publish, Asset replacement, regeneration, Timeline mutation, or Credits action/);
  assert.match(styles, /\.studio-production-review-grid/);
  assert.match(styles, /\.studio-production-review-gates/);
});

test("Review UI has no publication, asset replacement, regeneration, or Runtime control", () => {
  assert.doesNotMatch(panel, />Publish</);
  assert.doesNotMatch(panel, />Replace Asset</);
  assert.doesNotMatch(panel, />Regenerate</);
  assert.doesNotMatch(panel, />Retry Review</);
  assert.doesNotMatch(panel, />Execute Review</);
});
