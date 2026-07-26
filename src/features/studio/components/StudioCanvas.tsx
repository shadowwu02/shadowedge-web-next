"use client";

import { useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  type NodeTypes,
} from "@xyflow/react";
import { AssetNode } from "@/features/studio/nodes/AssetNode";
import { CharacterNode } from "@/features/studio/nodes/CharacterNode";
import { ImageGenerateNode } from "@/features/studio/nodes/ImageGenerateNode";
import { OutputNode } from "@/features/studio/nodes/OutputNode";
import { PromptNode } from "@/features/studio/nodes/PromptNode";
import { RemakeAnalysisNode } from "@/features/studio/nodes/RemakeAnalysisNode";
import { RemakePipelineNode } from "@/features/studio/nodes/RemakePipelineNode";
import { RemakeShotNode } from "@/features/studio/nodes/RemakeShotNode";
import { VideoGenerateNode } from "@/features/studio/nodes/VideoGenerateNode";
import { VideoEditNode } from "@/features/studio/nodes/VideoEditNode";
import { MotionControlNode } from "@/features/studio/nodes/MotionControlNode";
import { CameraControlNode } from "@/features/studio/nodes/CameraControlNode";
import { StudioAgentCanvas } from "@/features/studio/components/StudioAgentCanvas";
import { StudioCreativeCanvas } from "@/features/studio/components/StudioCreativeCanvas";
import { StudioProjectInitializationAssistant } from "@/features/studio/components/StudioProjectInitializationAssistant";
import { StudioCapabilityBoundary } from "@/features/studio/components/StudioApiIntegration";
import type { StudioExperienceMode } from "@/features/studio/lib/studioExperienceMode";
import { useI18n } from "@/i18n/useI18n";
import {
  getCurrentStudioSnapshot,
  useStudioStore,
} from "@/features/studio/store/studioStore";
import type {
  StudioCanvasSnapshot,
  StudioEdge,
  StudioNode,
} from "@/features/studio/types/studioTypes";

const nodeTypes = {
  asset: AssetNode,
  character: CharacterNode,
  prompt: PromptNode,
  remakeAnalysis: RemakeAnalysisNode,
  remake_pipeline: RemakePipelineNode,
  remakeShot: RemakeShotNode,
  imageGenerate: ImageGenerateNode,
  videoGenerate: VideoGenerateNode,
  video_edit: VideoEditNode,
  motion_control: MotionControlNode,
  camera_control: CameraControlNode,
  output: OutputNode,
} satisfies NodeTypes;

