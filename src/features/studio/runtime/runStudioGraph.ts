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

  if (node.data.kind === "remakeAnalysis") {
    const videoInput = String(node.data.videoInput || "").trim();
    if (videoInput && videoInput !== node.id && nodeById.has(videoInput)) {
      inputIds.add(videoInput);
    }
  }

  if (node.data.kind === "remakePipeline") {
    const sourceNodeId = String(node.data.sourceVideo?.sourceNodeId || "").trim();
    if (sourceNodeId && sourceNodeId !== node.id && nodeById.has(sourceNodeId)) {
      inputIds.add(sourceNodeId);
    }

    const connectedVideoIds = Array.from(inputIds).filter((inputId) => {
      const input = nodeById.get(inputId);
      return input?.data.kind === "asset" && input.data.assetType === "video";
    });
    const analysisIds = new Set<string>();
    const configuredAnalysisId = String(node.data.analysisNodeId || "").trim();
    if (configuredAnalysisId && nodeById.get(configuredAnalysisId)?.data.kind === "remakeAnalysis") {
      analysisIds.add(configuredAnalysisId);
    }
    Array.from(inputIds).forEach((inputId) => {
      if (nodeById.get(inputId)?.data.kind === "remakeAnalysis") {
        analysisIds.add(inputId);
      }
    });
    if (!analysisIds.size && connectedVideoIds.length) {
      nodeById.forEach((candidate) => {
        if (
          candidate.data.kind === "remakeAnalysis" &&
          candidate.data.status === "completed" &&
          (connectedVideoIds.includes(candidate.data.videoInput) ||
            edges.some(
              (edge) =>
                connectedVideoIds.includes(edge.source) &&
                edge.target === candidate.id,
            ))
        ) {
          analysisIds.add(candidate.id);
        }
      });
    }
    analysisIds.forEach((analysisId) => {
      inputIds.add(analysisId);
      const analysisNode = nodeById.get(analysisId);
      if (analysisNode?.data.kind !== "remakeAnalysis") return;
      const configuredVideoId = String(analysisNode.data.videoInput || "").trim();
      if (configuredVideoId && nodeById.get(configuredVideoId)?.data.kind === "asset") {
        inputIds.add(configuredVideoId);
      }
      edges
        .filter((edge) => edge.target === analysisId)
        .map((edge) => edge.source)
        .filter((sourceId) => {
          const source = nodeById.get(sourceId);
          return source?.data.kind === "asset" && source.data.assetType === "video";
        })
        .forEach((sourceId) => inputIds.add(sourceId));
    });
    if (!(node.data.status === "completed" && node.data.shotCount > 0)) {
      nodeById.forEach((candidate) => {
        if (
          candidate.data.kind === "remakeShot" &&
          analysisIds.has(candidate.data.analysisNodeId)
        ) {
          inputIds.add(candidate.id);
        }
      });
    }
  }

  if (node.data.kind === "videoEdit") {
    const sourceNodeId = String(node.data.sourceVideo?.sourceNodeId || "").trim();
    if (sourceNodeId && sourceNodeId !== node.id && nodeById.has(sourceNodeId)) {
      inputIds.add(sourceNodeId);
    }
  }

  if (node.data.kind === "motionControl") {
    [
      node.data.sourceImage?.sourceNodeId,
      node.data.motionReferenceVideo?.sourceNodeId,
    ]
      .map((value) => String(value || "").trim())
      .filter(
        (sourceNodeId) =>
          sourceNodeId && sourceNodeId !== node.id && nodeById.has(sourceNodeId),
      )
      .forEach((sourceNodeId) => inputIds.add(sourceNodeId));
  }

  if (node.data.kind === "cameraControl") {
    const sourceNodeId = String(node.data.sourceImage?.sourceNodeId || "").trim();
    if (sourceNodeId && sourceNodeId !== node.id && nodeById.has(sourceNodeId)) {
      inputIds.add(sourceNodeId);
    }
  }

  return Array.from(inputIds);
}

