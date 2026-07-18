import type { NodeProps } from "@xyflow/react";
import { StudioNodeFrame } from "@/features/studio/nodes/StudioNodeFrame";
import type { StudioNode } from "@/features/studio/types/studioTypes";

export function CharacterNode({ data, selected }: NodeProps<StudioNode>) {
  if (data.kind !== "character") return null;

  return (
    <StudioNodeFrame
      acceptsInput={false}
      eyebrow="Character Asset"
      selected={selected}
      status={data.status}
      title={data.title}
    >
      {data.referenceImages.length ? (
        <div className="studio-shot-frames">
          {data.referenceImages.slice(0, 3).map((url, index) => (
            // Character references may be signed URLs from the existing asset system.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={`${data.name || "Character"} reference ${index + 1}`}
              key={`${url}-${index}`}
              src={url}
            />
          ))}
        </div>
      ) : (
        <div className="studio-node-preview">
          <span>Add reference image URLs in the Inspector</span>
        </div>
      )}
      <p className="studio-node-copy">
        {data.description || "Reusable character definition for connected shots."}
      </p>
      <dl className="studio-node-meta">
        <div><dt>Name</dt><dd>{data.name || "Unnamed"}</dd></div>
        <div><dt>Style</dt><dd>{data.style || "Unspecified"}</dd></div>
        <div><dt>References</dt><dd>{data.referenceImages.length}</dd></div>
      </dl>
      <p className="studio-node-footnote">
        Metadata binding only / no face recognition / no provider / no credits
      </p>
    </StudioNodeFrame>
  );
}
