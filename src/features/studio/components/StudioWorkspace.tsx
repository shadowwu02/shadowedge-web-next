"use client";

import {
  Component,
  Suspense,
  lazy,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { activeBrand } from "@/config/brand";
import { useAuthSession } from "@/hooks/useAuthSession";
import { StudioToolbar } from "@/features/studio/components/StudioToolbar";
import {
  StudioApiIntegrationProvider,
  StudioApiVersionStatus,
  StudioCapabilityBoundary,
} from "@/features/studio/components/StudioApiIntegration";
import {
  STUDIO_CANVAS_STORAGE_KEY,
  useStudioStore,
} from "@/features/studio/store/studioStore";
import { getStudioProject } from "@/lib/studio-api";
import { useI18n, type DictionaryKey } from "@/i18n/useI18n";

const NodeInspector = lazy(() =>
  import("@/features/studio/components/NodeInspector").then((module) => ({
    default: module.NodeInspector,
  })),
);
const StudioAssetPanel = lazy(() =>
  import("@/features/studio/components/StudioAssetPanel").then((module) => ({
    default: module.StudioAssetPanel,
  })),
);
const StudioCanvas = lazy(() =>
  import("@/features/studio/components/StudioCanvas").then((module) => ({
    default: module.StudioCanvas,
  })),
);
const StudioRunHistoryPanel = lazy(() =>
  import("@/features/studio/components/StudioRunHistoryPanel").then((module) => ({
    default: module.StudioRunHistoryPanel,
  })),
);
const StudioTimelinePanel = lazy(() =>
  import("@/features/studio/components/StudioTimelinePanel").then((module) => ({
    default: module.StudioTimelinePanel,
  })),
);
const StudioUnifiedTimeline = lazy(() =>
  import("@/features/studio/components/StudioUnifiedTimeline").then((module) => ({
    default: module.StudioUnifiedTimeline,
  })),
);
const StudioStoryboardPanel = lazy(() =>
  import("@/features/studio/components/StudioStoryboardPanel").then((module) => ({
    default: module.StudioStoryboardPanel,
  })),
);
const StudioCreativeProjectIntelligenceDashboard = lazy(() =>
  import("@/features/studio/components/StudioCreativeProjectIntelligenceDashboard").then(
    (module) => ({ default: module.StudioCreativeProjectIntelligenceDashboard }),
  ),
);
const StudioProjectCopilotCommandCenter = lazy(() =>
  import("@/features/studio/components/StudioProjectCopilotCommandCenter").then(
    (module) => ({ default: module.StudioProjectCopilotCommandCenter }),
  ),
);
const StudioProjectExecutionConcierge = lazy(() =>
  import("@/features/studio/components/StudioProjectExecutionConcierge").then(
    (module) => ({ default: module.StudioProjectExecutionConcierge }),
  ),
);
const StudioProjectMembersPanel = lazy(() =>
  import("@/features/studio/components/StudioProjectMembersPanel").then(
    (module) => ({ default: module.StudioProjectMembersPanel }),
  ),
);
const StudioCollaborationActivityCenter = lazy(() =>
  import("@/features/studio/components/StudioCollaborationActivityCenter").then(
    (module) => ({ default: module.StudioCollaborationActivityCenter }),
  ),
);
const StudioProjectMemoryTimeline = lazy(() =>
  import("@/features/studio/components/StudioProjectMemoryTimeline").then((module) => ({
    default: module.StudioProjectMemoryTimeline,
  })),
);
const StudioProjectRoadmapTimeline = lazy(() =>
  import("@/features/studio/components/StudioProjectRoadmapTimeline").then((module) => ({
    default: module.StudioProjectRoadmapTimeline,
  })),
);
const StudioPortfolioStrategyCenter = lazy(() =>
  import("@/features/studio/components/StudioPortfolioStrategyCenter").then((module) => ({
    default: module.StudioPortfolioStrategyCenter,
  })),
);
const StudioPortfolioResourceCenter = lazy(() =>
  import("@/features/studio/components/StudioPortfolioResourceCenter").then((module) => ({
    default: module.StudioPortfolioResourceCenter,
  })),
);
const StudioPortfolioPerformanceCenter = lazy(() =>
  import("@/features/studio/components/StudioPortfolioPerformanceCenter").then((module) => ({
    default: module.StudioPortfolioPerformanceCenter,
  })),
);
const StudioPortfolioForecastCenter = lazy(() =>
  import("@/features/studio/components/StudioPortfolioForecastCenter").then((module) => ({
    default: module.StudioPortfolioForecastCenter,
  })),
);

export type StudioWorkspaceModule =
  | "overview"
  | "canvas"
  | "timeline"
  | "storyboard"
  | "production"
  | "review"
  | "delivery"
  | "intelligence";

export type StudioWorkspaceStatus =
  | "LOADING"
  | "READY"
  | "UNAVAILABLE"
  | "ERROR"
  | "MAINTENANCE";

const STUDIO_WORKSPACE_MODULES: ReadonlyArray<Readonly<{
  id: StudioWorkspaceModule;
  groupKey: DictionaryKey;
  labelKey: DictionaryKey;
  eyebrowKey: DictionaryKey;
  descriptionKey: DictionaryKey;
}>> = [
  { id: "overview", groupKey: "studio.workspace.group.studio", labelKey: "studio.workspace.overview.label", eyebrowKey: "studio.workspace.overview.eyebrow", descriptionKey: "studio.workspace.overview.description" },
  { id: "canvas", groupKey: "studio.workspace.group.studio", labelKey: "studio.workspace.canvas.label", eyebrowKey: "studio.workspace.canvas.eyebrow", descriptionKey: "studio.workspace.canvas.description" },
  { id: "timeline", groupKey: "studio.workspace.group.story", labelKey: "studio.workspace.timeline.label", eyebrowKey: "studio.workspace.timeline.eyebrow", descriptionKey: "studio.workspace.timeline.description" },
  { id: "storyboard", groupKey: "studio.workspace.group.story", labelKey: "studio.workspace.storyboard.label", eyebrowKey: "studio.workspace.storyboard.eyebrow", descriptionKey: "studio.workspace.storyboard.description" },
  { id: "production", groupKey: "studio.workspace.group.production", labelKey: "studio.workspace.production.label", eyebrowKey: "studio.workspace.production.eyebrow", descriptionKey: "studio.workspace.production.description" },
  { id: "review", groupKey: "studio.workspace.group.production", labelKey: "studio.workspace.review.label", eyebrowKey: "studio.workspace.review.eyebrow", descriptionKey: "studio.workspace.review.description" },
  { id: "delivery", groupKey: "studio.workspace.group.production", labelKey: "studio.workspace.delivery.label", eyebrowKey: "studio.workspace.delivery.eyebrow", descriptionKey: "studio.workspace.delivery.description" },
  { id: "intelligence", groupKey: "studio.workspace.group.intelligence", labelKey: "studio.workspace.intelligence.label", eyebrowKey: "studio.workspace.intelligence.eyebrow", descriptionKey: "studio.workspace.intelligence.description" },
];

function StudioWorkspaceState({
  status,
  title,
  message,
}: Readonly<{
  status: StudioWorkspaceStatus;
  title: string;
  message: string;
}>) {
  const { t } = useI18n();
  const statusKeys: Record<StudioWorkspaceStatus, DictionaryKey> = {
    LOADING: "studio.status.loading",
    READY: "studio.status.ready",
    UNAVAILABLE: "studio.status.unavailable",
    ERROR: "studio.status.error",
    MAINTENANCE: "studio.status.maintenance",
  };
  return (
    <section
      aria-live="polite"
      className={`studio-workspace-state is-${status.toLowerCase()}`}
      role={status === "ERROR" ? "alert" : "status"}
    >
      <span>{t(statusKeys[status])}</span>
      <strong>{title}</strong>
      <p>{message}</p>
    </section>
  );
}

class StudioModuleErrorBoundary extends Component<
  Readonly<{ children: ReactNode; resetKey: string }>,
  Readonly<{ failed: boolean }>
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidUpdate(previous: Readonly<{ children: ReactNode; resetKey: string }>) {
    if (this.state.failed && previous.resetKey !== this.props.resetKey) {
      this.setState({ failed: false });
    }
  }

  render() {
    if (this.state.failed) {
      return <StudioModuleErrorState />;
    }
    return this.props.children;
  }
}

