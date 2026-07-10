"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createLongVideoRemakeAnalysis,
  estimateLongVideoRemakeAnalysisCost,
  getLongVideoRemakeAnalysisStatus,
  type VideoRemakeLongAnalysisJob,
} from "@/lib/video-api";
import {
  isLongVideoAnalysisActive,
  isLongVideoAnalysisTerminal,
  keepLongVideoAnalysisProgressMonotonic,
  keepLongVideoAnalysisStateMonotonic,
  mapLongVideoAnalysisState,
  type LongVideoAnalysisErrorCategory,
  type LongVideoAnalysisState,
} from "@/lib/video/longVideoAnalysisState";
import {
  clearRemakeLongVideoActiveJob,
  restoreRemakeLongVideoActiveJob,
  saveRemakeLongVideoActiveJob,
  type RemakeLongVideoActiveJob,
  type SaveRemakeLongVideoActiveJobInput,
} from "@/lib/video/remakeLongVideoActiveJob";
import { ApiError } from "@/types/api";

export type LongVideoRemakeEstimateRequest = {
  sourceAssetId?: string;
  sourceVideoUrl: string;
  targetRatio?: string;
};

export type LongVideoRemakeSafeEstimate = {
  balance: number | null;
  billableNow: boolean;
  chargeCreditsNow: number;
  estimatedCredits: number;
  estimateId: string;
  requiresConfirmation: boolean;
};

export type LongVideoRemakeAnalysisSnapshot = {
  errorCategory?: LongVideoAnalysisErrorCategory | null;
  progress?: number | null;
  state: LongVideoAnalysisState;
};

type LongVideoRemakeAnalysisView = {
  errorCategory: LongVideoAnalysisErrorCategory | null;
  progress: number | null;
  state: LongVideoAnalysisState | null;
};

type PendingLongVideoEstimate = {
  clientRequestId: string;
  request: LongVideoRemakeEstimateRequest;
  safeEstimate: LongVideoRemakeSafeEstimate;
};

type RegisterLongVideoActiveJobInput = Omit<SaveRemakeLongVideoActiveJobInput, "clientRequestId"> & {
  clientRequestId?: string;
};

type UseLongVideoRemakeAnalysisOptions = {
  enabled?: boolean;
  onCompleted?: (job: VideoRemakeLongAnalysisJob) => void;
  onRestored?: (job: RemakeLongVideoActiveJob) => void;
  pollIntervalMs?: number;
  restoreOnMount?: boolean;
};

const idleView: LongVideoRemakeAnalysisView = {
  errorCategory: null,
  progress: null,
  state: null,
};

