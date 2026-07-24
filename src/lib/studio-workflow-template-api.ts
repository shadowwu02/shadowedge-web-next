import { apiRequest } from "@/lib/api";
import type { StudioCreativeWorkflowTemplateBundle } from "@/features/studio/capabilities/studioCreativeWorkflowTemplate";
import type {
  StudioWorkflowTemplateApplyDraft,
  StudioWorkflowTemplateLibrary,
  StudioWorkflowTemplateLibraryEntry,
} from "@/features/studio/capabilities/studioWorkflowTemplateLibrary";

export async function getStudioProjectWorkflowTemplates(projectId: string) {
  const envelope = await apiRequest<StudioCreativeWorkflowTemplateBundle>(
    `/api/projects/${encodeURIComponent(projectId)}/workflow-templates`,
  );
  if (!envelope.data?.projectId || !Array.isArray(envelope.data.templates)) throw new Error("Workflow Templates were not returned.");
  return envelope.data;
}

export async function getStudioUserWorkflowTemplates() {
  const envelope = await apiRequest<StudioWorkflowTemplateLibrary>("/api/user/workflow-templates");
  if (!Array.isArray(envelope.data?.templates)) throw new Error("Workflow Template Library was not returned.");
  return envelope.data;
}

export async function saveStudioWorkflowTemplate(input: {
  projectId: string;
  draftId: string;
  name: string;
  executionPlanId?: string;
  outcomeId?: string;
}) {
  const envelope = await apiRequest<StudioWorkflowTemplateLibraryEntry>("/api/user/workflow-templates", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!envelope.data?.templateId) throw new Error("Workflow Template was not saved.");
  return envelope.data;
}

export async function previewStudioWorkflowTemplateApply(projectId: string, templateId: string) {
  const envelope = await apiRequest<StudioWorkflowTemplateApplyDraft>(
    `/api/projects/${encodeURIComponent(projectId)}/workflow-template-apply`,
    { method: "POST", body: JSON.stringify({ templateId }) },
  );
  if (!envelope.data?.applyId) throw new Error("Workflow Template Apply preview was not returned.");
  return envelope.data;
}

export async function confirmStudioWorkflowTemplateApply(projectId: string, applyId: string) {
  const envelope = await apiRequest<StudioWorkflowTemplateApplyDraft>(
    `/api/projects/${encodeURIComponent(projectId)}/workflow-template-apply/${encodeURIComponent(applyId)}/confirm`,
    { method: "POST", body: JSON.stringify({ confirm: true }) },
  );
  if (envelope.data?.status !== "CONFIRMED" || !envelope.data.workflowDraft?.draftId) {
    throw new Error("Workflow Template Apply Draft was not confirmed.");
  }
  return envelope.data;
}
