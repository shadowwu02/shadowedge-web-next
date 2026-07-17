import { activeBrand, type BrandId } from "@/config/brand";
import type {
  StudioCanvasJson,
  StudioWorkflowTemplate,
} from "@/features/studio/types/studioTypes";

export const SHADOWEDGE_STUDIO_TEMPLATES_STORAGE_KEY =
  "shadowedge_studio_templates_v1";

export function getStudioTemplatesStorageKey(brandId: BrandId) {
  return brandId === "shadowedge"
    ? SHADOWEDGE_STUDIO_TEMPLATES_STORAGE_KEY
    : `${brandId}_studio_templates_v1`;
}

export const STUDIO_TEMPLATES_STORAGE_KEY = getStudioTemplatesStorageKey(
  activeBrand.id,
);

const TEMPLATE_LIMIT = 30;

function cloneCanvas(canvas: StudioCanvasJson): StudioCanvasJson {
  return JSON.parse(JSON.stringify(canvas)) as StudioCanvasJson;
}

function isTemplate(value: unknown): value is StudioWorkflowTemplate {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const template = value as Partial<StudioWorkflowTemplate>;
  return Boolean(
    template.id &&
      template.name &&
      template.createdAt &&
      template.canvas &&
      Array.isArray(template.canvas.nodes) &&
      Array.isArray(template.canvas.edges) &&
      template.canvas.viewport,
  );
}

export function listStudioTemplates() {
  if (typeof window === "undefined") return [];
  try {
    const stored = window.localStorage.getItem(STUDIO_TEMPLATES_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed)
      ? parsed.filter(isTemplate).slice(0, TEMPLATE_LIMIT)
      : [];
  } catch {
    return [];
  }
}

export function saveStudioTemplate(
  name: string,
  canvas: StudioCanvasJson,
) {
  if (typeof window === "undefined") {
    throw new Error("Templates are available in the browser only.");
  }

  const createdAt = new Date().toISOString();
  const template: StudioWorkflowTemplate = {
    id: `template-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim().slice(0, 120) || "Untitled Template",
    canvas: cloneCanvas(canvas),
    createdAt,
  };
  const templates = [template, ...listStudioTemplates()].slice(0, TEMPLATE_LIMIT);
  window.localStorage.setItem(
    STUDIO_TEMPLATES_STORAGE_KEY,
    JSON.stringify(templates),
  );
  return templates;
}
