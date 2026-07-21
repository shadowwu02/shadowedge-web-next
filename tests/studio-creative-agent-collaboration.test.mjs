import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { studioAgentTaskSymbol } from "../src/features/studio/capabilities/studioCreativeAgentCollaboration.ts";

test("Studio renders the four-role Agent Team with human-review status", () => {
  const component = fs.readFileSync("src/features/studio/components/StudioModelRecommendation.tsx", "utf8");
  assert.match(component, /aria-label="Agent Team"/);
  assert.match(component, /Every role output waits for Human Review/);
  assert.match(component, /No Agent can execute, charge Credits, or change this project/);
  assert.match(component, /task\.status\.replaceAll\("_", " "\)/);
});

test("collaboration client uses authenticated role and current-project task endpoints", () => {
  const api = fs.readFileSync("src/lib/studio-agent-collaboration-api.ts", "utf8");
  assert.match(api, /"\/api\/agent\/roles"/);
  assert.match(api, /\/api\/projects\/\$\{encodeURIComponent\(projectId\)\}\/agent-tasks/);
  assert.doesNotMatch(api, /userId|execute|generate|provider|billing|credits/i);
});

test("task symbols distinguish pending, active, review, and failure states", () => {
  assert.equal(studioAgentTaskSymbol("PENDING"), "○");
  assert.equal(studioAgentTaskSymbol("RUNNING"), "●");
  assert.equal(studioAgentTaskSymbol("WAITING_HUMAN"), "✓");
  assert.equal(studioAgentTaskSymbol("FAILED"), "×");
});

test("collaboration schema preserves role isolation and dependency metadata", () => {
  const schema = fs.readFileSync("src/features/studio/capabilities/studioCreativeAgentCollaboration.ts", "utf8");
  assert.match(schema, /"CREATIVE_DIRECTOR"/);
  assert.match(schema, /"STORYBOARD_AGENT"/);
  assert.match(schema, /"VIDEO_AGENT"/);
  assert.match(schema, /"QUALITY_AGENT"/);
  assert.match(schema, /dependencyTaskIds: string\[\]/);
  assert.match(schema, /humanApprovalRequired: true/);
});
