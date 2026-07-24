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
const canvasSchema = fs.readFileSync(
  "src/features/studio/capabilities/studioAgentCanvas.ts",
  "utf8",
);
const canvasApi = fs.readFileSync("src/lib/studio-agent-canvas-api.ts", "utf8");
const canvas = fs.readFileSync(
  "src/features/studio/components/StudioAgentCanvas.tsx",
  "utf8",
);

test("Storyboard and Shot schemas cover planning, references, and Timeline Placeholder mapping", () => {
  for (const field of [
    "storyboardId", "sceneId", "shots", "createdAt",
    "shotId", "description", "camera", "duration", "references",
    "timelinePlaceholder", "promptDraft",
  ]) {
    assert.match(schema, new RegExp(`${field}:`));
  }
  for (const type of [
    "WIDE_SHOT", "MEDIUM_SHOT", "CLOSE_UP", "TRACKING_SHOT", "ACTION_SHOT",
  ]) {
    assert.match(schema, new RegExp(`"${type}"`));
  }
  assert.match(schema, /status: "REFERENCE_ONLY"/);
});

test("Storyboard APIs preserve owned read and explicit SHOT_DRAFT confirmation", () => {
  assert.match(api, /\/api\/projects\/\$\{encodeURIComponent\(projectId\)\}\/storyboards/);
  assert.match(api, /\/api\/scenes\/\$\{encodeURIComponent\(sceneId\)\}\/shots/);
  assert.match(api, /draft\/preview/);
  assert.match(api, /draft\/confirm/);
  assert.match(api, /confirm: true/);
  assert.doesNotMatch(api, /execute|provider|billing|credits|generateVideo/i);
});

test("Storyboard Panel shows Shot cards, Camera, Duration, Reference, and Preview then Confirm", () => {
  for (const label of [
    "Storyboard Workspace",
    "AI Scene Planning",
    "Shot cards",
    "Camera",
    "Duration",
    "References",
    "Preview SHOT_DRAFT",
    "Confirm Create Draft",
  ]) {
    assert.match(panel, new RegExp(label));
  }
  assert.match(panel, /Scene → Storyboard → Shot → Timeline Placeholder/);
  assert.match(panel, /No Timeline, Agent, or Runtime action was started/);
});

test("Agent Canvas projects a governed Storyboard Node without direct execution", () => {
  assert.match(canvasSchema, /"STORYBOARD"/);
  assert.match(canvasApi, /getStudioStoryboards/);
  assert.match(canvasApi, /nodeType: "STORYBOARD"/);
  assert.match(canvasApi, /PLANS_SCENE/);
  assert.match(canvasApi, /GUIDES_AGENTS/);
  assert.match(canvas, /Open Storyboard/);
  assert.match(canvas, /SHOT_DRAFT/);
  assert.doesNotMatch(`${panel}\n${api}`, /runStudioGraph|executeNode|submitProvider|deductCredits/);
});