export function StudioCanvas({
  authReady = true,
  experienceMode = "CREATOR",
}: {
  authReady?: boolean;
  experienceMode?: StudioExperienceMode;
}) {
  const { t } = useI18n();
  const [canvasView, setCanvasView] = useState<"creative" | "workflow" | "agent">("creative");
  const nodes = useStudioStore((state) => state.nodes);
  const edges = useStudioStore((state) => state.edges);
  const viewport = useStudioStore((state) => state.viewport);
  const hasHydrated = useStudioStore((state) => state.hasHydrated);
  const projectId = useStudioStore((state) => state.projectId);
  const loadingProject = useStudioStore((state) => state.loadingProject);
  const onNodesChange = useStudioStore((state) => state.onNodesChange);
  const onEdgesChange = useStudioStore((state) => state.onEdgesChange);
  const onConnect = useStudioStore((state) => state.onConnect);
  const selectNode = useStudioStore((state) => state.selectNode);
  const setViewport = useStudioStore((state) => state.setViewport);
  const rememberSnapshot = useStudioStore((state) => state.rememberSnapshot);
  const dragStartSnapshot = useRef<StudioCanvasSnapshot | null>(null);
  const activeCanvasView = experienceMode === "CREATOR" ? "creative" : canvasView;

  return (
    <section className="studio-canvas-panel" aria-label={t("studio.canvas.aria")}>
      <div className="studio-canvas-heading">
        <div>
          <p>{activeCanvasView === "creative" ? t("studio.canvas.creative.title") : activeCanvasView === "workflow" ? t("studio.canvas.workflow.title") : t("studio.canvas.agent.title")}</p>
          <span>
            {activeCanvasView === "creative"
              ? t("studio.canvas.creative.description")
              : activeCanvasView === "workflow"
                ? t("studio.canvas.workflow.description")
                : t("studio.canvas.agent.description")}
          </span>
        </div>
        <div className="studio-canvas-view-switcher" aria-label={t("studio.canvas.viewAria")}>
          <button className={activeCanvasView === "creative" ? "is-active" : ""} onClick={() => setCanvasView("creative")} type="button">{t("studio.canvas.switch.creative")}</button>
          {experienceMode === "ADVANCED" ? (
            <>
              <button className={activeCanvasView === "workflow" ? "is-active" : ""} onClick={() => setCanvasView("workflow")} type="button">{t("studio.canvas.switch.workflow")}</button>
              <button className={activeCanvasView === "agent" ? "is-active" : ""} onClick={() => setCanvasView("agent")} type="button">{t("studio.canvas.switch.agent")}</button>
            </>
          ) : null}
          <span className="studio-local-badge">
            {activeCanvasView === "creative"
              ? t("studio.canvas.badge.unified")
              : activeCanvasView === "agent"
                ? t("studio.canvas.badge.compatibility")
              : loadingProject
                ? t("studio.canvas.badge.loadingProject")
                : projectId
                  ? t("studio.canvas.badge.cloudLoaded")
                  : hasHydrated
                    ? t("studio.canvas.badge.localRestored")
                    : t("studio.canvas.badge.restoringLocal")}
          </span>
        </div>
      </div>

      {activeCanvasView === "creative" ? (
        <StudioCapabilityBoundary feature="creative_canvas" label={t("studio.capability.creativeCanvas")}>
          {projectId ? (
            <StudioCreativeCanvas authReady={authReady} projectId={projectId} experienceMode={experienceMode} />
          ) : (
            <StudioProjectInitializationAssistant />
          )}
        </StudioCapabilityBoundary>
      ) : activeCanvasView === "agent" ? (
        <StudioCapabilityBoundary feature="agent_canvas" label={t("studio.capability.agentCanvas")}>
          <StudioAgentCanvas projectId={projectId} />
        </StudioCapabilityBoundary>
      ) : <div className="studio-flow-stage">
        <ReactFlow<StudioNode, StudioEdge>
          colorMode="dark"
          connectionLineStyle={{ stroke: "var(--studio-accent)", strokeWidth: 2 }}
          defaultEdgeOptions={{ animated: true, type: "smoothstep" }}
          edges={edges}
          fitViewOptions={{ padding: 0.18 }}
          isValidConnection={(connection) => connection.source !== connection.target}
          maxZoom={1.7}
          minZoom={0.35}
          nodeTypes={nodeTypes}
          nodes={nodes}
          onConnect={onConnect}
          onEdgesChange={onEdgesChange}
          onNodeClick={(_, node) => selectNode(node.id)}
          onNodeDragStart={() => {
            dragStartSnapshot.current = getCurrentStudioSnapshot();
          }}
          onNodeDragStop={() => {
            if (dragStartSnapshot.current) {
              rememberSnapshot(dragStartSnapshot.current);
              dragStartSnapshot.current = null;
            }
          }}
          onNodesChange={onNodesChange}
          onPaneClick={() => selectNode(null)}
          onViewportChange={setViewport}
          panOnDrag
          selectionOnDrag
          snapGrid={[12, 12]}
          snapToGrid
          viewport={viewport}
        >
          <Background
            color="var(--studio-grid)"
            gap={22}
            size={1}
            variant={BackgroundVariant.Dots}
          />
          <Controls position="bottom-left" showInteractive={false} />
          <MiniMap
            className="studio-minimap"
            maskColor="rgba(5, 7, 11, 0.7)"
            nodeColor="var(--studio-accent)"
            pannable
            position="bottom-right"
            zoomable
          />
        </ReactFlow>
      </div>}
    </section>
  );
}
