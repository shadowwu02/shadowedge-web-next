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
const canvas = fs.readFileSync(
  "src/features/studio/components/StudioCanvas.tsx",
  "utf8",
);
const workspace = fs.readFileSync(
  "src/features/studio/components/StudioWorkspace.tsx",
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

test("new-tab recovery waits for auth, project graph, and Canvas capability readiness", () => {
  assert.match(workspace, /StudioCanvas authReady=\{!authLoading && isSignedIn\}/);
  assert.match(canvas, /StudioCreativeCanvas authReady=\{authReady\} projectId=\{projectId\}/);
  assert.match(component, /if \(!projectId \|\| !authReady\) return/);
  assert.match(
    component,
    /if \(!authReady \|\| !projectId \|\| loadState\.projectId !== projectId \|\| !loadState\.graph\) return/,
  );
  assert.match(component, /if \(availability !== "READY"\)/);
});

test("recovery uses bounded transport retry without repeating Draft creation", () => {
  const recoveryEffectStart = component.indexOf("void recoverStudioCreativeCanvasDraft");
  const recoveryEffectEnd = component.indexOf("return () =>", recoveryEffectStart);
  const recoveryEffect = component.slice(recoveryEffectStart, recoveryEffectEnd);
  assert.match(component, /recoverStudioCreativeCanvasDraft/);
  assert.match(recovery, /maxAttempts \?\? 3/);
  assert.match(recovery, /reason instanceof ApiError && reason\.kind === "network"/);
  assert.match(recovery, /timeoutMs \?\? 8_000/);
  assert.match(recoveryEffect, /getStudioCreativeCanvasPlan/);
  assert.match(recoveryEffect, /getStudioCreativeCanvasOptimization/);
  assert.match(recoveryEffect, /getStudioCreativeCanvasEditSession/);
  assert.doesNotMatch(recoveryEffect, /createStudioCreativeCanvasPlan\(/);
});
