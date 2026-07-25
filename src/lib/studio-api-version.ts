import { getApiBaseUrl } from "@/lib/api";

export const STUDIO_API_FEATURES = [
  "studio_projects",
  "creative_canvas",
  "creative_canvas_editing",
  "creative_canvas_auto_planning",
  "creative_canvas_workflow_optimization",
  "creative_canvas_impact_simulation",
  "creative_canvas_decision_learning",
  "project_initialization_assistant",
  "project_execution_concierge",
  "project_collaboration",
  "agent_canvas",
  "timeline",
  "storyboard",
  "project_intelligence",
  "copilot_center",
  "project_memory",
  "project_roadmap",
  "portfolio_strategy",
  "portfolio_resources",
  "portfolio_performance",
  "portfolio_forecast",
  "production_read_models",
  "review_delivery",
] as const;

export type StudioApiFeature = (typeof STUDIO_API_FEATURES)[number];
export type StudioApiAvailability = "READY" | "AVAILABLE" | "NOT_DEPLOYED" | "ERROR";

export type StudioApiVersion = Readonly<{
  version: string;
  commit: string;
  buildTime: string;
  features: readonly string[];
}>;

export class StudioApiVersionError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "StudioApiVersionError";
    this.status = status;
  }
}

function clean(value: unknown, maximum = 500) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

export function normalizeStudioApiVersion(value: unknown): StudioApiVersion {
  const record = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const features = Array.isArray(record.features)
    ? record.features.map((item) => clean(item, 100)).filter(Boolean)
    : [];
  const version = clean(record.version, 80);
  const commit = clean(record.commit, 64);
  const buildTime = clean(record.buildTime, 80);
  if (!version || !commit || !buildTime) {
    throw new StudioApiVersionError("Studio API returned incomplete version metadata.");
  }
  return Object.freeze({
    version,
    commit,
    buildTime,
    features: Object.freeze(features),
  });
}

export async function getStudioApiVersion(signal?: AbortSignal) {
  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}/api/version`, {
      method: "GET",
      cache: "no-store",
      signal,
    });
  } catch {
    throw new StudioApiVersionError("Studio API is temporarily unavailable.");
  }

  if (response.status === 404) {
    throw new StudioApiVersionError("Studio API version handshake is not deployed.", 404);
  }
  if (!response.ok) {
    throw new StudioApiVersionError(`Studio API version check failed with HTTP ${response.status}.`, response.status);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new StudioApiVersionError("Studio API returned invalid version metadata.", response.status);
  }
  return normalizeStudioApiVersion(payload);
}

export function studioFeatureAvailability(
  apiStatus: StudioApiAvailability,
  version: StudioApiVersion | null,
  feature: StudioApiFeature,
): StudioApiAvailability {
  if (apiStatus !== "READY") return apiStatus;
  return version?.features.includes(feature) ? "READY" : "NOT_DEPLOYED";
}
