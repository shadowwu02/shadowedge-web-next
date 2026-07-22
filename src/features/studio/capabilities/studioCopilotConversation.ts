export const STUDIO_COPILOT_MESSAGE_ROLES = ["USER", "COPILOT"] as const;
export const STUDIO_COPILOT_RESPONSE_TYPES = ["ANSWER", "SUGGESTION", "DRAFT_PROPOSAL", "WARNING"] as const;

export type StudioCopilotMessageRole = typeof STUDIO_COPILOT_MESSAGE_ROLES[number];
export type StudioCopilotResponseType = typeof STUDIO_COPILOT_RESPONSE_TYPES[number];

export type StudioCopilotContextReference = Readonly<{
  type: "PROJECT_CONTEXT" | "MEMORY" | "WORKFLOW" | "AGENT_HISTORY" | "KNOWLEDGE_NODE" | "PROJECT_INSIGHT" | "PROJECT_EVOLUTION";
  sourceId?: string;
  fields?: readonly string[];
  nodeType?: string;
  insightType?: string;
  milestone?: string;
}>;

export type StudioCopilotDraftProposal = Readonly<{
  draftProposalId: string;
  draftType: "CHARACTER_DRAFT" | "STORYBOARD_DRAFT" | "WORKFLOW_DRAFT" | "PROMPT_DRAFT";
  changes: Readonly<{ visualStyle: string; request: string }>;
  affected: readonly string[];
  requiresConfirm: true;
  status: "PROPOSED";
  actionHandoff: "COPILOT_ACTION_PREVIEW_REQUIRED";
  createdAt: string;
}>;

export type StudioCopilotMessage = Readonly<{
  messageId: string;
  role: StudioCopilotMessageRole;
  content: string;
  references: readonly StudioCopilotContextReference[];
  responseType: StudioCopilotResponseType | null;
  draftProposal?: StudioCopilotDraftProposal | null;
  createdAt: string;
}>;

export type StudioCopilotConversation = Readonly<{
  conversationId: string;
  projectId: string;
  messages: readonly StudioCopilotMessage[];
  contextUsed: readonly StudioCopilotContextReference[];
  draftProposals: readonly StudioCopilotDraftProposal[];
  createdAt: string;
  updatedAt: string;
}>;

export type StudioCopilotChatResult = Readonly<{
  conversation: StudioCopilotConversation;
  reply: StudioCopilotMessage;
  draftProposal: StudioCopilotDraftProposal | null;
  knowledge?: Readonly<{ projectId: string; nodes: readonly Readonly<{ nodeId: string; type: string }>[]; relationships: readonly unknown[] }>;
  insights?: Readonly<{ projectId: string; insights: readonly Readonly<{ insightId: string; type: string }>[] }>;
  evolution?: Readonly<{ projectId: string; timeline: readonly Readonly<{ evolutionId: string; milestone: string }>[]; trends: readonly Readonly<{ type: string; trend: string; confidence: string }>[] }>;
  safety: "CONVERSATION_AND_PROPOSAL_ONLY_NO_PROJECT_MUTATION_OR_EXECUTION";
}>;

export function studioCopilotResponseLabel(type: StudioCopilotResponseType | null) {
  if (!type) return "Message";
  return ({ ANSWER: "Answer", SUGGESTION: "Suggestion", DRAFT_PROPOSAL: "Draft proposal", WARNING: "Warning" } as const)[type];
}

export function studioCopilotContextLabel(type: StudioCopilotContextReference["type"]) {
  return ({ PROJECT_CONTEXT: "Project Context", MEMORY: "Memory", WORKFLOW: "Workflow", AGENT_HISTORY: "Agent History", KNOWLEDGE_NODE: "Knowledge Graph", PROJECT_INSIGHT: "Project Insight", PROJECT_EVOLUTION: "Project Evolution" } as const)[type];
}
