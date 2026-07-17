import type { NodeProps } from "@xyflow/react";
import { StudioNodeFrame } from "@/features/studio/nodes/StudioNodeFrame";
import type { StudioNode } from "@/features/studio/types/studioTypes";

export function VideoGenerateNode({ data, selected }: NodeProps<StudioNode>) {
  if (data.kind !== "videoGenerate") return null;

  return (
    <StudioNodeFrame
      eyebrow="Video"
      selected={selected}
      status={data.status}
      title={data.title}
    >
      <div className="studio-node-preview studio-node-preview-video">
        <span>Video preview</span>
      </div>
      <dl className="studio-node-meta">
        <div>
          <dt>Model</dt>
          <dd>{data.model}</dd>
        </div>
        <div>
          <dt>Prompt</dt>
          <dd>{data.promptInput || "Not connected"}</dd>
        </div>
        <div>
          <dt>Media</dt>
          <dd>{data.imageInput || data.videoInput || "Not connected"}</dd>
        </div>
      </dl>
      <p className="studio-node-footnote">UI only · no API call</p>
    </StudioNodeFrame>
  );
}
