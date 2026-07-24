export type StudioProductionDeliveryStatus =
  | "DRAFT"
  | "READY"
  | "DELIVERED"
  | "ARCHIVED";

export type StudioProductionDeliveryPackage = Readonly<{
  packageId: string;
  projectId: string;
  productionId: string;
  version: string;
  outputs: readonly Readonly<{
    shotId: string;
    outputRef: string | null;
    videoUrl: string | null;
    timelineRef: string | null;
    assetRef: string | null;
    quality: Readonly<{
      score: number | null;
      confidence: "HIGH" | "MEDIUM" | "LOW";
      evaluationId: string | null;
    }>;
  }>[];
  assets: readonly Readonly<{
    assetId: string;
    sourceShotIds: readonly string[];
  }>[];
  timelineReferences: readonly string[];
  metadata: Readonly<{
    projectId: string;
    reviewId: string;
    executionPlanId: string;
    outputCount: number;
    assetCount: number;
    timelineReferenceCount: number;
    immutableHistory: true;
  }>;
  qualitySummary: Readonly<{
    reviewId: string;
    reviewStatus: "APPROVED";
    checks: readonly Readonly<{
      type: string;
      status: string;
      score: number | null;
    }>[];
    riskFlags: readonly string[];
  }>;
  status: StudioProductionDeliveryStatus;
  exportPreview: Readonly<{
    format: "REFERENCE_MANIFEST";
    outputCount: number;
    assetCount: number;
    timelineReferenceCount: number;
    externalUpload: false;
    automaticShare: false;
    automaticPublish: false;
  }>;
  createdAt: string;
  controlBoundary: Readonly<{
    approvedResultsOnly: true;
    versionAppendOnly: true;
    automaticPublish: false;
    externalUpload: false;
    automaticShare: false;
    historyDeletion: false;
    creditsDeducted: false;
  }>;
}>;

export type StudioProductionDeliveryCollection = Readonly<{
  projectId: string;
  productionId: string;
  reviewId: string;
  packages: readonly StudioProductionDeliveryPackage[];
  allowedVersions: readonly string[];
  approvalBoundary: Readonly<{
    reviewApproved: true;
    automaticPublish: false;
    externalUpload: false;
    automaticShare: false;
    historyDeletion: false;
    creditsDeducted: false;
  }>;
}>;