function persistedNodeOutput(node: StudioNode): Record<string, unknown> {
  const data = node.data;
  if (data.kind === "asset") {
    return {
      executor: "asset",
      assetId: data.assetId,
      assetType: data.assetType,
      url: data.url,
      thumbnail: data.thumbnail || data.url,
      source: data.source,
      status: data.status,
      metadata: data.metadata,
    };
  }
  if (data.kind === "character") {
    return {
      executor: "character",
      characterId: node.id,
      name: data.name,
      referenceImages: data.referenceImages,
      description: data.description,
      style: data.style,
      attributes: data.attributes,
      status: data.status,
      providerCalled: false,
    };
  }
  if (data.kind === "prompt") {
    return {
      executor: "prompt",
      prompt: data.prompt,
      style: data.style,
      camera: data.camera,
      duration: data.duration,
      ratio: data.ratio,
    };
  }
  if (data.kind === "remakeShot") {
    return {
      executor: "remake_shot",
      analysisNodeId: data.analysisNodeId,
      storyboardId: data.storyboardId,
      shotId: data.shotId,
      shotNumber: data.shotNumber,
      description: data.description,
      prompt: data.prompt,
      camera: data.camera,
      duration: data.duration,
      ratio: data.ratio,
      model: data.model,
      quality: data.quality,
      referenceImages: data.referenceFrames,
      characterRefs: data.characterRefs,
      sourceTimeRange: data.sourceTimeRange,
      status: data.status,
    };
  }
  if (data.kind === "imageGenerate") {
    return {
      executor: "image_generate",
      jobId: data.jobId,
      imageUrl: data.imageUrl || data.result,
      thumbnail: data.thumbnail,
      model: data.model,
      status: data.status,
      errorCode: data.errorCode,
      message: data.errorMessage,
    };
  }
  if (data.kind === "videoGenerate") {
    return {
      executor: "video_generate",
      jobId: data.jobId,
      videoUrl: data.videoUrl || data.result,
      thumbnail: data.thumbnail,
      model: data.model,
      status: data.status,
      errorCode: data.errorCode,
      message: data.errorMessage,
    };
  }
  if (data.kind === "videoEdit") {
    return {
      executor: "video_edit",
      jobId: data.result?.jobId || "",
      type: "video",
      url: data.result?.videoUrl || "",
      videoUrl: data.result?.videoUrl || "",
      thumbnail: data.result?.thumbnail || "",
      source: "generated",
      mode: data.mode,
      prompt: data.prompt,
      status: data.status,
      errorCode: data.errorCode,
      message: data.errorMessage,
      mock: data.result?.mock === true,
    };
  }
  if (data.kind === "motionControl") {
    return {
      executor: "motion_control",
      jobId: data.result?.jobId || "",
      type: "video",
      url: data.result?.videoUrl || "",
      videoUrl: data.result?.videoUrl || "",
      thumbnail: data.result?.thumbnail || "",
      source: "generated",
      mode: data.mode,
      prompt: data.prompt,
      status: data.status,
      errorCode: data.errorCode,
      message: data.errorMessage,
      mock: data.result?.mock === true,
    };
  }
  if (data.kind === "cameraControl") {
    return {
      executor: "camera_control",
      jobId: data.result?.jobId || "",
      type: "video",
      url: data.result?.videoUrl || "",
      videoUrl: data.result?.videoUrl || "",
      thumbnail: data.result?.thumbnail || "",
      source: "generated",
      preset: data.preset,
      prompt: data.prompt,
      duration: data.duration,
      characterIds: data.characterRefs,
      status: data.status,
      errorCode: data.errorCode,
      message: data.errorMessage,
      mock: data.result?.mock === true,
    };
  }
  if (data.kind === "remakeAnalysis") {
    return {
      executor: "remake_analysis",
      storyboardId: data.storyboardId,
      shotCount: data.shotCount,
      status: data.status,
      errorCode: data.errorCode,
      message: data.errorMessage,
    };
  }
  if (data.kind === "remakePipeline") {
    return {
      executor: "remake_pipeline",
      analysisNodeId: data.analysisNodeId,
      shotCount: data.shotCount,
      videoNodeCount: data.videoNodeCount,
      timelineClipCount: data.timelineClipCount,
      status: data.status,
      generationStarted: data.generationStarted,
      providerCallMade: data.providerCallMade,
      errorCode: data.errorCode,
      message: data.errorMessage,
    };
  }
  return {
    executor: "output",
    jobId: data.jobId,
    result: data.resultPreview,
    imageUrl: data.outputType === "image" ? data.resultPreview : "",
    videoUrl: data.outputType === "video" ? data.resultPreview : "",
    thumbnail: data.thumbnail,
    outputType: data.outputType,
    status: data.status,
    message: data.errorMessage,
  };
}

