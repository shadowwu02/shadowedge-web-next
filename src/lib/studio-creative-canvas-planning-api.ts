import type {
  CreateStudioCanvasPlanInput,
  StudioAIPlannedCanvasDraft,
  StudioCanvasPlanStatus,
} from "@/features/studio/capabilities/studioCreativeCanvasPlanning";
import { apiRequest } from "@/lib/api";
import type { ApiRequestOptions } from "@/types/api";

const PLAN_REQUEST_TIMEOUT_MS = 10_000;
const PLAN_STATUS_TIMEOUT_MS = 8_000;
const PLAN_POLL_INTERVAL_MS = 750;
const PLAN_POLL_MAX_ATTEMPTS = 60;
const PLAN_POLL_MAX_TRANSIENT_ERRORS = 2;

function assertPlan(value: StudioAIPlannedCanvasDraft | undefined, projectId: string) {
  if (
    !value?.draftId ||
    value.planningRequest?.projectId !== projectId ||
    !value.graph?.graphId ||
    !Array.isArray(value.graph.nodes) ||
    !Array.isArray(value.graph.edges) ||
    !Array.isArray(value.reasoning) ||
    !Array.isArray(value.evidence) ||
    !value.editSession?.sessionId
  ) {
    throw new Error("Creative Canvas Plan response was incomplete.");
  }
  return value;
}

function assertPlanStatus(value: StudioCanvasPlanStatus | undefined, projectId: string) {
  if (
    !value?.draftId ||
    !value.requestId ||
    value.projectId !== projectId ||
    !["CREATED", "BUILDING", "COMPLETED", "FAILED"].includes(value.status)
  ) {
    throw new Error("Creative Canvas Plan status response was incomplete.");
  }
  return value;
}

async function apiRequestWithTimeout<T>(
  path: string,
  options: ApiRequestOptions,
  timeoutMs: number,
) {
  const controller = new AbortController();
  const upstream = options.signal;
  const abort = () => controller.abort();
  if (upstream?.aborted) controller.abort();
  else upstream?.addEventListener("abort", abort, { once: true });
  const timeout = window.setTimeout(abort, timeoutMs);
  try {
    return await apiRequest<T>(path, { ...options, signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
    upstream?.removeEventListener("abort", abort);
  }
}

type PlanPollOptions = Readonly<{
  maxAttempts?: number;
  pollIntervalMs?: number;
  maxTransientErrors?: number;
  wait?: (milliseconds: number) => Promise<void>;
}>;

export async function pollStudioCreativeCanvasPlan(
  readStatus: () => Promise<StudioCanvasPlanStatus>,
  options: PlanPollOptions = {},
) {
  const maxAttempts = Math.max(1, options.maxAttempts ?? PLAN_POLL_MAX_ATTEMPTS);
  const pollIntervalMs = Math.max(0, options.pollIntervalMs ?? PLAN_POLL_INTERVAL_MS);
  const maxTransientErrors = Math.max(0, options.maxTransientErrors ?? PLAN_POLL_MAX_TRANSIENT_ERRORS);
  const wait = options.wait || ((milliseconds: number) => new Promise<void>((resolve) => {
    window.setTimeout(resolve, milliseconds);
  }));
  let transientErrors = 0;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (pollIntervalMs) await wait(pollIntervalMs);
    let status: StudioCanvasPlanStatus;
    try {
      status = await readStatus();
      transientErrors = 0;
    } catch (reason) {
      transientErrors += 1;
      if (transientErrors > maxTransientErrors) throw reason;
      continue;
    }
    if (status.status === "COMPLETED") {
      return assertPlan(status.draft || undefined, status.projectId);
    }
    if (status.status === "FAILED") {
      throw new Error(status.error?.message || "Creative Canvas Planning failed.");
    }
  }
  throw new Error("Creative Canvas Planning timed out before Preview was ready. Please retry.");
}

export async function createStudioCreativeCanvasPlan(
  projectId: string,
  input: CreateStudioCanvasPlanInput,
) {
  const response = await apiRequestWithTimeout<StudioAIPlannedCanvasDraft | StudioCanvasPlanStatus>(
    `/api/projects/${encodeURIComponent(projectId)}/creative-canvas/plan`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
    PLAN_REQUEST_TIMEOUT_MS,
  );
  const value = response.data;
  if (value && "graph" in value) return assertPlan(value, projectId);
  const accepted = assertPlanStatus(value as StudioCanvasPlanStatus | undefined, projectId);
  if (accepted.status === "COMPLETED") return assertPlan(accepted.draft || undefined, projectId);
  if (accepted.status === "FAILED") {
    throw new Error(accepted.error?.message || "Creative Canvas Planning failed.");
  }
  return pollStudioCreativeCanvasPlan(
    () => getStudioCreativeCanvasPlanStatus(projectId, accepted.draftId),
  );
}

export async function getStudioCreativeCanvasPlanStatus(
  projectId: string,
  draftId: string,
  signal?: AbortSignal,
) {
  const response = await apiRequestWithTimeout<StudioCanvasPlanStatus>(
    `/api/projects/${encodeURIComponent(projectId)}/creative-canvas/plan/${encodeURIComponent(draftId)}/status`,
    { signal },
    PLAN_STATUS_TIMEOUT_MS,
  );
  return assertPlanStatus(response.data, projectId);
}

export async function getStudioCreativeCanvasPlan(
  projectId: string,
  draftId: string,
  signal?: AbortSignal,
) {
  const response = await apiRequestWithTimeout<StudioAIPlannedCanvasDraft>(
    `/api/projects/${encodeURIComponent(projectId)}/creative-canvas/plan/${encodeURIComponent(draftId)}`,
    { signal },
    PLAN_STATUS_TIMEOUT_MS,
  );
  return assertPlan(response.data, projectId);
}
