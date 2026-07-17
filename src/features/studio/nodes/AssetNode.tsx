import type { NodeProps } from "@xyflow/react";
import { StudioNodeFrame } from "@/features/studio/nodes/StudioNodeFrame";
import type { StudioNode } from "@/features/studio/types/studioTypes";

export function AssetNode({ data, selected }: NodeProps<StudioNode>) {
  if (data.kind !== "asset") return null;

  return (
    <StudioNodeFrame
      acceptsInput={false}
      eyebrow="Input"
      selected={selected}
      status={data.status}
      title={data.title}
    >
      <div className="studio-node-preview studio-node-preview-asset">
        <span>{data.assetType.slice(0, 1).toUpperCase()}</span>
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
      </dl>
    </StudioNodeFrame>
  );
}
