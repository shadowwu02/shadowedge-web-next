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
import { useI18n } from "@/i18n/useI18n";

type TemplatePanel = "save" | "load" | null;

export function StudioTemplateControls({ disabled }: { disabled: boolean }) {
  const { t, tf } = useI18n();
  const projectName = useStudioStore((state) => state.projectName);
  const loadTemplateCanvas = useStudioStore((state) => state.loadTemplateCanvas);
  const [panel, setPanel] = useState<TemplatePanel>(null);
  const [templateName, setTemplateName] = useState("");
  const [templates, setTemplates] = useState<StudioWorkflowTemplate[]>([]);
  const [message, setMessage] = useState("");

  const openSave = () => {
    setTemplateName(`${projectName.trim() || t("studio.toolbar.untitledProject")} · ${t("studio.template.save")}`);
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
      setMessage(t("studio.template.saved"));
      setPanel("load");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("studio.template.saveFailed"));
    }
  };

  const handleLoad = (template: StudioWorkflowTemplate) => {
    loadTemplateCanvas(template.canvas);
    setMessage(tf("studio.template.loaded", { name: template.name }));
    setPanel("load");
  };

  return (
    <div className="studio-template-controls">
      <button className="studio-button" disabled={disabled} onClick={openSave} type="button">
        {t("studio.template.save")}
      </button>
      <button className="studio-button" disabled={disabled} onClick={openLoad} type="button">
        {t("studio.template.load")}
      </button>

      {panel ? (
        <div
          aria-label={panel === "save" ? t("studio.template.saveAria") : t("studio.template.loadAria")}
          className="studio-template-menu"
          role="dialog"
        >
          <div className="studio-template-menu-heading">
            <div>
              <strong>{panel === "save" ? t("studio.template.saveWorkflow") : t("studio.template.localTemplates")}</strong>
              <span title={STUDIO_TEMPLATES_STORAGE_KEY}>{t("studio.template.localOnly")}</span>
            </div>
            <button aria-label={t("studio.template.closeAria")} onClick={() => setPanel(null)} type="button">×</button>
          </div>

          {panel === "save" ? (
            <div className="studio-template-save-form">
              <label>
                <span>{t("studio.template.name")}</span>
                <input autoFocus maxLength={120} onChange={(event) => setTemplateName(event.target.value)} value={templateName} />
              </label>
              <button className="studio-button studio-button-primary" disabled={!templateName.trim()} onClick={handleSave} type="button">
                {t("studio.template.saveCanvas")}
              </button>
            </div>
          ) : templates.length ? (
            <div className="studio-template-list">
              {templates.map((template) => (
                <button key={template.id} onClick={() => handleLoad(template)} type="button">
                  <strong>{template.name}</strong>
                  <span>{tf("studio.template.summary", { nodes: template.canvas.nodes.length, edges: template.canvas.edges.length })}</span>
                  <time dateTime={template.createdAt}>{new Date(template.createdAt).toLocaleString()}</time>
                </button>
              ))}
            </div>
          ) : (
            <p className="studio-template-empty">{t("studio.template.empty")}</p>
          )}

          {message ? <p className="studio-template-message">{message}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
