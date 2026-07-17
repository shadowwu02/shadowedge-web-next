import type { NodeProps } from "@xyflow/react";
import { StudioNodeFrame } from "@/features/studio/nodes/StudioNodeFrame";
import { useStudioNodeRuntimeStatus } from "@/features/studio/store/studioStore";
import type { StudioNode } from "@/features/studio/types/studioTypes";

export function AssetNode({ data, id, selected }: NodeProps<StudioNode>) {
  const runtimeStatus = useStudioNodeRuntimeStatus(id);
  if (data.kind !== "asset") return null;
  const previewUrl = data.thumbnail || data.url;

  return (
    <StudioNodeFrame
      acceptsInput={Boolean(data.originNodeId)}
      eyebrow={data.source === "generated" ? "Generated Asset" : "Input"}
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
    </StudioNodeFrame>
  );
}
