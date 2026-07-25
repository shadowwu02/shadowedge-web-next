import type {
  StudioCreativeCanvasEditSession,
  StudioCreativeCanvasGraph,
  StudioCreativeCanvasGraphChange,
} from "@/features/studio/capabilities/studioCreativeCanvas";
import { apiRequest } from "@/lib/api";

export async function getStudioCreativeCanvas(projectId: string, signal?: AbortSignal) {
  const response = await apiRequest<StudioCreativeCanvasGraph>(
    `/api/projects/${encodeURIComponent(projectId)}/creative-canvas`,
    { signal },
  );
  if (
    !response.data?.graphId ||
    response.data.projectId !== projectId ||
    !Array.isArray(response.data.nodes) ||
    !Array.isArray(response.data.edges)
  ) {
    throw new Error("Creative Canvas response was incomplete.");
  }
  return response.data;
}

function assertEditSession(value: StudioCreativeCanvasEditSession | undefined, projectId: string) {
  if (
    !value?.sessionId ||
    value.projectId !== projectId ||
    !value.draftGraph?.graphId ||
    !Array.isArray(value.changes) ||
    !Array.isArray(value.validation?.checks)
  ) {
    throw new Error("Creative Canvas Edit Session response was incomplete.");
  }
  return value;
}

export async function createStudioCreativeCanvasEditSession(
  projectId: string,
  changes: readonly StudioCreativeCanvasGraphChange[],
) {
  const response = await apiRequest<StudioCreativeCanvasEditSession>(
    `/api/projects/${encodeURIComponent(projectId)}/creative-canvas/edit-session`,
    {
      method: "POST",
      body: JSON.stringify({ changes }),
    },
  );
  return assertEditSession(response.data, projectId);
}

export async function getStudioCreativeCanvasEditSession(
  projectId: string,
  sessionId: string,
  signal?: AbortSignal,
) {
  const response = await apiRequest<StudioCreativeCanvasEditSession>(
    `/api/projects/${encodeURIComponent(projectId)}/creative-canvas/edit-session/${encodeURIComponent(sessionId)}`,
    { signal },
  );
  return assertEditSession(response.data, projectId);
}

export async function confirmStudioCreativeCanvasEditSession(projectId: string, sessionId: string) {
  const response = await apiRequest<StudioCreativeCanvasEditSession>(
    `/api/projects/${encodeURIComponent(projectId)}/creative-canvas/edit-session/${encodeURIComponent(sessionId)}/confirm`,
    {
      method: "POST",
      body: JSON.stringify({ confirm: true }),
    },
  );
  return assertEditSession(response.data, projectId);
}
