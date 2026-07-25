import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  STUDIO_PROJECT_NEXT_ACTION_TYPES,
} from "../src/features/studio/capabilities/studioProjectExecutionConcierge.ts";

const schema = fs.readFileSync(
  "src/features/studio/capabilities/studioProjectExecutionConcierge.ts",
  "utf8",
);
const api = fs.readFileSync("src/lib/studio-project-execution-concierge-api.ts", "utf8");
const component = fs.readFileSync(
  "src/features/studio/components/StudioProjectExecutionConcierge.tsx",
  "utf8",
);
const workspace = fs.readFileSync("src/features/studio/components/StudioWorkspace.tsx", "utf8");
const version = fs.readFileSync("src/lib/studio-api-version.ts", "utf8");

test("ProjectExecutionSnapshot covers Progress, Stage, Blocks, Risks, Next Actions, and Evidence", () => {
  assert.match(schema, /StudioProjectExecutionSnapshot/);
  for (const field of ["progress", "currentStage", "blockedItems", "risks", "nextActions", "evidence", "updatedAt"]) {
    assert.match(schema, new RegExp(field));
  }
  assert.deepEqual(STUDIO_PROJECT_NEXT_ACTION_TYPES, [
    "CONTENT_ACTION",
    "WORKFLOW_ACTION",
    "QUALITY_ACTION",
    "RESOURCE_ACTION",
    "DELIVERY_ACTION",
  ]);
});

test("Execution Assistant uses the exact owned project GET API", () => {
  assert.match(api, /\/api\/projects\/\$\{encodeURIComponent\(projectId\)\}\/execution-assistant/);
  assert.match(api, /getStudioProjectExecutionAssistant/);
  assert.match(version, /project_execution_concierge/);
});

test("Studio Context Panel shows Project Copilot Assistant, Risks, Next Actions, and Evidence", () => {
  assert.match(workspace, /StudioProjectExecutionConcierge/);
  assert.match(component, /Project Copilot Assistant/);
  assert.match(component, /Current stage/);
  assert.match(component, /Risk insight/);
  assert.match(component, /Next actions/);
  assert.match(component, /studio-execution-concierge-evidence/);
});

test("Concierge preserves Preview and Draft-only boundary", () => {
  assert.match(component, /Human confirm required/);
  assert.match(component, /Monitoring and Draft suggestions only/);
  assert.match(component, /No task execution, Workflow mutation, Job, generation, Provider call, or Credits action/);
  assert.doesNotMatch(
    `${schema}\n${api}`,
    /executeNode|generateVideo|submitProvider|createJob|startQueue|deductCredits|chargeCredits|updateWorkflow/,
  );
});
