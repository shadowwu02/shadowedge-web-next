import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const schemaSource = fs.readFileSync(
  new URL("../src/features/studio/capabilities/studioCreativeCanvasPlanning.ts", import.meta.url),
  "utf8",
);
const apiSource = fs.readFileSync(
  new URL("../src/lib/studio-creative-canvas-planning-api.ts", import.meta.url),
  "utf8",
);
const componentSource = fs.readFileSync(
  new URL("../src/features/studio/components/StudioCreativeCanvas.tsx", import.meta.url),
  "utf8",
);
const versionSource = fs.readFileSync(
  new URL("../src/lib/studio-api-version.ts", import.meta.url),
  "utf8",
);
const actionCenterSource = fs.readFileSync(
  new URL("../src/features/studio/capabilities/studioProjectCopilot.ts", import.meta.url),
  "utf8",
);

test("Canvas Planning contracts expose Request, Draft, Evidence, and Confidence", () => {
  assert.match(schemaSource, /StudioCanvasPlanningRequest/);
  assert.match(schemaSource, /StudioAIPlannedCanvasDraft/);
  assert.match(schemaSource, /StudioCanvasPlanningEvidence/);
  assert.match(schemaSource, /"HIGH" \| "MEDIUM" \| "LOW"/);
  for (const intent of [
    "CREATE_VIDEO",
    "EDIT_VIDEO",
    "TRANSFER_MOTION",
    "CREATE_CHARACTER",
    "CAMERA_EFFECT",
    "UNKNOWN",
  ]) {
    assert.match(schemaSource, new RegExp(`"${intent}"`));
  }
});

test("Canvas Auto Planning uses exact authenticated project APIs", () => {
  assert.match(apiSource, /\/creative-canvas\/plan/);
  assert.match(apiSource, /\/status/);
  assert.match(apiSource, /method: "POST"/);
  assert.match(apiSource, /getStudioCreativeCanvasPlan/);
  assert.match(apiSource, /pollStudioCreativeCanvasPlan/);
  assert.match(apiSource, /PLAN_POLL_MAX_ATTEMPTS/);
  assert.match(versionSource, /"creative_canvas_auto_planning"/);
});

test("Create with Copilot renders Prompt, Explanation, Evidence, Confidence, and Diff Review", () => {
  assert.match(componentSource, /studio\.creativeCanvas\.createWithCopilot/);
  assert.match(componentSource, /studio\.creativeCanvas\.prompt\.placeholder/);
  assert.match(componentSource, /studio\.creativeCanvas\.plan\.reasoning/);
  assert.match(componentSource, /studio\.creativeCanvas\.plan\.evidence/);
  assert.match(componentSource, /studio\.common\.confidence/);
  assert.match(componentSource, /AI Canvas Draft is ready for Diff Review and human confirmation/);
  assert.match(componentSource, /CANVAS_AUTO_PLAN_DRAFT/);
  assert.match(actionCenterSource, /CANVAS_AUTO_PLAN_DRAFT/);
});

test("AI planning delegates to the existing Edit Session human-confirm boundary", () => {
  assert.match(schemaSource, /confirmationTarget: "CREATIVE_CANVAS_EDIT_SESSION"/);
  assert.match(componentSource, /setSession\(value\.editSession\)/);
  assert.match(componentSource, /confirmStudioCreativeCanvasEditSession/);
  assert.match(componentSource, /studio\.creativeCanvas\.plan\.boundary/);
  assert.doesNotMatch(
    apiSource + componentSource,
    /executeNode|generateVideo|submitProvider|deductCredits|chargeCredits|startQueue/,
  );
});
