import { apiRequest } from "@/lib/api";
import type { StudioTimeline } from "@/features/studio/types/studioTypes";

export type StudioRenderStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed";

export type StudioRenderJob = {
  jobId: string;
  projectId: string;
  status: StudioRenderStatus;
  outputUrl: string;
  error: string;
  createdAt: string;
  updatedAt: string;
};

type StudioRenderResponse = {
  render?: StudioRenderJob;
};

function requireRender(render: StudioRenderJob | undefined) {
  if (!render?.jobId) {
    throw new Error("Studio render response was incomplete.");
  }
  return render;
}

export async function createStudioRender(
  projectId: string,
  timeline: StudioTimeline,
) {
  const response = await apiRequest<StudioRenderResponse>("/api/studio/render", {
    method: "POST",
    body: JSON.stringify({ projectId, timeline }),
  });
  return requireRender(response.data?.render);
}

export async function getStudioRender(jobId: string) {
  const response = await apiRequest<StudioRenderResponse>(
    `/api/studio/render/${encodeURIComponent(jobId)}`,
  );
  return requireRender(response.data?.render);
}
