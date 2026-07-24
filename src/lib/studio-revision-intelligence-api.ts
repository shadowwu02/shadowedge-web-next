import type {
  StudioRevisionIntelligenceBundle,
  StudioRevisionProposalConfirmation,
} from "@/features/studio/capabilities/studioRevisionIntelligence";
import { apiRequest } from "@/lib/api";

export async function getStudioRevisionProposals(
  projectId: string,
  deliveryPackageId: string,
  signal?: AbortSignal,
) {
  const response = await apiRequest<StudioRevisionIntelligenceBundle>(
    `/api/projects/${encodeURIComponent(projectId)}/revision-proposals?deliveryPackageId=${encodeURIComponent(deliveryPackageId)}`,
    { signal },
  );
  if (!response.data?.projectId || !Array.isArray(response.data.proposals)) {
    throw new Error("AI Revision Suggestions were not returned.");
  }
  return response.data;
}

export async function confirmStudioRevisionProposal(
  projectId: string,
  proposalId: string,
  deliveryPackageId: string,
) {
  const response = await apiRequest<StudioRevisionProposalConfirmation>(
    `/api/projects/${encodeURIComponent(projectId)}/revision-proposals/${encodeURIComponent(proposalId)}/confirm`,
    {
      method: "POST",
      body: JSON.stringify({ deliveryPackageId, confirm: true }),
    },
  );
  if (!response.data?.proposal?.proposalId || !response.data.workflowDraft?.draftId) {
    throw new Error("Confirmed Revision Proposal was not returned.");
  }
  return response.data;
}
