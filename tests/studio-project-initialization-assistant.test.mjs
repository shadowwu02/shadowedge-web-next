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
  assert.match(component, /Start with Copilot/);
  assert.match(component, /Project Goal/);
  assert.match(component, /Strategy/);
  assert.match(component, /Canvas/);
  assert.match(component, /Timeline/);
  assert.match(component, /Copilot Evidence/);
  assert.match(component, /Confirm Project Draft/);
});

test("Confirm boundary never creates a formal project or runs production", () => {
  assert.match(component, /No formal Studio project was created/);
  assert.match(component, /formal project not created/);
  assert.match(component, /No Workflow execution, generation, Provider call, or Credits action/);
  assert.doesNotMatch(
    api,
    /\/api\/studio\/projects|createStudioProject|executeNode|generateVideo|submitProvider|deductCredits|chargeCredits|startQueue/,
  );
});
