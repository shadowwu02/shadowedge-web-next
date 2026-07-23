import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  STUDIO_COPILOT_EVIDENCE_TYPES,
  studioCopilotEvidenceLabel,
} from "../src/features/studio/capabilities/studioCopilotExplanation.ts";

test("Copilot Trust Center exposes the seven safe evidence types", () => {
  assert.deepEqual(STUDIO_COPILOT_EVIDENCE_TYPES, [
    "PROJECT_CONTEXT",
    "USER_PREFERENCE",
    "DECISION_PATTERN",
    "HISTORICAL_RESULT",
    "WORKFLOW_SUCCESS",
    "QUALITY_SIGNAL",
    "COST_SIGNAL",
  ]);
  assert.equal(studioCopilotEvidenceLabel("USER_PREFERENCE"), "Your preferences");
  assert.equal(studioCopilotEvidenceLabel("COST_SIGNAL"), "Cost confidence");
});

test("Why Copilot displays evidence, factors, and confidence without sensitive internals", () => {
  const panel = fs.readFileSync("src/features/studio/components/StudioCopilotTrustCenter.tsx", "utf8");
  const parent = fs.readFileSync("src/features/studio/components/StudioProjectCopilot.tsx", "utf8");
  assert.match(panel, /Why Copilot\?/);
  assert.match(panel, /confidence\.breakdown/);
  assert.match(panel, /reasoningFactors/);
  assert.match(panel, /explanation\.evidence/);
  assert.match(panel, /sanitized evidence from this project/);
  assert.match(parent, /<StudioCopilotTrustCenter/);
  assert.match(parent, /explanationReference/);
  assert.doesNotMatch(panel, /sourceIds\.map|providerNativeId|rawPrompt|otherUserId/);
});

test("Copilot Explanation API is authenticated project-scoped GET only", () => {
  const api = fs.readFileSync("src/lib/studio-copilot-explanations-api.ts", "utf8");
  assert.match(api, /\/api\/projects\/.*\/copilot\/explanations/);
  assert.doesNotMatch(api, /method:\s*"(POST|PUT|PATCH|DELETE)"/);
});

test("Explanation stays attached to Preview and Draft without execution hooks", () => {
  const contract = fs.readFileSync("src/features/studio/capabilities/studioProjectCopilot.ts", "utf8");
  const parent = fs.readFileSync("src/features/studio/components/StudioProjectCopilot.tsx", "utf8");
  assert.match(contract, /StudioCopilotExplanationReference/);
  assert.match(contract, /explanationReference/);
  assert.match(parent, /Explanation linked/);
  assert.match(parent, /Explanation.*linked/);
  assert.doesNotMatch([contract, parent].join("\n"), /executeStudioWorkflowNode|\/api\/video\/generate|providerTransport|deductCredits|billingService/i);
});
