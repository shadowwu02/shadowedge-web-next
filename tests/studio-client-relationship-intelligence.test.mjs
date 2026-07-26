import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const schema = fs.readFileSync(
  "src/features/studio/capabilities/studioClientRelationshipIntelligence.ts",
  "utf8",
);
const api = fs.readFileSync(
  "src/lib/studio-client-relationship-intelligence-api.ts",
  "utf8",
);
const panel = fs.readFileSync(
  "src/features/studio/components/StudioStoryboardPanel.tsx",
  "utf8",
) + fs.readFileSync("src/i18n/productPhase2Dictionary.ts", "utf8");
const reviewSchema = fs.readFileSync(
  "src/features/studio/capabilities/studioClientReview.ts",
  "utf8",
);
const reviewApi = fs.readFileSync("src/lib/studio-client-review-api.ts", "utf8");
const version = fs.readFileSync("src/lib/studio-api-version.ts", "utf8");

test("Client Relationship Snapshot exposes qualified history, preferences, success, and metrics", () => {
  for (const field of [
    "clientScope",
    "projects",
    "history",
    "preferences",
    "successPatterns",
    "confidence",
    "createdAt",
  ]) assert.match(schema, new RegExp(`${field}:`));
  for (const metric of [
    "PROJECT_COUNT",
    "APPROVAL_SPEED",
    "REVISION_RATE",
    "QUALITY_SCORE",
    "DELIVERY_HISTORY",
    "COLLABORATION_PATTERN",
  ]) assert.match(schema, new RegExp(`"${metric}"`));
  assert.match(schema, /crossClientLearning: false/);
  assert.match(schema, /automaticClientProfileMutation: false/);
});

test("Client scope can only be explicitly reused through a scoped Review Link", () => {
  assert.match(reviewSchema, /clientScope: string/);
  assert.match(reviewApi, /clientScope\?: string/);
  assert.match(version, /"client_relationship_intelligence"/);
});

test("Client Relationship API uses authenticated read and explicit Draft confirmation", () => {
  assert.match(api, /\/api\/client\/\$\{encodeURIComponent\(clientScope\)\}\/intelligence/);
  assert.match(api, /\/recommendations\/\$\{encodeURIComponent\(recommendationId\)\}\/confirm/);
  assert.match(api, /JSON\.stringify\(\{ confirm: true \}\)/);
  assert.doesNotMatch(api, /sendMessage|updateClient|updateProject|executeWorkflow|deductCredits/);
});

test("Client Relationship Center shows history, patterns, preferences, risks, and Draft boundary", () => {
  for (const label of [
    "Client Relationship Center",
    "Historical Projects",
    "Qualified Preferences",
    "Success Patterns",
    "Future Recommendations",
    "Create Relationship Draft",
  ]) assert.match(panel, new RegExp(label));
  assert.match(panel, /Current user and explicit client scope only/);
  assert.match(panel, /No client profile, message, project, Workflow, or Credits action occurred/);
  assert.doesNotMatch(panel, />Send Client Message<|>Apply Client Profile<|>Execute Recommendation</);
});
