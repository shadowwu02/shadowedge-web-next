export type StudioFeedbackIntentType =
  | "STYLE_CHANGE"
  | "CHARACTER_CHANGE"
  | "CAMERA_CHANGE"
  | "TIMING_CHANGE"
  | "AUDIO_CHANGE"
  | "CONTENT_CHANGE"
  | "QUALITY_FIX";

export type StudioFeedbackIntent = Readonly<{
  intentId: string;
  commentId: string;
  type: StudioFeedbackIntentType;
  affectedRefs: readonly string[];
  confidence: "HIGH" | "MEDIUM" | "LOW";
  createdAt: string;
}>;

export type StudioRevisionProposal = Readonly<{
  proposalId: string;
  feedbackIntent: StudioFeedbackIntent;
  affectedShots: readonly string[];
  recommendedChanges: readonly Readonly<{
    changeType: StudioFeedbackIntentType;
    targetRef: string;
    description: string;
    requiresHumanConfirm: true;
  }>[];
  confidence: "HIGH" | "MEDIUM" | "LOW";
  status: "PREVIEW" | "CONFIRMED";
  sourceComment: Readonly<{
    commentId: string;
    content: string;
    targetRef: string;
    timestamp: number;
  }>;
  deliveryPackageId: string;
  deliveryVersion: string;
  workflowDraftRef: Readonly<{
    draftId: string;
    status: "DRAFT";
    boundary: "WORKFLOW_PROPOSAL_ONLY";
  }> | null;
  createdAt: string;
  confirmedAt: string | null;
}>;

export type StudioRevisionIntelligenceBundle = Readonly<{
  projectId: string;
  deliveryPackageId: string;
  deliveryVersion: string;
  proposals: readonly StudioRevisionProposal[];
  summary: Readonly<{
    commentCount: number;
    proposalCount: number;
    confirmedCount: number;
  }>;
  controlBoundary: Readonly<{
    previewThenConfirm: true;
    workflowDraftOnly: true;
    automaticResultMutation: false;
    automaticGeneration: false;
    automaticExecution: false;
    automaticPublish: false;
    creditsDeducted: false;
  }>;
}>;

export type StudioRevisionProposalConfirmation = Readonly<{
  proposal: StudioRevisionProposal;
  workflowDraft: Readonly<{
    draftId: string;
    status: "DRAFT";
    boundary: "WORKFLOW_PROPOSAL_ONLY";
  }>;
}>;
