export const STUDIO_PROJECT_KNOWLEDGE_NODE_TYPES = ["BRAND", "CHARACTER", "SCENE", "ASSET", "STYLE", "WORKFLOW", "MODEL", "RESULT"] as const;
export const STUDIO_PROJECT_KNOWLEDGE_RELATION_TYPES = ["USES", "BELONGS_TO", "GENERATED_FROM", "INSPIRED_BY", "USED_IN"] as const;

export type StudioProjectKnowledgeNodeType = typeof STUDIO_PROJECT_KNOWLEDGE_NODE_TYPES[number];
export type StudioProjectKnowledgeRelationType = typeof STUDIO_PROJECT_KNOWLEDGE_RELATION_TYPES[number];

export type StudioProjectKnowledgeNode = Readonly<{
  nodeId: string;
  projectId: string;
  type: StudioProjectKnowledgeNodeType;
  referenceId: string;
  metadata: Readonly<Record<string, string | number | boolean | null | readonly string[]>>;
  createdAt: string;
}>;

export type StudioProjectKnowledgeRelationship = Readonly<{
  sourceId: string;
  targetId: string;
  relationType: StudioProjectKnowledgeRelationType;
  confidence: number;
  createdAt: string;
}>;

export type StudioProjectKnowledgeGraph = Readonly<{
  projectId: string;
  nodes: readonly StudioProjectKnowledgeNode[];
  relationships: readonly StudioProjectKnowledgeRelationship[];
  generatedAt: string;
  privacy: "CURRENT_USER_CURRENT_PROJECT_ONLY";
  safety: "INDEX_AND_RETRIEVAL_ONLY_NO_PROJECT_MUTATION_OR_EXECUTION";
}>;

export function studioProjectKnowledgeNodeLabel(type: StudioProjectKnowledgeNodeType) {
  return ({ BRAND: "Brand", CHARACTER: "Characters", SCENE: "Scenes", ASSET: "Assets", STYLE: "Styles", WORKFLOW: "Workflows", MODEL: "Models", RESULT: "Results" } as const)[type];
}

export function studioProjectKnowledgeNodeName(node: StudioProjectKnowledgeNode) {
  const value = node.metadata.name || node.metadata.modelId || node.metadata.assetId || node.referenceId;
  return String(value || node.referenceId);
}
