import type { UploadMediaType } from "@/types/video";

export type ReferencePipelineCounts = Record<UploadMediaType, number>;

type ReferenceStage = number | Partial<Record<UploadMediaType, number | unknown[]>>;

export function getReferencePipelineCounts(stage: ReferenceStage): ReferencePipelineCounts & { total: number } {
  if (typeof stage === "number") return { image: stage, video: 0, audio: 0, total: stage };
  const count = (type: UploadMediaType) => {
    const value = stage[type];
    return Array.isArray(value) ? value.length : Math.max(0, Number(value || 0));
  };
  const image = count("image");
  const video = count("video");
  const audio = count("audio");
  return { image, video, audio, total: image + video + audio };
}

export function assertReferencePipelineParity(stages: Record<string, ReferenceStage>) {
  const entries = Object.entries(stages);
  if (entries.length < 2) return true;
  const expected = getReferencePipelineCounts(entries[0][1]);
  const divergent = entries.find(([, stage]) =>
    JSON.stringify(getReferencePipelineCounts(stage)) !== JSON.stringify(expected),
  );
  if (!divergent) return true;
  throw Object.assign(new Error("Reference counts changed before submission."), {
    code: "REFERENCE_PIPELINE_COUNT_DIVERGENCE",
    details: Object.fromEntries(entries.map(([name, stage]) => [name, getReferencePipelineCounts(stage)])),
  });
}
