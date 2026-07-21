export type StudioCreativeWorkflowTemplateMetrics = {
  completionRate: number;
  userRating: number | null;
  modificationRate: number;
  failureRate: number;
  qualityScore: number;
};

export type StudioCreativeWorkflowTemplate = {
  templateId: string;
  name: string;
  capabilities: string[];
  nodes: Array<{
    capability: string;
    inputs: string[];
    outputs: string[];
    dependencies: string[];
  }>;
  successMetrics: StudioCreativeWorkflowTemplateMetrics;
  sourceCount: number;
  createdAt: string;
  updatedAt: string;
};

export type StudioCreativeWorkflowTemplateBundle = {
  projectId: string;
  templates: StudioCreativeWorkflowTemplate[];
  recommendationMode: "SUGGESTION_ONLY_USER_MUST_ACCEPT_OR_IGNORE";
  privacy: "CURRENT_USER_CURRENT_PROJECT_ONLY";
  executionBoundary: "NO_AUTOMATIC_WORKFLOW_CHANGE_OR_EXECUTION";
};
