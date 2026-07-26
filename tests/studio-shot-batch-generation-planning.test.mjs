import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const schema = fs.readFileSync(
  "src/features/studio/capabilities/studioStoryboard.ts",
  "utf8",
);
const api = fs.readFileSync("src/lib/studio-storyboard-api.ts", "utf8");
const panel = fs.readFileSync(
  "src/features/studio/components/StudioStoryboardPanel.tsx",
  "utf8",
) + fs.readFileSync("src/i18n/productPhase2Dictionary.ts", "utf8");

test("Batch Generation Plan and Shot Item schemas expose planning, cost, dependency, and risk data", () => {
  for (const field of [
    "batchPlanId",
    "sceneId",
    "shots",
    "models",
    "estimatedCost",
    "dependencies",
    "riskFlags",
    "createdAt",
    "generationDraftId",
    "model",
    "status",
  ]) {
    assert.match(schema, new RegExp(`${field}:`));
  }
  for (const dependency of ["INDEPENDENT", "SEQUENTIAL", "SHARED_REFERENCE"]) {
    assert.match(schema, new RegExp(`"${dependency}"`));
  }
  assert.match(schema, /actionType: "BATCH_GENERATION_PLAN_DRAFT"/);
  assert.match(schema, /queueStarted: false/);
  assert.match(schema, /jobsCreated: 0/);
});

test("Batch Planning API uses the exact Scene route and preserves Preview then Confirm", () => {
  assert.match(api, /\/api\/scenes\/\$\{encodeURIComponent\(sceneId\)\}\/batch-generation-plan/);
  assert.match(api, /createStudioShotBatchGenerationPlan/);
  assert.match(api, /getStudioShotBatchGenerationPlan/);
  assert.match(api, /confirmStudioShotBatchGenerationPlan/);
  assert.match(api, /batchPlanId, confirm: true/);
  assert.doesNotMatch(api, /startQueue|createGenerationJob|submitProvider|deductCredits|billingService/);
});

test("Storyboard Batch Planning renders Shots, Models, Cost, dependencies, and risks", () => {
  for (const label of [
    "Batch Generation Planning",
    "Total Credits Estimate",
    "Cost Confidence",
    "Unknown Cost",
    "Models",
    "Batch dependencies",
    "Confirm Batch Plan Draft",
  ]) {
    assert.match(panel, new RegExp(label));
  }
  assert.match(panel, /No Queue, Job, Provider call, or Credits action occurred/);
  assert.match(panel, /Execution Confirm is still required/);
  assert.match(panel, /Confirmation blocked until every Shot has an allowed model and known cost/);
  assert.doesNotMatch(panel, /startQueue|executeBatch|submitProvider|generateVideo|deductCredits/);
});
