import type { NodeProps } from "@xyflow/react";
import { STUDIO_IMAGE_EXECUTION_ENABLED } from "@/config/studioFeatures";
import { StudioNodeFrame } from "@/features/studio/nodes/StudioNodeFrame";
import {
  useStudioNodeRuntimeStatus,
  useStudioStore,
} from "@/features/studio/store/studioStore";
import type { StudioNode } from "@/features/studio/types/studioTypes";

export function ImageGenerateNode({ data, id, selected }: NodeProps<StudioNode>) {
  const runtimeStatus = useStudioNodeRuntimeStatus(id);
  const createAssetFromResultNode = useStudioStore(
    (state) => state.createAssetFromResultNode,
  );
  if (data.kind !== "imageGenerate") return null;
  const imageUrl = data.thumbnail || data.imageUrl || data.result;

  return (
    <StudioNodeFrame
      eyebrow="Image"
      selected={selected}
      status={runtimeStatus}
      title={data.title}
    >
      <div className="studio-node-preview studio-node-preview-image-result">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt="Generated image result" src={imageUrl} />
        ) : (
          <span>{runtimeStatus === "processing" ? "Generating image..." : "Image preview"}</span>
        )}
      </div>
      <dl className="studio-node-meta">
        <div>
          <dt>Model</dt>
          <dd>{data.model}</dd>
        </div>
        <div>
          <dt>Settings</dt>
          <dd>{data.ratio || "auto"} · {data.count || 1} image</dd>
        </div>
        {data.jobId ? (
          <div>
            <dt>Job</dt>
            <dd>{data.jobId}</dd>
          </div>
        ) : null}
      </dl>
      {data.errorMessage ? (
        <p className="studio-node-error" title={data.errorMessage}>
          {data.errorCode || "IMAGE_GENERATION_FAILED"}: {data.errorMessage}
        </p>
      ) : null}
      {data.status === "completed" && imageUrl ? (
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
      ) : null}
      <p className="studio-node-footnote">
        {STUDIO_IMAGE_EXECUTION_ENABLED
          ? "Real executor · existing credits apply"
          : "Execution disabled by environment flag"}
      </p>
    </StudioNodeFrame>
  );
}
