import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const schema = fs.readFileSync(
  "src/features/studio/capabilities/studioClientReview.ts",
  "utf8",
);
const api = fs.readFileSync(
  "src/lib/studio-client-review-api.ts",
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

test("Client Review, Comment, and Revision Draft schemas expose append-only collaboration state", () => {
  for (const field of [
    "reviewSessionId",
    "deliveryPackageId",
    "comments",
    "status",
    "createdAt",
    "commentId",
    "timestamp",
    "targetRef",
    "content",
    "revisionId",
    "deliveryVersion",
    "impact",
  ]) {
    assert.match(schema, new RegExp(`${field}:`));
  }
  for (const status of ["OPEN", "RESOLVED", "ARCHIVED"]) {
    assert.match(schema, new RegExp(`"${status}"`));
  }
  assert.match(schema, /revisionPreviewThenConfirm: true/);
  assert.match(schema, /workflowImpact: "NEW_WORKFLOW_DRAFT_ONLY"/);
});

test("Client Review API supports Session, Comment, Revision Preview, and explicit Confirm", () => {
  assert.match(api, /\/review-session/);
  assert.match(api, /deliveryPackageId=\$\{encodeURIComponent\(deliveryPackageId\)\}/);
  assert.match(api, /\/review-comment/);
  assert.match(api, /\/revision-draft/);
  assert.match(api, /\/confirm/);
  assert.match(api, /JSON\.stringify\(\{ deliveryPackageId, confirm: true \}\)/);
  assert.doesNotMatch(api, /modifyOutput|regenerate|publishVersion|executeWorkflow|deductCredits/);
});

test("Client Review Workspace renders Video Preview, Timeline Comment, Feedback, and Revision Draft", () => {
  for (const label of [
    "Client Review Workspace",
    "Delivery Version",
    "Video Preview",
    "Timeline Comment",
    "Feedback",
    "Review Feedback",
    "Revision Draft",
    "Add Review Comment",
    "Preview Revision Draft",
    "Confirm Revision Draft",
    "New Workflow Draft",
  ]) {
    assert.match(panel, new RegExp(label));
  }
  assert.match(panel, /Current Workflow and Delivery remain unchanged/);
  assert.match(panel, /Comments and Revision Drafts only/);
  assert.match(styles, /\.studio-client-review/);
  assert.match(styles, /\.studio-client-review-comment-form/);
});

test("Client Review UI has no Output mutation, regeneration, publish, execution, or Credits control", () => {
  assert.doesNotMatch(panel, />Replace Output</);
  assert.doesNotMatch(panel, />Regenerate</);
  assert.doesNotMatch(panel, />Publish Version</);
  assert.doesNotMatch(panel, />Execute Workflow</);
  assert.doesNotMatch(panel, />Run Revision</);
  assert.match(panel, /It was not confirmed, executed, generated, or charged/);
});
