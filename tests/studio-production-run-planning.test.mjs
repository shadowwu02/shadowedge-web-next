import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const schema = fs.readFileSync(
  "src/features/studio/capabilities/studioProductionRunPlan.ts",
  "utf8",
);
const api = fs.readFileSync(
  "src/lib/studio-production-run-plan-api.ts",
  "utf8",
);
const panel = fs.readFileSync(
  "src/features/studio/components/StudioStoryboardPanel.tsx",
  "utf8",
);

test("Production Run Plan and Production Step schemas expose the complete project preview", () => {
  for (const field of [
    "runId",
    "projectId",
    "scenes",
    "shots",
    "agentPlan",
    "estimatedCost",
    "riskFlags",
    "checkpoints",
    "createdAt",
    "stepId",
    "sceneId",
    "shotId",
    "agent",
    "dependencies",
    "status",
  ]) {
    assert.match(schema, new RegExp(`${field}:`));
  }
  for (const dependency of [
    "SCENE_SEQUENCE",
    "SHOT_SEQUENCE",
    "SHARED_REFERENCE",
    "QUALITY_CHECKPOINT",
  ]) {
    assert.match(schema, new RegExp(`"${dependency}"`));
  }
  assert.match(schema, /actionType: "PRODUCTION_RUN_PLAN_DRAFT"/);
  assert.match(schema, /requiresExecutionApproval: true/);
  assert.match(schema, /queueStarted: false/);
  assert.match(schema, /jobsCreated: 0/);
});

test("Production Planning API uses the exact project route and Preview then Confirm", () => {
  assert.match(api, /\/api\/projects\/\$\{encodeURIComponent\(projectId\)\}\/production-run-plan/);
  assert.match(api, /createStudioProductionRunPlan/);
  assert.match(api, /getStudioProductionRunPlan/);
  assert.match(api, /confirmStudioProductionRunPlan/);
  assert.match(api, /runId, confirm: true/);
  assert.doesNotMatch(api, /startQueue|createGenerationJob|submitProvider|deductCredits|billingService/);
});

test("Production Run Planner renders Scene, Shot, Agent, Credits, dependency, checkpoint, and risk summaries", () => {
  for (const label of [
    "Production Run Planner",
    "Scenes",
    "Shots",
    "Agents",
    "Quality Checkpoints",
    "Credits",
    "Cost Confidence",
    "Unknown Cost",
    "Production Scene sequence",
    "Production Steps",
    "Confirm Production Draft",
  ]) {
    assert.match(panel, new RegExp(label));
  }
  assert.match(panel, /No Job, Queue, Provider call, Generate, or Credits action occurred/);
  assert.match(panel, /Existing Execution Approval remains mandatory/);
  assert.match(panel, /Confirmation blocked until all Scenes, Shots, Agent planning, and cost evidence are ready/);
  assert.doesNotMatch(panel, /startQueue|executeBatch|submitProvider|generateVideo|deductCredits/);
});
