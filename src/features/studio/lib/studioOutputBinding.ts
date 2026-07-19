import type {
  OutputNodeStatus,
  StudioEdge,
  StudioNode,
} from "@/features/studio/types/studioTypes";

export const OUTPUT_NODE_CONNECTION_REQUIRED = "OUTPUT_NODE_CONNECTION_REQUIRED";
export const OUTPUT_RESULT_MISSING = "OUTPUT_RESULT_MISSING";

type VideoOutputBindingInput = {
  nodes: StudioNode[];
  edges: StudioEdge[];
  sourceNodeId: string;
  status: string;
  videoUrl?: string;
  thumbnail?: string;
  jobId?: string;
  completedAt?: string;
  errorMessage?: string;
};

export type VideoOutputBindingResult = {
  nodes: StudioNode[];
  changed: boolean;
  bound: boolean;
  targetNodeIds: string[];
  errorCode:
    | ""
    | typeof OUTPUT_NODE_CONNECTION_REQUIRED
    | typeof OUTPUT_RESULT_MISSING;
};

function clean(value: unknown) {
  return String(value || "").trim();
}

function outputStatus(status: string, videoUrl: string): OutputNodeStatus {
  if (status === "failed") return "failed";
  if (status === "completed") return videoUrl ? "completed" : "failed";
  return "processing";
}

export function bindVideoResultToOutputNodes(
  input: VideoOutputBindingInput,
): VideoOutputBindingResult {
  const sourceNodeId = clean(input.sourceNodeId);
  const videoUrl = clean(input.videoUrl);
  const status = outputStatus(clean(input.status), videoUrl);
  const targetIds = new Set(
    input.edges
      .filter((edge) => edge.source === sourceNodeId)
      .map((edge) => edge.target),
  );
  const targetNodeIds = input.nodes
    .filter((node) => targetIds.has(node.id) && node.data.kind === "output")
    .map((node) => node.id);

  if (!sourceNodeId || !targetNodeIds.length) {
    const terminal = input.status === "completed" || input.status === "failed";
    return {
      nodes: input.nodes,
      changed: false,
      bound: false,
      targetNodeIds: [],
      errorCode: terminal ? OUTPUT_NODE_CONNECTION_REQUIRED : "",
    };
  }

  const missingResult = input.status === "completed" && !videoUrl;
  let changed = false;
  const nodes = input.nodes.map((node) => {
    if (!targetIds.has(node.id) || node.data.kind !== "output") return node;

    const completedAt =
      status === "completed"
        ? clean(input.completedAt) ||
          (node.data.sourceNodeId === sourceNodeId ? node.data.completedAt : "") ||
          new Date().toISOString()
        : "";
    const errorMessage =
      status === "failed"
        ? clean(input.errorMessage) ||
          (missingResult
            ? "The completed video did not include a result URL."
            : "Upstream video generation failed.")
        : "";
    const nextData = {
      ...node.data,
      sourceNodeId,
      status,
      videoUrl: status === "completed" ? videoUrl : "",
      resultPreview: status === "completed" ? videoUrl : "",
      outputType: "video" as const,
      createdAt: completedAt,
      completedAt,
      jobId: clean(input.jobId) || node.data.jobId,
      thumbnail:
        status === "completed" ? clean(input.thumbnail) || videoUrl : "",
      errorMessage,
    };
    const same =
      node.data.sourceNodeId === nextData.sourceNodeId &&
      node.data.status === nextData.status &&
      node.data.videoUrl === nextData.videoUrl &&
      node.data.resultPreview === nextData.resultPreview &&
      node.data.outputType === nextData.outputType &&
      node.data.createdAt === nextData.createdAt &&
      node.data.completedAt === nextData.completedAt &&
      node.data.jobId === nextData.jobId &&
      node.data.thumbnail === nextData.thumbnail &&
      node.data.errorMessage === nextData.errorMessage;
    if (same) return node;
    changed = true;
    return { ...node, data: nextData } satisfies StudioNode;
  });

  return {
    nodes: changed ? nodes : input.nodes,
    changed,
    bound: true,
    targetNodeIds,
    errorCode: missingResult ? OUTPUT_RESULT_MISSING : "",
  };
}
