"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CanvasNodeCard } from "@/components/canvas/CanvasNodeCard";
import type { CanvasPosition, CanvasWorkflow } from "@/components/canvas/canvasTypes";
import { useI18n } from "@/i18n/useI18n";

const nodeWidth = 230;
const nodeHeight = 116;
const minCanvasWidthForDrag = 640;
const canvasConnections = [
  { id: "prompt-image", from: "prompt", to: "image" },
  { id: "image-video", from: "image", to: "video" },
  { id: "video-history", from: "video", to: "history" },
];

type DragState = {
  nodeId: string;
  offsetX: number;
  offsetY: number;
};

type CanvasBoardProps = {
  onMoveNode: (nodeId: string, position: CanvasPosition) => void;
  onSelectNode: (nodeId: string) => void;
  workflow: CanvasWorkflow;
};

function buildConnectorPath(from: CanvasPosition, to: CanvasPosition) {
  const start = { x: from.x + nodeWidth / 2, y: from.y + nodeHeight / 2 };
  const end = { x: to.x + nodeWidth / 2, y: to.y + nodeHeight / 2 };
  const dx = Math.max(80, Math.abs(end.x - start.x) * 0.45);
  const c1x = end.x >= start.x ? start.x + dx : start.x - dx;
  const c2x = end.x >= start.x ? end.x - dx : end.x + dx;
  return `M ${start.x} ${start.y} C ${c1x} ${start.y}, ${c2x} ${end.y}, ${end.x} ${end.y}`;
}

export function CanvasBoard({ onMoveNode, onSelectNode, workflow }: CanvasBoardProps) {
  const { t } = useI18n();
  const stageRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const [stageSize, setStageSize] = useState({ height: 0, width: 0 });
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const canDrag = stageSize.width >= minCanvasWidthForDrag;

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const updateSize = () => {
      setStageSize({
        height: stage.clientHeight,
        width: stage.clientWidth,
      });
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  const clampPosition = useCallback((position: CanvasPosition): CanvasPosition => {
    if (!stageSize.width || !stageSize.height) return position;
    const maxX = Math.max(12, stageSize.width - nodeWidth - 12);
    const maxY = Math.max(12, stageSize.height - nodeHeight - 12);
    return {
      x: Math.round(Math.min(maxX, Math.max(12, position.x))),
      y: Math.round(Math.min(maxY, Math.max(12, position.y))),
    };
  }, [stageSize.height, stageSize.width]);

  const constrainedPositions = useMemo(() => {
    if (!canDrag) return workflow.positions;
    return Object.fromEntries(
      Object.entries(workflow.positions).map(([nodeId, position]) => [nodeId, clampPosition(position)]),
    ) as Record<string, CanvasPosition>;
  }, [canDrag, clampPosition, workflow.positions]);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>, nodeId: string) => {
      onSelectNode(nodeId);
      if (!canDrag || event.button !== 0) return;
      const stage = stageRef.current;
      const position = constrainedPositions[nodeId];
      if (!stage || !position) return;
      const rect = stage.getBoundingClientRect();
      dragRef.current = {
        nodeId,
        offsetX: event.clientX - rect.left - position.x,
        offsetY: event.clientY - rect.top - position.y,
      };
      setDraggingNodeId(nodeId);
      event.currentTarget.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    },
    [canDrag, constrainedPositions, onSelectNode],
  );

  useEffect(() => {
    const handlePointerMove = (event: globalThis.PointerEvent) => {
      const drag = dragRef.current;
      const stage = stageRef.current;
      if (!drag || !stage) return;
      const rect = stage.getBoundingClientRect();
      onMoveNode(
        drag.nodeId,
        clampPosition({
          x: event.clientX - rect.left - drag.offsetX,
          y: event.clientY - rect.top - drag.offsetY,
        }),
      );
      event.preventDefault();
    };

    const finishDrag = () => {
      dragRef.current = null;
      setDraggingNodeId(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", finishDrag);
    window.addEventListener("pointercancel", finishDrag);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", finishDrag);
      window.removeEventListener("pointercancel", finishDrag);
    };
  }, [clampPosition, onMoveNode]);

  const connectorPaths = useMemo(() => {
    if (!canDrag) return [];
    return canvasConnections.map((connection) => ({
      ...connection,
      path: buildConnectorPath(constrainedPositions[connection.from], constrainedPositions[connection.to]),
    }));
  }, [canDrag, constrainedPositions]);

  const nodeLabels = {
    prompt: t("canvas.promptNode"),
    image: t("canvas.imageNode"),
    video: t("canvas.videoNode"),
    history: t("canvas.historyNode"),
  };

  const nodeTypeLabels = {
    prompt: t("canvas.nodeType.input"),
    image: t("canvas.nodeType.generation"),
    video: t("canvas.nodeType.generation"),
    history: t("canvas.nodeType.utility"),
  };

  const getNodeDescription = (nodeId: string) => {
    const node = workflow.nodes[nodeId];
    if (!node) return "";
    if (node.type === "prompt") return node.prompt || t("canvas.promptEmpty");
    if (node.type === "image") return `${node.model || "Auto"} / ${node.ratio || "--"} / ${node.quality || "--"}`;
    if (node.type === "video") {
      const duration = node.duration ? `${node.duration}s` : "--";
      return `${node.model || "--"} / ${duration} / ${node.ratio || "--"} / ${node.resolution || node.quality || "--"}`;
    }
    return t("canvas.historyDescription");
  };

  return (
    <section className="se-card min-w-0 rounded-[30px] p-4 md:p-5">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="se-eyebrow">{t("canvas.workflowBoard")}</p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-[#f7f3ea]">{t("canvas.boardTitle")}</h2>
        </div>
        <span className="inline-flex w-fit rounded-full border border-[#ffb44d]/22 bg-[#ffb44d]/10 px-3 py-1.5 text-xs font-semibold text-[#ffcf83]">
          {t("canvas.previewMode")}
        </span>
      </div>

      <div
        className="relative grid min-h-[460px] gap-3 overflow-hidden rounded-[26px] border border-[rgba(244,244,244,0.08)] bg-[radial-gradient(circle_at_20%_20%,rgba(255,180,77,.12),transparent_24%),#090b10] p-3 md:min-h-[620px]"
        data-canvas-stage="workflow"
        ref={stageRef}
      >
        {canDrag ? (
          <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
            <defs>
              <marker id="seCanvasArrowNext" markerHeight="10" markerUnits="strokeWidth" markerWidth="10" orient="auto" refX="8" refY="5">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(255,180,77,.62)" />
              </marker>
            </defs>
            {connectorPaths.map((connector) => (
              <path
                className="fill-none stroke-[#ffb44d]/45"
                d={connector.path}
                key={connector.id}
                markerEnd="url(#seCanvasArrowNext)"
                strokeLinecap="round"
                strokeWidth="2.5"
              />
            ))}
          </svg>
        ) : null}

        {Object.values(workflow.nodes).map((node) => (
          <CanvasNodeCard
            canDrag={canDrag}
            isSelected={workflow.selectedNodeId === node.id || draggingNodeId === node.id}
            key={node.id}
            node={node}
            nodeDescription={getNodeDescription(node.id)}
            nodeLabel={nodeLabels[node.type]}
            nodeTypeLabel={nodeTypeLabels[node.type]}
            onPointerDown={handlePointerDown}
            onSelect={onSelectNode}
            position={constrainedPositions[node.id]}
            readyLabel={t("canvas.ready")}
            selectedLabel={t("canvas.selected")}
          />
        ))}
      </div>
    </section>
  );
}
