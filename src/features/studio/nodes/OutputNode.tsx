import type { NodeProps } from "@xyflow/react";
import { StudioNodeFrame } from "@/features/studio/nodes/StudioNodeFrame";
import { useStudioNodeRuntimeStatus } from "@/features/studio/store/studioStore";
import type { StudioNode } from "@/features/studio/types/studioTypes";

function isRenderableOutputUrl(value: string) {
  return /^(https?:\/\/|blob:|data:(?:image|video)\/)/i.test(value.trim());
}

export function OutputNode({ data, id, selected }: NodeProps<StudioNode>) {
  const runtimeStatus = useStudioNodeRuntimeStatus(
    id,
    data.kind === "output" ? data.status : "idle",
  );
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
        {data.outputType === "image" && isRenderableOutputUrl(data.resultPreview) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt="Workflow output" src={data.resultPreview} />
        ) : data.outputType === "video" && isRenderableOutputUrl(data.resultPreview) ? (
          <video
            aria-label="Workflow video output"
            controls
            muted
            playsInline
            poster={data.thumbnail || undefined}
            preload="metadata"
            src={data.resultPreview}
          />
        ) : (
          <span>{data.resultPreview || "Awaiting result"}</span>
        )}
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
        <div>
          <dt>Status</dt>
          <dd>{data.status}</dd>
        </div>
      </dl>
      {data.errorMessage ? (
        <p className="studio-node-error">{data.errorMessage}</p>
      ) : null}
    </StudioNodeFrame>
  );
}
