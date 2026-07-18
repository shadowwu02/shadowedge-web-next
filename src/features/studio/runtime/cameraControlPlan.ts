import type { CameraControlPreset } from "@/features/studio/types/studioTypes";

export type CameraControlPlanItem = {
  nodeId: string;
  type: "camera_control";
  status: "draft";
  model: string;
  estimatedCredits: number;
  startedAt: null;
  finishedAt: null;
};

export function buildCameraControlGenerationPlanItem({
  nodeId,
  preset,
}: {
  nodeId: string;
  preset: CameraControlPreset;
}): CameraControlPlanItem {
  return {
    nodeId,
    type: "camera_control",
    status: "draft",
    model: `camera_control:${preset}`,
    estimatedCredits: 0,
    startedAt: null,
    finishedAt: null,
  };
}
