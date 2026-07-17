"use client";

import { useStudioStore } from "@/features/studio/store/studioStore";
import { STUDIO_NODE_DEFINITIONS } from "@/features/studio/types/studioTypes";

export function NodeLibrary() {
  const addNode = useStudioStore((state) => state.addNode);

  return (
    <aside className="studio-side-panel studio-node-library" aria-label="Node library">
      <div className="studio-panel-heading">
        <p>Node Library</p>
        <h2>Building blocks</h2>
        <span>Add a placeholder node to the workflow.</span>
      </div>

      <div className="studio-library-list">
        {STUDIO_NODE_DEFINITIONS.map((item, index) => (
          <button key={item.type} onClick={() => addNode(item.type)} type="button">
            <span className="studio-library-index">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span>
              <strong>{item.label}</strong>
              <small>{item.description}</small>
            </span>
            <span aria-hidden="true" className="studio-library-add">
              +
            </span>
          </button>
        ))}
      </div>

      <div className="studio-panel-note">
        <strong>P0 boundary</strong>
        <span>Nodes hold UI data only. Generate actions are intentionally unavailable.</span>
      </div>
    </aside>
  );
}
