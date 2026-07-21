import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { formatStudioCapabilityLabel } from "../src/features/studio/capabilities/studioCapabilityExecutionPlan.ts";

test("Creative Workflow Node labels preserve the Capability contract", () => {
  assert.equal(formatStudioCapabilityLabel("video_generate"), "Video Generate");
  assert.equal(formatStudioCapabilityLabel("motion_control"), "Motion Control");
});

test("Studio creates and confirms a PLAN_ONLY draft without entering execution", () => {
  const component = fs.readFileSync("src/features/studio/components/StudioModelRecommendation.tsx", "utf8");
  const api = fs.readFileSync("src/lib/studio-capability-plan-api.ts", "utf8");
  const schema = fs.readFileSync("src/features/studio/capabilities/studioCapabilityExecutionPlan.ts", "utf8");
  assert.match(component, /Creative Plan/);
  assert.match(component, /Create Creative Plan/);
  assert.match(component, /Review Plan/);
  assert.match(component, /Confirm Workflow/);
  assert.match(component, /existing Generation Plan controls/);
  assert.match(api, /\/api\/capabilities\/plans/);
  assert.match(api, /\/confirm/);
  assert.match(schema, /PLAN_ONLY/);
  assert.match(schema, /generationPlanCreated: false/);
  assert.match(schema, /queueEntered: false/);
  assert.match(schema, /providerCalled: false/);
  assert.doesNotMatch(`${component}${api}`, /startGenerationPlan|createGenerationPlan|\/api\/video\/generate|videoGenerateExecutor/);
});

test("Workflow graph renders dependencies, readiness blockers, and estimated cost", () => {
  const component = fs.readFileSync("src/features/studio/components/StudioModelRecommendation.tsx", "utf8");
  assert.match(component, /capabilityPlan\.nodes\.map/);
  assert.match(component, /node\.dependencies/);
  assert.match(component, /node\.blockers/);
  assert.match(component, /estimatedCost\.estimatedCredits/);
  assert.match(component, /confirmationAllowed/);
});
