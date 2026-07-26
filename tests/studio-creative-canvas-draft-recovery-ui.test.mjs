import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const component = fs.readFileSync(
  "src/features/studio/components/StudioCreativeCanvas.tsx",
  "utf8",
);
const recovery = fs.readFileSync(
  "src/lib/studio-creative-canvas-draft-recovery.ts",
  "utf8",
);

test("Studio restores the active project Draft through the existing read APIs", () => {
  assert.match(component, /getActiveStudioCreativeCanvasDraft\(projectId\)/);
  assert.match(component, /getStudioCreativeCanvasPlan/);
  assert.match(component, /getStudioCreativeCanvasOptimization/);
  assert.match(component, /getStudioCreativeCanvasEditSession/);
  assert.match(component, /setMode\("EDIT_DRAFT"\)/);
  assert.match(component, /DRAFT RESTORED/);
});

test("Draft recovery metadata includes the required stable fields", () => {
  for (const field of ["draftId", "projectId", "graphVersion", "createdAt"]) {
    assert.match(recovery, new RegExp(`${field}: string`));
  }
  assert.match(recovery, /status: StudioCreativeCanvasEditStatus/);
  assert.match(recovery, /shadowedge_studio_creative_canvas_active_drafts_v1/);
  assert.match(component, /window\.addEventListener\("storage"/);
});

test("Recovered Preview renders Diff, Evidence, Confidence, and confirmation state", () => {
  assert.match(component, /aria-label="Recovered Canvas Draft"/);
  assert.match(component, /Changes <b>/);
  assert.match(component, /Evidence <b>/);
  assert.match(component, /Confidence <b>/);
  assert.match(component, /Confirm <b>/);
  assert.match(component, /aria-label="Canvas Graph Diff"/);
});

test("terminal Draft states cannot cross the human confirmation boundary", () => {
  assert.match(component, /!\["DRAFT", "REVIEW"\]\.includes\(session\.status\)/);
  assert.match(component, /session\.status === "REJECTED" \|\| session\.status === "EXPIRED"/);
  assert.match(component, /cannot be confirmed/);
  assert.doesNotMatch(
    recovery + component,
    /executeNode|generateVideo|submitProvider|deductCredits|chargeCredits|startQueue|createJob/,
  );
});
