"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthSession } from "@/hooks/useAuthSession";
import {
  getCurrentStudioCanvasJson,
  useStudioStore,
} from "@/features/studio/store/studioStore";
import {
  createStudioProject,
  getStudioProject,
  listStudioProjects,
  updateStudioProject,
} from "@/lib/studio-api";

type StudioNotice = {
  kind: "success" | "error";
  message: string;
} | null;

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Studio project request failed.";
}

export function useStudioProjects() {
  const { isLoading: authLoading, isSignedIn } = useAuthSession();
  const projectId = useStudioStore((state) => state.projectId);
  const projectName = useStudioStore((state) => state.projectName);
  const dirty = useStudioStore((state) => state.dirty);
  const hasHydrated = useStudioStore((state) => state.hasHydrated);
  const setProjects = useStudioStore((state) => state.setProjects);
  const setSaving = useStudioStore((state) => state.setSaving);
  const setLoadingProject = useStudioStore((state) => state.setLoadingProject);
  const setProjectError = useStudioStore((state) => state.setProjectError);
  const loadProject = useStudioStore((state) => state.loadProject);
  const markProjectSaved = useStudioStore((state) => state.markProjectSaved);
  const [notice, setNotice] = useState<StudioNotice>(null);
  const initializedForProject = useRef<string | null>(null);
  const listedForSession = useRef(false);

  const refreshProjects = useCallback(async () => {
    const projects = await listStudioProjects();
    setProjects(projects);
    return projects;
  }, [setProjects]);

  useEffect(() => {
    if (!hasHydrated || authLoading || !isSignedIn || listedForSession.current) return;
    listedForSession.current = true;
    void refreshProjects().catch((error) => {
      setProjectError(errorMessage(error));
    });
  }, [authLoading, hasHydrated, isSignedIn, refreshProjects, setProjectError]);

  useEffect(() => {
    if (!isSignedIn) listedForSession.current = false;
  }, [isSignedIn]);

  useEffect(() => {
    if (
      !hasHydrated ||
      authLoading ||
      !isSignedIn ||
      !projectId ||
      initializedForProject.current === projectId
    ) {
      return;
    }

    initializedForProject.current = projectId;
    setLoadingProject(true);
    setProjectError("");
    void getStudioProject(projectId)
      .then(loadProject)
      .catch((error) => {
        const message = errorMessage(error);
        setProjectError(message);
        setNotice({
          kind: "error",
          message: message + " Local fallback was kept.",
        });
      })
      .finally(() => setLoadingProject(false));
  }, [
    authLoading,
    hasHydrated,
    isSignedIn,
    loadProject,
    projectId,
    setLoadingProject,
    setProjectError,
  ]);

  const createProject = useCallback(async () => {
    if (!isSignedIn) {
      setNotice({ kind: "error", message: "Sign in to create a cloud project." });
      return null;
    }

    setSaving(true);
    setProjectError("");
    try {
      const created = await createStudioProject(projectName.trim() || "Untitled Project");
      const saved = await updateStudioProject(created.id, {
        name: projectName.trim() || created.name,
        canvasJson: getCurrentStudioCanvasJson(),
      });
      initializedForProject.current = saved.id;
      markProjectSaved(saved);
      await refreshProjects();
      setNotice({ kind: "success", message: "Project created and saved." });
      return saved;
    } catch (error) {
      const message = errorMessage(error);
      setProjectError(message);
      setNotice({ kind: "error", message });
      return null;
    } finally {
      setSaving(false);
    }
  }, [
    isSignedIn,
    markProjectSaved,
    projectName,
    refreshProjects,
    setProjectError,
    setSaving,
  ]);

  const saveProject = useCallback(async () => {
    if (!projectId) return createProject();
    if (!isSignedIn) {
      setNotice({ kind: "error", message: "Sign in to save this cloud project." });
      return null;
    }

    setSaving(true);
    setProjectError("");
    try {
      const saved = await updateStudioProject(projectId, {
        name: projectName.trim() || "Untitled Project",
        canvasJson: getCurrentStudioCanvasJson(),
      });
      initializedForProject.current = saved.id;
      markProjectSaved(saved);
      await refreshProjects();
      setNotice({ kind: "success", message: "Project saved." });
      return saved;
    } catch (error) {
      const message = errorMessage(error);
      setProjectError(message);
      setNotice({ kind: "error", message });
      return null;
    } finally {
      setSaving(false);
    }
  }, [
    createProject,
    isSignedIn,
    markProjectSaved,
    projectId,
    projectName,
    refreshProjects,
    setProjectError,
    setSaving,
  ]);

  const openProject = useCallback(
    async (nextProjectId: string) => {
      if (!nextProjectId || nextProjectId === projectId) return;
      if (dirty) {
        setNotice({
          kind: "error",
          message: "Save the current project before opening another one.",
        });
        return;
      }

      setLoadingProject(true);
      setProjectError("");
      try {
        const project = await getStudioProject(nextProjectId);
        initializedForProject.current = project.id;
        loadProject(project);
        setNotice(null);
      } catch (error) {
        const message = errorMessage(error);
        setProjectError(message);
        setNotice({ kind: "error", message });
      } finally {
        setLoadingProject(false);
      }
    },
    [dirty, loadProject, projectId, setLoadingProject, setProjectError],
  );

  return {
    authLoading,
    isSignedIn,
    notice,
    clearNotice: () => setNotice(null),
    createProject,
    openProject,
    saveProject,
  };
}
