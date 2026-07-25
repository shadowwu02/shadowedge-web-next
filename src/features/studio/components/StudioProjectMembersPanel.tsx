"use client";

import { useEffect, useState } from "react";
import {
  PROJECT_MEMBER_ROLES,
  type ProjectMemberRole,
  type StudioProjectMembers,
} from "@/features/studio/capabilities/studioProjectCollaboration";
import {
  addStudioProjectMember,
  getStudioProjectMembers,
} from "@/lib/studio-project-collaboration-api";

const ASSIGNABLE_ROLES = PROJECT_MEMBER_ROLES.filter((role) => role !== "OWNER") as Exclude<ProjectMemberRole, "OWNER">[];

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase());
}

export function StudioProjectMembersPanel({ projectId }: { projectId: string | null }) {
  const [state, setState] = useState<{
    projectId: string;
    data: StudioProjectMembers | null;
    error: string;
  } | null>(null);
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<Exclude<ProjectMemberRole, "OWNER">>("VIEWER");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = async (activeProjectId: string, signal?: AbortSignal) => {
    const data = await getStudioProjectMembers(activeProjectId, signal);
    setState({ projectId: activeProjectId, data, error: "" });
  };

  useEffect(() => {
    if (!projectId) return;
    const controller = new AbortController();
    void getStudioProjectMembers(projectId, controller.signal)
      .then((data) => setState({ projectId, data, error: "" }))
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setState({
            projectId,
            data: null,
            error: reason instanceof Error ? reason.message : "Project Members are unavailable.",
          });
        }
      });
    return () => controller.abort();
  }, [projectId]);

  if (!projectId) return <section className="studio-project-members-empty">Open a project to manage collaborators.</section>;
  const data = state?.projectId === projectId ? state.data : null;
  const error = state?.projectId === projectId ? state.error : "";
  const canManage = data?.currentUser.permissions.includes("MANAGE") || false;

  const submit = async () => {
    const target = userId.trim();
    if (!target || busy) return;
    setBusy(true);
    setMessage("");
    try {
      await addStudioProjectMember(projectId, { userId: target, role });
      await load(projectId);
      setUserId("");
      setMessage("Member access saved. Runtime and Credits permissions were not granted.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Member access could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="studio-project-members" aria-label="Project Members">
      <header>
        <div><span>COLLABORATION</span><strong>Project Members</strong></div>
        <b>{data?.members.length ?? "—"}</b>
      </header>
      {error ? <p className="is-error">{error}</p> : !data ? <p>Checking project access…</p> : (
        <>
          <div className="studio-project-members-list">
            {data.members.map((member) => (
              <article key={member.memberId}>
                <div><strong>{member.userId}</strong><b>{label(member.role)}</b></div>
                <small>{member.permissions.map(label).join(" · ")}</small>
              </article>
            ))}
          </div>
          {canManage ? (
            <div className="studio-project-members-form">
              <input
                aria-label="Member user ID"
                onChange={(event) => setUserId(event.target.value)}
                placeholder="User ID"
                value={userId}
              />
              <select aria-label="Member role" onChange={(event) => setRole(event.target.value as Exclude<ProjectMemberRole, "OWNER">)} value={role}>
                {ASSIGNABLE_ROLES.map((item) => <option key={item} value={item}>{label(item)}</option>)}
              </select>
              <button disabled={busy || !userId.trim()} onClick={() => void submit()} type="button">
                {busy ? "Saving…" : "Add member"}
              </button>
            </div>
          ) : <p>Your role can view members but cannot manage access.</p>}
          {message ? <p aria-live="polite">{message}</p> : null}
          <footer>Roles control view, comment, Draft editing, approval, and member management. Execution remains separately confirmed.</footer>
        </>
      )}
    </section>
  );
}
