"use client";

import { useEffect, type CSSProperties } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { activeBrand } from "@/config/brand";
import { NodeInspector } from "@/features/studio/components/NodeInspector";
import { StudioAssetPanel } from "@/features/studio/components/StudioAssetPanel";
import { StudioCanvas } from "@/features/studio/components/StudioCanvas";
import { StudioToolbar } from "@/features/studio/components/StudioToolbar";
import { StudioRunHistoryPanel } from "@/features/studio/components/StudioRunHistoryPanel";
import { StudioTimelinePanel } from "@/features/studio/components/StudioTimelinePanel";
import { StudioUnifiedTimeline } from "@/features/studio/components/StudioUnifiedTimeline";
import { StudioStoryboardPanel } from "@/features/studio/components/StudioStoryboardPanel";
import { StudioCreativeProjectIntelligenceDashboard } from "@/features/studio/components/StudioCreativeProjectIntelligenceDashboard";
import { StudioProjectCopilotCommandCenter } from "@/features/studio/components/StudioProjectCopilotCommandCenter";
import { StudioProjectMemoryTimeline } from "@/features/studio/components/StudioProjectMemoryTimeline";
import { StudioProjectRoadmapTimeline } from "@/features/studio/components/StudioProjectRoadmapTimeline";
import { StudioPortfolioStrategyCenter } from "@/features/studio/components/StudioPortfolioStrategyCenter";
import { StudioPortfolioResourceCenter } from "@/features/studio/components/StudioPortfolioResourceCenter";
import { StudioPortfolioPerformanceCenter } from "@/features/studio/components/StudioPortfolioPerformanceCenter";
import { StudioPortfolioForecastCenter } from "@/features/studio/components/StudioPortfolioForecastCenter";
import {
  StudioApiIntegrationProvider,
  StudioApiVersionStatus,
  StudioCapabilityBoundary,
} from "@/features/studio/components/StudioApiIntegration";
import {
  STUDIO_CANVAS_STORAGE_KEY,
  useStudioStore,
} from "@/features/studio/store/studioStore";

export function StudioWorkspace() {
  const setHasHydrated = useStudioStore((state) => state.setHasHydrated);

  useEffect(() => {
    const finishHydration = () => setHasHydrated(true);
    const result = useStudioStore.persist.rehydrate();
    if (result && typeof result.then === "function") {
      void result.then(finishHydration);
    } else {
      window.queueMicrotask(finishHydration);
    }
  }, [setHasHydrated]);

  const studioTheme = {
    "--studio-accent": activeBrand.theme.accent,
    "--studio-accent-soft": activeBrand.theme.accentSoft,
    "--studio-accent-deep": activeBrand.theme.accentDeep,
  } as CSSProperties;

  return (
    <AppShell hideSidebar workspaceNav>
      <StudioApiIntegrationProvider>
        <div className="studio-shell" style={studioTheme}>
          <StudioToolbar
            brandName={activeBrand.shortName}
            storageKey={STUDIO_CANVAS_STORAGE_KEY}
          />
          <StudioApiVersionStatus />
          <StudioCapabilityBoundary feature="project_intelligence" label="Project Intelligence">
            <StudioCreativeProjectIntelligenceDashboard />
          </StudioCapabilityBoundary>
          <StudioCapabilityBoundary feature="copilot_center" label="Project Copilot Center">
            <StudioProjectCopilotCommandCenter />
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
          <div className="studio-layout">
            <StudioAssetPanel />
            <StudioCanvas />
            <div className="studio-runtime-sidebar">
              <NodeInspector />
              <StudioRunHistoryPanel />
            </div>
          </div>
          <StudioCapabilityBoundary feature="timeline" label="Unified Timeline">
            <StudioUnifiedTimeline />
          </StudioCapabilityBoundary>
          <StudioCapabilityBoundary feature="storyboard" label="Storyboard">
            <StudioStoryboardPanel />
          </StudioCapabilityBoundary>
          <StudioTimelinePanel />
        </div>
      </StudioApiIntegrationProvider>
    </AppShell>
  );
}
