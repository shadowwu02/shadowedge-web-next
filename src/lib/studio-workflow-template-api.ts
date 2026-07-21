import { apiRequest } from "@/lib/api";
import type { StudioCreativeWorkflowTemplateBundle } from "@/features/studio/capabilities/studioCreativeWorkflowTemplate";

export async function getStudioProjectWorkflowTemplates(projectId: string) {
  const envelope = await apiRequest<StudioCreativeWorkflowTemplateBundle>(
    `/api/projects/${encodeURIComponent(projectId)}/workflow-templates`,
  );
  if (!envelope.data?.projectId || !Array.isArray(envelope.data.templates)) throw new Error("Workflow Templates were not returned.");
  return envelope.data;
}
