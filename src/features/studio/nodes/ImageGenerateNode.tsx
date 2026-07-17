import type { NodeProps } from "@xyflow/react";
import { StudioNodeFrame } from "@/features/studio/nodes/StudioNodeFrame";
import type { StudioNode } from "@/features/studio/types/studioTypes";

export function ImageGenerateNode({ data, selected }: NodeProps<StudioNode>) {
  if (data.kind !== "imageGenerate") return null;

  return (
    <StudioNodeFrame
      eyebrow="Image"
      selected={selected}
      status={data.status}
      title={data.title}
    >
      <div className="studio-node-preview">
        <span>Image preview</span>
      </div>
      <dl className="studio-node-meta">
        <div>
          <dt>Model</dt>
          <dd>{data.model}</dd>
        </div>
        <div>
          <dt>Inputs</dt>
          <dd>{data.promptInput || "Prompt"} + {data.assetInput || "Asset"}</dd>
        </div>
      </dl>
      <p className="studio-node-footnote">UI only · no API call</p>
    </StudioNodeFrame>
  );
}
