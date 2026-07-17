import type { NodeProps } from "@xyflow/react";
import { StudioNodeFrame } from "@/features/studio/nodes/StudioNodeFrame";
import {
  useStudioNodeRuntimeStatus,
  useStudioStore,
} from "@/features/studio/store/studioStore";
import type { StudioNode } from "@/features/studio/types/studioTypes";

export function RemakeShotNode({ data, id, selected }: NodeProps<StudioNode>) {
  const runtimeStatus = useStudioNodeRuntimeStatus(
    id,
    data.kind === "remakeShot" ? data.status : "ready",
  );
  const createVideoNode = useStudioStore(
    (state) => state.createVideoNodeFromRemakeShot,
  );
  if (data.kind !== "remakeShot") return null;

  return (
    <StudioNodeFrame
      eyebrow={`Shot ${data.shotNumber}`}
      selected={selected}
      status={runtimeStatus}
      title={data.title}
    >
      {data.referenceFrames.length ? (
        <div className="studio-shot-frames">
          {data.referenceFrames.slice(0, 3).map((url, index) => (
            // Frames can be signed URLs from several existing storage paths.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={`Shot ${data.shotNumber} reference frame ${index + 1}`}
              key={`${url}-${index}`}
              src={url}
            />
          ))}
        </div>
      ) : null}
      <p className="studio-node-copy">{data.description}</p>
      <p className="studio-shot-prompt">{data.prompt || "No prompt returned."}</p>
      <dl className="studio-node-meta">
        <div>
          <dt>Camera</dt>
          <dd>{data.camera || "Unspecified"}</dd>
        </div>
        <div>
          <dt>Duration</dt>
          <dd>{data.duration}s</dd>
        </div>
        <div>
          <dt>Source</dt>
          <dd>{data.sourceTimeRange.start}s–{data.sourceTimeRange.end}s</dd>
        </div>
      </dl>
      <button
        className="studio-node-action nodrag nopan"
        onClick={(event) => {
          event.stopPropagation();
          createVideoNode(id);
        }}
        onMouseDown={(event) => event.stopPropagation()}
        type="button"
      >
        Create Video Node
      </button>
      <p className="studio-node-footnote">Creation only; the video node will not auto-run.</p>
    </StudioNodeFrame>
  );
}
