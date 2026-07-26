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
  group: "Studio" | "Story" | "Production" | "Intelligence";
  label: string;
  eyebrow: string;
  description: string;
}>> = [
  { id: "overview", group: "Studio", label: "Overview", eyebrow: "Project home", description: "Project health and next actions" },
  { id: "canvas", group: "Studio", label: "Canvas", eyebrow: "Creative operating canvas", description: "Goals, agents, scenes, execution, and results" },
  { id: "timeline", group: "Story", label: "Timeline", eyebrow: "Unified timeline", description: "Scenes, clips, assets, and output references" },
  { id: "storyboard", group: "Story", label: "Storyboard", eyebrow: "Story workspace", description: "Shots, camera plans, and generation drafts" },
  { id: "production", group: "Production", label: "Production", eyebrow: "Production workspace", description: "Run plan, gates, approvals, and status" },
  { id: "review", group: "Production", label: "Review", eyebrow: "Quality and collaboration", description: "Quality gates, comments, and revision drafts" },
  { id: "delivery", group: "Production", label: "Delivery", eyebrow: "Versioned delivery", description: "Approved outputs, assets, and package versions" },
  { id: "intelligence", group: "Intelligence", label: "Intelligence", eyebrow: "Project intelligence", description: "Memory, roadmap, portfolio, risk, and evidence" },
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
  return (
    <section
      aria-live="polite"
      className={`studio-workspace-state is-${status.toLowerCase()}`}
      role={status === "ERROR" ? "alert" : "status"}
    >
      <span>{status}</span>
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
      return (
        <StudioWorkspaceState
          message="This module could not be displayed. No project, execution, or billing data was changed."
          status="ERROR"
          title="Workspace module unavailable"
        />
      );
    }
    return this.props.children;
  }
}

