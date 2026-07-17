import { activeBrand, type BrandId } from "@/config/brand";
import type { StudioRunRecord } from "@/features/studio/runtime/types";

export const SHADOWEDGE_STUDIO_RUNS_STORAGE_KEY = "shadowedge_studio_runs_v1";

export function getStudioRunsStorageKey(brandId: BrandId) {
  return brandId === "shadowedge"
    ? SHADOWEDGE_STUDIO_RUNS_STORAGE_KEY
    : `${brandId}_studio_runs_v1`;
}

export const STUDIO_RUNS_STORAGE_KEY = getStudioRunsStorageKey(activeBrand.id);

const RUN_HISTORY_LIMIT = 50;

function isRunRecord(value: unknown): value is StudioRunRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const run = value as Partial<StudioRunRecord>;
  return Boolean(
    run.id &&
      run.projectId &&
      run.createdAt &&
      (run.status === "running" || run.status === "completed" || run.status === "failed") &&
      (run.mode === "graph" || run.mode === "retry") &&
      Array.isArray(run.nodes),
  );
}

export function listStudioRunHistory() {
  if (typeof window === "undefined") return [];
  try {
    const stored = window.localStorage.getItem(STUDIO_RUNS_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed)
      ? parsed
          .filter(isRunRecord)
          .map((run) =>
            run.status === "running"
              ? {
                  ...run,
                  status: "failed" as const,
                  nodes: run.nodes.map((node) =>
                    node.status === "completed" || node.status === "failed"
                      ? node
                      : {
                          ...node,
                          status: "failed" as const,
                          finishedAt: node.finishedAt || new Date().toISOString(),
                          errorCode: "RUN_INTERRUPTED",
                          message: "The page closed before this run finished.",
                        },
                  ),
                }
              : run,
          )
          .slice(0, RUN_HISTORY_LIMIT)
      : [];
  } catch {
    return [];
  }
}

export function saveStudioRunRecord(record: StudioRunRecord) {
  if (typeof window === "undefined") return [];
  const history = [
    record,
    ...listStudioRunHistory().filter((item) => item.id !== record.id),
  ].slice(0, RUN_HISTORY_LIMIT);
  try {
    window.localStorage.setItem(STUDIO_RUNS_STORAGE_KEY, JSON.stringify(history));
  } catch {
    // A storage quota or privacy setting must not block or duplicate execution.
  }
  return history;
}
