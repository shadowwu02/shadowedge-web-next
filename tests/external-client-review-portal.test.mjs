import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const schema = fs.readFileSync("src/features/studio/capabilities/externalClientReview.ts", "utf8");
const api = fs.readFileSync("src/lib/external-client-review-api.ts", "utf8");
const portal = fs.readFileSync("src/features/client-review/ExternalClientReviewPortal.tsx", "utf8");
const page = fs.readFileSync("src/app/client/review/[token]/page.tsx", "utf8");
const studioApi = fs.readFileSync("src/lib/studio-client-review-api.ts", "utf8");
const studioPanel = fs.readFileSync("src/features/studio/components/StudioStoryboardPanel.tsx", "utf8");
const maintenance = fs.readFileSync("src/components/maintenance/MaintenanceGate.tsx", "utf8");

test("External Review contract exposes only Delivery preview, public comments, and decisions", () => {
  for (const field of [
    "deliveryPackageId",
    "permissions",
    "expiresAt",
    "outputs",
    "timeline",
    "comments",
    "decisions",
  ]) assert.match(schema, new RegExp(`${field}:`));
  for (const boundary of [
    "studioDataExposed: false",
    "agentDataExposed: false",
    "workflowDataExposed: false",
    "canvasDataExposed: false",
    "executionDataExposed: false",
    "costDataExposed: false",
    "creditsExposed: false",
  ]) assert.match(schema, new RegExp(boundary));
  assert.doesNotMatch(schema, /executionPlanId|providerNativeId|shadowCredits|assetRef|outputRef/);
});

test("Studio creates a scoped seven-day link through the approval-protected API", () => {
  assert.match(studioApi, /\/client-review-link/);
  assert.match(studioPanel, /Create 7-day Review Link/);
  assert.match(studioPanel, /VIEW", "COMMENT", "APPROVE", "REQUEST_REVISION"/);
  assert.match(studioPanel, /token is shown once/);
  assert.match(studioPanel, /Delivery scope only/);
});

test("External portal supports View, Comment, Approve, and Request Revision without Studio controls", () => {
  assert.match(page, /ExternalClientReviewPortal/);
  assert.match(page, /index: false/);
  assert.match(page, /referrer: "no-referrer"/);
  assert.match(api, /\/api\/client\/review\//);
  assert.match(api, /token: ""/);
  for (const label of [
    "ShadowEdge Client Review",
    "Timeline feedback",
    "Add comment",
    "Approve delivery",
    "Request revision",
  ]) assert.match(portal, new RegExp(label));
  assert.doesNotMatch(portal, />Execute Workflow<|>Generate Video<|>Open Canvas Editor<|>Deduct Credits<|>Change Cost</);
});

test("External Review bypasses the Studio maintenance redirect but remains token protected by its API", () => {
  assert.match(maintenance, /"\/client\/review"/);
  assert.match(portal, /getExternalClientReview\(token/);
  assert.match(portal, /Review link is unavailable/);
});
