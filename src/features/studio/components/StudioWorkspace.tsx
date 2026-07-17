"use client";

import { useEffect, type CSSProperties } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { activeBrand } from "@/config/brand";
import { NodeInspector } from "@/features/studio/components/NodeInspector";
import { StudioAssetPanel } from "@/features/studio/components/StudioAssetPanel";
import { StudioCanvas } from "@/features/studio/components/StudioCanvas";
import { StudioToolbar } from "@/features/studio/components/StudioToolbar";
import { StudioRunHistoryPanel } from "@/features/studio/components/StudioRunHistoryPanel";
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
        <div className="studio-layout">
          <StudioAssetPanel />
          <StudioCanvas />
          <div className="studio-runtime-sidebar">
            <NodeInspector />
            <StudioRunHistoryPanel />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
