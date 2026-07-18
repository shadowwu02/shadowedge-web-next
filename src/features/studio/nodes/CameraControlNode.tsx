import type { NodeProps } from "@xyflow/react";
import { StudioCostPreview } from "@/features/studio/components/StudioCostPreview";
import { StudioRetryButton } from "@/features/studio/components/StudioRetryButton";
import { StudioNodeFrame } from "@/features/studio/nodes/StudioNodeFrame";
import {
  useStudioNodeRuntimeStatus,
  useStudioStore,
} from "@/features/studio/store/studioStore";
import type { StudioNode } from "@/features/studio/types/studioTypes";

export function CameraControlNode({ data, id, selected }: NodeProps<StudioNode>) {
  const runtimeStatus = useStudioNodeRuntimeStatus(
    id,
    data.kind === "cameraControl" ? data.status : "idle",
  );
  const createAssetFromResultNode = useStudioStore(
    (state) => state.createAssetFromResultNode,
  );
  const addNodeToTimeline = useStudioStore((state) => state.addNodeToTimeline);
  if (data.kind !== "cameraControl") return null;

  const resultUrl = data.result?.videoUrl || "";
  return (
    <StudioNodeFrame
      eyebrow="Camera Control"
      selected={selected}
      status={data.queueStatus || runtimeStatus}
      title={data.title}
    >
      <div className="studio-node-preview">
        {resultUrl ? (
          // The P2-A4 mock reuses the source image; it is not generated video.
          // eslint-disable-next-line @next/next/no-img-element
          <img alt="Camera Control mock result" src={data.result?.thumbnail || resultUrl} />
        ) : (
          <span>Character or image input required</span>
        )}
      </div>
      <dl className="studio-node-meta">
        <div><dt>Preset</dt><dd>{data.preset}</dd></div>
        <div><dt>Duration</dt><dd>{data.duration}s</dd></div>
        <div><dt>Character</dt><dd>{data.characterRefs.join(", ") || "Optional"}</dd></div>
      </dl>
      <p className="studio-node-footnote">
        Local mock / provider metadata only / no credits
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
