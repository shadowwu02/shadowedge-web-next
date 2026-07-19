import type { NodeProps } from "@xyflow/react";
import { StudioNodeFrame } from "@/features/studio/nodes/StudioNodeFrame";
import {
  useStudioNodeRuntimeStatus,
  useStudioStore,
} from "@/features/studio/store/studioStore";
import type { StudioNode } from "@/features/studio/types/studioTypes";

function isRenderableOutputUrl(value: string) {
  return /^(https?:\/\/|blob:|data:(?:image|video)\/)/i.test(value.trim());
}

export function OutputNode({ data, id, selected }: NodeProps<StudioNode>) {
  const runtimeStatus = useStudioNodeRuntimeStatus(
    id,
    data.kind === "output" ? data.status : "idle",
  );
  const createAssetFromResultNode = useStudioStore(
    (state) => state.createAssetFromResultNode,
  );
  if (data.kind !== "output") return null;

  return (
    <StudioNodeFrame
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
          <dd>{data.completedAt || data.createdAt || "Not created"}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{data.status}</dd>
        </div>
      </dl>
      {data.errorMessage ? (
        <p className="studio-node-error">{data.errorMessage}</p>
      ) : null}
      {data.status === "completed" &&
      (data.outputType === "image" || data.outputType === "video") &&
      isRenderableOutputUrl(data.resultPreview) ? (
        <div className="studio-output-actions">
          <button
            className="studio-node-action nodrag nopan"
            onClick={(event) => {
              event.stopPropagation();
              createAssetFromResultNode(id);
            }}
            onMouseDown={(event) => event.stopPropagation()}
            type="button"
          >
            Create Asset
          </button>
          <a
            className="studio-node-action nodrag nopan"
            download={data.outputType === "video" ? "studio-output.mp4" : "studio-output.png"}
            href={data.resultPreview}
            onClick={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
          >
            Download
          </a>
        </div>
      ) : null}
    </StudioNodeFrame>
  );
}