function createClientRequestId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `long-video-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function classifyError(error: unknown): LongVideoAnalysisErrorCategory {
  const apiError = error instanceof ApiError ? error : null;
  const token = `${apiError?.code || ""} ${error instanceof Error ? error.message : ""}`.toLowerCase();

  if (apiError?.kind === "auth" || apiError?.status === 401) return "auth_required";
  if (apiError?.kind === "credits" || apiError?.status === 402) return "insufficient_credits";
  if (token.includes("duration") || token.includes("too_long") || token.includes("too_short")) return "invalid_duration";
  if (token.includes("asset") || token.includes("media") || token.includes("source")) return "asset_unavailable";
  if (token.includes("timeout") || token.includes("timed out")) return "analysis_timeout";
  if (apiError?.status === 403 || token.includes("allowlist") || token.includes("not eligible") || token.includes("guard")) {
    return "not_eligible";
  }
  return "analysis_failed";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function hasAcceptedRealResult(job: VideoRemakeLongAnalysisJob) {
  const canonical = job.canonicalResult;
  const storyboard = job.result?.storyboard;
  const jobMetadata = asRecord(job.metadata);
  const resultMetadata = asRecord(job.result?.metadata);
  const shots = canonical?.shots?.length ? canonical.shots : storyboard?.shots || [];
  const analysisSource = canonical?.analysisSource || storyboard?.analysisSource;
  const mock = canonical?.storyboard.mock === true || storyboard?.mock === true;
  const sandbox = canonical?.storyboard.sandbox === true || storyboard?.sandboxVlm === true;
  const providerCallMade =
    canonical?.visualUnderstanding.providerCallMade === true ||
    storyboard?.providerCallMade === true ||
    jobMetadata.providerCallMade === true ||
    resultMetadata.providerCallMade === true;
  const vlmCalled =
    canonical?.visualUnderstanding.vlmCalled === true ||
    storyboard?.vlmCalled === true ||
    jobMetadata.vlmCalled === true ||
    resultMetadata.vlmCalled === true;
  const fallback =
    canonical?.badges?.some((badge) =>
      ["fallback_storyboard", "not_real_visual_reverse", "no_vision_model"].includes(badge),
    ) ||
    Boolean(storyboard?.fallbackReason) ||
    Boolean(jobMetadata.fallbackReason || resultMetadata.fallbackReason) ||
    jobMetadata.realVlmFallback === true ||
    resultMetadata.realVlmFallback === true;

  return (
    shots.length > 0 &&
    (analysisSource === "vlm" || analysisSource === "real_vlm") &&
    providerCallMade &&
    vlmCalled &&
    !mock &&
    !sandbox &&
    !fallback
  );
}

export function useLongVideoRemakeAnalysis({
  enabled = false,
  onCompleted,
  onRestored,
  pollIntervalMs = 5000,
  restoreOnMount = true,
}: UseLongVideoRemakeAnalysisOptions = {}) {
  const [activeJob, setActiveJob] = useState<RemakeLongVideoActiveJob | null>(null);
  const [clientRequestId, setClientRequestId] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isEstimating, setIsEstimating] = useState(false);
  const [pendingEstimate, setPendingEstimate] = useState<PendingLongVideoEstimate | null>(null);
  const [view, setView] = useState<LongVideoRemakeAnalysisView>(idleView);
  const onCompletedRef = useRef(onCompleted);
  const onRestoredRef = useRef(onRestored);
  const createInFlightRef = useRef(false);
  const estimateInFlightRef = useRef(false);
  const pollInFlightRef = useRef(false);
  const restoredRef = useRef(false);

  useEffect(() => {
    onCompletedRef.current = onCompleted;
  }, [onCompleted]);

  useEffect(() => {
    onRestoredRef.current = onRestored;
  }, [onRestored]);

  const beginAttempt = useCallback((nextClientRequestId: string) => {
    const normalized = nextClientRequestId.trim();
    if (!normalized || activeJob) return false;
    setClientRequestId(normalized);
    setPendingEstimate(null);
    setView(idleView);
    return true;
  }, [activeJob]);

  const registerActiveJob = useCallback(
    (input: RegisterLongVideoActiveJobInput) => {
      if (activeJob && activeJob.analysisJobId !== input.analysisJobId) {
        return { ok: false, reason: "invalid" as const };
      }
      const result = saveRemakeLongVideoActiveJob({
        ...input,
        clientRequestId: input.clientRequestId || clientRequestId,
      });
      if (!result.job) return result;

      setActiveJob(result.job);
      setClientRequestId(result.job.clientRequestId);
      setView({ errorCategory: null, progress: null, state: "queued" });
      return result;
    },
    [activeJob, clientRequestId],
  );

  const restoreActiveJob = useCallback(() => {
    const result = restoreRemakeLongVideoActiveJob();
    if (!result.job) return result;

    setActiveJob(result.job);
    setClientRequestId(result.job.clientRequestId);
    setView({ errorCategory: null, progress: null, state: "queued" });
    onRestoredRef.current?.(result.job);
    return result;
  }, []);

  const applySnapshot = useCallback((snapshot: LongVideoRemakeAnalysisSnapshot) => {
    setView((current) => {
      if (isLongVideoAnalysisTerminal(current.state)) return current;
      const nextState = keepLongVideoAnalysisStateMonotonic(current.state, snapshot.state);
      return {
        errorCategory: nextState === "failed" ? snapshot.errorCategory || "analysis_failed" : null,
        progress:
          nextState === "completed"
            ? 1
            : keepLongVideoAnalysisProgressMonotonic(current.progress, snapshot.progress),
        state: nextState,
      };
    });
  }, []);

  const markCompleted = useCallback(() => {
    setView((current) =>
      isLongVideoAnalysisTerminal(current.state)
        ? current
        : { errorCategory: null, progress: 1, state: "completed" },
    );
    clearRemakeLongVideoActiveJob();
    setActiveJob(null);
  }, []);

  const markFailed = useCallback((category: LongVideoAnalysisErrorCategory = "analysis_failed") => {
    setView((current) =>
      isLongVideoAnalysisTerminal(current.state)
        ? current
        : { ...current, errorCategory: category, state: "failed" },
    );
    clearRemakeLongVideoActiveJob();
    setActiveJob(null);
  }, []);

  const reportStatusError = useCallback(() => {
    setView((current) =>
      isLongVideoAnalysisTerminal(current.state)
        ? current
        : { ...current, errorCategory: "status_unavailable" },
    );
  }, []);

  const reset = useCallback(() => {
    clearRemakeLongVideoActiveJob();
    setActiveJob(null);
    setClientRequestId("");
    setIsCreating(false);
    setIsEstimating(false);
    setPendingEstimate(null);
    setView(idleView);
  }, []);

  const requestEstimate = useCallback(
    async (request: LongVideoRemakeEstimateRequest) => {
      if (!enabled || activeJob || createInFlightRef.current || estimateInFlightRef.current || isCreating || isEstimating) {
        if (!enabled) markFailed("not_eligible");
        return null;
      }

      const nextClientRequestId = createClientRequestId();
      if (!beginAttempt(nextClientRequestId)) return null;

      estimateInFlightRef.current = true;
      setIsEstimating(true);
      setView({ errorCategory: null, progress: null, state: "preparing" });
      try {
        const estimate = await estimateLongVideoRemakeAnalysisCost({
          analysisEngine: "real_vlm",
          sourceAssetId: request.sourceAssetId,
          sourceVideoUrl: request.sourceVideoUrl,
          targetRatio: request.targetRatio,
        });
        if (!estimate.hasEnoughCredits) {
          markFailed("insufficient_credits");
          return null;
        }
        if (!estimate.estimateId) {
          markFailed("result_unavailable");
          return null;
        }

        const safeEstimate: LongVideoRemakeSafeEstimate = {
          balance: estimate.balance,
          billableNow: estimate.billableNow,
          chargeCreditsNow: estimate.chargeCreditsNow,
          estimatedCredits: estimate.estimatedCredits,
          estimateId: estimate.estimateId,
          requiresConfirmation: estimate.requiresConfirmation,
        };
        setPendingEstimate({ clientRequestId: nextClientRequestId, request, safeEstimate });
        setView(idleView);
        return safeEstimate;
      } catch (error) {
        markFailed(classifyError(error));
        return null;
      } finally {
        estimateInFlightRef.current = false;
        setIsEstimating(false);
      }
    },
    [activeJob, beginAttempt, enabled, isCreating, isEstimating, markFailed],
  );

  const cancelConfirmation = useCallback(() => {
    if (createInFlightRef.current || isCreating) return;
    setClientRequestId("");
    setPendingEstimate(null);
    setView(idleView);
  }, [isCreating]);

  const confirmCreate = useCallback(async () => {
    if (
      !enabled ||
      !pendingEstimate ||
      activeJob ||
      createInFlightRef.current ||
      estimateInFlightRef.current ||
      isCreating ||
      isEstimating
    ) {
      return null;
    }

    createInFlightRef.current = true;
    setIsCreating(true);
    setView({ errorCategory: null, progress: null, state: "queued" });
    try {
      const job = await createLongVideoRemakeAnalysis({
        analysisEngine: "real_vlm",
        clientRequestId: pendingEstimate.clientRequestId,
        confirmCost: true,
        estimateId: pendingEstimate.safeEstimate.estimateId,
        sourceAssetId: pendingEstimate.request.sourceAssetId,
        sourceVideoUrl: pendingEstimate.request.sourceVideoUrl,
        targetRatio: pendingEstimate.request.targetRatio,
      });
      if (!job.analysisJobId) {
        markFailed("result_unavailable");
        return null;
      }

      registerActiveJob({
        analysisJobId: job.analysisJobId,
        clientRequestId: pendingEstimate.clientRequestId,
      });
      setPendingEstimate(null);
      return job;
    } catch (error) {
      markFailed(classifyError(error));
      return null;
    } finally {
      createInFlightRef.current = false;
      setIsCreating(false);
    }
  }, [activeJob, enabled, isCreating, isEstimating, markFailed, pendingEstimate, registerActiveJob]);

  const processJob = useCallback(
    (job: VideoRemakeLongAnalysisJob) => {
      const hasUsableResult = job.status === "completed" ? hasAcceptedRealResult(job) : undefined;
      const nextState = mapLongVideoAnalysisState({
        hasUsableResult,
        stage: job.stage,
        status: job.status,
      });

      if (nextState === "failed") {
        markFailed(job.status === "completed" ? "result_unavailable" : classifyError(new Error(`${job.errorCode || ""} ${job.errorMessage || ""}`)));
        return;
      }
      if (nextState === "completed") {
        try {
          onCompletedRef.current?.(job);
          markCompleted();
        } catch {
          markFailed("result_unavailable");
        }
        return;
      }
      applySnapshot({ progress: job.progress, state: nextState });
    },
    [applySnapshot, markCompleted, markFailed],
  );

  useEffect(() => {
    if (!restoreOnMount || restoredRef.current) return;
    restoredRef.current = true;
    restoreActiveJob();
  }, [restoreActiveJob, restoreOnMount]);

  useEffect(() => {
    if (!activeJob || isLongVideoAnalysisTerminal(view.state)) return;
    let cancelled = false;
    const analysisJobId = activeJob.analysisJobId;

    async function poll() {
      if (pollInFlightRef.current) return;
      pollInFlightRef.current = true;
      try {
        const job = await getLongVideoRemakeAnalysisStatus(analysisJobId);
        if (!cancelled) processJob(job);
      } catch {
        if (!cancelled) reportStatusError();
      } finally {
        pollInFlightRef.current = false;
      }
    }

    void poll();
    const timer = window.setInterval(poll, Math.max(2000, pollIntervalMs));
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [activeJob, pollIntervalMs, processJob, reportStatusError, view.state]);

  const flags = useMemo(
    () => ({
      isActive: isLongVideoAnalysisActive(view.state),
      isTerminal: isLongVideoAnalysisTerminal(view.state),
    }),
    [view.state],
  );

  return {
    activeJob,
    applySnapshot,
    beginAttempt,
    cancelConfirmation,
    clientRequestId,
    confirmCreate,
    errorCategory: view.errorCategory,
    isActive: flags.isActive,
    isCreating,
    isEstimating,
    isTerminal: flags.isTerminal,
    markCompleted,
    markFailed,
    pendingEstimate: pendingEstimate?.safeEstimate || null,
    progress: view.progress,
    registerActiveJob,
    requestEstimate,
    reset,
    restoreActiveJob,
    state: view.state,
  };
}
