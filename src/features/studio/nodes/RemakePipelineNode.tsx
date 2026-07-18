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
  const updateNodeData = useStudioStore((state) => state.updateNodeData);
  if (data.kind !== "remakePipeline") return null;

  const planReady = data.status === "completed" && data.shotCount > 0;
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
      {data.confirmationState === "cancelled" ? (
        <p className="studio-node-footnote">Generation handoff cancelled; the editable plan remains saved.</p>
      ) : null}
      {data.errorMessage ? (
        <p className="studio-node-error" title={data.errorCode}>{data.errorMessage}</p>
      ) : null}
      <StudioRetryButton nodeId={id} status={runtimeStatus} />
      <button
        className="studio-node-action nodrag nopan"
        disabled
        title="Reserved for a later phase; P1-A6 never creates video jobs."
        type="button"
      >
        Start Generation
      </button>
      <button
        className="studio-node-action nodrag nopan"
        disabled={!planReady || data.confirmationState === "cancelled"}
        onClick={(event) => {
          event.stopPropagation();
          updateNodeData(id, { confirmationState: "cancelled" });
        }}
        onMouseDown={(event) => event.stopPropagation()}
        type="button"
      >
        Cancel
      </button>
      <p className="studio-node-footnote">Local planning only / no provider / no credits</p>
    </StudioNodeFrame>
  );
}
