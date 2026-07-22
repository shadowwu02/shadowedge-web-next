import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  STUDIO_COPILOT_SUGGESTION_TYPES,
  studioCopilotSuggestionLabel,
} from "../src/features/studio/capabilities/studioProjectCopilot.ts";

test("Project Copilot schema exposes the bounded suggestion types", () => {
  assert.deepEqual(STUDIO_COPILOT_SUGGESTION_TYPES, ["NEXT_STEP", "STYLE_IMPROVEMENT", "WORKFLOW_SUGGESTION", "COST_WARNING", "QUALITY_WARNING"]);
  assert.equal(studioCopilotSuggestionLabel("WORKFLOW_SUGGESTION"), "Workflow suggestion");
});

test("Creative Copilot Panel displays Context, Workflow, suggestions, and Task status", () => {
  const component = fs.readFileSync("src/features/studio/components/StudioProjectCopilot.tsx", "utf8");
  assert.match(component, /Creative Copilot/);
  assert.match(component, /Project summary/);
  assert.match(component, /Current goal/);
  assert.match(component, /memoryCount/);
  assert.match(component, /workflowTemplateCount/);
  assert.match(component, /taskStatus\.waitingHuman/);
  assert.match(component, /pendingActions/);
});

test("Accept and Dismiss remain explicit user actions and Accept creates Draft only", () => {
  const component = fs.readFileSync("src/features/studio/components/StudioProjectCopilot.tsx", "utf8");
  const api = fs.readFileSync("src/lib/studio-project-copilot-api.ts", "utf8");
  assert.match(component, /"ACCEPT"/);
  assert.match(component, /"DISMISS"/);
  assert.match(component, /Accept as Draft/);
  assert.match(component, /Draft created\. Review it before any planning or execution/);
  assert.match(api, /\/api\/projects\/\$\{encodeURIComponent\(projectId\)\}\/copilot/);
  assert.match(api, /method: "POST"/);
});

test("Copilot is mounted in Studio without execution, Provider, or charging hooks", () => {
  const parent = fs.readFileSync("src/features/studio/components/StudioModelRecommendation.tsx", "utf8");
  const sources = [
    fs.readFileSync("src/features/studio/components/StudioProjectCopilot.tsx", "utf8"),
    fs.readFileSync("src/lib/studio-project-copilot-api.ts", "utf8"),
    fs.readFileSync("src/features/studio/capabilities/studioProjectCopilot.ts", "utf8"),
  ].join("\n");
  assert.match(parent, /<StudioProjectCopilot projectId=\{projectId\}/);
  assert.doesNotMatch(sources, /executeStudioWorkflowNode|\/api\/video\/generate|providerTransport|deductCredits|createUsageRecord/i);
});
