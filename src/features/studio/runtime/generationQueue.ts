import type {
  StudioGenerationQueueItemStatus,
  StudioNode,
} from "@/features/studio/types/studioTypes";
import { estimateVideoCreditsForParams } from "@/lib/video/videoModelRules";

export const MAX_CONCURRENT_VIDEO_GENERATIONS = 1;
export const MAX_STUDIO_VIDEO_TASKS_PER_RUN = 3;

export type StudioGenerationPlanStatus =
  | "draft"
  | "confirmed"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type StudioGenerationPlanSourceType =
  | "remake_pipeline"
  | "videoGenerate";

export type StudioGenerationPlanItem = {
  nodeId: string;
  type: "video_generate";
  status: StudioGenerationQueueItemStatus;
  model: string;
  estimatedCredits: number;
  startedAt: string | null;
  finishedAt: string | null;
  jobId?: string;
  costCredits?: number;
  creditsBalance?: number;
  errorCode?: string;
  message?: string;
};

export type StudioGenerationPlan = {
  id: string;
  projectId: string;
  sourceNodeId: string;
  sourceNodeType: StudioGenerationPlanSourceType;
  /** Kept for Canvas P1-A7 localStorage compatibility. */
  pipelineNodeId: string;
  status: StudioGenerationPlanStatus;
  items: StudioGenerationPlanItem[];
  estimatedCredits: number;
  createdAt: string;
  updatedAt: string;
  confirmedAt: string | null;
  completedAt: string | null;
  mock: boolean;
};

export function estimateStudioVideoNodeCredits(node: StudioNode) {
  if (node.data.kind !== "videoGenerate") return 0;
  return estimateVideoCreditsForParams(node.data.model, {
    duration: node.data.duration,
    ratio: node.data.ratio,
    quality: node.data.quality,
    resolution: node.data.resolution,
  });
}

export function isActiveStudioGenerationPlan(plan: StudioGenerationPlan) {
  return (
    plan.status === "draft" ||
    plan.status === "confirmed" ||
    plan.status === "running"
  );
}

export function buildStudioGenerationPlanFromNode({
  nodeId,
  nodeType,
  projectId,
  nodes,
}: {
  nodeId: string;
  nodeType: StudioGenerationPlanSourceType;
  projectId: string;
  nodes: StudioNode[];
}): StudioGenerationPlan {
  const sourceNode = nodes.find((node) => node.id === nodeId);
  if (!sourceNode || sourceNode.type !== nodeType) {
    throw new Error("The Generation Plan source node was not found.");
  }

  let videoNodes: StudioNode[];
  if (nodeType === "videoGenerate") {
    if (sourceNode.data.kind !== "videoGenerate") {
      throw new Error("The selected node is not a Video Generate Node.");
    }
    videoNodes = [sourceNode];
  } else {
    if (sourceNode.data.kind !== "remakePipeline") {
      throw new Error("The selected node is not a Remake Pipeline Node.");
    }
    const plannedNodeIds = new Set(sourceNode.data.videoNodeIds);
    videoNodes = nodes.filter((node) => plannedNodeIds.has(node.id));
  }

  const timestamp = new Date().toISOString();
  const items = videoNodes
    .filter((node) => node.data.kind === "videoGenerate")
    .filter(
      (node) =>
        !(
          node.data.kind === "videoGenerate" &&
          node.data.status === "completed" &&
          Boolean(node.data.videoUrl || node.data.result)
        ),
    )
    .map((node) => ({
      nodeId: node.id,
      type: "video_generate" as const,
      status: "draft" as const,
      model: node.data.kind === "videoGenerate" ? node.data.model : "",
      estimatedCredits: estimateStudioVideoNodeCredits(node),
      startedAt: null,
      finishedAt: null,
    }));

  if (!items.length) {
    throw new Error("The selected source has no unfinished Video Generate task.");
  }

  return {
    id: `generation-plan-${Date.now()}`,
    projectId,
    sourceNodeId: nodeId,
    sourceNodeType: nodeType,
    pipelineNodeId: nodeId,
    status: "draft",
    items,
    estimatedCredits: items.reduce(
      (total, item) => total + item.estimatedCredits,
      0,
    ),
    createdAt: timestamp,
    updatedAt: timestamp,
    confirmedAt: null,
    completedAt: null,
    mock: false,
  };
}
