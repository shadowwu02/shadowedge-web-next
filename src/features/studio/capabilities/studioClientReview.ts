import type { StudioProductionDeliveryPackage } from "@/features/studio/capabilities/studioProductionDelivery";

export type StudioReviewCommentStatus = "OPEN" | "RESOLVED" | "ARCHIVED";

export type StudioReviewComment = Readonly<{
  commentId: string;
  timestamp: number;
  targetRef: string;
  content: string;
  status: StudioReviewCommentStatus;
  createdAt: string;
}>;

export type StudioRevisionRequestDraft = Readonly<{
  revisionId: string;
  deliveryVersion: string;
  comments: readonly Readonly<{
    commentId: string;
    targetRef: string;
    timestamp: number;
  }>[];
  impact: Readonly<{
    commentCount: number;
    targetCount: number;
    affectedShotIds: readonly string[];
    affectedOutputRefs: readonly string[];
    affectedTimelineRefs: readonly string[];
    affectedAssetRefs: readonly string[];
    outputMutation: false;
    regeneration: false;
    automaticExecution: false;
    workflowImpact: "NEW_WORKFLOW_DRAFT_ONLY";
  }>;
  status: "PREVIEW" | "CONFIRMED";
  createdAt: string;
  confirmedAt: string | null;
  workflowDraftRef: Readonly<{
    draftId: string;
    status: "DRAFT";
    boundary: "WORKFLOW_PROPOSAL_ONLY";
  }> | null;
}>;

export type StudioClientReviewSession = Readonly<{
  reviewSessionId: string;
  projectId: string;
  deliveryPackageId: string;
  deliveryVersion: string;
  comments: readonly StudioReviewComment[];
  revisions: readonly StudioRevisionRequestDraft[];
  status: "OPEN" | "REVISION_DRAFT" | "REVISION_CONFIRMED" | "CLOSED";
  createdAt: string;
  updatedAt: string;
  controlBoundary: Readonly<{
    feedbackOnly: true;
    revisionPreviewThenConfirm: true;
    outputMutation: false;
    regeneration: false;
    automaticPublish: false;
    automaticExecution: false;
    creditsDeducted: false;
  }>;
}>;

export type StudioClientReviewWorkspace = Readonly<{
  projectId: string;
  deliveryPackage: StudioProductionDeliveryPackage;
  session: StudioClientReviewSession;
}>;

export type StudioClientReviewMutation = Readonly<{
  session: StudioClientReviewSession;
  comment?: StudioReviewComment;
  revision?: StudioRevisionRequestDraft;
  workflowDraft?: Readonly<{
    draftId: string;
    status: "DRAFT";
    boundary: "WORKFLOW_PROPOSAL_ONLY";
  }>;
}>;

export type StudioExternalReviewPermission = "VIEW" | "COMMENT" | "APPROVE" | "REQUEST_REVISION";

export type StudioClientReviewLinkResult = Readonly<{
  link: Readonly<{
    linkId: string;
    deliveryPackageId: string;
    clientScope: string;
    permissions: readonly StudioExternalReviewPermission[];
    expiresAt: string;
    createdAt: string;
  }>;
  token: string;
  reviewPath: string;
}>;
