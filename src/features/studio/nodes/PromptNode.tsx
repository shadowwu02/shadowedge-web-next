import type { NodeProps } from "@xyflow/react";
import { StudioNodeFrame } from "@/features/studio/nodes/StudioNodeFrame";
import type { StudioNode } from "@/features/studio/types/studioTypes";

export function PromptNode({ data, selected }: NodeProps<StudioNode>) {
  if (data.kind !== "prompt") return null;

  return (
    <StudioNodeFrame eyebrow="Direction" selected={selected} title={data.title}>
      <p className="studio-node-copy">
        {data.prompt || "Describe the scene, motion, and visual intent."}
      </p>
      <div className="studio-node-chips">
        <span>{data.style || "No style"}</span>
        <span>{data.camera || "No camera"}</span>
        <span>{data.duration}s</span>
        <span>{data.ratio}</span>
      </div>
    </StudioNodeFrame>
  );
}
