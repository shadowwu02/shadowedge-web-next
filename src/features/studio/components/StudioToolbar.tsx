"use client";

import { useState } from "react";
import {
  STUDIO_IMAGE_EXECUTION_ENABLED,
  STUDIO_REMAKE_EXECUTION_ENABLED,
  STUDIO_VIDEO_EXECUTION_ENABLED,
} from "@/config/studioFeatures";
import { useStudioProjects } from "@/features/studio/hooks/useStudioProjects";
import { StudioTemplateControls } from "@/features/studio/components/StudioTemplateControls";
import { useStudioStore } from "@/features/studio/store/studioStore";
import {
  STUDIO_NODE_DEFINITIONS,
  type StudioNodeType,
} from "@/features/studio/types/studioTypes";

export function StudioToolbar({
  brandName,
  storageKey,
}: {
  brandName: string;
  storageKey: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const addNode = useStudioStore((state) => state.addNode);
  const undo = useStudioStore((state) => state.undo);
  const redo = useStudioStore((state) => state.redo);
  const setProjectName = useStudioStore((state) => state.setProjectName);
  const canUndo = useStudioStore((state) => state.past.length > 0);
  const canRedo = useStudioStore((state) => state.future.length > 0);
  const projectId = useStudioStore((state) => state.projectId);
  const projectName = useStudioStore((state) => state.projectName);
  const projects = useStudioStore((state) => state.projects);
  const dirty = useStudioStore((state) => state.dirty);
  const saving = useStudioStore((state) => state.saving);
  const loadingProject = useStudioStore((state) => state.loadingProject);
  const projectError = useStudioStore((state) => state.projectError);
  const runtimeRunning = useStudioStore((state) => state.runtimeRunning);
  const runLockState = useStudioStore((state) => state.runLockState);
  const runtimeError = useStudioStore((state) => state.runtimeError);
  const generationQueue = useStudioStore((state) => state.generationQueue);
  const clearRuntimeError = useStudioStore((state) => state.clearRuntimeError);
  const runNodes = useStudioStore((state) => state.runNodes);
  const nodeCount = useStudioStore((state) => state.nodes.length);
  const updatedAt = useStudioStore((state) => state.updatedAt);
  const {
    authLoading,
    isSignedIn,
    notice,
    clearNotice,
    createProject,
    openProject,
    saveProject,
  } = useStudioProjects();

  const handleAddNode = (type: StudioNodeType) => {
    addNode(type);
    setMenuOpen(false);
  };

  const projectBusy =
    saving ||
    loadingProject ||
    authLoading ||
    runtimeRunning ||
    generationQueue.running;
  const saveLabel = saving ? "Saving..." : projectId ? "Save Project" : "Create & Save";

  return (
    <header className="studio-toolbar">
      <div className="studio-toolbar-title">
        <p>{brandName}</p>
        <h1>AI Studio</h1>
        <span>
          Node runtime · image {STUDIO_IMAGE_EXECUTION_ENABLED ? "on" : "off"} · video{" "}
          {STUDIO_VIDEO_EXECUTION_ENABLED ? "on" : "off"} · remake{" "}
          {STUDIO_REMAKE_EXECUTION_ENABLED ? "on" : "off"} · lock {runLockState}
          {generationQueue.running ? " · mock queue running (max 1)" : ""}
        </span>
      </div>

      <div className="studio-project-controls">
        <input
          aria-label="Project name"
          disabled={projectBusy}
          maxLength={180}
          onChange={(event) => setProjectName(event.target.value)}
          placeholder="Untitled Project"
          value={projectName}
        />
        <select
          aria-label="Open studio project"
          disabled={!isSignedIn || projectBusy}
          onChange={(event) => void openProject(event.target.value)}
          value={projectId || ""}
        >
          <option value="">Local draft</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>

      <div className="studio-toolbar-actions">
        <button
          className="studio-button studio-button-run"
          disabled={projectBusy || runtimeRunning || nodeCount === 0}
          onClick={() => void runNodes()}
          title={
            STUDIO_IMAGE_EXECUTION_ENABLED ||
            STUDIO_VIDEO_EXECUTION_ENABLED ||
            STUDIO_REMAKE_EXECUTION_ENABLED
              ? "Runs enabled generation nodes through the existing APIs and credits flow"
              : "Runs local executors; generation is disabled in this environment"
          }
          type="button"
        >
          <span className="studio-run-icon" aria-hidden="true">▶</span>
          {runLockState === "locked" ? "Locked" : runtimeRunning ? "Running..." : "Run"}
        </button>
        <div className="studio-new-node-wrap">
          <button
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className="studio-button studio-button-primary"
            onClick={() => setMenuOpen((open) => !open)}
            type="button"
          >
            <span aria-hidden="true">+</span>
            New Node
          </button>
          {menuOpen ? (
            <div className="studio-new-node-menu" role="menu">
              {STUDIO_NODE_DEFINITIONS.map((item) => (
                <button
                  key={item.type}
                  onClick={() => handleAddNode(item.type)}
                  role="menuitem"
                  type="button"
                >
                  <strong>{item.label}</strong>
                  <span>{item.description}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <button
          className="studio-button"
          disabled={!isSignedIn || projectBusy}
          onClick={() => void createProject()}
          type="button"
        >
          New Project
        </button>
        <button
          className="studio-button"
          disabled={!isSignedIn || projectBusy || Boolean(projectId && !dirty)}
          onClick={() => void saveProject()}
          type="button"
        >
          {saveLabel}
        </button>
        <StudioTemplateControls disabled={projectBusy} />
        <button className="studio-button" disabled={!canUndo} onClick={undo} type="button">
          Undo
        </button>
        <button className="studio-button" disabled={!canRedo} onClick={redo} type="button">
          Redo
        </button>
      </div>

      <div className="studio-save-state" aria-live="polite">
        <span title={storageKey}>
          {isSignedIn ? (projectId ? "Cloud project" : "Local fallback") : "Sign in for cloud save"}
          {dirty ? " · Unsaved" : ""}
        </span>
        <span>
          {loadingProject
            ? "Loading project..."
            : runtimeRunning
              ? "Workflow running..."
              : updatedAt
              ? "Updated " +
                new Date(updatedAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Local draft ready"}
        </span>
      </div>

      {notice || projectError || runtimeError ? (
        <button
          className={"studio-toast studio-toast-" + (notice?.kind || "error")}
          onClick={() => {
            clearNotice();
            clearRuntimeError();
          }}
          type="button"
        >
          {notice?.message || projectError || runtimeError}
        </button>
      ) : null}
    </header>
  );
}
