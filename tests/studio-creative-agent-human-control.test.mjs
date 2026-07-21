import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("Studio renders the Agent Workflow Human Control Center and node-level controls", () => {
  const component = fs.readFileSync("src/features/studio/components/StudioModelRecommendation.tsx", "utf8");
  assert.match(component, /Human Control Center/);
  assert.match(component, /Review Workflow/);
  assert.match(component, /\? "Unlock" : "Lock"/);
  assert.match(component, />Edit<\/button>/);
  assert.match(component, />Re-plan<\/button>/);
  assert.match(component, /Selective Re-plan/);
});

test("locked nodes disable edit and replan operations", () => {
  const component = fs.readFileSync("src/features/studio/components/StudioModelRecommendation.tsx", "utf8");
  assert.match(component, /node\.lockStatus === "LOCKED"/);
  assert.match(component, /workflowReview\.status === "CONFIRMED" \|\| node\.lockStatus === "LOCKED"/);
  assert.match(component, /Unlock/);
});

test("review and selective replan APIs are scoped to the owned Agent Session", () => {
  const api = fs.readFileSync("src/lib/studio-creative-workflow-review-api.ts", "utf8");
  assert.match(api, /\/api\/agent\/workflows\/\$\{encodeURIComponent\(sessionId\)\}\/review/);
  assert.match(api, /\/api\/agent\/workflows\/\$\{encodeURIComponent\(sessionId\)\}\/replan/);
  assert.match(api, /CONFIRM_REVIEW/);
  assert.doesNotMatch(api, /userId|projectId/);
});

test("Human Decision Record preserves before, after, reason, and timestamp", () => {
  const types = fs.readFileSync("src/features/studio/capabilities/studioCreativeWorkflowReview.ts", "utf8");
  assert.match(types, /StudioHumanDecisionRecord/);
  assert.match(types, /before: Record<string, unknown>/);
  assert.match(types, /after: Record<string, unknown>/);
  assert.match(types, /reason: string \| null/);
  assert.match(types, /createdAt: string/);
});

test("review confirmation remains PLAN_ONLY and does not expose an execution shortcut", () => {
  const component = fs.readFileSync("src/features/studio/components/StudioModelRecommendation.tsx", "utf8");
  const api = fs.readFileSync("src/lib/studio-creative-workflow-review-api.ts", "utf8");
  assert.match(component, /Confirm Reviewed Plan/);
  assert.match(component, /creates a new PLAN_ONLY draft; it never executes or charges Credits/);
  assert.doesNotMatch(api, /execute|generate|queue|provider|billing|credit/i);
});
