import type { NodeProps } from "@xyflow/react";
import { StudioNodeFrame } from "@/features/studio/nodes/StudioNodeFrame";
import {
  useStudioNodeRuntimeStatus,
  useStudioStore,
} from "@/features/studio/store/studioStore";
import type { StudioNode } from "@/features/studio/types/studioTypes";

export function VideoGenerateNode({ data, id, selected }: NodeProps<StudioNode>) {
  const runtimeStatus = useStudioNodeRuntimeStatus(
    id,
    data.kind === "videoGenerate" ? data.status : "idle",
  );
  const createAssetFromResultNode = useStudioStore(
    (state) => state.createAssetFromResultNode,
  );
  if (data.kind !== "videoGenerate") return null;

  return (
    <StudioNodeFrame
      eyebrow="Video"
      selected={selected}
      status={runtimeStatus}
      title={data.title}
    >
      <div className="studio-node-preview studio-node-preview-video">
        {data.videoUrl ? (
          <video
            aria-label="Generated video preview"
            controls
            muted
            playsInline
            poster={data.thumbnail || undefined}
            preload="metadata"
            src={data.videoUrl}
          />
        ) : (
          <span>{data.status === "failed" ? "Generation failed" : "Video preview"}</span>
        )}
      </div>
      <dl className="studio-node-meta">
        <div>
          <dt>Model</dt>
          <dd>{data.model}</dd>
        </div>
        <div>
          <dt>Settings</dt>
          <dd>{data.duration || 4}s · {data.ratio || "16:9"} · {data.quality || "480p"}</dd>
        </div>
        <div>
          <dt>Media</dt>
          <dd>{data.imageInput || data.videoInput || "Not connected"}</dd>
        </div>
      </dl>
      {data.jobId ? <p className="studio-node-footnote">Job {data.jobId}</p> : null}
      {data.errorMessage ? (
        <p className="studio-node-error" title={data.errorCode}>
          {data.errorMessage}
        </p>
      ) : null}
      {data.status === "completed" && data.videoUrl ? (
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
