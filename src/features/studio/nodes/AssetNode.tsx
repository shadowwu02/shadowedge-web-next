import type { NodeProps } from "@xyflow/react";
import { StudioNodeFrame } from "@/features/studio/nodes/StudioNodeFrame";
import {
  useStudioNodeRuntimeStatus,
  useStudioStore,
} from "@/features/studio/store/studioStore";
import type { StudioNode } from "@/features/studio/types/studioTypes";

export function AssetNode({ data, id, selected }: NodeProps<StudioNode>) {
  const runtimeStatus = useStudioNodeRuntimeStatus(id);
  const addNodeToTimeline = useStudioStore((state) => state.addNodeToTimeline);
  if (data.kind !== "asset") return null;
  const previewUrl = data.thumbnail || data.url;
  const eyebrow =
    data.source === "rendered"
      ? "Rendered Asset"
      : data.source === "generated"
        ? "Generated Asset"
        : "Input";

  return (
    <StudioNodeFrame
      acceptsInput={Boolean(data.originNodeId)}
      eyebrow={eyebrow}
      selected={selected}
      status={runtimeStatus}
      title={data.title}
    >
      <div className="studio-node-preview studio-node-preview-asset">
        {data.assetType === "image" && previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt="" src={previewUrl} />
        ) : data.assetType === "video" && data.url ? (
          <video muted playsInline preload="metadata" src={data.url} />
        ) : (
          <span>{data.assetType === "audio" ? "♪" : data.assetType.slice(0, 1).toUpperCase()}</span>
        )}
      </div>
      <dl className="studio-node-meta">
        <div>
          <dt>Type</dt>
          <dd>{data.assetType}</dd>
        </div>
        <div>
          <dt>Asset ID</dt>
          <dd>{data.assetId || "Not assigned"}</dd>
        </div>
        <div>
          <dt>Source</dt>
          <dd>{data.source || "upload"}</dd>
        </div>
        {data.originNodeId ? (
          <div>
            <dt>Origin</dt>
            <dd>{data.originNodeId}</dd>
          </div>
        ) : null}
        <div>
          <dt>Availability</dt>
          <dd>{data.status}</dd>
        </div>
      </dl>
      {data.assetType === "video" || data.assetType === "audio" ? (
        <button
          className="studio-node-action nodrag nopan"
          disabled={data.status !== "ready" || !data.url}
          onClick={(event) => {
            event.stopPropagation();
            addNodeToTimeline(id);
          }}
          onMouseDown={(event) => event.stopPropagation()}
          type="button"
        >
          Add {data.assetType === "audio" ? "Audio" : "Video"} To Timeline
        </button>
      ) : null}
    </StudioNodeFrame>
  );
}
