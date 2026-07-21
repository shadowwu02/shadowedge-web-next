import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("Studio defines the AgentTeamPlan and AgentTaskAllocation contracts", () => {
  const schema = fs.readFileSync("src/features/studio/capabilities/studioDynamicAgentTeamPlan.ts", "utf8");
  assert.match(schema, /teamPlanId: string/);
  assert.match(schema, /requiredRoles: StudioCreativeAgentRoleId\[\]/);
  assert.match(schema, /tasks: StudioAgentTaskAllocation\[\]/);
  assert.match(schema, /dependencies: string\[\]/);
  assert.match(schema, /priority: number/);
  assert.match(schema, /"DRAFT" \| "WAITING_HUMAN" \| "APPROVED"/);
});

test("Agent Team Planner renders selected roles, allocation reasons, priority, and dependencies", () => {
  const component = fs.readFileSync("src/features/studio/components/StudioModelRecommendation.tsx", "utf8");
  assert.match(component, /aria-label="Agent Team Planner"/);
  assert.match(component, /currentAgentTeamPlan\.selectedRoles\.map/);
  assert.match(component, /task\.reason/);
  assert.match(component, /task\.priority/);
  assert.match(component, /task\.dependencies\.length/);
  assert.match(component, /Approve Team Plan/);
  assert.match(component, /never runs a Task, changes the project, calls a Provider, or charges Credits/);
});

test("Team Plan client uses authenticated draft, project read, and human approval routes", () => {
  const api = fs.readFileSync("src/lib/studio-agent-team-plan-api.ts", "utf8");
  assert.match(api, /"\/api\/agent\/team-plan"/);
  assert.match(api, /\/api\/projects\/\$\{encodeURIComponent\(projectId\)\}\/agent-team-plan/);
  assert.match(api, /\/api\/agent\/team-plan\/\$\{encodeURIComponent\(teamPlanId\)\}\/approve/);
  assert.doesNotMatch(api, /execute|generate|provider|billing|credits|queue/i);
});

test("existing Agent Team and Human Review remain present", () => {
  const component = fs.readFileSync("src/features/studio/components/StudioModelRecommendation.tsx", "utf8");
  assert.match(component, /aria-label="Agent Team"/);
  assert.match(component, /Every role output waits for Human Review/);
  assert.match(component, /Confirm Plan/);
});
