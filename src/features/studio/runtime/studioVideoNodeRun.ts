import { createVideoClientRequestId } from "@/lib/video/videoClientRequestId";

export type StudioVideoNodeRunStatus =
  | "running"
  | "polling"
  | "retryable_uncertain"
  | "completed"
  | "failed_terminal"
  | "interrupted";

export type StudioVideoNodeRunContext = {
  nodeRunId: string;
  nodeId: string;
  projectId: string;
  clientRequestId: string;
  status: StudioVideoNodeRunStatus;
  startedAt: string;
  backendJobId: string | null;
  lastErrorKind: string | null;
};

type RuntimeEvidence = {
  status: string;
  outputs?: Record<string, unknown>;
  error?: string;
};

const terminalAdmissionErrors = new Set([
  "AUTH_REQUIRED",
  "FORBIDDEN",
  "INSUFFICIENT_CREDITS",
  "MATERIAL_ISSUE",
  "PARAMETER_ISSUE",
  "POLICY_OR_COPYRIGHT",
]);

function nowIso() {
  return new Date().toISOString();
}

function createNodeRunId() {
  const suffix = globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
  return `studio-video-run-${suffix.replace(/[^A-Za-z0-9:_-]/g, "_")}`;
}

function outputString(outputs: Record<string, unknown> | undefined, key: string) {
  const value = outputs?.[key];
  return typeof value === "string" ? value.trim() : "";
}

function runtimeErrorKind(runtime: RuntimeEvidence) {
  return outputString(runtime.outputs, "errorCode") || outputString(runtime.outputs, "code") || "UNKNOWN";
}

function isUncertainFailure(errorKind: string, runtime: RuntimeEvidence) {
  if (terminalAdmissionErrors.has(errorKind)) return false;
  const text = `${errorKind} ${runtime.error || ""}`.toLowerCase();
  return (
    text.includes("network") ||
    text.includes("timeout") ||
    text.includes("connection") ||
    text.includes("provider_temporary") ||
    text.includes("temporarily") ||
    text.includes("unknown")
  );
}

export function createStudioVideoNodeRun({ nodeId, projectId }: { nodeId: string; projectId: string }) : StudioVideoNodeRunContext {
  return {
    nodeRunId: createNodeRunId(),
    nodeId,
    projectId,
    clientRequestId: createVideoClientRequestId(),
    status: "running",
    startedAt: nowIso(),
    backendJobId: null,
    lastErrorKind: null,
  };
}

export function updateStudioVideoNodeRun(
  nodeRun: StudioVideoNodeRunContext,
  runtime: RuntimeEvidence,
): StudioVideoNodeRunContext {
  const backendJobId =
    outputString(runtime.outputs, "statusJobId") ||
    outputString(runtime.outputs, "jobId") ||
    outputString(runtime.outputs, "databaseJobId") ||
    nodeRun.backendJobId;

  if (runtime.status === "completed") {
    return { ...nodeRun, backendJobId: backendJobId || null, status: "completed", lastErrorKind: null };
  }
  if (runtime.status === "queued" || runtime.status === "processing") {
    return { ...nodeRun, backendJobId: backendJobId || null, status: backendJobId ? "polling" : "running", lastErrorKind: null };
  }
  if (runtime.status === "failed") {
    const lastErrorKind = runtimeErrorKind(runtime);
    if (backendJobId) {
      return { ...nodeRun, backendJobId, status: "failed_terminal", lastErrorKind };
    }
    return {
      ...nodeRun,
      status: isUncertainFailure(lastErrorKind, runtime) ? "retryable_uncertain" : "failed_terminal",
      lastErrorKind,
    };
  }
  return { ...nodeRun, backendJobId: backendJobId || null };
}

export function isStudioVideoNodeRunRetryable(nodeRun: StudioVideoNodeRunContext | undefined) {
  return nodeRun?.status === "retryable_uncertain" && !nodeRun.backendJobId;
}

export function prepareStudioVideoNodeRunForRefresh(nodeRun: StudioVideoNodeRunContext): StudioVideoNodeRunContext {
  if (nodeRun.backendJobId) return { ...nodeRun, status: "polling", lastErrorKind: null };
  if (nodeRun.status === "completed" || nodeRun.status === "failed_terminal") return nodeRun;
  return { ...nodeRun, status: "interrupted", lastErrorKind: "QUEUE_INTERRUPTED" };
}
