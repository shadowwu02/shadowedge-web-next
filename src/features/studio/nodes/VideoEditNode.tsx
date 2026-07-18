import type { NodeProps } from "@xyflow/react";
import { STUDIO_VIDEO_EDIT_EXECUTION_ENABLED } from "@/config/studioFeatures";
import { StudioCostPreview } from "@/features/studio/components/StudioCostPreview";
import { StudioRetryButton } from "@/features/studio/components/StudioRetryButton";
import { StudioNodeFrame } from "@/features/studio/nodes/StudioNodeFrame";
import {
  useStudioNodeRuntimeStatus,
  useStudioStore,
} from "@/features/studio/store/studioStore";
import type { StudioNode } from "@/features/studio/types/studioTypes";

function modeLabel(mode: "video_to_video" | "replace_background" | "extend") {
  if (mode === "replace_background") return "Replace background";
  if (mode === "extend") return "Extend video";
  return "Video to video";
}

export function VideoEditNode({ data, id, selected }: NodeProps<StudioNode>) {
  const runtimeStatus = useStudioNodeRuntimeStatus(
    id,
    data.kind === "videoEdit" ? data.status : "idle",
  );
  const createAssetFromResultNode = useStudioStore(
    (state) => state.createAssetFromResultNode,
  );
  const addNodeToTimeline = useStudioStore((state) => state.addNodeToTimeline);
  if (data.kind !== "videoEdit") return null;

  const resultUrl = data.result?.videoUrl || "";
  return (
    <StudioNodeFrame
      eyebrow="AI Video Edit"
      selected={selected}
      status={data.queueStatus || runtimeStatus}
      title={data.title}
    >
      <div className="studio-node-preview studio-node-preview-video">
        {resultUrl ? (
          <video
            aria-label="Mock video edit preview"
            controls
            muted
            playsInline
            poster={data.result?.thumbnail || undefined}
            preload="metadata"
            src={resultUrl}
          />
        ) : (
          <span>{data.status === "failed" ? "Mock edit failed" : "Video edit preview"}</span>
        )}
      </div>
      <dl className="studio-node-meta">
        <div><dt>Mode</dt><dd>{modeLabel(data.mode)}</dd></div>
        <div><dt>Source</dt><dd>{data.sourceVideo?.assetId || "Connect Video Asset"}</dd></div>
        <div><dt>Runtime</dt><dd>{data.result?.mock ? "Mock Completed" : "Mock only"}</dd></div>
      </dl>
      <p className="studio-node-footnote">
        Provider execution {STUDIO_VIDEO_EDIT_EXECUTION_ENABLED ? "gated" : "disabled"} / local mock / no credits
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
