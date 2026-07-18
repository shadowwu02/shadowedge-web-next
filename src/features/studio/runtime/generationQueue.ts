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

export function buildStudioGenerationPlan({
  pipelineNodeId,
  projectId,
  videoNodes,
}: {
  pipelineNodeId: string;
  projectId: string;
  videoNodes: StudioNode[];
}): StudioGenerationPlan {
  const timestamp = new Date().toISOString();
  const items = videoNodes
    .filter((node) => node.data.kind === "videoGenerate")
    .map((node) => ({
      nodeId: node.id,
      type: "video_generate" as const,
      status: "waiting" as const,
      model: node.data.kind === "videoGenerate" ? node.data.model : "",
      estimatedCredits: estimateStudioVideoNodeCredits(node),
      startedAt: null,
      finishedAt: null,
    }));
  return {
    id: `generation-plan-${Date.now()}`,
    projectId,
    pipelineNodeId,
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
