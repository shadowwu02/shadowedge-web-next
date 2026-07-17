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
  onNodeResult: (
    state: StudioNodeRuntimeState,
    result: NodeExecutionResult,
  ) => void;
};

function nowIso() {
  return new Date().toISOString();
}

function getExecutionOrder(nodes: StudioNode[], edges: StudioEdge[]) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const indegree = new Map(nodes.map((node) => [node.id, 0]));
  const targetsBySource = new Map<string, string[]>();

  for (const edge of edges) {
    if (!nodeById.has(edge.source) || !nodeById.has(edge.target)) continue;
    indegree.set(edge.target, (indegree.get(edge.target) || 0) + 1);
    targetsBySource.set(edge.source, [
      ...(targetsBySource.get(edge.source) || []),
      edge.target,
    ]);
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
  onNodeResult,
}: {
  projectId: string | null;
  nodes: StudioNode[];
  edges: StudioEdge[];
} & StudioRuntimeCallbacks) {
  const outputsByNodeId: Record<string, Record<string, unknown>> = {};
  const executionOrder = getExecutionOrder(nodes, edges);

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
      edges
        .filter((edge) => edge.target === node.id)
        .map((edge) => [edge.source, outputsByNodeId[edge.source] || {}]),
    );
    const { executor } = getStudioExecutor(node.type);

    let result: NodeExecutionResult;
    try {
      result = await executor.execute({
        projectId,
        nodeId: node.id,
        inputs,
        config: node.data,
      });
    } catch (error) {
      result = {
        status: "failed",
        outputs: {},
        error: error instanceof Error ? error.message : "Mock executor failed",
      };
    }

    outputsByNodeId[node.id] = result.outputs;
    onNodeResult(
      {
        nodeId: node.id,
        status: result.status,
        startedAt,
        finishedAt: nowIso(),
        outputs: result.outputs,
        error: result.error,
      },
      result,
    );
  }
}
