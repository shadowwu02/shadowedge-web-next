import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  STUDIO_CANVAS_LEARNING_SIGNALS,
} from "../src/features/studio/capabilities/studioCreativeCanvasDecision.ts";

const schema = fs.readFileSync(
  "src/features/studio/capabilities/studioCreativeCanvasDecision.ts",
  "utf8",
);
const api = fs.readFileSync(
  "src/lib/studio-creative-canvas-decision-api.ts",
  "utf8",
);
const component = fs.readFileSync(
  "src/features/studio/components/StudioCreativeCanvas.tsx",
  "utf8",
) + fs.readFileSync("src/i18n/dictionary.ts", "utf8");
const version = fs.readFileSync("src/lib/studio-api-version.ts", "utf8");

test("Canvas Decision schema covers source Draft, options, selected option, reason, and outcome", () => {
  assert.match(schema, /StudioCanvasDecisionRecord/);
  assert.match(schema, /sourceDraft/);
  assert.match(schema, /selectedOption/);
  assert.match(schema, /StudioCanvasDecisionOutcome/);
  assert.deepEqual(STUDIO_CANVAS_LEARNING_SIGNALS, [
    "QUALITY_FIRST_PATTERN",
    "COST_OPTIMIZATION_PATTERN",
    "SPEED_PRIORITY_PATTERN",
    "RISK_AVOIDANCE_PATTERN",
  ]);
});

test("Decision APIs use exact project-scoped routes", () => {
  assert.match(api, /\/creative-canvas`/);
  assert.match(api, /\/decision-history/);
  assert.match(api, /\/decision`/);
  assert.match(api, /recordStudioCreativeCanvasDecision/);
  assert.match(api, /bindStudioCreativeCanvasDecisionOutcome/);
  assert.match(version, /creative_canvas_decision_learning/);
});

test("Canvas exposes explicit human choice and Decision History", () => {
  assert.match(component, /Record your choice/);
  assert.match(component, /Select Draft/);
  assert.match(component, /Keep current/);
  assert.match(component, /Decision History/);
  assert.match(component, /Outcome pending/);
  assert.match(component, /future suggestions only/);
});

test("Decision UI preserves the Draft and execution boundary", () => {
  assert.match(component, /does not confirm or apply the Draft/);
  assert.match(component, /Preferences and the production Canvas remain unchanged/);
  assert.match(component, /No cross-user learning/);
  assert.doesNotMatch(
    `${api}\n${schema}`,
    /executeNode|generateVideo|submitProvider|deductCredits|chargeCredits|startQueue|updatePreference/,
  );
});
