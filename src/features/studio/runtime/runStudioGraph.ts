import { getStudioExecutor } from "@/features/studio/runtime/executorRegistry";
import type {
  NodeExecutionResult,
  StudioNodeRuntimeState,
} from "@/features/studio/runtime/types";
import type {
  StudioEdge,
  StudioNode,
} from "@/features/studio/types/studioTypes";

type StudioRuntimeCallbacks = {
  onNodeStart: (state: StudioNodeRuntimeState) => void;
  onNodeProgress: (state: StudioNodeRuntimeState) => void;
  onNodeResult: (
    state: StudioNodeRuntimeState,
    result: NodeExecutionResult,
  ) => void;
};

function nowIso() {
  return new Date().toISOString();
}

function getNodeInputIds(
  node: StudioNode,
  edges: StudioEdge[],
  nodeById: Map<string, StudioNode>,
) {
  const inputIds = new Set(
    edges
      .filter((edge) => edge.target === node.id)
      .map((edge) => edge.source),
  );

  if (node.data.kind === "imageGenerate" || node.data.kind === "videoGenerate") {
    const configuredInputs = [
      node.data.promptInput,
      ...(node.data.kind === "imageGenerate"
        ? [node.data.assetInput]
        : [node.data.imageInput, node.data.videoInput]),
    ];
    configuredInputs
      .map((value) => String(value || "").trim())
      .filter((inputId) => inputId && inputId !== node.id && nodeById.has(inputId))
      .forEach((inputId) => inputIds.add(inputId));
  }

  return Array.from(inputIds);
}

function getExecutionOrder(nodes: StudioNode[], edges: StudioEdge[]) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const indegree = new Map(nodes.map((node) => [node.id, 0]));
  const targetsBySource = new Map<string, string[]>();

  for (const node of nodes) {
    for (const sourceId of getNodeInputIds(node, edges, nodeById)) {
      indegree.set(node.id, (indegree.get(node.id) || 0) + 1);
      targetsBySource.set(sourceId, [
        ...(targetsBySource.get(sourceId) || []),
        node.id,
      ]);
    }
  }

  const queue = nodes.filter((node) => indegree.get(node.id) === 0);
  const ordered: StudioNode[] = [];

  while (queue.length > 0) {
    const node = queue.shift();
    if (!node) break;
    ordered.push(node);

    for (const targetId of targetsBySource.get(node.id) || []) {
      const nextIndegree = (indegree.get(targetId) || 0) - 1;
      indegree.set(targetId, nextIndegree);
      if (nextIndegree === 0) {
        const target = nodeById.get(targetId);
        if (target) queue.push(target);
      }
    }
  }

  // React Flow currently permits cycles. Keep mock execution deterministic by
  // appending cyclic nodes in canvas order after the acyclic portion.
  const orderedIds = new Set(ordered.map((node) => node.id));
  return [...ordered, ...nodes.filter((node) => !orderedIds.has(node.id))];
}

export async function runStudioGraph({
  projectId,
  nodes,
  edges,
  onNodeStart,
  onNodeProgress,
  onNodeResult,
}: {
  projectId: string | null;
  nodes: StudioNode[];
  edges: StudioEdge[];
} & StudioRuntimeCallbacks) {
  const outputsByNodeId: Record<string, Record<string, unknown>> = {};
  const executionOrder = getExecutionOrder(nodes, edges);
  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  for (const node of executionOrder) {
    const startedAt = nowIso();
    const runningState: StudioNodeRuntimeState = {
      nodeId: node.id,
      status: "running",
      startedAt,
      finishedAt: null,
      outputs: {},
    };
    onNodeStart(runningState);

    const inputs = Object.fromEntries(
      getNodeInputIds(node, edges, nodeById).map((sourceId) => [
        sourceId,
        outputsByNodeId[sourceId] || {},
      ]),
    );
    const { executor } = getStudioExecutor(node.type);
    let currentOutputs: Record<string, unknown> = {};

    let result: NodeExecutionResult;
    try {
      result = await executor.execute({
        projectId,
        nodeId: node.id,
        inputs,
        config: node.data,
        reportProgress: (progress) => {
          currentOutputs = {
            ...currentOutputs,
            ...(progress.outputs || {}),
          };
          onNodeProgress({
            nodeId: node.id,
            status: progress.status,
            startedAt,
            finishedAt: null,
            outputs: currentOutputs,
            error: progress.error,
          });
        },
      });
    } catch (error) {
      result = {
        status: "failed",
        outputs: {},
        error: error instanceof Error ? error.message : "Node executor failed",
      };
    }

    const finalOutputs = {
      ...currentOutputs,
      ...result.outputs,
    };
    outputsByNodeId[node.id] = finalOutputs;
    onNodeResult(
      {
        nodeId: node.id,
        status: result.status,
        startedAt,
        finishedAt: nowIso(),
        outputs: finalOutputs,
        error: result.error,
      },
      result,
    );
  }
}
