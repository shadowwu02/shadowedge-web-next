"use client";

import type { PointerEvent } from "react";
import type { CanvasNode, CanvasNodeType, CanvasPosition } from "@/components/canvas/canvasTypes";
import { cn } from "@/lib/utils";

const nodeTypeTone: Record<CanvasNodeType, string> = {
  prompt: "border-[#ffb44d]/26 bg-[#ffb44d]/10 text-[#ffcf83]",
  image: "border-[#6fd7d7]/20 bg-[#6fd7d7]/9 text-[#9be7e7]",
  video: "border-[#bca7ff]/18 bg-[#bca7ff]/8 text-[#d7ccff]",
  history: "border-[#f4f4f4]/12 bg-[#f4f4f4]/7 text-[#d6d0c4]",
};

type CanvasNodeCardProps = {
  canDrag: boolean;
  isSelected: boolean;
  node: CanvasNode;
  nodeDescription: string;
  nodeLabel: string;
  nodeTypeLabel: string;
  onPointerDown: (event: PointerEvent<HTMLElement>, nodeId: string) => void;
  onSelect: (nodeId: string) => void;
  position: CanvasPosition;
  readyLabel: string;
  selectedLabel: string;
};

export function CanvasNodeCard({
  canDrag,
  isSelected,
  node,
  nodeDescription,
  nodeLabel,
  nodeTypeLabel,
  onPointerDown,
  onSelect,
  position,
  readyLabel,
  selectedLabel,
}: CanvasNodeCardProps) {
  return (
    <article
      className={cn(
        "group z-10 flex min-h-[116px] w-full cursor-pointer flex-col justify-between rounded-[22px] border p-4 text-left shadow-[0_18px_45px_rgba(0,0,0,.22)] transition",
        "border-[rgba(244,244,244,0.10)] bg-[#101218]/94",
        canDrag ? "md:absolute md:w-[230px] md:cursor-grab md:active:cursor-grabbing" : "",
        isSelected ? "border-[#ffb44d]/44 bg-[#15130f] shadow-[0_24px_58px_rgba(255,180,77,.13)]" : "hover:border-[rgba(255,180,77,.24)]",
      )}
      data-canvas-node={node.id}
      onClick={() => onSelect(node.id)}
      onPointerDown={(event) => onPointerDown(event, node.id)}
      style={canDrag ? { left: position.x, top: position.y } : undefined}
    >
      <div>
        <span className={cn("inline-flex w-fit rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.14em]", nodeTypeTone[node.type])}>
          {nodeTypeLabel}
        </span>
        <h3 className="mt-3 text-sm font-semibold text-[#f7f3ea]">{nodeLabel}</h3>
      </div>
      <p className="mt-3 line-clamp-2 text-xs leading-5 text-[#d6d0c4]/66">{nodeDescription}</p>
      <span className="mt-3 text-[10px] font-semibold uppercase tracking-[.16em] text-[#b9b9b9]/44">
        {isSelected ? selectedLabel : readyLabel}
      </span>
    </article>
  );
}
