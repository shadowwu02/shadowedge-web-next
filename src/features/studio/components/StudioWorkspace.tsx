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
      <div className="studio-shell" style={studioTheme}>
        <StudioToolbar
          brandName={activeBrand.shortName}
          storageKey={STUDIO_CANVAS_STORAGE_KEY}
        />
        <StudioCreativeProjectIntelligenceDashboard />
        <StudioProjectCopilotCommandCenter />
        <StudioProjectMemoryTimeline />
        <StudioProjectRoadmapTimeline />
        <StudioPortfolioStrategyCenter />
        <StudioPortfolioResourceCenter />
        <StudioPortfolioPerformanceCenter />
        <div className="studio-layout">
          <StudioAssetPanel />
          <StudioCanvas />
          <div className="studio-runtime-sidebar">
            <NodeInspector />
            <StudioRunHistoryPanel />
          </div>
        </div>
        <StudioUnifiedTimeline />
        <StudioStoryboardPanel />
        <StudioTimelinePanel />
      </div>
    </AppShell>
  );
}
