import type {
  ProjectMemberRole,
  StudioProjectMembers,
} from "@/features/studio/capabilities/studioProjectCollaboration";
import { apiRequest } from "@/lib/api";

export async function getStudioProjectMembers(projectId: string, signal?: AbortSignal) {
  const response = await apiRequest<StudioProjectMembers>(
    `/api/projects/${encodeURIComponent(projectId)}/members`,
    { signal },
  );
  if (response.data?.projectId !== projectId || !Array.isArray(response.data.members)) {
    throw new Error("Project Members response was incomplete.");
  }
  return response.data;
}

export async function addStudioProjectMember(
  projectId: string,
  input: Readonly<{ userId: string; role: Exclude<ProjectMemberRole, "OWNER"> }>,
) {
  return (await apiRequest<Readonly<{
    member: StudioProjectMembers["members"][number];
    created: boolean;
    changed: boolean;
  }>>(`/api/projects/${encodeURIComponent(projectId)}/members`, {
    method: "POST",
    body: JSON.stringify(input),
  })).data;
}
