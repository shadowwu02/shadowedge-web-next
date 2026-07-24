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
);

test("Shot Generation Draft schema preserves model, scope, reference, cost, and confidence previews", () => {
  for (const field of [
    "draftId",
    "shotId",
    "prompt",
    "modelSuggestion",
    "references",
    "parameters",
    "estimatedCost",
    "confidence",
    "createdAt",
  ]) {
    assert.match(schema, new RegExp(`${field}:`));
  }
  for (const type of ["CHARACTER", "STYLE", "IMAGE", "VIDEO"]) {
    assert.match(schema, new RegExp(`"${type}"`));
  }
  assert.match(schema, /actionType: "SHOT_GENERATION_DRAFT"/);
  assert.match(schema, /requiresExecutionConfirm: true/);
  assert.match(schema, /executionStarted: false/);
});

test("Shot Generation Draft API uses the exact POST and GET route with Preview then Confirm", () => {
  assert.match(api, /\/api\/shots\/\$\{encodeURIComponent\(shotId\)\}\/generation-draft/);
  assert.match(api, /createStudioShotGenerationDraft/);
  assert.match(api, /getStudioShotGenerationDraft/);
  assert.match(api, /confirmStudioShotGenerationDraft/);
  assert.match(api, /draftId, confirm: true/);
  assert.doesNotMatch(api, /generateVideo|createGenerationJob|submitProvider|deductCredits|billingService/);
});

test("Storyboard UI exposes a controlled Generation Draft Panel without runtime controls", () => {
  for (const label of [
    "Create Generation Draft",
    "Generation Draft Panel",
    "Confirm Generation Draft",
    "Estimated",
    "Reference bindings",
    "separate Execution Confirm",
  ]) {
    assert.match(panel, new RegExp(label, "i"));
  }
  assert.match(panel, /No Job, Provider call, or Credits action occurred/);
  assert.match(panel, /Runtime execution remains unstarted and separately gated/);
  assert.doesNotMatch(panel, /executeNode|runStudioGraph|submitProvider|generateVideo|deductCredits/);
});
