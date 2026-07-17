import type { NodeProps } from "@xyflow/react";
import { StudioNodeFrame } from "@/features/studio/nodes/StudioNodeFrame";
import { useStudioNodeRuntimeStatus } from "@/features/studio/store/studioStore";
import type { StudioNode } from "@/features/studio/types/studioTypes";

export function VideoGenerateNode({ data, id, selected }: NodeProps<StudioNode>) {
  const runtimeStatus = useStudioNodeRuntimeStatus(id);
  if (data.kind !== "videoGenerate") return null;

  return (
    <StudioNodeFrame
      eyebrow="Video"
      selected={selected}
      status={runtimeStatus}
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
      <p className="studio-node-footnote">Mock executor · no API call</p>
    </StudioNodeFrame>
  );
}