function StudioModuleErrorState() {
  const { t } = useI18n();
  return (
    <StudioWorkspaceState
      message={t("studio.workspace.error.message")}
      status="ERROR"
      title={t("studio.workspace.error.title")}
    />
  );
}

function StudioModuleLoading({ label }: Readonly<{ label: string }>) {
  const { tf } = useI18n();
  return (
    <StudioWorkspaceState
      message={tf("studio.workspace.loading.message", { module: label })}
      status="LOADING"
      title={tf("studio.workspace.loading.title", { module: label })}
    />
  );
}

function StudioNewProjectEmptyState({
  onNavigate,
  onAskCopilot,
}: Readonly<{
  onNavigate: (module: StudioWorkspaceModule) => void;
  onAskCopilot: () => void;
}>) {
  const { t } = useI18n();
  return (
    <section className="studio-workspace-empty" aria-label={t("studio.workspace.empty.aria")}>
      <span>{t("studio.workspace.empty.eyebrow")}</span>
      <h2>{t("studio.workspace.empty.title")}</h2>
      <p>{t("studio.workspace.empty.message")}</p>
      <div>
        <button onClick={() => onNavigate("canvas")} type="button">{t("studio.workspace.empty.createWorkflow")}</button>
        <button onClick={() => onNavigate("canvas")} type="button">{t("studio.workspace.empty.importTemplate")}</button>
        <button onClick={onAskCopilot} type="button">{t("studio.workspace.empty.askCopilot")}</button>
      </div>
    </section>
  );
}

