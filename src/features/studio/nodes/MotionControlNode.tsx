import type { NodeProps } from "@xyflow/react";
import { STUDIO_MOTION_CONTROL_EXECUTION_ENABLED } from "@/config/studioFeatures";
import { StudioCostPreview } from "@/features/studio/components/StudioCostPreview";
import { StudioRetryButton } from "@/features/studio/components/StudioRetryButton";
import { StudioNodeFrame } from "@/features/studio/nodes/StudioNodeFrame";
import {
  useStudioNodeRuntimeStatus,
  useStudioStore,
} from "@/features/studio/store/studioStore";
import type { StudioNode } from "@/features/studio/types/studioTypes";

function modeLabel(mode: "character_motion" | "camera_motion" | "motion_transfer") {
  if (mode === "camera_motion") return "Camera motion";
  if (mode === "motion_transfer") return "Motion transfer";
  return "Character motion";
}

export function MotionControlNode({ data, id, selected }: NodeProps<StudioNode>) {
  const runtimeStatus = useStudioNodeRuntimeStatus(
    id,
    data.kind === "motionControl" ? data.status : "idle",
  );
  const createAssetFromResultNode = useStudioStore(
    (state) => state.createAssetFromResultNode,
  );
  const addNodeToTimeline = useStudioStore((state) => state.addNodeToTimeline);
  if (data.kind !== "motionControl") return null;

  const resultUrl = data.result?.videoUrl || "";
  return (
    <StudioNodeFrame
      eyebrow="Motion Control"
      selected={selected}
      status={data.queueStatus || runtimeStatus}
      title={data.title}
    >
      <div className="studio-node-preview studio-node-preview-video">
        {resultUrl ? (
          <video
            aria-label="Motion Control mock preview"
            controls
            muted
            playsInline
            poster={data.result?.thumbnail || undefined}
            preload="metadata"
            src={resultUrl}
          />
        ) : (
          <span>
            {data.status === "failed"
              ? "Motion mock failed"
              : "Image + motion video required"}
          </span>
        )}
      </div>
      <dl className="studio-node-meta">
        <div><dt>Mode</dt><dd>{modeLabel(data.mode)}</dd></div>
        <div><dt>Character</dt><dd>{data.characterRefs.join(", ") || data.sourceImage?.assetId || "Connect Character"}</dd></div>
        <div><dt>Motion</dt><dd>{data.motionReferenceVideo?.assetId || "Connect Video"}</dd></div>
      </dl>
      <p className="studio-node-footnote">
        Provider execution {STUDIO_MOTION_CONTROL_EXECUTION_ENABLED ? "gated" : "disabled"} / local mock / no credits
      </p>
      <StudioCostPreview data={data} />
      {data.errorMessage ? (
        <p className="studio-node-error" title={data.errorCode}>{data.errorMessage}</p>
      ) : null}
      <StudioRetryButton nodeId={id} status={runtimeStatus} />
      <button
        className="studio-node-action nodrag nopan"
        disabled={data.status !== "completed" || !resultUrl || data.timelineBound}
        onClick={(event) => {
          event.stopPropagation();
          addNodeToTimeline(id);
        }}
        onMouseDown={(event) => event.stopPropagation()}
        type="button"
      >
        {data.timelineBound ? "Added To Timeline" : "Add To Timeline"}
      </button>
      {data.status === "completed" && resultUrl ? (
        <button
          className="studio-node-action nodrag nopan"
          onClick={(event) => {
            event.stopPropagation();
            createAssetFromResultNode(id);
          }}
          onMouseDown={(event) => event.stopPropagation()}
          type="button"
        >
          Create Asset
        </button>
      ) : null}
    </StudioNodeFrame>
  );
}
