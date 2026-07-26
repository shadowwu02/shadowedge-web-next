"use client";

import { useState } from "react";
import {
  STUDIO_GENERATION_ORCHESTRATOR_ENABLED,
  STUDIO_IMAGE_EXECUTION_ENABLED,
  STUDIO_REMAKE_EXECUTION_ENABLED,
  STUDIO_VIDEO_EXECUTION_ENABLED,
} from "@/config/studioFeatures";
import { StudioTemplateControls } from "@/features/studio/components/StudioTemplateControls";
import { useStudioProjects } from "@/features/studio/hooks/useStudioProjects";
import { useStudioStore } from "@/features/studio/store/studioStore";
import {
  STUDIO_NODE_DEFINITIONS,
  type StudioNodeType,
} from "@/features/studio/types/studioTypes";
import type { StudioExperienceMode } from "@/features/studio/lib/studioExperienceMode";
import { useI18n } from "@/i18n/useI18n";

export function StudioToolbar({
  brandName,
  storageKey,
  experienceMode,
  onExperienceModeChange,
}: {
  brandName: string;
  storageKey: string;
  experienceMode: StudioExperienceMode;
  onExperienceModeChange: (mode: StudioExperienceMode) => void;
}) {
  const { t, tf } = useI18n();
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
  const hasDraftGenerationPlan = useStudioStore((state) =>
    state.generationPlans.some((plan) => plan.status === "draft"),
  );
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

  const projectBusy = saving || loadingProject || authLoading || runtimeRunning || generationQueue.running;
  const saveLabel = saving
    ? t("studio.toolbar.saving")
    : projectId
      ? t("studio.toolbar.saveProject")
      : t("studio.toolbar.createAndSave");
  const toggleLabel = (enabled: boolean) => t(enabled ? "studio.toolbar.runtimeOn" : "studio.toolbar.runtimeOff");
  const runtimeSummary = tf("studio.toolbar.runtimeSummary", {
    image: toggleLabel(STUDIO_IMAGE_EXECUTION_ENABLED),
    video: toggleLabel(STUDIO_VIDEO_EXECUTION_ENABLED),
    remake: toggleLabel(STUDIO_REMAKE_EXECUTION_ENABLED),
    lock: runLockState,
    orchestrator: toggleLabel(STUDIO_GENERATION_ORCHESTRATOR_ENABLED),
  });

  return (
    <header className={`studio-toolbar is-${experienceMode.toLowerCase()}`}>
      <div className="studio-toolbar-title">
        <p>{brandName}</p>
        <h1>{t("studio.toolbar.title")}</h1>
        <span>
          {experienceMode === "CREATOR"
            ? t("studio.creator.toolbar.summary")
            : `${runtimeSummary}${generationQueue.running ? ` · ${t("studio.toolbar.queueRunning")}` : ""}`}
        </span>
      </div>

      <div className="studio-project-controls">
        <input
          aria-label={t("studio.toolbar.projectName")}
          disabled={projectBusy}
          maxLength={180}
          onChange={(event) => setProjectName(event.target.value)}
          placeholder={t("studio.toolbar.untitledProject")}
          value={projectName}
        />
        <select
          aria-label={t("studio.toolbar.openProject")}
          disabled={!isSignedIn || projectBusy}
          onChange={(event) => void openProject(event.target.value)}
          value={projectId || ""}
        >
          <option value="">{t("studio.toolbar.localDraft")}</option>
          {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
      </div>

      <div className="studio-toolbar-actions">
        {experienceMode === "ADVANCED" ? (
          <>
            <button
              className="studio-button studio-button-run"
              disabled={projectBusy || runtimeRunning || nodeCount === 0}
              onClick={() => void runNodes()}
              title={t("studio.toolbar.runTitle")}
              type="button"
            >
              <span className="studio-run-icon" aria-hidden="true">▶</span>
              {runLockState === "locked"
                ? t("studio.toolbar.locked")
                : runtimeRunning
                  ? t("studio.toolbar.running")
                  : hasDraftGenerationPlan
                    ? t("studio.toolbar.reviewPlan")
                    : t("studio.toolbar.run")}
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
                {t("studio.toolbar.newNode")}
              </button>
              {menuOpen ? (
                <div className="studio-new-node-menu" role="menu">
                  {STUDIO_NODE_DEFINITIONS.map((item) => (
                    <button key={item.type} onClick={() => handleAddNode(item.type)} role="menuitem" type="button">
                      <strong>{item.label}</strong>
                      <span>{item.description}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </>
        ) : null}

        <button className="studio-button" disabled={!isSignedIn || projectBusy} onClick={() => void createProject()} type="button">
          {t("studio.toolbar.newProject")}
        </button>
        <button className="studio-button" disabled={!isSignedIn || projectBusy || Boolean(projectId && !dirty)} onClick={() => void saveProject()} type="button">
          {saveLabel}
        </button>
        {experienceMode === "ADVANCED" ? (
          <>
            <StudioTemplateControls disabled={projectBusy} />
            <button className="studio-button" disabled={!canUndo} onClick={undo} type="button">{t("studio.toolbar.undo")}</button>
            <button className="studio-button" disabled={!canRedo} onClick={redo} type="button">{t("studio.toolbar.redo")}</button>
          </>
        ) : null}
        <div className="studio-experience-mode" aria-label={t("studio.mode.aria")} role="group">
          <button
            aria-pressed={experienceMode === "CREATOR"}
            className={experienceMode === "CREATOR" ? "is-active" : ""}
            onClick={() => onExperienceModeChange("CREATOR")}
            title={t("studio.mode.creator.description")}
            type="button"
          >
            {t("studio.mode.creator")}
          </button>
          <button
            aria-pressed={experienceMode === "ADVANCED"}
            className={experienceMode === "ADVANCED" ? "is-active" : ""}
            onClick={() => onExperienceModeChange("ADVANCED")}
            title={t("studio.mode.advanced.description")}
            type="button"
          >
            {t("studio.mode.advanced")}
          </button>
        </div>
      </div>

      <div className="studio-save-state" aria-live="polite">
        <span title={storageKey}>
          {isSignedIn
            ? projectId ? t("studio.toolbar.cloudProject") : t("studio.toolbar.localFallback")
            : t("studio.toolbar.signInForCloud")}
          {dirty ? ` · ${t("studio.toolbar.unsaved")}` : ""}
        </span>
        <span>
          {loadingProject
            ? t("studio.toolbar.loadingProject")
            : runtimeRunning
              ? t("studio.toolbar.workflowRunning")
              : updatedAt
                ? tf("studio.common.updated", {
                    time: new Date(updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                  })
                : t("studio.toolbar.localReady")}
        </span>
      </div>

      {notice || projectError || runtimeError ? (
        <button
          className={`studio-toast studio-toast-${notice?.kind || "error"}`}
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
