"use client";

import type { ChangeEvent } from "react";
import { useStudioStore } from "@/features/studio/store/studioStore";

function InspectorField({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="studio-inspector-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function NodeInspector() {
  const nodes = useStudioStore((state) => state.nodes);
  const selectedNodeId = useStudioStore((state) => state.selectedNodeId);
  const updateNodeData = useStudioStore((state) => state.updateNodeData);
  const deleteNode = useStudioStore((state) => state.deleteNode);
  const selectedNode = nodes.find((node) => node.id === selectedNodeId);

  if (!selectedNode) {
    return (
      <aside className="studio-side-panel studio-inspector" aria-label="Node inspector">
        <div className="studio-panel-heading">
          <p>Inspector</p>
          <h2>No node selected</h2>
          <span>Select a node to edit its P0 data structure.</span>
        </div>
        <div className="studio-empty-inspector">
          <span aria-hidden="true">↖</span>
          <p>Choose a node on the canvas or add one from the library.</p>
        </div>
      </aside>
    );
  }

  const data = selectedNode.data;
  const update = (patch: Record<string, unknown>) =>
    updateNodeData(selectedNode.id, patch);
  const updateText =
    (field: string) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      update({ [field]: event.target.value });

  return (
    <aside className="studio-side-panel studio-inspector" aria-label="Node inspector">
      <div className="studio-panel-heading">
        <p>Inspector</p>
        <h2>{data.title}</h2>
        <span>{selectedNode.type} · {selectedNode.id}</span>
      </div>

      <div className="studio-inspector-fields">
        <InspectorField label="Title">
          <input value={data.title} onChange={updateText("title")} />
        </InspectorField>

        {data.kind === "asset" ? (
          <>
            <InspectorField label="Asset ID">
              <input
                placeholder="asset_..."
                value={data.assetId}
                onChange={updateText("assetId")}
              />
            </InspectorField>
            <InspectorField label="Asset type">
              <select value={data.assetType} onChange={updateText("assetType")}>
                <option value="image">Image</option>
                <option value="video">Video</option>
                <option value="audio">Audio</option>
              </select>
            </InspectorField>
            <InspectorField label="Status">
              <select value={data.status} onChange={updateText("status")}>
                <option value="ready">Ready</option>
                <option value="missing">Missing</option>
                <option value="processing">Processing</option>
              </select>
            </InspectorField>
          </>
        ) : null}

        {data.kind === "prompt" ? (
          <>
            <InspectorField label="Prompt">
              <textarea rows={6} value={data.prompt} onChange={updateText("prompt")} />
            </InspectorField>
            <InspectorField label="Style">
              <input value={data.style} onChange={updateText("style")} />
            </InspectorField>
            <InspectorField label="Camera">
              <input value={data.camera} onChange={updateText("camera")} />
            </InspectorField>
            <div className="studio-inspector-grid">
              <InspectorField label="Duration">
                <input
                  min={1}
                  type="number"
                  value={data.duration}
                  onChange={(event) =>
                    update({ duration: Math.max(1, Number(event.target.value) || 1) })
                  }
                />
              </InspectorField>
              <InspectorField label="Ratio">
                <select value={data.ratio} onChange={updateText("ratio")}>
                  <option value="16:9">16:9</option>
                  <option value="9:16">9:16</option>
                  <option value="1:1">1:1</option>
                  <option value="4:5">4:5</option>
                </select>
              </InspectorField>
            </div>
          </>
        ) : null}

        {data.kind === "imageGenerate" ? (
          <>
            <InspectorField label="Model">
              <input value={data.model} onChange={updateText("model")} />
            </InspectorField>
            <InspectorField label="Prompt input">
              <input value={data.promptInput} onChange={updateText("promptInput")} />
            </InspectorField>
            <InspectorField label="Asset input">
              <input value={data.assetInput} onChange={updateText("assetInput")} />
            </InspectorField>
            <InspectorField label="Status">
              <select value={data.status} onChange={updateText("status")}>
                <option value="idle">Idle</option>
                <option value="ready">Ready</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </InspectorField>
            <InspectorField label="Result">
              <input
                placeholder="Result placeholder"
                value={data.result}
                onChange={updateText("result")}
              />
            </InspectorField>
          </>
        ) : null}

        {data.kind === "videoGenerate" ? (
          <>
            <InspectorField label="Model">
              <input value={data.model} onChange={updateText("model")} />
            </InspectorField>
            <InspectorField label="Prompt input">
              <input value={data.promptInput} onChange={updateText("promptInput")} />
            </InspectorField>
            <InspectorField label="Image input">
              <input value={data.imageInput} onChange={updateText("imageInput")} />
            </InspectorField>
            <InspectorField label="Video input">
              <input value={data.videoInput} onChange={updateText("videoInput")} />
            </InspectorField>
            <InspectorField label="Status">
              <select value={data.status} onChange={updateText("status")}>
                <option value="idle">Idle</option>
                <option value="ready">Ready</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </InspectorField>
            <InspectorField label="Result">
              <input
                placeholder="Result placeholder"
                value={data.result}
                onChange={updateText("result")}
              />
            </InspectorField>
          </>
        ) : null}

        {data.kind === "output" ? (
          <>
            <InspectorField label="Result preview">
              <textarea
                rows={4}
                value={data.resultPreview}
                onChange={updateText("resultPreview")}
              />
            </InspectorField>
            <InspectorField label="Type">
              <select value={data.outputType} onChange={updateText("outputType")}>
                <option value="image">Image</option>
                <option value="video">Video</option>
                <option value="audio">Audio</option>
              </select>
            </InspectorField>
            <InspectorField label="Created time">
              <input
                placeholder="Not created"
                value={data.createdAt}
                onChange={updateText("createdAt")}
              />
            </InspectorField>
          </>
        ) : null}
      </div>

      <button
        className="studio-delete-button"
        onClick={() => deleteNode(selectedNode.id)}
        type="button"
      >
        Delete node
      </button>
    </aside>
  );
}
