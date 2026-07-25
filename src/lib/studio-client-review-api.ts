import type {
  StudioClientReviewMutation,
  StudioClientReviewLinkResult,
  StudioClientReviewWorkspace,
} from "@/features/studio/capabilities/studioClientReview";
import { apiRequest } from "@/lib/api";

function assertMutation(data: StudioClientReviewMutation | undefined) {
  if (!data?.session?.reviewSessionId) {
    throw new Error("Client Review update was not returned.");
  }
  return data;
}

export async function getStudioClientReviewSession(
  projectId: string,
  deliveryPackageId: string,
  signal?: AbortSignal,
) {
  const response = await apiRequest<StudioClientReviewWorkspace>(
    `/api/projects/${encodeURIComponent(projectId)}/review-session?deliveryPackageId=${encodeURIComponent(deliveryPackageId)}`,
    { signal },
  );
  if (!response.data?.session?.reviewSessionId || !response.data.deliveryPackage?.packageId) {
    throw new Error("Client Review Workspace was not returned.");
  }
  return response.data;
}

export async function createStudioReviewComment(
  projectId: string,
  input: Readonly<{
    deliveryPackageId: string;
    targetRef: string;
    timestamp: number;
    content: string;
  }>,
) {
  const response = await apiRequest<StudioClientReviewMutation>(
    `/api/projects/${encodeURIComponent(projectId)}/review-comment`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  return assertMutation(response.data);
}

export async function createStudioRevisionDraft(
  projectId: string,
  reviewSessionId: string,
  deliveryPackageId: string,
) {
  const response = await apiRequest<StudioClientReviewMutation>(
    `/api/projects/${encodeURIComponent(projectId)}/review-session/${encodeURIComponent(reviewSessionId)}/revision-draft`,
    {
      method: "POST",
      body: JSON.stringify({ deliveryPackageId }),
    },
  );
  return assertMutation(response.data);
}

export async function confirmStudioRevisionDraft(
  projectId: string,
  reviewSessionId: string,
  revisionId: string,
  deliveryPackageId: string,
) {
  const response = await apiRequest<StudioClientReviewMutation>(
    `/api/projects/${encodeURIComponent(projectId)}/review-session/${encodeURIComponent(reviewSessionId)}/revision-draft/${encodeURIComponent(revisionId)}/confirm`,
    {
      method: "POST",
      body: JSON.stringify({ deliveryPackageId, confirm: true }),
    },
  );
  return assertMutation(response.data);
}

export async function createStudioExternalReviewLink(
  projectId: string,
  input: Readonly<{
    deliveryPackageId: string;
    permissions: readonly ("VIEW" | "COMMENT" | "APPROVE" | "REQUEST_REVISION")[];
    expiresAt: string;
  }>,
) {
  const response = await apiRequest<StudioClientReviewLinkResult>(
    `/api/projects/${encodeURIComponent(projectId)}/client-review-link`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  if (!response.data?.link?.linkId || !response.data.token || !response.data.reviewPath) {
    throw new Error("External Review Link was not returned.");
  }
  return response.data;
}