function StudioOverview({
  hasProject,
  onNavigate,
  onAskCopilot,
}: Readonly<{
  hasProject: boolean;
  onNavigate: (module: StudioWorkspaceModule) => void;
  onAskCopilot: () => void;
}>) {
  const { t } = useI18n();
  if (!hasProject) {
    return <StudioNewProjectEmptyState onAskCopilot={onAskCopilot} onNavigate={onNavigate} />;
  }

  return (
    <div className="studio-overview-workspace">
      <StudioCapabilityBoundary feature="project_intelligence" label={t("studio.capability.projectIntelligence")}>
        <StudioCreativeProjectIntelligenceDashboard />
      </StudioCapabilityBoundary>
      <section className="studio-overview-shortcuts" aria-label={t("studio.workspace.shortcuts")}>
        {STUDIO_WORKSPACE_MODULES.filter((item) => item.id !== "overview").map((item) => (
          <button key={item.id} onClick={() => onNavigate(item.id)} type="button">
            <span>{t(item.groupKey)}</span>
            <strong>{t(item.labelKey)}</strong>
            <small>{t(item.descriptionKey)}</small>
          </button>
        ))}
      </section>
    </div>
  );
}

export function StudioWorkspace() {
  const { t, tf } = useI18n();
  const searchParams = useSearchParams();
  const { isLoading: authLoading, isSignedIn } = useAuthSession();
  const setHasHydrated = useStudioStore((state) => state.setHasHydrated);
  const hasHydrated = useStudioStore((state) => state.hasHydrated);
  const projectId = useStudioStore((state) => state.projectId);
  const projectName = useStudioStore((state) => state.projectName);
  const dirty = useStudioStore((state) => state.dirty);
  const loadProject = useStudioStore((state) => state.loadProject);
  const setLoadingProject = useStudioStore((state) => state.setLoadingProject);
  const setProjectError = useStudioStore((state) => state.setProjectError);
  const [activeModule, setActiveModule] = useState<StudioWorkspaceModule>(() => {
    const requestedModule = searchParams.get("module");
    return STUDIO_WORKSPACE_MODULES.some((item) => item.id === requestedModule)
      ? requestedModule as StudioWorkspaceModule
      : "canvas";
  });
  const copilotPanelRef = useRef<HTMLElement>(null);
  const routeProjectRequest = useRef("");

  useEffect(() => {
    const finishHydration = () => setHasHydrated(true);
    const result = useStudioStore.persist.rehydrate();
    if (result && typeof result.then === "function") {
      void result.then(finishHydration);
    } else {
      window.queueMicrotask(finishHydration);
    }
  }, [setHasHydrated]);

  useEffect(() => {
    const requestedProjectId = searchParams.get("project") || "";
    if (
      !requestedProjectId ||
      requestedProjectId === projectId ||
      requestedProjectId === routeProjectRequest.current ||
      !hasHydrated ||
      authLoading ||
      !isSignedIn
    ) {
      return;
    }
    if (dirty && projectId) {
      setProjectError(t("studio.workspace.saveBeforeOpen"));
      return;
    }

    routeProjectRequest.current = requestedProjectId;
    setLoadingProject(true);
    setProjectError("");
    void getStudioProject(requestedProjectId)
      .then(loadProject)
      .catch((error) => {
        routeProjectRequest.current = "";
        setProjectError(error instanceof Error ? error.message : t("studio.workspace.openFailed"));
      })
      .finally(() => setLoadingProject(false));
  }, [
    authLoading,
    dirty,
    hasHydrated,
    isSignedIn,
    loadProject,
    projectId,
    searchParams,
    setLoadingProject,
    setProjectError,
    t,
  ]);

  const studioTheme = {
    "--studio-accent": activeBrand.theme.accent,
    "--studio-accent-soft": activeBrand.theme.accentSoft,
    "--studio-accent-deep": activeBrand.theme.accentDeep,
  } as CSSProperties;
  const activeModuleDefinition =
    STUDIO_WORKSPACE_MODULES.find((item) => item.id === activeModule) ??
    STUDIO_WORKSPACE_MODULES[1];

  const askCopilot = () => {
    copilotPanelRef.current?.focus();
  };

  const renderActiveModule = () => {
    switch (activeModule) {
      case "overview":
        return (
          <StudioOverview
            hasProject={Boolean(projectId)}
            onAskCopilot={askCopilot}
            onNavigate={setActiveModule}
          />
        );
      case "canvas":
        return (
          <>
            {!projectId ? (
              <StudioNewProjectEmptyState onAskCopilot={askCopilot} onNavigate={setActiveModule} />
            ) : null}
            <div className="studio-layout studio-workspace-canvas-layout">
              <StudioAssetPanel />
              <StudioCanvas authReady={!authLoading && isSignedIn} />
              <div className="studio-runtime-sidebar">
                <NodeInspector />
                <StudioRunHistoryPanel />
              </div>
            </div>
          </>
        );
      case "timeline":
        return (
          <div className="studio-timeline-workspace">
            <StudioCapabilityBoundary feature="timeline" label={t("studio.capability.timeline")}>
              <StudioUnifiedTimeline />
            </StudioCapabilityBoundary>
            <StudioTimelinePanel />
          </div>
        );
      case "storyboard":
        return (
          <StudioCapabilityBoundary feature="storyboard" label={t("studio.capability.storyboard")}>
            <StudioStoryboardPanel workspaceFocus="storyboard" />
          </StudioCapabilityBoundary>
        );
      case "production":
        return (
          <StudioCapabilityBoundary feature="storyboard" label={t("studio.capability.production")}>
            <StudioStoryboardPanel workspaceFocus="production" />
          </StudioCapabilityBoundary>
        );
      case "review":
        return (
          <StudioCapabilityBoundary feature="storyboard" label={t("studio.capability.review")}>
            <StudioStoryboardPanel workspaceFocus="review" />
          </StudioCapabilityBoundary>
        );
      case "delivery":
        return (
          <StudioCapabilityBoundary feature="storyboard" label={t("studio.capability.delivery")}>
            <StudioStoryboardPanel workspaceFocus="delivery" />
          </StudioCapabilityBoundary>
        );
      case "intelligence":
        return (
          <div className="studio-intelligence-workspace">
            <StudioCapabilityBoundary feature="project_intelligence" label={t("studio.capability.projectIntelligence")}>
              <StudioCreativeProjectIntelligenceDashboard />
            </StudioCapabilityBoundary>
            <StudioCapabilityBoundary feature="project_memory" label={t("studio.capability.projectMemory")}>
              <StudioProjectMemoryTimeline />
            </StudioCapabilityBoundary>
            <StudioCapabilityBoundary feature="project_roadmap" label={t("studio.capability.projectRoadmap")}>
              <StudioProjectRoadmapTimeline />
            </StudioCapabilityBoundary>
            <StudioCapabilityBoundary feature="portfolio_strategy" label={t("studio.capability.portfolioStrategy")}>
              <StudioPortfolioStrategyCenter />
            </StudioCapabilityBoundary>
            <StudioCapabilityBoundary feature="portfolio_resources" label={t("studio.capability.portfolioResources")}>
              <StudioPortfolioResourceCenter />
            </StudioCapabilityBoundary>
            <StudioCapabilityBoundary feature="portfolio_performance" label={t("studio.capability.portfolioPerformance")}>
              <StudioPortfolioPerformanceCenter />
            </StudioCapabilityBoundary>
            <StudioCapabilityBoundary feature="portfolio_forecast" label={t("studio.capability.portfolioForecast")}>
              <StudioPortfolioForecastCenter />
            </StudioCapabilityBoundary>
          </div>
        );
    }
  };

  return (
    <AppShell hideSidebar workspaceNav>
      <StudioApiIntegrationProvider>
        <div className="studio-shell studio-workspace-shell" style={studioTheme}>
          <div className="studio-project-header">
            <StudioToolbar
              brandName={activeBrand.shortName}
              storageKey={STUDIO_CANVAS_STORAGE_KEY}
            />
            <StudioApiVersionStatus />
          </div>

          <nav className="studio-workspace-navigation" aria-label={t("studio.workspace.navigation")}>
            {STUDIO_WORKSPACE_MODULES.map((item) => (
              <button
                aria-current={activeModule === item.id ? "page" : undefined}
                className={activeModule === item.id ? "is-active" : ""}
                key={item.id}
                onClick={() => setActiveModule(item.id)}
                type="button"
              >
                <span>{t(item.groupKey)}</span>
                <strong>{t(item.labelKey)}</strong>
              </button>
            ))}
          </nav>

          <div className="studio-workspace-frame">
            <main className="studio-main-workspace" aria-label={tf("studio.workspace.mainAria", { module: t(activeModuleDefinition.labelKey) })}>
              <header className="studio-workspace-module-header">
                <div>
                  <span>{t(activeModuleDefinition.eyebrowKey)}</span>
                  <h2>{t(activeModuleDefinition.labelKey)}</h2>
                  <p>{t(activeModuleDefinition.descriptionKey)}</p>
                </div>
                <div>
                  <strong>{t("studio.status.ready")}</strong>
                  <small>{projectName || t("studio.workspace.localDraft")}</small>
                </div>
              </header>
              <StudioModuleErrorBoundary resetKey={`${activeModule}:${projectId || "local"}`}>
                <Suspense fallback={<StudioModuleLoading label={t(activeModuleDefinition.labelKey)} />}>
                  {renderActiveModule()}
                </Suspense>
              </StudioModuleErrorBoundary>
            </main>

            <aside
              aria-label={t("studio.copilot.contextAria")}
              className="studio-context-panel"
              ref={copilotPanelRef}
              tabIndex={-1}
            >
              <header>
                <div>
                  <span>{t("studio.copilot.contextEyebrow")}</span>
                  <h2>{t("studio.copilot.title")}</h2>
                </div>
                <strong>{t("studio.copilot.draftOnly")}</strong>
              </header>
              <p className="studio-context-panel-intro">
                {t("studio.copilot.contextMessage")}
              </p>
              <StudioModuleErrorBoundary resetKey={`copilot:${projectId || "local"}`}>
                <Suspense fallback={<StudioModuleLoading label={t("studio.copilot.title")} />}>
                  <StudioCapabilityBoundary feature="project_execution_concierge" label={t("studio.capability.executionAssistant")}>
                    <StudioProjectExecutionConcierge projectId={projectId} />
                  </StudioCapabilityBoundary>
                  <StudioCapabilityBoundary feature="project_collaboration" label={t("studio.capability.projectMembers")}>
                    <StudioProjectMembersPanel projectId={projectId} />
                  </StudioCapabilityBoundary>
                  <StudioCapabilityBoundary feature="collaboration_activity" label={t("studio.capability.collaborationActivity")}>
                    <StudioCollaborationActivityCenter projectId={projectId} />
                  </StudioCapabilityBoundary>
                  <StudioCapabilityBoundary feature="copilot_center" label={t("studio.capability.copilotCenter")}>
                    <StudioProjectCopilotCommandCenter />
                  </StudioCapabilityBoundary>
                </Suspense>
              </StudioModuleErrorBoundary>
            </aside>
          </div>
        </div>
      </StudioApiIntegrationProvider>
    </AppShell>
  );
}
