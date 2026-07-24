import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const schema = fs.readFileSync(
  "src/features/studio/capabilities/studioProjectRoadmap.ts",
  "utf8",
);
const api = fs.readFileSync(
  "src/lib/studio-project-roadmap-api.ts",
  "utf8",
);
const timeline = fs.readFileSync(
  "src/features/studio/components/StudioProjectRoadmapTimeline.tsx",
  "utf8",
);
const workspace = fs.readFileSync(
  "src/features/studio/components/StudioWorkspace.tsx",
  "utf8",
);
const styles = fs.readFileSync(
  "src/features/studio/studio.css",
  "utf8",
);

test("Project Roadmap covers three phases, milestones, strategies and confidence", () => {
  for (const field of [
    "roadmapId",
    "projectId",
    "phases",
    "milestones",
    "strategies",
    "confidence",
    "createdAt",
  ]) {
    assert.match(schema, new RegExp(`${field}:`));
  }
  for (const phase of ["CURRENT", "NEXT", "FUTURE"]) {
    assert.match(schema, new RegExp(`"${phase}"`));
  }
  for (const field of ["pastStrategies", "currentStrategy", "futureSuggestions", "evidence"]) {
    assert.match(schema, new RegExp(`${field}:`));
  }
});

test("Project Roadmap API preserves read, preview and explicit Draft confirmation", () => {
  assert.match(api, /\/roadmap`/);
  assert.match(api, /\/roadmap\/preview`/);
  assert.match(api, /\/roadmap\/confirm`/);
  assert.match(api, /JSON\.stringify\(\{ confirm: true \}\)/);
  assert.doesNotMatch(api, /execute|generate|publish|deductCredits|provider/i);
});

test("Studio renders roadmap phases, strategy evolution, milestones and confidence", () => {
  for (const label of [
    "Project Roadmap Timeline",
    "Current phase",
    "Next phase",
    "Future direction",
    "Strategy Evolution",
    "Roadmap milestones",
    "Roadmap confidence",
  ]) {
    assert.match(`${schema}\n${timeline}`, new RegExp(label));
  }
  assert.match(workspace, /<StudioProjectRoadmapTimeline \/>/);
  assert.match(styles, /\.studio-project-roadmap/);
  assert.match(styles, /\.studio-project-roadmap-phases/);
});

test("Roadmap actions remain Draft-only and cannot mutate or execute", () => {
  assert.match(schema, /roadmapDraftType: "PROJECT_ROADMAP_DRAFT"/);
  assert.match(timeline, /Analysis and Draft only/);
  assert.match(timeline, /No automatic project-direction change/);
  assert.match(timeline, /No Workflow creation, execution, publish, or Credits/);
  assert.doesNotMatch(timeline, />Execute</);
  assert.doesNotMatch(timeline, />Generate</);
  assert.doesNotMatch(timeline, />Publish</);
  assert.doesNotMatch(timeline, />Charge</);
});
