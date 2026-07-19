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
  edges: StudioEdge[];
  changed: boolean;
  bound: boolean;
  targetNodeIds: string[];
  createdOutputNodeId: string;
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

function uniqueId(base: string, used: Set<string>) {
  if (!used.has(base)) return base;
  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

function outputNodeForSource(nodes: StudioNode[], edges: StudioEdge[], sourceNodeId: string) {
  const incomingTargets = new Set(edges.map((edge) => edge.target));
  return nodes.find(
    (node) =>
      node.data.kind === "output" &&
      (node.data.sourceNodeId === sourceNodeId || !incomingTargets.has(node.id)),
  );
}

function createDefaultOutputNode(nodes: StudioNode[], sourceNodeId: string): StudioNode {
  const source = nodes.find((node) => node.id === sourceNodeId);
  const id = uniqueId(`output-${sourceNodeId}`, new Set(nodes.map((node) => node.id)));
  return {
    id,
    type: "output",
    position: {
      x: (source?.position.x || 0) + 360,
      y: source?.position.y || 0,
    },
    data: {
      kind: "output",
      title: "Workflow output",
      sourceNodeId: "",
      resultPreview: "Awaiting an upstream result",
      videoUrl: "",
      outputType: "video",
      createdAt: "",
      completedAt: "",
      status: "idle",
      jobId: "",
      thumbnail: "",
      errorMessage: "",
    },
  } satisfies StudioNode;
}

export function bindVideoResultToOutputNodes(
  input: VideoOutputBindingInput,
): VideoOutputBindingResult {
  const sourceNodeId = clean(input.sourceNodeId);
  const videoUrl = clean(input.videoUrl);
  const status = outputStatus(clean(input.status), videoUrl);
  let nodes = input.nodes;
  let edges = input.edges;
  let structureChanged = false;
  let createdOutputNodeId = "";
  const targetIds = new Set(
    edges
      .filter((edge) => edge.source === sourceNodeId)
      .map((edge) => edge.target),
  );
  let targetNodeIds = nodes
    .filter((node) => targetIds.has(node.id) && node.data.kind === "output")
    .map((node) => node.id);

  if (
    sourceNodeId &&
    !targetNodeIds.length &&
    clean(input.status) === "completed" &&
    videoUrl
  ) {
    let outputNode = outputNodeForSource(nodes, edges, sourceNodeId);
    if (!outputNode) {
      outputNode = createDefaultOutputNode(nodes, sourceNodeId);
      nodes = [...nodes, outputNode];
      createdOutputNodeId = outputNode.id;
      structureChanged = true;
    }
    if (!edges.some((edge) => edge.source === sourceNodeId && edge.target === outputNode.id)) {
      edges = [
        ...edges,
        {
          id: uniqueId(
            `edge-${sourceNodeId}-${outputNode.id}-output`,
            new Set(edges.map((edge) => edge.id)),
          ),
          source: sourceNodeId,
          target: outputNode.id,
          type: "smoothstep",
          animated: true,
        },
      ];
      structureChanged = true;
    }
    targetIds.add(outputNode.id);
    targetNodeIds = [outputNode.id];
  }

  if (!sourceNodeId || !targetNodeIds.length) {
    const terminal = input.status === "completed" || input.status === "failed";
    return {
      nodes,
      edges,
      changed: false,
      bound: false,
      targetNodeIds: [],
      createdOutputNodeId,
      errorCode: terminal ? OUTPUT_NODE_CONNECTION_REQUIRED : "",
    };
  }

  const missingResult = input.status === "completed" && !videoUrl;
  let changed = false;
  const boundNodes = nodes.map((node) => {
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
    nodes: changed ? boundNodes : nodes,
    edges,
    changed: changed || structureChanged,
    bound: true,
    targetNodeIds,
    createdOutputNodeId,
    errorCode: missingResult ? OUTPUT_RESULT_MISSING : "",
  };
}