function buildPersistedInputs(
  node: StudioNode,
  nodes: StudioNode[],
  edges: StudioEdge[],
) {
  const nodeById = new Map(nodes.map((item) => [item.id, item]));
  return Object.fromEntries(
    getNodeInputIds(node, edges, nodeById)
      .map((sourceId) => nodeById.get(sourceId))
      .filter((source): source is StudioNode => Boolean(source))
      .map((source) => [source.id, persistedNodeOutput(source)]),
  );
}

export function getStudioRetryPreflight(
  nodeId: string,
  nodes: StudioNode[],
  edges: StudioEdge[],
) {
  const node = nodes.find((item) => item.id === nodeId);
  if (!node) {
    return { ok: false, errorCode: "NODE_NOT_FOUND", message: "The node no longer exists." };
  }

  const data = node.data;
  const hasCompletedResult =
    (data.kind === "imageGenerate" && data.status === "completed" && Boolean(data.imageUrl || data.result)) ||
    (data.kind === "videoGenerate" && data.status === "completed" && Boolean(data.videoUrl || data.result)) ||
    (data.kind === "videoEdit" && data.status === "completed" && Boolean(data.result?.videoUrl)) ||
    (data.kind === "motionControl" && data.status === "completed" && Boolean(data.result?.videoUrl)) ||
    (data.kind === "cameraControl" && data.status === "completed" && Boolean(data.result?.videoUrl)) ||
    (data.kind === "remakeAnalysis" && data.status === "completed" && Boolean(data.storyboardId)) ||
    (data.kind === "remakePipeline" && data.status === "completed" && data.shotCount > 0) ||
    (data.kind === "output" && data.status === "completed" && Boolean(data.resultPreview));
  if (hasCompletedResult) {
    return {
      ok: false,
      errorCode: "COMPLETED_RESULT_EXISTS",
      message: "This node already has a completed result and will not be charged again.",
    };
  }

  const inputs = Object.values(buildPersistedInputs(node, nodes, edges));
  const invalidGeneratedInput = inputs.find(
    (input) =>
      (input.executor === "image_generate" ||
        input.executor === "video_generate" ||
        input.executor === "video_edit" ||
        input.executor === "motion_control" ||
        input.executor === "camera_control") &&
      (input.status !== "completed" || !(input.imageUrl || input.videoUrl)),
  );
  if (invalidGeneratedInput) {
    return {
      ok: false,
      errorCode: "UPSTREAM_INPUT_INVALID",
      message: "An upstream generated result is missing or incomplete.",
    };
  }

  if (data.kind === "imageGenerate" || data.kind === "videoGenerate") {
    const prompt = inputs.find(
      (input) => typeof input.prompt === "string" && input.prompt.trim(),
    );
    if (!prompt) {
      return {
        ok: false,
        errorCode: "UPSTREAM_INPUT_INVALID",
        message: "Connect a Prompt or Remake Shot node with a valid prompt before retrying.",
      };
    }
  }

  if (data.kind === "remakeAnalysis") {
    const video = inputs.find(
      (input) => input.assetType === "video" && typeof input.url === "string" && input.url.trim(),
    );
    if (!video) {
      return {
        ok: false,
        errorCode: "UPSTREAM_INPUT_INVALID",
        message: "Connect a ready Video Asset before retrying Remake analysis.",
      };
    }
  }

  if (data.kind === "remakePipeline") {
    const video = inputs.find(
      (input) => input.assetType === "video" && typeof input.url === "string" && input.url.trim(),
    );
    const analysis = inputs.find(
      (input) =>
        input.executor === "remake_analysis" &&
        input.status === "completed" &&
        typeof input.storyboardId === "string" &&
        input.storyboardId.trim(),
    );
    const shot = inputs.find((input) => input.executor === "remake_shot");
    if (!video || !analysis || !shot) {
      return {
        ok: false,
        errorCode: "REMAKE_PIPELINE_INPUT_INVALID",
        message: "A ready Video Asset, completed Remake Analysis, and Shot Nodes are required.",
      };
    }
  }

  if (data.kind === "videoGenerate" && data.pipelineExecutionBlocked) {
    return {
      ok: false,
      errorCode: "REMAKE_PIPELINE_GENERATION_LOCKED",
      message: "This planned video is locked until a future generation confirmation flow is enabled.",
    };
  }

  if (data.kind === "videoEdit") {
    const video = inputs.find(
      (input) =>
        input.assetType === "video" &&
        typeof input.url === "string" &&
        input.url.trim(),
    );
    if (!video) {
      return {
        ok: false,
        errorCode: "UPSTREAM_INPUT_INVALID",
        message: "Connect a ready Video Asset before retrying Video Edit.",
      };
    }
  }

  if (data.kind === "motionControl") {
    const image = inputs.find(
      (input) =>
        input.assetType === "image" &&
        typeof input.url === "string" &&
        input.url.trim(),
    );
    const video = inputs.find(
      (input) =>
        input.assetType === "video" &&
        typeof input.url === "string" &&
        input.url.trim(),
    );
    if (!image || !video) {
      return {
        ok: false,
        errorCode: "UPSTREAM_INPUT_INVALID",
        message:
          "Connect one ready Image Asset and one Motion Reference Video Asset before retrying Motion Control.",
      };
    }
  }

  if (data.kind === "cameraControl") {
    const imageOrCharacter = inputs.find(
      (input) =>
        (input.assetType === "image" &&
          typeof input.url === "string" &&
          input.url.trim()) ||
        (input.executor === "character" &&
          Array.isArray(input.referenceImages) &&
          input.referenceImages.length > 0),
    );
    if (!imageOrCharacter) {
      return {
        ok: false,
        errorCode: "UPSTREAM_INPUT_INVALID",
        message: "Connect a Character or ready Image Asset before retrying Camera Control.",
      };
    }
  }

  return { ok: true, errorCode: "", message: "" };
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
    if (
      node.data.kind === "remakePipeline" &&
      node.data.status === "completed" &&
      node.data.shotCount > 0
    ) {
      continue;
    }
    if (
      node.data.kind === "videoGenerate" &&
      node.data.pipelineExecutionBlocked
    ) {
      continue;
    }
    const startedAt = nowIso();
    const runningState: StudioNodeRuntimeState = {
      nodeId: node.id,
      status: "running",
      startedAt,
      finishedAt: null,
      outputs: {},
    };
    onNodeStart(runningState);

    if (
      node.type === "imageGenerate" ||
      node.type === "videoGenerate" ||
      node.type === "video_edit" ||
      node.type === "motion_control" ||
      node.type === "camera_control"
    ) {
      const executor =
        node.type === "videoGenerate"
          ? "video_generate"
          : node.type === "video_edit"
            ? "video_edit"
            : node.type === "motion_control"
              ? "motion_control"
              : node.type === "camera_control"
                ? "camera_control"
            : "image_generate";
      const message =
        node.type === "videoGenerate"
          ? "Paid Video Generate Nodes must be confirmed through a Generation Plan and Queue."
          : node.type === "video_edit"
            ? "Video Edit Nodes must be confirmed through a Generation Plan and Queue."
            : node.type === "motion_control"
              ? "Motion Control Nodes must be confirmed through a Generation Plan and Queue."
              : node.type === "camera_control"
                ? "Camera Control Nodes must be confirmed through a Generation Plan and Queue."
            : "Paid Image Generate Nodes are blocked until Image Queue support is available.";
      const blockedResult: NodeExecutionResult = {
        status: "failed",
        outputs: {
          executor,
          errorCode:
            node.type === "videoGenerate" ||
            node.type === "video_edit" ||
            node.type === "motion_control" ||
            node.type === "camera_control"
              ? "GENERATION_PLAN_REQUIRED"
              : "STUDIO_IMAGE_QUEUE_UNSUPPORTED",
          message,
        },
        error: message,
      };
      onNodeResult(
        {
          nodeId: node.id,
          status: "failed",
          startedAt,
          finishedAt: nowIso(),
          outputs: blockedResult.outputs,
          error: message,
        },
        blockedResult,
      );
      break;
    }

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

export async function runSingleStudioNode({
  projectId,
  nodeId,
  nodes,
  edges,
  onNodeStart,
  onNodeProgress,
  onNodeResult,
  executionSource = "direct",
}: {
  projectId: string | null;
  nodeId: string;
  nodes: StudioNode[];
  edges: StudioEdge[];
  executionSource?: "direct" | "generation_queue";
} & StudioRuntimeCallbacks) {
  const node = nodes.find((item) => item.id === nodeId);
  if (!node) throw new Error("Studio node was not found.");

  const startedAt = nowIso();
  onNodeStart({
    nodeId: node.id,
    status: "running",
    startedAt,
    finishedAt: null,
    outputs: {},
  });

  if (
    (node.type === "imageGenerate" ||
      node.type === "videoGenerate" ||
      node.type === "video_edit" ||
      node.type === "motion_control" ||
      node.type === "camera_control") &&
    executionSource !== "generation_queue"
  ) {
    const executor =
      node.type === "videoGenerate"
        ? "video_generate"
        : node.type === "video_edit"
          ? "video_edit"
          : node.type === "motion_control"
            ? "motion_control"
            : node.type === "camera_control"
              ? "camera_control"
          : "image_generate";
    const message =
      node.type === "videoGenerate"
        ? "Paid Video Generate Nodes must be confirmed through a Generation Plan and Queue."
        : node.type === "video_edit"
          ? "Video Edit Nodes must be confirmed through a Generation Plan and Queue."
          : node.type === "motion_control"
            ? "Motion Control Nodes must be confirmed through a Generation Plan and Queue."
            : node.type === "camera_control"
              ? "Camera Control Nodes must be confirmed through a Generation Plan and Queue."
          : "Paid Image Generate Nodes are blocked until Image Queue support is available.";
    const blockedResult: NodeExecutionResult = {
      status: "failed",
      outputs: {
        executor,
        errorCode:
          node.type === "videoGenerate" ||
          node.type === "video_edit" ||
          node.type === "motion_control" ||
          node.type === "camera_control"
            ? "GENERATION_PLAN_REQUIRED"
            : "STUDIO_IMAGE_QUEUE_UNSUPPORTED",
        message,
      },
      error: message,
    };
    onNodeResult(
      {
        nodeId: node.id,
        status: "failed",
        startedAt,
        finishedAt: nowIso(),
        outputs: blockedResult.outputs,
        error: message,
      },
      blockedResult,
    );
    return blockedResult;
  }

  const { executor } = getStudioExecutor(node.type);
  let currentOutputs: Record<string, unknown> = {};
  let result: NodeExecutionResult;
  try {
    result = await executor.execute({
      projectId,
      nodeId: node.id,
      inputs: buildPersistedInputs(node, nodes, edges),
      config: node.data,
      reportProgress: (progress) => {
        currentOutputs = { ...currentOutputs, ...(progress.outputs || {}) };
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

  const finalOutputs = { ...currentOutputs, ...result.outputs };
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
  return result;
}
