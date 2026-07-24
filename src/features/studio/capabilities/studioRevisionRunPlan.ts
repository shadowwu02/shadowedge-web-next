export type StudioRevisionScopeType =
  | "MODIFY_SHOT"
  | "ADD_SHOT"
  | "REMOVE_SHOT"
  | "UPDATE_ASSET"
  | "UPDATE_AUDIO"
  | "UPDATE_TIMING";

export type StudioRevisionScopeItem = Readonly<{
  type: StudioRevisionScopeType;
  shotId: string | null;
  draftShotRef: string | null;
}>;

export type StudioRevisionRunPlan = Readonly<{
  revisionRunId: string;
  projectId: string;
  proposalId: string;
  sourceWorkflowDraftId: string;
  deliveryPackageId: string;
  revisionScope: readonly StudioRevisionScopeItem[];
  affectedShots: readonly string[];
  preservedShots: readonly string[];
  estimatedCost: Readonly<{
    totalCreditsEstimate: number;
    costConfidence: "HIGH" | "MEDIUM" | "UNKNOWN";
    unknownCost: number;
    status: "COMPLETE" | "PARTIAL";
    deductionPerformed: false;
  }>;
  riskFlags: readonly string[];
  impact: Readonly<{
    modifiedShotIds: readonly string[];
    addedShotRefs: readonly string[];
    removedShotIds: readonly string[];
    preservedShotIds: readonly string[];
    timelineImpact: Readonly<{
      status: "NEW_VERSION_UPDATE_REQUIRED" | "PRESERVED";
      affectedRefs: readonly string[];
    }>;
    assetImpact: Readonly<{
      status: "NEW_VERSION_REBIND_REQUIRED" | "PRESERVED";
      affectedRefs: readonly string[];
    }>;
    sourceDeliveryMutation: false;
  }>;
  versionPlan: Readonly<{
    sourceVersion: string;
    targetVersion: string;
    sourceImmutable: true;
    targetStatus: "PLANNED" | "WORKFLOW_DRAFT";
  }>;
  status: "PREVIEWED" | "BLOCKED" | "CONFIRMED";
  requiresConfirmation: true;
  productionWorkflowDraftRef: Readonly<{
    draftId: string;
    status: "DRAFT";
    boundary: "WORKFLOW_PROPOSAL_ONLY";
  }> | null;
  createdAt: string;
  confirmedAt: string | null;
  controlBoundary: Readonly<{
    productionWorkflowDraftOnly: true;
    executionApprovalRequired: true;
    deliveryReviewRequired: true;
    sourceDeliveryMutation: false;
    automaticExecution: false;
    automaticGeneration: false;
    automaticPublish: false;
    creditsDeducted: false;
  }>;
}>;

export type StudioRevisionRunPlanResponse = Readonly<{
  plan: StudioRevisionRunPlan;
  boundary: StudioRevisionRunPlan["controlBoundary"] | string;
  workflowDraft?: Readonly<{
    draftId: string;
    status: "DRAFT";
    boundary: "WORKFLOW_PROPOSAL_ONLY";
  }>;
}>;
