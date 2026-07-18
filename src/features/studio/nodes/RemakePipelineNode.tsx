import type { NodeProps } from "@xyflow/react";
import { StudioRetryButton } from "@/features/studio/components/StudioRetryButton";
import { StudioNodeFrame } from "@/features/studio/nodes/StudioNodeFrame";
import {
  useStudioNodeRuntimeStatus,
  useStudioStore,
} from "@/features/studio/store/studioStore";
import type { StudioNode } from "@/features/studio/types/studioTypes";

export function RemakePipelineNode({ data, id, selected }: NodeProps<StudioNode>) {
  const runtimeStatus = useStudioNodeRuntimeStatus(
    id,
    data.kind === "remakePipeline" ? data.status : "idle",
  );
  const generationPlans = useStudioStore((state) => state.generationPlans);
  const generationQueue = useStudioStore((state) => state.generationQueue);
  const createGenerationPlan = useStudioStore(
    (state) => state.createGenerationPlan,
  );
  const startGenerationPlan = useStudioStore(
    (state) => state.startGenerationPlan,
  );
  const cancelGenerationPlan = useStudioStore(
    (state) => state.cancelGenerationPlan,
  );
  if (data.kind !== "remakePipeline") return null;

  const planReady = data.status === "completed" && data.shotCount > 0;
  const generationPlan = generationPlans.find(
    (plan) =>
      plan.id === data.generationPlanId ||
      (!data.generationPlanId && plan.pipelineNodeId === id),
  );
  const completedTasks =
    generationPlan?.items.filter((item) => item.status === "completed").length || 0;
  const runningTask = generationPlan?.items.find(
    (item) => item.status === "running" || item.status === "queued",
  );
  const itemCredits = generationPlan?.items.map((item) => item.estimatedCredits) || [];
  const unitCreditLabel = itemCredits.length
    ? Math.min(...itemCredits) === Math.max(...itemCredits)
      ? `${itemCredits[0]} credits each`
      : `${Math.min(...itemCredits)}–${Math.max(...itemCredits)} credits each`
    : "Awaiting plan";
  return (
    <StudioNodeFrame
      eyebrow="Remake Pipeline"
      selected={selected}
      status={runtimeStatus}
      title={data.title}
    >
      <p className="studio-node-copy">
        Build a production plan from completed Remake shots without starting generation.
      </p>
      <dl className="studio-node-meta">
        <div><dt>Shots</dt><dd>{data.shotCount || "Awaiting plan"}</dd></div>
        <div><dt>Videos</dt><dd>{data.videoNodeCount || "0 planned"}</dd></div>
        <div><dt>Timeline</dt><dd>{planReady ? "Ready" : "Awaiting plan"}</dd></div>
      </dl>
      {planReady ? (
        <div className="studio-node-copy" role="status">
          Remake Plan Ready. Review every planned Video Node before a future generation step.
        </div>
      ) : null}
      {generationPlan ? (
        <dl className="studio-node-meta">
          <div><dt>Plan</dt><dd>{generationPlan.status}</dd></div>
          <div><dt>Tasks</dt><dd>{completedTasks}/{generationPlan.items.length}</dd></div>
          <div><dt>Unit cost</dt><dd>{unitCreditLabel}</dd></div>
          <div><dt>Estimated</dt><dd>{generationPlan.estimatedCredits} credits</dd></div>
          <div><dt>Queue</dt><dd>{runningTask?.status || "waiting"} / max 1</dd></div>
        </dl>
      ) : null}
      {data.confirmationState === "cancelled" ? (
        <p className="studio-node-footnote">Generation handoff cancelled; the editable plan remains saved.</p>
      ) : null}
      {data.errorMessage ? (
        <p className="studio-node-error" title={data.errorCode}>{data.errorMessage}</p>
      ) : null}
      <StudioRetryButton nodeId={id} status={runtimeStatus} />
      <button
        className="studio-node-action nodrag nopan"
        disabled={!planReady || generationQueue.running}
        onClick={(event) => {
          event.stopPropagation();
          createGenerationPlan(id);
        }}
        onMouseDown={(event) => event.stopPropagation()}
        type="button"
      >
        Generate Plan
      </button>
      <button
        className="studio-node-action nodrag nopan"
        disabled={
          !generationPlan ||
          generationQueue.running ||
          (generationPlan.status !== "draft" && generationPlan.status !== "failed")
        }
        onClick={(event) => {
          event.stopPropagation();
          if (generationPlan) void startGenerationPlan(generationPlan.id);
        }}
        onMouseDown={(event) => event.stopPropagation()}
        title="Runs a local mock queue only; no video provider is called."
        type="button"
      >
        Start Generation
      </button>
      <button
        className="studio-node-action nodrag nopan"
        disabled={
          !generationPlan ||
          generationPlan.status === "completed" ||
          generationPlan.status === "cancelled"
        }
        onClick={(event) => {
          event.stopPropagation();
          if (generationPlan) cancelGenerationPlan(generationPlan.id);
        }}
        onMouseDown={(event) => event.stopPropagation()}
        type="button"
      >
        Cancel
      </button>
      <p className="studio-node-footnote">Mock queue only / concurrency 1 / no provider / no credits</p>
    </StudioNodeFrame>
  );
}
