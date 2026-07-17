import type { NodeProps } from "@xyflow/react";
import { STUDIO_REMAKE_EXECUTION_ENABLED } from "@/config/studioFeatures";
import { StudioNodeFrame } from "@/features/studio/nodes/StudioNodeFrame";
import { useStudioNodeRuntimeStatus } from "@/features/studio/store/studioStore";
import type { StudioNode } from "@/features/studio/types/studioTypes";

export function RemakeAnalysisNode({ data, id, selected }: NodeProps<StudioNode>) {
  const runtimeStatus = useStudioNodeRuntimeStatus(
    id,
    data.kind === "remakeAnalysis" ? data.status : "idle",
  );
  if (data.kind !== "remakeAnalysis") return null;

  return (
    <StudioNodeFrame
      eyebrow="Remake"
      selected={selected}
      status={runtimeStatus}
      title={data.title}
    >
      <p className="studio-node-copy">
        Analyze one authorized video into editable storyboard shots.
      </p>
      <dl className="studio-node-meta">
        <div>
          <dt>Video</dt>
          <dd>{data.videoInput || "Connect a video asset"}</dd>
        </div>
        <div>
          <dt>Mode</dt>
          <dd>Single clip</dd>
        </div>
        <div>
          <dt>Shots</dt>
          <dd>{data.shotCount || "Not analyzed"}</dd>
        </div>
        {data.analysisSource ? (
          <div>
            <dt>Source</dt>
            <dd>{data.analysisSource}</dd>
          </div>
        ) : null}
      </dl>
      {!STUDIO_REMAKE_EXECUTION_ENABLED ? (
        <p className="studio-node-footnote">Execution flag is off; no VLM call can start.</p>
      ) : null}
      {data.errorMessage ? (
        <p className="studio-node-error" title={data.errorCode}>
          {data.errorMessage}
        </p>
      ) : null}
    </StudioNodeFrame>
  );
}
