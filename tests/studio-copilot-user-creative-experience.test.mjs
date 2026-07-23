import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  STUDIO_USER_CREATIVE_EXPERIENCE_TYPES,
  studioCreativeExperienceLabel,
} from "../src/features/studio/capabilities/studioUserCreativeExperience.ts";

test("User Creative Experience contract exposes only verified pattern types", () => {
  assert.deepEqual(STUDIO_USER_CREATIVE_EXPERIENCE_TYPES, [
    "SUCCESSFUL_WORKFLOW",
    "EFFECTIVE_STRATEGY",
    "EFFECTIVE_OPTIMIZATION",
    "STYLE_PATTERN",
    "RESOURCE_PATTERN",
  ]);
  assert.equal(studioCreativeExperienceLabel("EFFECTIVE_OPTIMIZATION"), "Effective optimization");
  const schema = fs.readFileSync("src/features/studio/capabilities/studioUserCreativeExperience.ts", "utf8");
  assert.match(schema, /CURRENT_USER_PROJECTS_ONLY_NO_CROSS_USER_OR_ACCOUNT_LEARNING/);
  assert.match(schema, /COPILOT_EXPERIENCE_RETRIEVED/);
});

test("Your Creative Patterns displays source project, Confidence, and success signal", () => {
  const component = fs.readFileSync("src/features/studio/components/StudioUserCreativePatternsPanel.tsx", "utf8");
  const parent = fs.readFileSync("src/features/studio/components/StudioProjectCopilot.tsx", "utf8");
  assert.match(component, /Your Creative Patterns/);
  assert.match(component, /sourceProjectName/);
  assert.match(component, /experience\.confidence/);
  assert.match(component, /experience\.signal/);
  assert.match(component, /completed, successful project evidence/);
  assert.match(parent, /<StudioUserCreativePatternsPanel projectId=\{projectId\}/);
});

test("Creative Pattern API and USE_EXPERIENCE_DRAFT preserve user control", () => {
  const api = fs.readFileSync("src/lib/studio-user-creative-patterns-api.ts", "utf8");
  const contract = fs.readFileSync("src/features/studio/capabilities/studioProjectCopilot.ts", "utf8");
  const component = fs.readFileSync("src/features/studio/components/StudioUserCreativePatternsPanel.tsx", "utf8");
  assert.match(api, /\/api\/user\/creative-patterns/);
  assert.match(contract, /USE_EXPERIENCE_DRAFT/);
  assert.match(contract, /REVIEW_EXPERIENCE/);
  assert.match(component, /never copy a project/);
  assert.doesNotMatch([api, contract, component].join("\n"), /\/api\/video\/generate|providerTransport|deductCredits|executeStudioWorkflowNode/i);
});
