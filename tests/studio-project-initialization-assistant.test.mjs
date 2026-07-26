import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const schema = fs.readFileSync(
  "src/features/studio/capabilities/studioProjectInitialization.ts",
  "utf8",
);
const api = fs.readFileSync("src/lib/studio-project-initialization-api.ts", "utf8");
const component = fs.readFileSync(
  "src/features/studio/components/StudioProjectInitializationAssistant.tsx",
  "utf8",
);
const canvas = fs.readFileSync("src/features/studio/components/StudioCanvas.tsx", "utf8");
const version = fs.readFileSync("src/lib/studio-api-version.ts", "utf8");

test("Project Initialization schema includes Request, Goal, Strategy, Canvas, Roadmap, Timeline, Confidence, and Evidence", () => {
  assert.match(schema, /StudioProjectInitializationRequest/);
  assert.match(schema, /StudioAIProjectDraft/);
  for (const field of [
    "projectGoal",
    "strategy",
    "canvasGraph",
    "roadmap",
    "timelineStructure",
    "confidence",
    "evidence",
  ]) assert.match(schema, new RegExp(field));
});

test("Project Initialization uses exact Preview and Confirm APIs", () => {
  assert.match(api, /\/api\/projects\/init\/preview/);
  assert.match(api, /\/api\/projects\/init\/confirm/);
  assert.match(api, /previewStudioProjectInitialization/);
  assert.match(api, /confirmStudioProjectInitialization/);
  assert.match(version, /project_initialization_assistant/);
});

test("Studio Entry exposes Start with Copilot and complete Preview", () => {
  assert.match(canvas, /StudioProjectInitializationAssistant/);
  assert.match(component, /studio\.init\.title/);
  assert.match(component, /studio\.init\.projectGoal/);
  assert.match(component, /studio\.init\.strategy/);
  assert.match(component, /studio\.init\.canvas/);
  assert.match(component, /studio\.init\.timeline/);
  assert.match(component, /studio\.init\.copilotEvidence/);
  assert.match(component, /studio\.init\.confirmDraft/);
});

test("Confirm boundary never creates a formal project or runs production", () => {
  assert.match(component, /studio\.init\.previewReady/);
  assert.match(component, /studio\.init\.confirmed/);
  assert.match(component, /studio\.init\.boundary/);
  assert.doesNotMatch(
    api,
    /\/api\/studio\/projects|createStudioProject|executeNode|generateVideo|submitProvider|deductCredits|chargeCredits|startQueue/,
  );
});
