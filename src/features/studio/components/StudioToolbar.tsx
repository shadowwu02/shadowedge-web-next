"use client";

import { useState } from "react";
import { useStudioStore } from "@/features/studio/store/studioStore";
import {
  STUDIO_NODE_DEFINITIONS,
  type StudioNodeType,
} from "@/features/studio/types/studioTypes";

export function StudioToolbar({
  brandName,
  storageKey,
}: {
  brandName: string;
  storageKey: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const addNode = useStudioStore((state) => state.addNode);
  const save = useStudioStore((state) => state.save);
  const undo = useStudioStore((state) => state.undo);
  const redo = useStudioStore((state) => state.redo);
  const canUndo = useStudioStore((state) => state.past.length > 0);
  const canRedo = useStudioStore((state) => state.future.length > 0);
  const updatedAt = useStudioStore((state) => state.updatedAt);

  const handleAddNode = (type: StudioNodeType) => {
    addNode(type);
    setMenuOpen(false);
  };

  return (
    <header className="studio-toolbar">
      <div className="studio-toolbar-title">
        <p>{brandName}</p>
        <h1>AI Studio</h1>
        <span>Canvas P0 · UI and project structure only</span>
      </div>

      <div className="studio-toolbar-actions">
        <div className="studio-new-node-wrap">
          <button
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className="studio-button studio-button-primary"
            onClick={() => setMenuOpen((open) => !open)}
            type="button"
          >
            <span aria-hidden="true">＋</span>
            New Node
          </button>
          {menuOpen ? (
            <div className="studio-new-node-menu" role="menu">
              {STUDIO_NODE_DEFINITIONS.map((item) => (
                <button
                  key={item.type}
                  onClick={() => handleAddNode(item.type)}
                  role="menuitem"
                  type="button"
                >
                  <strong>{item.label}</strong>
                  <span>{item.description}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <button className="studio-button" onClick={save} type="button">
          Save
        </button>
        <button className="studio-button" disabled={!canUndo} onClick={undo} type="button">
          Undo
        </button>
        <button className="studio-button" disabled={!canRedo} onClick={redo} type="button">
          Redo
        </button>
      </div>

      <div className="studio-save-state" aria-live="polite">
        <span>Local only · no provider calls</span>
        <span title={storageKey}>
          {updatedAt
            ? "Saved " + new Date(updatedAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "Ready to save"}
        </span>
      </div>
    </header>
  );
}
