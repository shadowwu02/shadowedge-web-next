import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const schema = fs.readFileSync(
  "src/features/studio/capabilities/studioProjectContinuityMemory.ts",
  "utf8",
);
const api = fs.readFileSync(
  "src/lib/studio-project-continuity-memory-api.ts",
  "utf8",
);
const timeline = fs.readFileSync(
  "src/features/studio/components/StudioProjectMemoryTimeline.tsx",
  "utf8",
);
const workspace = fs.readFileSync(
  "src/features/studio/components/StudioWorkspace.tsx",
  "utf8",
);
const copilotSchema = fs.readFileSync(
  "src/features/studio/capabilities/studioProjectCopilotCenter.ts",
  "utf8",
);
const styles = fs.readFileSync(
  "src/features/studio/studio.css",
  "utf8",
);

test("Project Memory Snapshot covers milestones, decisions, successful patterns and lessons", () => {
  for (const field of ["projectId", "milestones", "decisions", "successfulPatterns", "lessons", "updatedAt"]) {
    assert.match(schema, new RegExp(`${field}:`));
  }
  for (const type of [
    "CREATIVE_DIRECTION",
    "STYLE_EVOLUTION",
    "WORKFLOW_EVOLUTION",
    "QUALITY_LEARNING",
    "CLIENT_PREFERENCE",
    "DECISION_HISTORY",
  ]) {
    assert.match(schema, new RegExp(`"${type}"`));
  }
  assert.match(copilotSchema, /historicalMemory:/);
});

test("Project Memory API is authenticated read-only retrieval", () => {
  assert.match(api, /\/api\/projects\/\$\{encodeURIComponent\(projectId\)\}\/memory/);
  assert.doesNotMatch(api, /method:\s*"POST"|method:\s*"PUT"|method:\s*"PATCH"|method:\s*"DELETE"/);
  assert.doesNotMatch(api, /execute|generate|provider|credits|billing/i);
});

test("Studio renders the continuity timeline and source-qualified memory groups", () => {
  for (const label of [
    "Project Memory Timeline",
    "Creative continuity",
    "Decision history",
    "Successful patterns",
    "Lessons",
    "Chronological",
    "qualified sources only",
  ]) {
    assert.match(timeline, new RegExp(label));
  }
  assert.match(workspace, /<StudioProjectMemoryTimeline \/>/);
  assert.match(styles, /\.studio-project-memory/);
  assert.match(styles, /\.studio-project-memory-stream/);
});

test("Project Memory UI preserves privacy and read-only execution boundaries", () => {
  assert.match(timeline, /Current user \+ current project only/);
  assert.match(timeline, /No Context or project-direction mutation/);
  assert.match(timeline, /No execution, Provider, or Credits/);
  assert.doesNotMatch(timeline, />Execute</);
  assert.doesNotMatch(timeline, />Generate</);
  assert.doesNotMatch(timeline, />Modify Context</);
  assert.doesNotMatch(timeline, />Charge</);
});
