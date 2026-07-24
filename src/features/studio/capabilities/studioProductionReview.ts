export type StudioProductionReviewStatus =
  | "PENDING"
  | "IN_REVIEW"
  | "APPROVED"
  | "REJECTED";

export type StudioProductionReviewGateStatus = "PASS" | "WARNING" | "BLOCKED";

export type StudioProductionReview = Readonly<{
  reviewId: string;
  projectId: string;
  productionRunId: string;
  executionPlanId: string;
  trackingId: string;
  results: readonly Readonly<{
    shotId: string;
    resultRef: Readonly<{
      executionNodeId: string;
      videoUrl: string | null;
      timelineRef: string | null;
      assetRef: string | null;
      outputRef: string | null;
    }>;
    quality: Readonly<{
      score: number | null;
      confidence: "HIGH" | "MEDIUM" | "LOW";
      evaluationId: string | null;
    }>;
    issues: readonly Readonly<{
      issueId: string;
      type: string;
      severity: string;
      message: string;
    }>[];
    qualityChecks: readonly Readonly<{
      type: string;
      status: StudioProductionReviewGateStatus;
      score: number | null;
      threshold: number;
      sourceRefs: readonly string[];
      message: string;
    }>[];
    decision: "PENDING" | "APPROVED" | "REJECTED";
  }>[];
  qualityChecks: readonly Readonly<{
    type: string;
    status: StudioProductionReviewGateStatus;
    score: number | null;
    shotCount: number;
    blockedShots: number;
    warningShots: number;
  }>[];
  riskFlags: readonly string[];
  status: StudioProductionReviewStatus;
  reviewSuggestion: Readonly<{
    actionType: "REVIEW_SUGGESTION";
    status: "PREVIEW" | "CONFIRMED";
    requiresConfirmation: boolean;
    summary: string;
  }>;
  approvalReady: boolean;
  createdAt: string;
  approvedAt: string | null;
  approvedBy: string | null;
  controlBoundary: Readonly<{
    previewThenConfirm: true;
    humanApprovalRequired: true;
    automaticPublish: false;
    assetReplacement: false;
    regeneration: false;
    timelineMutation: false;
    automaticExecution: false;
    creditsDeducted: false;
  }>;
}>;
