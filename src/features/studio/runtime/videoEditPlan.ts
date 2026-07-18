export type VideoEditPlanItem = {
  nodeId: string;
  type: "video_edit";
  status: "draft";
  model: string;
  estimatedCredits: number;
  startedAt: null;
  finishedAt: null;
};

export function buildVideoEditGenerationPlanItem({
  nodeId,
  mode,
}: {
  nodeId: string;
  mode: "video_to_video" | "replace_background" | "extend";
}): VideoEditPlanItem {
  return {
    nodeId,
    type: "video_edit",
    status: "draft",
    model: `video_edit:${mode}`,
    // No real provider or pricing contract is registered in P2-A1.
    estimatedCredits: 0,
    startedAt: null,
    finishedAt: null,
  };
}
