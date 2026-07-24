import type { StudioCanvasWorkflowChange } from "@/features/studio/capabilities/studioAgentCanvas";

export const STUDIO_WORKFLOW_TEMPLATE_STATUSES = ["DRAFT", "ACTIVE", "ARCHIVED"] as const;
export type StudioWorkflowTemplateStatus = typeof STUDIO_WORKFLOW_TEMPLATE_STATUSES[number];

export type StudioWorkflowTemplateLibraryEntry = Readonly<{
  templateId: string;
  userId: string;
  name: string;
  nodes: ReadonlyArray<Readonly<{
    nodeId: string;
    nodeType: string;
    role: string | null;
    capability: string | null;
    anchorType: string | null;
    config: Readonly<Record<string, unknown>>;
  }>>;
  edges: ReadonlyArray<Readonly<{
    edgeId: string;
    source: string;
    target: string;
    relationType: string;
  }>>;
  capabilities: readonly string[];
  successSignals: readonly string[];
  successMetrics: Readonly<{
    completionRate: number | null;
    qualityScore: number;
    userRating?: number | null;
    modificationRate?: number;
    failureRate?: number;
  }>;
  source: Readonly<{
    type: string;
    fingerprint: string;
  }>;
  status: StudioWorkflowTemplateStatus;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}>;

export type StudioWorkflowTemplateLibrary = Readonly<{
  templates: readonly StudioWorkflowTemplateLibraryEntry[];
  recommendedTemplateId: string | null;
  privacy: "CURRENT_USER_ONLY_NO_CROSS_USER_TEMPLATE_ACCESS";
  applyBoundary: "PREVIEW_CONFIRM_THEN_NEW_WORKFLOW_DRAFT";
  generatedAt: string;
}>;

export type StudioWorkflowTemplateApplyDraft = Readonly<{
  applyId: string;
  templateId: string;
  projectId: string;
  changes: readonly StudioCanvasWorkflowChange[];
  impact: Readonly<{
    affectedNodes: readonly string[];
    executionImpact: "REQUIRES_NEW_EXECUTION_PREVIEW";
    costImpact: "REQUIRES_COST_REESTIMATE";
    automaticWorkflowReplacement: false;
    creditsDeducted: false;
    blockers: readonly string[];
    risks: readonly string[];
  }>;
  status: "DRAFT" | "BLOCKED" | "CONFIRMED";
  createdAt: string;
  confirmedAt?: string;
  workflowDraft?: Readonly<{
    draftId: string;
    status: "DRAFT";
  }>;
  boundary: "APPLY_PREVIEW_ONLY_NO_PROJECT_MUTATION" | "NEW_WORKFLOW_DRAFT_CREATED_NO_CANVAS_OR_EXECUTION_MUTATION";
}>;
