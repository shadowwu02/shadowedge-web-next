import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const schema = fs.readFileSync(
  "src/features/studio/capabilities/studioProductionExecutionApproval.ts",
  "utf8",
);
const api = fs.readFileSync(
  "src/lib/studio-production-execution-approval-api.ts",
  "utf8",
);
const panel = fs.readFileSync(
  "src/features/studio/components/StudioStoryboardPanel.tsx",
  "utf8",
);

test("Production Execution Approval schema exposes package, Gate, policy, cost, and status", () => {
  for (const field of [
    "approvalId",
    "runId",
    "executionSummary",
    "agents",
    "steps",
    "cost",
    "policy",
    "riskFlags",
    "status",
    "createdAt",
  ]) {
    assert.match(schema, new RegExp(`${field}:`));
  }
  for (const status of ["PENDING", "APPROVED", "REJECTED", "EXPIRED"]) {
    assert.match(schema, new RegExp(`"${status}"`));
  }
  for (const gate of [
    "capability",
    "availability",
    "readiness",
    "verifiedScope",
    "cost",
    "agentPolicy",
  ]) {
    assert.match(schema, new RegExp(`${gate}: StudioProductionApprovalGate`));
  }
});

test("Production Approval APIs create a package then require explicit Human Confirm", () => {
  assert.match(api, /\/production-run\/approval`/);
  assert.match(api, /\/production-run\/approval\/\$\{encodeURIComponent\(approvalId\)\}\/confirm/);
  assert.match(api, /JSON\.stringify\(\{ runId \}\)/);
  assert.match(api, /JSON\.stringify\(\{ confirm: true \}\)/);
  assert.doesNotMatch(api, /startQueue|createGenerationJob|submitProvider|generateVideo|deductCredits/);
});

test("Production Approval Panel shows summary, six Gates, risks, and no direct execution control", () => {
  for (const label of [
    "Production Approval Panel",
    "Scenes",
    "Shots",
    "Agents",
    "Tasks",
    "Credits",
    "Cost Confidence",
    "Agent Policy",
    "Capability",
    "Availability",
    "Readiness",
    "Verified Scope",
    "Cost",
    "Prepare Production Approval",
    "Confirm Production Execution Approval",
  ]) {
    assert.match(panel, new RegExp(label));
  }
  assert.match(panel, /A separate Runtime start remains required/);
  assert.match(panel, /No Job, Queue, Provider call, Generate, or Credits action occurred/);
  assert.doesNotMatch(panel, /Execute Production|Start Queue|Run Now|deductCredits/);
});
