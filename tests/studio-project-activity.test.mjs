import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  PROJECT_ACTIVITY_TYPES,
  PROJECT_NOTIFICATION_TYPES,
} from "../src/features/studio/capabilities/studioProjectActivity.ts";

const schema = fs.readFileSync("src/features/studio/capabilities/studioProjectActivity.ts", "utf8");
const api = fs.readFileSync("src/lib/studio-project-activity-api.ts", "utf8");
const component = fs.readFileSync("src/features/studio/components/StudioCollaborationActivityCenter.tsx", "utf8");
const workspace = fs.readFileSync("src/features/studio/components/StudioWorkspace.tsx", "utf8");
const version = fs.readFileSync("src/lib/studio-api-version.ts", "utf8");

test("Activity and Notification models expose the governed schema", () => {
  assert.equal(PROJECT_ACTIVITY_TYPES.length, 6);
  assert.equal(PROJECT_NOTIFICATION_TYPES.length, 5);
  for (const field of ["activityId", "projectId", "actorId", "action", "resource", "timestamp", "metadata"]) {
    assert.match(schema, new RegExp(field));
  }
  for (const field of ["notificationId", "userId", "type", "read", "createdAt"]) {
    assert.match(schema, new RegExp(field));
  }
});

test("Activity and personal Notification APIs use the required routes", () => {
  assert.match(api, /\/api\/projects\/\$\{encodeURIComponent\(projectId\)\}\/activity/);
  assert.match(api, /"\/api\/notifications"/);
  assert.match(api, /\/api\/notifications\/\$\{encodeURIComponent\(notificationId\)\}\/read/);
  assert.match(version, /collaboration_activity/);
});

test("Studio renders Activity Timeline, Notification Center, actors, time, and action state", () => {
  assert.match(workspace, /StudioCollaborationActivityCenter/);
  assert.match(component, /Activity Timeline/);
  assert.match(component, /Notification Center/);
  assert.match(component, /actorId/);
  assert.match(component, /Mark read/);
  assert.match(component, /Action may be required/);
});

test("Collaboration Center has awareness-only boundaries", () => {
  assert.match(component, /Awareness only/);
  assert.match(component, /never authorize, execute, modify the project, trigger Workflow, or deduct Credits/);
  assert.doesNotMatch(`${schema}\n${api}`, /executeNode|submitProvider|createJob|startQueue|deductCredits|chargeCredits/);
});
