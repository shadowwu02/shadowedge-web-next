import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const statusSource = fs.readFileSync("src/features/studio/capabilities/studioCreativeAgentSession.ts", "utf8");
const componentSource = fs.readFileSync("src/features/studio/components/StudioModelRecommendation.tsx", "utf8");

test("Studio exposes privacy-safe Agent lifecycle labels", () => {
  for (const label of ["Analyzing", "Waiting for approval", "Generating", "Finalizing", "Finalized", "Needs attention"]) assert.match(statusSource, new RegExp(label));
  assert.match(componentSource, /aria-label="Creative Agent status"/);
  assert.match(componentSource, /studioCreativeAgentPublicStatus\(agentSession\.status, executionStatus\?\.planStatus\)/);
  assert.doesNotMatch(statusSource, /providerNativeId|providerTrackingId|databaseJobId|billing|credits/i);
});

test("Agent team planning carries the owned Session correlation only", () => {
  assert.match(componentSource, /sessionId: agentSession\?\.sessionId/);
  assert.doesNotMatch(componentSource, /autoRetry|automaticExecution/);
});
