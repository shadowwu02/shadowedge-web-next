import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("Studio exposes a project-owned Suggested Workflow with explicit use and ignore controls", () => {
  const component = fs.readFileSync("src/features/studio/components/StudioModelRecommendation.tsx", "utf8");
  assert.match(component, /Suggested Workflow/);
  assert.match(component, /Based on your previous successful projects/);
  assert.match(component, /Use workflow/);
  assert.match(component, />Ignore</);
  assert.match(component, /setSelectedWorkflowTemplateId\(suggestedWorkflowTemplate\.templateId\)/);
  assert.match(component, /setSelectedWorkflowTemplateId\(null\)/);
  assert.match(component, /execution still requires confirmation/);
});

test("Workflow Template API is scoped to the current project", () => {
  const api = fs.readFileSync("src/lib/studio-workflow-template-api.ts", "utf8");
  assert.match(api, /\/api\/projects\/\$\{encodeURIComponent\(projectId\)\}\/workflow-templates/);
  assert.doesNotMatch(api, /admin|listAll|userId/);
});

test("template selection is opt-in and travels only as a planning hint", () => {
  const component = fs.readFileSync("src/features/studio/components/StudioModelRecommendation.tsx", "utf8");
  const api = fs.readFileSync("src/lib/studio-creative-agent-api.ts", "utf8");
  assert.match(component, /\.\.\.\(activeWorkflowTemplateId \? \{ workflowTemplateId: activeWorkflowTemplateId \} : \{\}\)/);
  assert.match(api, /workflowTemplateId\?: string/);
  assert.doesNotMatch(component, /workflowTemplateId[\s\S]{0,100}(executeStudioWorkflowNode|confirmStudioWorkflowExecutionPlan)/);
});

test("Creative Plan reports whether a template was explicitly selected", () => {
  const types = fs.readFileSync("src/features/studio/capabilities/studioCapabilityExecutionPlan.ts", "utf8");
  const component = fs.readFileSync("src/features/studio/components/StudioModelRecommendation.tsx", "utf8");
  assert.match(types, /workflowTemplateSuggestion/);
  assert.match(types, /workflowTemplateSelection/);
  assert.match(types, /automaticPlanChange: false/);
  assert.match(component, /Workflow template used/);
  assert.match(component, /Selected by you; all model readiness, verified scope, and cost gates still apply/);
});

test("Workflow Template UI contains no automatic execution, billing, or charging path", () => {
  const files = [
    "src/features/studio/capabilities/studioCreativeWorkflowTemplate.ts",
    "src/lib/studio-workflow-template-api.ts",
  ].map((file) => fs.readFileSync(file, "utf8")).join("\n");
  assert.doesNotMatch(files, /execute|generate|provider|billing|deduct|credits/i);
});
