export const LONG_VIDEO_ANALYSIS_STATES = [
  "queued",
  "preparing",
  "extracting_frames",
  "analyzing",
  "building_storyboard",
  "completed",
  "failed",
] as const;

export type LongVideoAnalysisState = (typeof LONG_VIDEO_ANALYSIS_STATES)[number];

export type LongVideoAnalysisErrorCategory =
  | "analysis_failed"
  | "analysis_timeout"
  | "asset_unavailable"
  | "auth_required"
  | "insufficient_credits"
  | "invalid_duration"
  | "not_eligible"
  | "result_unavailable"
  | "status_unavailable";

export type LongVideoAnalysisStateInput = {
  hasUsableResult?: boolean;
  stage?: unknown;
  status?: unknown;
};

const activeStateRanks: Record<Exclude<LongVideoAnalysisState, "completed" | "failed">, number> = {
  queued: 0,
  preparing: 1,
  extracting_frames: 2,
  analyzing: 3,
  building_storyboard: 4,
};

const stageStateMap: Record<string, LongVideoAnalysisState> = {
  analyzing: "analyzing",
  analyzing_segments: "analyzing",
  building_storyboard: "building_storyboard",
  completed: "completed",
  extracting_frames: "extracting_frames",
  extracting_keyframes: "extracting_frames",
  failed: "failed",
  merging_storyboard: "building_storyboard",
  preparing: "preparing",
  queued: "queued",
  reading_metadata: "preparing",
};

function normalizeToken(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function normalizeLongVideoAnalysisProgress(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const progress = Number(value);
  if (!Number.isFinite(progress)) return null;
  return Math.min(1, Math.max(0, progress));
}

export function mapLongVideoAnalysisState({
  hasUsableResult,
  stage,
  status,
}: LongVideoAnalysisStateInput): LongVideoAnalysisState {
  const normalizedStatus = normalizeToken(status);
  const normalizedStage = normalizeToken(stage);

  if (normalizedStatus === "failed" || normalizedStage === "failed") return "failed";
  if (normalizedStatus === "completed" || normalizedStage === "completed") {
    return hasUsableResult === false ? "failed" : "completed";
  }

  const mappedStage = stageStateMap[normalizedStage];
  if (mappedStage && mappedStage !== "completed" && mappedStage !== "failed") return mappedStage;
  if (normalizedStatus === "queued") return "queued";
  return "preparing";
}

export function keepLongVideoAnalysisStateMonotonic(
  current: LongVideoAnalysisState | null,
  next: LongVideoAnalysisState,
) {
  if (!current) return next;
  if (current === "completed" || current === "failed") return current;
  if (next === "completed" || next === "failed") return next;
  return activeStateRanks[next] >= activeStateRanks[current] ? next : current;
}

export function keepLongVideoAnalysisProgressMonotonic(current: number | null, next: unknown) {
  const normalizedNext = normalizeLongVideoAnalysisProgress(next);
  if (normalizedNext === null) return current;
  return current === null ? normalizedNext : Math.max(current, normalizedNext);
}

export function isLongVideoAnalysisActive(state: LongVideoAnalysisState | null) {
  return Boolean(state && state !== "completed" && state !== "failed");
}

export function isLongVideoAnalysisTerminal(state: LongVideoAnalysisState | null) {
  return state === "completed" || state === "failed";
}
