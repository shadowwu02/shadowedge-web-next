export type StudioClientRelationshipMetricName =
  | "PROJECT_COUNT"
  | "APPROVAL_SPEED"
  | "REVISION_RATE"
  | "QUALITY_SCORE"
  | "DELIVERY_HISTORY"
  | "COLLABORATION_PATTERN";

export type StudioClientRelationshipDraft = Readonly<{
  draftId: string;
  clientScope: string;
  type: string;
  status: "DRAFT";
  message: string;
  evidenceRefs: readonly string[];
  createdAt: string;
  boundary: "RELATIONSHIP_RECOMMENDATION_DRAFT_ONLY";
}>;

export type StudioClientRelationshipRecommendation = Readonly<{
  recommendationId: string;
  type: "PREFERENCE_ALIGNMENT" | "RELATIONSHIP_RISK_REVIEW" | "SUCCESS_PATTERN_REUSE";
  message: string;
  evidenceRefs: readonly string[];
  confidence: "HIGH" | "MEDIUM" | "LOW";
  status: "PREVIEW" | "CONFIRMED";
  draft: StudioClientRelationshipDraft | null;
}>;

export type StudioClientRelationshipSnapshot = Readonly<{
  snapshotId: string;
  clientScope: string;
  projects: readonly Readonly<{
    projectId: string;
    approvedDeliveries: number;
    confirmedRevisions: number;
    completedOutcomes: number;
  }>[];
  history: readonly Readonly<{
    evidenceId: string;
    type:
      | "APPROVED_DELIVERY"
      | "CONFIRMED_REVISION"
      | "CLIENT_FEEDBACK_INSIGHT"
      | "COMPLETED_PROJECT_OUTCOME";
    projectId: string;
    referenceFingerprint: string;
    summary: string;
    createdAt: string;
  }>[];
  preferences: readonly Readonly<{
    type: "STYLE_PREFERENCE" | "TIMING_PREFERENCE" | "QUALITY_EXPECTATION";
    evidenceCount: number;
    confidence: "HIGH" | "MEDIUM" | "LOW";
    recommendation: string;
  }>[];
  successPatterns: readonly Readonly<{
    type: "APPROVED_DELIVERY" | "COMPLETED_PROJECT_OUTCOME" | "APPROVAL_PATTERN";
    projectId: string;
    summary: string;
    evidenceRef: string;
  }>[];
  metrics: Readonly<Record<StudioClientRelationshipMetricName, Readonly<{
    value: number | string | null;
    unit: string;
    status?: "VERIFIED" | "UNKNOWN";
  }>>>;
  riskFlags: readonly string[];
  recommendations: readonly StudioClientRelationshipRecommendation[];
  confidence: "HIGH" | "MEDIUM" | "LOW";
  createdAt: string;
  controlBoundary: Readonly<{
    currentUserScopeOnly: true;
    crossClientLearning: false;
    automaticClientProfileMutation: false;
    automaticMessageSending: false;
    automaticProjectMutation: false;
    futureRecommendationDraftOnly: true;
    creditsDeducted: false;
  }>;
}>;

export type StudioClientRelationshipConfirmation = Readonly<{
  snapshot: StudioClientRelationshipSnapshot;
  draft: StudioClientRelationshipDraft;
}>;
