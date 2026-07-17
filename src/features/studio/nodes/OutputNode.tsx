import type { NodeProps } from "@xyflow/react";
import { StudioNodeFrame } from "@/features/studio/nodes/StudioNodeFrame";
import { useStudioNodeRuntimeStatus } from "@/features/studio/store/studioStore";
import type { StudioNode } from "@/features/studio/types/studioTypes";

export function OutputNode({ data, id, selected }: NodeProps<StudioNode>) {
  const runtimeStatus = useStudioNodeRuntimeStatus(id);
  if (data.kind !== "output") return null;

  return (
    <StudioNodeFrame
      emitsOutput={false}
      eyebrow="Result"
      selected={selected}
      status={runtimeStatus}
      title={data.title}
    >
      <div className="studio-node-preview studio-node-preview-output">
        <span>{data.resultPreview || "Awaiting result"}</span>
      </div>
      <dl className="studio-node-meta">
        <div>
          <dt>Type</dt>
          <dd>{data.outputType}</dd>
        </div>
        <div>
          <dt>Created</dt>
          <dd>{data.createdAt || "Not created"}</dd>
        </div>
      </dl>
    </StudioNodeFrame>
  );
}
