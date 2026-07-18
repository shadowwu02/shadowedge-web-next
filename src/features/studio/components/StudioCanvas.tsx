"use client";

import { useRef } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  type NodeTypes,
} from "@xyflow/react";
import { AssetNode } from "@/features/studio/nodes/AssetNode";
import { ImageGenerateNode } from "@/features/studio/nodes/ImageGenerateNode";
import { OutputNode } from "@/features/studio/nodes/OutputNode";
import { PromptNode } from "@/features/studio/nodes/PromptNode";
import { RemakeAnalysisNode } from "@/features/studio/nodes/RemakeAnalysisNode";
import { RemakePipelineNode } from "@/features/studio/nodes/RemakePipelineNode";
import { RemakeShotNode } from "@/features/studio/nodes/RemakeShotNode";
import { VideoGenerateNode } from "@/features/studio/nodes/VideoGenerateNode";
import { VideoEditNode } from "@/features/studio/nodes/VideoEditNode";
import { MotionControlNode } from "@/features/studio/nodes/MotionControlNode";
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
  prompt: PromptNode,
  remakeAnalysis: RemakeAnalysisNode,
  remake_pipeline: RemakePipelineNode,
  remakeShot: RemakeShotNode,
  imageGenerate: ImageGenerateNode,
  videoGenerate: VideoGenerateNode,
  video_edit: VideoEditNode,
  motion_control: MotionControlNode,
  output: OutputNode,
} satisfies NodeTypes;

export function StudioCanvas() {
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

  return (
    <section className="studio-canvas-panel" aria-label="Studio workflow canvas">
      <div className="studio-canvas-heading">
        <div>
          <p>Workflow Canvas</p>
          <span>Drag nodes, connect handles, and shape the generation flow.</span>
        </div>
        <span className="studio-local-badge">
          {loadingProject
            ? "Loading cloud project"
            : projectId
              ? "Cloud project loaded"
              : hasHydrated
                ? "Local fallback restored"
                : "Restoring local fallback"}
        </span>
      </div>

      <div className="studio-flow-stage">
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
      </div>
    </section>
  );
}
