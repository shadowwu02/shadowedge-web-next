import { apiRequest } from "@/lib/api";
import type {
  StudioCanvasJson,
  StudioProject,
  StudioProjectSummary,
} from "@/features/studio/types/studioTypes";

type ProjectResponse = {
  project?: StudioProject;
};

type ProjectsResponse = {
  projects?: StudioProjectSummary[];
};

function requireProject(project: StudioProject | undefined) {
  if (!project?.id) throw new Error("Studio project response was incomplete.");
  return project;
}

export async function createStudioProject(name = "Untitled Project") {
  const response = await apiRequest<ProjectResponse>("/api/studio/projects", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  return requireProject(response.data?.project);
}

export async function listStudioProjects() {
  const response = await apiRequest<ProjectsResponse>("/api/studio/projects");
  return response.data?.projects || [];
}

export async function getStudioProject(projectId: string) {
  const response = await apiRequest<ProjectResponse>(
    "/api/studio/projects/" + encodeURIComponent(projectId),
  );
  return requireProject(response.data?.project);
}

export async function updateStudioProject(
  projectId: string,
  input: {
    canvasJson: StudioCanvasJson;
    name?: string;
    thumbnail?: string | null;
  },
) {
  const response = await apiRequest<ProjectResponse>(
    "/api/studio/projects/" + encodeURIComponent(projectId),
    {
      method: "PUT",
      body: JSON.stringify(input),
    },
  );
  return requireProject(response.data?.project);
}
