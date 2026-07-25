import type { StudioAIProjectDraft } from "@/features/studio/capabilities/studioProjectInitialization";
import { apiRequest } from "@/lib/api";

function requireDraft(value: StudioAIProjectDraft | undefined) {
  if (
    !value?.draftId ||
    !value.initializationRequest?.requestId ||
    !value.projectGoal?.goalId ||
    !value.canvasGraph?.graphId
  ) throw new Error("Project Initialization Draft response was incomplete.");
  return value;
}

export async function previewStudioProjectInitialization(input: {
  prompt: string;
  brandContext?: string;
  goal?: string;
  constraints?: Readonly<Record<string, string | number | boolean>>;
}) {
  const response = await apiRequest<StudioAIProjectDraft>("/api/projects/init/preview", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return requireDraft(response.data);
}

export async function confirmStudioProjectInitialization(draftId: string) {
  const response = await apiRequest<StudioAIProjectDraft>("/api/projects/init/confirm", {
    method: "POST",
    body: JSON.stringify({ draftId }),
  });
  return requireDraft(response.data);
}
