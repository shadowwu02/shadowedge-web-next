import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const schema = fs.readFileSync(
  "src/features/studio/capabilities/studioProductionRuntime.ts",
  "utf8",
);
const api = fs.readFileSync(
  "src/lib/studio-production-runtime-api.ts",
  "utf8",
);
const panel = fs.readFileSync(
  "src/features/studio/components/StudioStoryboardPanel.tsx",
  "utf8",
) + fs.readFileSync("src/i18n/productPhase2Dictionary.ts", "utf8");

test("Production Runtime Handoff and Tracking schemas expose existing Runtime mapping", () => {
  for (const field of [
    "handoffId",
    "approvalId",
    "executionPlanId",
    "runtimeNodes",
    "createdAt",
    "trackingId",
    "steps",
    "status",
    "progress",
    "updatedAt",
  ]) {
    assert.match(schema, new RegExp(`${field}:`));
  }
  for (const status of ["PENDING", "READY", "EXECUTING", "COMPLETED", "FAILED"]) {
    assert.match(schema, new RegExp(`"${status}"`));
  }
  assert.match(schema, /usesExistingRuntime: true/);
  assert.match(schema, /runtimeControl: false/);
  assert.match(schema, /autoRetry: false/);
});

test("Production status client is authenticated GET-only tracking", () => {
  assert.match(api, /\/api\/projects\/\$\{encodeURIComponent\(projectId\)\}\/production-run\/status/);
  assert.doesNotMatch(api, /method:\s*"POST"|startExecution|executeNode|submitProvider|deductCredits/);
});

test("Production Run Monitor renders Wave, Shot, Agent, Progress, and existing Result references", () => {
  for (const label of [
    "Production Run Monitor",
    "Current Wave",
    "Shot Status",
    "Agent Status",
    "Progress",
    "Timeline Clip",
    "Asset",
    "Output",
  ]) {
    assert.match(panel, new RegExp(label));
  }
  assert.match(panel, /Existing Execution Runtime · read-only tracking/);
  assert.match(panel, /No Retry, Runtime control, Provider call, or Credits action is available here/);
  assert.doesNotMatch(panel, /Start Production|Execute Production|Retry Shot|Cancel Runtime/);
});
