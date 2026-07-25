import type { StudioExternalReviewPermission } from "@/features/studio/capabilities/studioClientReview";

export type ExternalReviewComment = Readonly<{
  commentId: string;
  targetId: string;
  timestamp: number;
  content: string;
  status: "OPEN";
  createdAt: string;
}>;

export type ExternalReviewDecision = Readonly<{
  decisionId: string;
  type: "APPROVE" | "REQUEST_REVISION";
  content: string;
  createdAt: string;
}>;

export type ExternalClientReviewWorkspace = Readonly<{
  review: Readonly<{
    linkId: string;
    deliveryPackageId: string;
    version: string;
    status: string;
    expiresAt: string;
    permissions: readonly StudioExternalReviewPermission[];
  }>;
  delivery: Readonly<{
    version: string;
    status: string;
    outputs: readonly Readonly<{
      targetId: string;
      label: string;
      videoUrl: string;
    }>[];
    timeline: readonly Readonly<{
      targetId: string;
      label: string;
    }>[];
  }>;
  session: Readonly<{
    sessionId: string;
    status: "OPEN" | "APPROVED" | "REVISION_REQUESTED";
    comments: readonly ExternalReviewComment[];
    decisions: readonly ExternalReviewDecision[];
    createdAt: string;
    updatedAt: string;
  }>;
  boundary: Readonly<{
    deliveryScopeOnly: true;
    studioDataExposed: false;
    agentDataExposed: false;
    workflowDataExposed: false;
    canvasDataExposed: false;
    executionDataExposed: false;
    costDataExposed: false;
    creditsExposed: false;
    workflowExecutionAllowed: false;
  }>;
}>;
