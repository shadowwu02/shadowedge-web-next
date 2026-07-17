"use client";

import { useState } from "react";
import type { NodeExecutionStatus } from "@/features/studio/runtime/types";
import { useStudioStore } from "@/features/studio/store/studioStore";

export function StudioRetryButton({
  nodeId,
  status,
  warning = "Retry may create a new charged task.",
}: {
  nodeId: string;
  status: NodeExecutionStatus;
  warning?: string;
}) {
  const [armed, setArmed] = useState(false);
  const runtimeRunning = useStudioStore((state) => state.runtimeRunning);
  const retryNode = useStudioStore((state) => state.retryNode);

  if (status !== "failed") return null;

  if (!armed) {
    return (
      <button
        className="studio-node-action nodrag nopan"
        disabled={runtimeRunning}
        onClick={(event) => {
          event.stopPropagation();
          setArmed(true);
        }}
        onMouseDown={(event) => event.stopPropagation()}
        type="button"
      >
        Retry
      </button>
    );
  }

  return (
    <div className="studio-retry-confirm nodrag nopan" role="alert">
      <span>{warning}</span>
      <div>
        <button
          disabled={runtimeRunning}
          onClick={(event) => {
            event.stopPropagation();
            setArmed(false);
            void retryNode(nodeId);
          }}
          onMouseDown={(event) => event.stopPropagation()}
          type="button"
        >
          Confirm Retry
        </button>
        <button
          onClick={(event) => {
            event.stopPropagation();
            setArmed(false);
          }}
          onMouseDown={(event) => event.stopPropagation()}
          type="button"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
