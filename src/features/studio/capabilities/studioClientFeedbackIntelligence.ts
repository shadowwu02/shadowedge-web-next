export type StudioClientFeedbackPatternType =
  | "STYLE_PREFERENCE"
  | "TIMING_PREFERENCE"
  | "QUALITY_EXPECTATION"
  | "REVISION_PATTERN"
  | "APPROVAL_PATTERN";

export type StudioClientFeedbackEvidence = Readonly<{
  evidenceId: string;
  type:
    | "CLIENT_REVIEW_COMMENT"
    | "APPROVED_REVISION"
    | "DELIVERY_FEEDBACK"
    | "DELIVERY_APPROVAL"
    | "PROJECT_HISTORY";
  referenceFingerprint: string;
  summary: string;
  createdAt: string;
}>;

export type StudioProjectMemoryDraft = Readonly<{
  draftId: string;
  projectId: string;
  type: "CLIENT_PREFERENCE";
  status: "DRAFT";
  summary: string;
  evidenceRefs: readonly string[];
  sourcePatternId: string;
  createdAt: string;
  boundary: "PROJECT_MEMORY_DRAFT_ONLY";
}>;

export type StudioClientFeedbackPattern = Readonly<{
  patternId: string;
  projectId: string;
  clientScope: string;
  patterns: readonly Readonly<{
    type: StudioClientFeedbackPatternType;
    signal: string;
    evidenceCount: number;
    confidence: "HIGH" | "MEDIUM" | "LOW";
    recommendation: string;
  }>[];
  evidence: readonly StudioClientFeedbackEvidence[];
  confidence: "HIGH" | "MEDIUM" | "LOW";
  status: "PREVIEW" | "CONFIRMED";
  memoryDraft: StudioProjectMemoryDraft | null;
  historicalFeedbackCount: number;
  createdAt: string;
  confirmedAt?: string;
}>;

export type StudioClientFeedbackIntelligence = Readonly<{
  projectId: string;
  patterns: readonly StudioClientFeedbackPattern[];
  summary: Readonly<{
    clientScopeCount: number;
    patternCount: number;
    evidenceCount: number;
    confirmedMemoryDraftCount: number;
  }>;
  controlBoundary: Readonly<{
    previewThenHumanConfirm: true;
    projectMemoryDraftOnly: true;
    crossClientLearning: false;
    automaticPreferenceMutation: false;
    automaticProjectMutation: false;
    automaticRevisionExecution: false;
    creditsDeducted: false;
  }>;
}>;

export type StudioClientFeedbackConfirmation = Readonly<{
  pattern: StudioClientFeedbackPattern;
  memoryDraft: StudioProjectMemoryDraft;
}>;
