import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("Studio defines AgentTaskRuntime and HumanCheckpoint governance contracts", () => {
  const schema = fs.readFileSync("src/features/studio/capabilities/studioAgentTaskRuntime.ts", "utf8");
  assert.match(schema, /runtimeTaskId: string/);
  assert.match(schema, /inputRefs: string\[\]/);
  assert.match(schema, /outputRefs: string\[\]/);
  assert.match(schema, /approvalState:/);
  assert.match(schema, /"PENDING"[\s\S]*"READY"[\s\S]*"WAITING_HUMAN"[\s\S]*"APPROVED"[\s\S]*"EXECUTING"[\s\S]*"COMPLETED"[\s\S]*"FAILED"/);
  assert.match(schema, /"PLAN_REVIEW" \| "OUTPUT_REVIEW" \| "EXECUTION_APPROVAL"/);
});

test("Agent Task Control Center shows role, state, Checkpoint, dependencies, and output", () => {
  const component = fs.readFileSync("src/features/studio/components/StudioModelRecommendation.tsx", "utf8");
  assert.match(component, /aria-label="Agent Task Control Center"/);
  assert.match(component, /task\.approvalState/);
  assert.match(component, /task\.dependencies\.length/);
  assert.match(component, /Checkpoint:/);
  assert.match(component, /task\.outputRefs\.length/);
  assert.match(component, /Approve \$\{studioCheckpointTypeForRole/);
  assert.match(component, /Execution Confirm remains separate/);
  assert.doesNotMatch(component.match(/<section className="studio-agent-task-control"[\s\S]*?<section className="studio-agent-team"/)?.[0] || "", /Execute Task|Run Task|Generate Now/);
});

test("Runtime client exposes only project status and Human Checkpoint APIs", () => {
  const api = fs.readFileSync("src/lib/studio-agent-task-runtime-api.ts", "utf8");
  assert.match(api, /\/api\/projects\/\$\{encodeURIComponent\(projectId\)\}\/agent-task-runtime/);
  assert.match(api, /\/api\/agent\/tasks\/\$\{encodeURIComponent\(input\.runtimeTaskId\)\}\/checkpoint/);
  assert.doesNotMatch(api, /execute|generate|provider|billing|credits|queue|retry/i);
});

test("Team Plan approval refreshes Runtime metadata without automatic execution", () => {
  const component = fs.readFileSync("src/features/studio/components/StudioModelRecommendation.tsx", "utf8");
  assert.match(component, /approveStudioAgentTeamPlan/);
  assert.match(component, /getStudioProjectAgentTaskRuntime/);
  assert.match(component, /Checkpoints govern approval metadata only/);
  assert.match(component, /aria-label="Agent Team Planner"/);
  assert.match(component, /aria-label="Agent Team"/);
});
