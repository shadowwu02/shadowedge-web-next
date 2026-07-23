import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  STUDIO_DECISION_OPTION_TYPES,
  STUDIO_TRADEOFF_METRICS,
  studioDecisionOptionLabel,
} from "../src/features/studio/capabilities/studioDecisionSupport.ts";

test("Decision Option contract exposes bounded options and all Tradeoff Metrics", () => {
  assert.deepEqual(STUDIO_DECISION_OPTION_TYPES, [
    "QUALITY_FIRST",
    "COST_OPTIMIZATION",
    "SPEED_FIRST",
    "BRAND_ALIGNMENT_FIRST",
  ]);
  assert.deepEqual(STUDIO_TRADEOFF_METRICS, [
    "QUALITY",
    "COST",
    "SPEED",
    "BRAND_ALIGNMENT",
    "EFFICIENCY",
  ]);
  assert.equal(studioDecisionOptionLabel("COST_OPTIMIZATION"), "Cost optimization");
});

test("Decision Support Panel displays options, advantages, risks, Tradeoff, and conflict", () => {
  const panel = fs.readFileSync("src/features/studio/components/StudioDecisionSupportPanel.tsx", "utf8");
  const parent = fs.readFileSync("src/features/studio/components/StudioProjectCopilot.tsx", "utf8");
  assert.match(panel, /Decision Support/);
  assert.match(panel, /tradeoffs\.advantages/);
  assert.match(panel, /tradeoffs\.risks/);
  assert.match(panel, /STUDIO_TRADEOFF_METRICS/);
  assert.match(panel, /TRADEOFF_CONFLICT/);
  assert.match(panel, /No automatic choice/);
  assert.match(parent, /<StudioDecisionSupportPanel projectId=\{projectId\}/);
});

test("Decision Support API is authenticated project GET only", () => {
  const api = fs.readFileSync("src/lib/studio-decision-support-api.ts", "utf8");
  assert.match(api, /\/api\/projects\/\$\{encodeURIComponent\(projectId\)\}\/decision-support/);
  assert.doesNotMatch(api, /method: "POST"|method: "PUT"|method: "DELETE"/);
});

test("DECISION_SELECTION_DRAFT stays behind Preview and Confirm without automatic selection", () => {
  const contract = fs.readFileSync("src/features/studio/capabilities/studioProjectCopilot.ts", "utf8");
  const panel = fs.readFileSync("src/features/studio/components/StudioDecisionSupportPanel.tsx", "utf8");
  const parent = fs.readFileSync("src/features/studio/components/StudioProjectCopilot.tsx", "utf8");
  assert.match(contract, /DECISION_SELECTION_DRAFT/);
  assert.match(contract, /REVIEW_DECISION_SUPPORT/);
  assert.match(parent, /Preview Action/);
  assert.match(parent, /Create Draft/);
  assert.doesNotMatch([contract, panel, parent].join("\n"), /selectOption|updateGoal|executeStudioWorkflowNode|\/api\/video\/generate|providerTransport|deductCredits/i);
});