function StudioModuleLoading({ label }: Readonly<{ label: string }>) {
  return (
    <StudioWorkspaceState
      message={`Preparing the ${label} workspace without blocking the rest of Studio.`}
      status="LOADING"
      title={`Loading ${label}`}
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
  return (
    <section className="studio-workspace-empty" aria-label="New Project Canvas">
      <span>NEW PROJECT</span>
      <h2>Turn the first idea into a visible creative plan.</h2>
      <p>
        Start from the Creative Canvas, reuse a confirmed template, or ask Copilot for a
        draft suggestion. Nothing runs until the existing confirmation gates are completed.
      </p>
      <div>
        <button onClick={() => onNavigate("canvas")} type="button">Create Workflow</button>
        <button onClick={() => onNavigate("canvas")} type="button">Import Template</button>
        <button onClick={onAskCopilot} type="button">Ask Copilot</button>
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
  if (!hasProject) {
    return <StudioNewProjectEmptyState onAskCopilot={onAskCopilot} onNavigate={onNavigate} />;
  }

  return (
    <div className="studio-overview-workspace">
      <StudioCapabilityBoundary feature="project_intelligence" label="Project Intelligence">
        <StudioCreativeProjectIntelligenceDashboard />
      </StudioCapabilityBoundary>
      <section className="studio-overview-shortcuts" aria-label="Studio workspace shortcuts">
        {STUDIO_WORKSPACE_MODULES.filter((item) => item.id !== "overview").map((item) => (
          <button key={item.id} onClick={() => onNavigate(item.id)} type="button">
            <span>{item.group}</span>
            <strong>{item.label}</strong>
            <small>{item.description}</small>
          </button>
        ))}
      </section>
    </div>
  );
}

export function StudioWorkspace() {
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
      setProjectError("Save the current project before opening another one from Dashboard.");
      return;
    }

    routeProjectRequest.current = requestedProjectId;
    setLoadingProject(true);
    setProjectError("");
    void getStudioProject(requestedProjectId)
      .then(loadProject)
      .catch((error) => {
        routeProjectRequest.current = "";
        setProjectError(error instanceof Error ? error.message : "Dashboard project could not be opened.");
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
            <StudioCapabilityBoundary feature="timeline" label="Unified Timeline">
              <StudioUnifiedTimeline />
            </StudioCapabilityBoundary>
            <StudioTimelinePanel />
          </div>
        );
      case "storyboard":
        return (
          <StudioCapabilityBoundary feature="storyboard" label="Storyboard">
            <StudioStoryboardPanel workspaceFocus="storyboard" />
          </StudioCapabilityBoundary>
        );
      case "production":
        return (
          <StudioCapabilityBoundary feature="storyboard" label="Production">
            <StudioStoryboardPanel workspaceFocus="production" />
          </StudioCapabilityBoundary>
        );
      case "review":
        return (
          <StudioCapabilityBoundary feature="storyboard" label="Review">
            <StudioStoryboardPanel workspaceFocus="review" />
          </StudioCapabilityBoundary>
        );
      case "delivery":
        return (
          <StudioCapabilityBoundary feature="storyboard" label="Delivery">
            <StudioStoryboardPanel workspaceFocus="delivery" />
          </StudioCapabilityBoundary>
        );
      case "intelligence":
        return (
          <div className="studio-intelligence-workspace">
            <StudioCapabilityBoundary feature="project_intelligence" label="Project Intelligence">
              <StudioCreativeProjectIntelligenceDashboard />
            </StudioCapabilityBoundary>
            <StudioCapabilityBoundary feature="project_memory" label="Project Memory">
              <StudioProjectMemoryTimeline />
            </StudioCapabilityBoundary>
            <StudioCapabilityBoundary feature="project_roadmap" label="Project Roadmap">
              <StudioProjectRoadmapTimeline />
            </StudioCapabilityBoundary>
            <StudioCapabilityBoundary feature="portfolio_strategy" label="Portfolio Strategy">
              <StudioPortfolioStrategyCenter />
            </StudioCapabilityBoundary>
            <StudioCapabilityBoundary feature="portfolio_resources" label="Portfolio Resources">
              <StudioPortfolioResourceCenter />
            </StudioCapabilityBoundary>
            <StudioCapabilityBoundary feature="portfolio_performance" label="Portfolio Performance">
              <StudioPortfolioPerformanceCenter />
            </StudioCapabilityBoundary>
            <StudioCapabilityBoundary feature="portfolio_forecast" label="Portfolio Forecast">
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

          <nav className="studio-workspace-navigation" aria-label="Studio modules">
            {STUDIO_WORKSPACE_MODULES.map((item) => (
              <button
                aria-current={activeModule === item.id ? "page" : undefined}
                className={activeModule === item.id ? "is-active" : ""}
                key={item.id}
                onClick={() => setActiveModule(item.id)}
                type="button"
              >
                <span>{item.group}</span>
                <strong>{item.label}</strong>
              </button>
            ))}
          </nav>

          <div className="studio-workspace-frame">
            <main className="studio-main-workspace" aria-label={`${activeModuleDefinition.label} workspace`}>
              <header className="studio-workspace-module-header">
                <div>
                  <span>{activeModuleDefinition.eyebrow}</span>
                  <h2>{activeModuleDefinition.label}</h2>
                  <p>{activeModuleDefinition.description}</p>
                </div>
                <div>
                  <strong>READY</strong>
                  <small>{projectName || "Local draft"}</small>
                </div>
              </header>
              <StudioModuleErrorBoundary resetKey={`${activeModule}:${projectId || "local"}`}>
                <Suspense fallback={<StudioModuleLoading label={activeModuleDefinition.label} />}>
                  {renderActiveModule()}
                </Suspense>
              </StudioModuleErrorBoundary>
            </main>

            <aside
              aria-label="Copilot Context Panel"
              className="studio-context-panel"
              ref={copilotPanelRef}
              tabIndex={-1}
            >
              <header>
                <div>
                  <span>CONTEXT PANEL</span>
                  <h2>Creative Copilot</h2>
                </div>
                <strong>DRAFT ONLY</strong>
              </header>
              <p className="studio-context-panel-intro">
                Insights, recommendations, evidence, and draft actions stay visible while you
                move between Studio modules.
              </p>
              <StudioModuleErrorBoundary resetKey={`copilot:${projectId || "local"}`}>
                <Suspense fallback={<StudioModuleLoading label="Copilot" />}>
                  <StudioCapabilityBoundary feature="project_execution_concierge" label="Project Copilot Assistant">
                    <StudioProjectExecutionConcierge projectId={projectId} />
                  </StudioCapabilityBoundary>
                  <StudioCapabilityBoundary feature="project_collaboration" label="Project Members">
                    <StudioProjectMembersPanel projectId={projectId} />
                  </StudioCapabilityBoundary>
                  <StudioCapabilityBoundary feature="collaboration_activity" label="Collaboration Activity">
                    <StudioCollaborationActivityCenter projectId={projectId} />
                  </StudioCapabilityBoundary>
                  <StudioCapabilityBoundary feature="copilot_center" label="Project Copilot Center">
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
