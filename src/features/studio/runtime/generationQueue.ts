import type {
  StudioGenerationQueueItemStatus,
  StudioNode,
} from "@/features/studio/types/studioTypes";
import { buildVideoEditGenerationPlanItem } from "@/features/studio/runtime/videoEditPlan";
import { buildMotionControlGenerationPlanItem } from "@/features/studio/runtime/motionControlPlan";
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
  | "videoGenerate"
  | "video_edit"
  | "motion_control";

export type StudioGenerationPlanItem = {
  nodeId: string;
  type: "video_generate" | "video_edit" | "motion_control";
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

  let taskNodes: StudioNode[];
  if (nodeType === "videoGenerate") {
    if (sourceNode.data.kind !== "videoGenerate") {
      throw new Error("The selected node is not a Video Generate Node.");
    }
    taskNodes = [sourceNode];
  } else if (nodeType === "video_edit") {
    if (sourceNode.data.kind !== "videoEdit") {
      throw new Error("The selected node is not a Video Edit Node.");
    }
    taskNodes = [sourceNode];
  } else if (nodeType === "motion_control") {
    if (sourceNode.data.kind !== "motionControl") {
      throw new Error("The selected node is not a Motion Control Node.");
    }
    taskNodes = [sourceNode];
  } else {
    if (sourceNode.data.kind !== "remakePipeline") {
      throw new Error("The selected node is not a Remake Pipeline Node.");
    }
    const plannedNodeIds = new Set(sourceNode.data.videoNodeIds);
    taskNodes = nodes.filter((node) => plannedNodeIds.has(node.id));
  }

  const timestamp = new Date().toISOString();
  const items = taskNodes.flatMap((node): StudioGenerationPlanItem[] => {
    if (node.data.kind === "videoEdit") {
      if (
        node.data.status === "completed" &&
        Boolean(node.data.result?.videoUrl)
      ) {
        return [];
      }
      return [
        buildVideoEditGenerationPlanItem({
          nodeId: node.id,
          mode: node.data.mode,
        }),
      ];
    }
    if (node.data.kind === "videoGenerate") {
      if (
        node.data.status === "completed" &&
        Boolean(node.data.videoUrl || node.data.result)
      ) {
        return [];
      }
      return [
        {
          nodeId: node.id,
          type: "video_generate",
          status: "draft",
          model: node.data.model,
          estimatedCredits: estimateStudioVideoNodeCredits(node),
          startedAt: null,
          finishedAt: null,
        },
      ];
    }
    if (node.data.kind === "motionControl") {
      if (
        node.data.status === "completed" &&
        Boolean(node.data.result?.videoUrl)
      ) {
        return [];
      }
      return [
        buildMotionControlGenerationPlanItem({
          nodeId: node.id,
          mode: node.data.mode,
        }),
      ];
    }
    return [];
  });

  if (!items.length) {
    throw new Error("The selected source has no unfinished generation task.");
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
    mock: nodeType === "video_edit" || nodeType === "motion_control",
  };
}
