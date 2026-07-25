import type {
  StudioClientRelationshipConfirmation,
  StudioClientRelationshipSnapshot,
} from "@/features/studio/capabilities/studioClientRelationshipIntelligence";
import { apiRequest } from "@/lib/api";

export async function getStudioClientRelationship(
  clientScope: string,
  signal?: AbortSignal,
) {
  const response = await apiRequest<StudioClientRelationshipSnapshot>(
    `/api/client/${encodeURIComponent(clientScope)}/intelligence`,
    { signal },
  );
  if (!response.data?.snapshotId || response.data.clientScope !== clientScope) {
    throw new Error("Client Relationship Snapshot was not returned.");
  }
  return response.data;
}

export async function confirmStudioClientRelationshipRecommendation(
  clientScope: string,
  recommendationId: string,
) {
  const response = await apiRequest<StudioClientRelationshipConfirmation>(
    `/api/client/${encodeURIComponent(clientScope)}/intelligence/recommendations/${encodeURIComponent(recommendationId)}/confirm`,
    {
      method: "POST",
      body: JSON.stringify({ confirm: true }),
    },
  );
  if (!response.data?.snapshot?.snapshotId || !response.data.draft?.draftId) {
    throw new Error("Client Relationship Recommendation Draft was not returned.");
  }
  return response.data;
}
