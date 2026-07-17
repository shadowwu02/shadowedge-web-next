import type { ReactNode } from "react";
import { Handle, Position } from "@xyflow/react";
import { cn } from "@/lib/utils";

export function StudioNodeFrame({
  acceptsInput = true,
  children,
  eyebrow,
  emitsOutput = true,
  selected,
  status,
  title,
}: {
  acceptsInput?: boolean;
  children: ReactNode;
  eyebrow: string;
  emitsOutput?: boolean;
  selected: boolean;
  status?: string;
  title: string;
}) {
  return (
    <article className={cn("studio-node", selected && "studio-node-selected")}>
      {acceptsInput ? (
        <Handle
          className="studio-node-handle studio-node-handle-input"
          position={Position.Left}
          type="target"
        />
      ) : null}

      <header className="studio-node-header">
        <div>
          <p className="studio-node-eyebrow">{eyebrow}</p>
          <h3 className="studio-node-title">{title}</h3>
        </div>
        {status ? <span className="studio-node-status">{status}</span> : null}
      </header>

      <div className="studio-node-body">{children}</div>

      {emitsOutput ? (
        <Handle
          className="studio-node-handle studio-node-handle-output"
          position={Position.Right}
          type="source"
        />
      ) : null}
    </article>
  );
}
