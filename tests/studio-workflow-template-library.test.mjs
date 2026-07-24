import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("Workflow Template Library exposes reusable schema, qualification, and lifecycle metadata", () => {
  const schema = fs.readFileSync("src/features/studio/capabilities/studioWorkflowTemplateLibrary.ts", "utf8");
  for (const field of [
    "templateId",
    "userId",
    "name",
    "nodes",
    "edges",
    "capabilities",
    "successSignals",
    "createdAt",
    "applyId",
    "changes",
    "impact",
  ]) {
    assert.match(schema, new RegExp(`${field}:`));
  }
  for (const status of ["DRAFT", "ACTIVE", "ARCHIVED"]) {
    assert.match(schema, new RegExp(`"${status}"`));
  }
  assert.match(schema, /CURRENT_USER_ONLY_NO_CROSS_USER_TEMPLATE_ACCESS/);
  assert.match(schema, /PREVIEW_CONFIRM_THEN_NEW_WORKFLOW_DRAFT/);
});

test("Template API supports list, save, Apply Preview, and explicit Apply confirmation", () => {
  const api = fs.readFileSync("src/lib/studio-workflow-template-api.ts", "utf8");
  assert.match(api, /getStudioUserWorkflowTemplates/);
  assert.match(api, /saveStudioWorkflowTemplate/);
  assert.match(api, /previewStudioWorkflowTemplateApply/);
  assert.match(api, /confirmStudioWorkflowTemplateApply/);
  assert.match(api, /\/api\/user\/workflow-templates/);
  assert.match(api, /workflow-template-apply/);
  assert.match(api, /JSON\.stringify\(\{ confirm: true \}\)/);
});

test("Agent Canvas displays Template quality, source, usage, and Impact Analysis", () => {
  const component = fs.readFileSync("src/features/studio/components/StudioAgentCanvas.tsx", "utf8");
  for (const label of [
    "Workflow Templates",
    "Recommended",
    "Success",
    "Source",
    "Used",
    "Preview Apply",
    "Apply Preview",
    "Affected nodes",
    "Confirm Create Workflow Draft",
    "Save as Template",
  ]) {
    assert.match(component, new RegExp(label));
  }
});

test("Template application creates a new Workflow Draft without automatic replacement or execution", () => {
  const component = fs.readFileSync("src/features/studio/components/StudioAgentCanvas.tsx", "utf8");
  const start = component.indexOf("async function saveConfirmedWorkflowTemplate");
  const end = component.indexOf("if (!projectId)", start);
  const templateHandlers = component.slice(start, end);
  assert.match(templateHandlers, /previewStudioWorkflowTemplateApply/);
  assert.match(templateHandlers, /confirmStudioWorkflowTemplateApply/);
  assert.match(templateHandlers, /getStudioCanvasWorkflowDraft/);
  assert.match(templateHandlers, /Review and confirm that Draft separately/);
  assert.doesNotMatch(templateHandlers, /confirmStudioCanvasWorkflowDraft|confirmStudioCanvasExecutionPreview|executeStudioWorkflowNode|generateVideo|deductCredits|updateProject/);
});

test("Template UI states privacy and keeps the active Workflow unchanged during Preview", () => {
  const component = fs.readFileSync("src/features/studio/components/StudioAgentCanvas.tsx", "utf8");
  assert.match(component, /Private to your account/);
  assert.match(component, /never replace the current Workflow/);
  assert.match(component, /Nothing changed/);
  assert.match(component, /current Workflow remains unchanged/);
});
