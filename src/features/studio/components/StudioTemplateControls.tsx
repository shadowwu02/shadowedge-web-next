"use client";

import { useState } from "react";
import {
  listStudioTemplates,
  saveStudioTemplate,
  STUDIO_TEMPLATES_STORAGE_KEY,
} from "@/features/studio/lib/studioTemplates";
import {
  getCurrentStudioCanvasJson,
  useStudioStore,
} from "@/features/studio/store/studioStore";
import type { StudioWorkflowTemplate } from "@/features/studio/types/studioTypes";

type TemplatePanel = "save" | "load" | null;

export function StudioTemplateControls({ disabled }: { disabled: boolean }) {
  const projectName = useStudioStore((state) => state.projectName);
  const loadTemplateCanvas = useStudioStore((state) => state.loadTemplateCanvas);
  const [panel, setPanel] = useState<TemplatePanel>(null);
  const [templateName, setTemplateName] = useState("");
  const [templates, setTemplates] = useState<StudioWorkflowTemplate[]>([]);
  const [message, setMessage] = useState("");

  const openSave = () => {
    setTemplateName(`${projectName.trim() || "Untitled Project"} Template`);
    setMessage("");
    setPanel((current) => (current === "save" ? null : "save"));
  };

  const openLoad = () => {
    setTemplates(listStudioTemplates());
    setMessage("");
    setPanel((current) => (current === "load" ? null : "load"));
  };

  const handleSave = () => {
    try {
      const nextTemplates = saveStudioTemplate(
        templateName,
        getCurrentStudioCanvasJson(),
      );
      setTemplates(nextTemplates);
      setMessage("Template saved on this device.");
      setPanel("load");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Template could not be saved.");
    }
  };

  const handleLoad = (template: StudioWorkflowTemplate) => {
    loadTemplateCanvas(template.canvas);
    setMessage(`Loaded ${template.name}. Save the project to keep this canvas in the cloud.`);
    setPanel("load");
  };

  return (
    <div className="studio-template-controls">
      <button
        className="studio-button"
        disabled={disabled}
        onClick={openSave}
        type="button"
      >
        Save Template
      </button>
      <button
        className="studio-button"
        disabled={disabled}
        onClick={openLoad}
        type="button"
      >
        Load Template
      </button>

      {panel ? (
        <div
          aria-label={panel === "save" ? "Save workflow template" : "Load workflow template"}
          className="studio-template-menu"
          role="dialog"
        >
          <div className="studio-template-menu-heading">
            <div>
              <strong>{panel === "save" ? "Save workflow" : "Local templates"}</strong>
              <span title={STUDIO_TEMPLATES_STORAGE_KEY}>Device-local · never auto-runs</span>
            </div>
            <button
              aria-label="Close template menu"
              onClick={() => setPanel(null)}
              type="button"
            >
              ×
            </button>
          </div>

          {panel === "save" ? (
            <div className="studio-template-save-form">
              <label>
                <span>Template name</span>
                <input
                  autoFocus
                  maxLength={120}
                  onChange={(event) => setTemplateName(event.target.value)}
                  value={templateName}
                />
              </label>
              <button
                className="studio-button studio-button-primary"
                disabled={!templateName.trim()}
                onClick={handleSave}
                type="button"
              >
                Save Current Canvas
              </button>
            </div>
          ) : templates.length ? (
            <div className="studio-template-list">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleLoad(template)}
                  type="button"
                >
                  <strong>{template.name}</strong>
                  <span>
                    {template.canvas.nodes.length} nodes · {template.canvas.edges.length} connections
                  </span>
                  <time dateTime={template.createdAt}>
                    {new Date(template.createdAt).toLocaleString()}
                  </time>
                </button>
              ))}
            </div>
          ) : (
            <p className="studio-template-empty">No templates saved on this device.</p>
          )}

          {message ? <p className="studio-template-message">{message}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
