export type MotionControlPlanItem = {
  nodeId: string;
  type: "motion_control";
  status: "draft";
  model: string;
  estimatedCredits: number;
  startedAt: null;
  finishedAt: null;
};

export function buildMotionControlGenerationPlanItem({
  nodeId,
  mode,
}: {
  nodeId: string;
  mode: "character_motion" | "camera_motion" | "motion_transfer";
}): MotionControlPlanItem {
  return {
    nodeId,
    type: "motion_control",
    status: "draft",
    model: `motion_control:${mode}`,
    // No provider price contract exists in P2-A2; Mock execution is free.
    estimatedCredits: 0,
    startedAt: null,
    finishedAt: null,
  };
}
