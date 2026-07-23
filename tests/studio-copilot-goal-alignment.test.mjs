import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  STUDIO_GOAL_ALIGNMENT_STATUSES,
  STUDIO_PROJECT_GOAL_TYPES,
  studioProjectGoalLabel,
} from "../src/features/studio/capabilities/studioProjectGoals.ts";

test("Project Mission, Goal, and Alignment contracts expose the approved values", () => {
  assert.deepEqual(STUDIO_PROJECT_GOAL_TYPES, ["BUSINESS_GOAL", "CREATIVE_GOAL", "QUALITY_GOAL", "EFFICIENCY_GOAL", "BRAND_GOAL"]);
  assert.deepEqual(STUDIO_GOAL_ALIGNMENT_STATUSES, ["ALIGNED", "PARTIAL", "MISALIGNED"]);
  assert.equal(studioProjectGoalLabel("QUALITY_GOAL"), "Quality Goal");
  const schema = fs.readFileSync("src/features/studio/capabilities/studioProjectGoals.ts", "utf8");
  assert.match(schema, /missionId: string/);
  assert.match(schema, /priority: "HIGH" \| "MEDIUM" \| "LOW"/);
});

test("Project Goals Panel renders Mission, Goals, Priority, and Alignment without write controls", () => {
  const component = fs.readFileSync("src/features/studio/components/StudioProjectGoalsPanel.tsx", "utf8");
  assert.match(component, /Project Goals Panel/);
  assert.match(component, />Mission</);
  assert.match(component, />Vision</);
  assert.match(component, /goal\.priority/);
  assert.match(component, /Goal Alignment summary/);
  assert.match(component, /Aligned \{bundle\.summary\.aligned\}/);
  assert.doesNotMatch(component, /onClick|execute|generateVideo|deductCredits/);
});

test("Goal API and Action Center preserve Preview then Confirm draft boundary", () => {
  const api = fs.readFileSync("src/lib/studio-project-goals-api.ts", "utf8");
  const copilot = fs.readFileSync("src/features/studio/capabilities/studioProjectCopilot.ts", "utf8");
  const panel = fs.readFileSync("src/features/studio/components/StudioProjectCopilot.tsx", "utf8");
  assert.match(api, /\/api\/projects\/\$\{encodeURIComponent\(projectId\)\}\/goals/);
  assert.match(copilot, /GOAL_ALIGNMENT_REVIEW/);
  assert.match(copilot, /GOAL_REVIEW_DRAFT/);
  assert.match(panel, /Preview Action/);
  assert.match(panel, /Create Draft/);
});
