export const STUDIO_RESOURCE_INSIGHT_TYPES = [
  "ASSET_REUSE_OPPORTUNITY",
  "DUPLICATE_ASSET",
  "STYLE_RESOURCE_MATCH",
  "CHARACTER_REUSE",
  "WORKFLOW_EFFICIENCY",
] as const;

export type StudioResourceInsightType = typeof STUDIO_RESOURCE_INSIGHT_TYPES[number];

export type StudioAssetIntelligenceRecord = Readonly<{
  assetId: string;
  projectId: string | null;
  usageCount: number;
  relatedProjects: readonly string[];
  styleTags: readonly string[];
  reuseScore: number;
  displayName: string;
  mediaType: string;
  source: string;
  createdAt: string;
}>;

export type StudioResourceInsight = Readonly<{
  insightId: string;
  type: StudioResourceInsightType;
  assets: readonly string[];
  projects: readonly string[];
  message: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  createdAt: string;
}>;

export type StudioResourceIntelligence = Readonly<{
  snapshotId: string;
  portfolioId: string;
  assets: readonly StudioAssetIntelligenceRecord[];
  insights: readonly StudioResourceInsight[];
  summary: Readonly<{
    assetCount: number;
    highValueAssetCount: number;
    insightCount: number;
    projectCount: number;
  }>;
  generatedAt: string;
  privacy: "CURRENT_USER_PROJECTS_AND_ASSETS_ONLY";
  actionBoundary: "PREVIEW_CONFIRM_CREATES_ASSET_REUSE_DRAFT_ONLY";
}>;

export function studioResourceInsightLabel(type: StudioResourceInsightType) {
  return type.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (character) => character.toUpperCase());
}
