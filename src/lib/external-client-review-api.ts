import type { ExternalClientReviewWorkspace } from "@/features/studio/capabilities/externalClientReview";
import { apiRequest } from "@/lib/api";

function assertWorkspace(data: ExternalClientReviewWorkspace | undefined) {
  if (!data?.review?.linkId || !data.session?.sessionId) {
    throw new Error("Client Review could not be loaded.");
  }
  return data;
}

export async function getExternalClientReview(token: string, signal?: AbortSignal) {
  const response = await apiRequest<ExternalClientReviewWorkspace>(
    `/api/client/review/${encodeURIComponent(token)}`,
    { signal, token: "" },
  );
  return assertWorkspace(response.data);
}

export async function submitExternalClientReviewAction(
  token: string,
  input: Readonly<{
    action: "COMMENT" | "APPROVE" | "REQUEST_REVISION";
    targetId?: string;
    timestamp?: number;
    content?: string;
  }>,
) {
  const response = await apiRequest<ExternalClientReviewWorkspace>(
    `/api/client/review/${encodeURIComponent(token)}`,
    {
      method: "POST",
      body: JSON.stringify(input),
      token: "",
    },
  );
  return assertWorkspace(response.data);
}
