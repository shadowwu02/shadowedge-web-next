export const LONG_VIDEO_CREATE_AUTH_REPLAY = false;

export type RemakeLongVideoQuoteStatus = "created" | "confirmed" | "consumed" | "expired" | "failed" | "cancelled";

export type RemakeLongVideoQuote = {
  clientRequestId: string;
  estimateId: string;
  expiresAt: number;
  issuedAt: number;
  status: RemakeLongVideoQuoteStatus;
};

export type RemakeLongVideoQuoteEvaluation =
  | { kind: "ready"; quote: RemakeLongVideoQuote }
  | { kind: "expired"; quote: RemakeLongVideoQuote }
  | { kind: "invalid"; reason: "missing_identity" | "invalid_expiry" | "invalid_status" };

export type RemakeLongVideoConfirmConditions = {
  activeJob: boolean;
  eligible: boolean;
  isCreating: boolean;
  isRecovering: boolean;
  quote: RemakeLongVideoQuoteEvaluation;
};

export type RemakeLongVideoPendingRecoveryState = {
  analysisJobId: string | null;
  clientRequestId: string;
  errorCode: string | null;
  status: "idle" | "uncertain" | "checking" | "processing" | "completed" | "failed" | "not_found";
};

export type RemakeLongVideoPendingRecoveryEvent =
  | { type: "mark_uncertain"; clientRequestId: string }
  | { type: "check_started" }
  | { type: "processing" }
  | { type: "completed"; analysisJobId: string }
  | { type: "failed"; errorCode?: string }
  | { type: "not_found" }
  | { type: "reset" };

export const EMPTY_LONG_VIDEO_PENDING_RECOVERY: RemakeLongVideoPendingRecoveryState = {
  analysisJobId: null,
  clientRequestId: "",
  errorCode: null,
  status: "idle",
};

function safeId(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 200) : "";
}

function safeTimestamp(value: unknown) {
  if (typeof value === "string" && value.trim()) {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

export function evaluateRemakeLongVideoQuote(
  input: Partial<RemakeLongVideoQuote> | null | undefined,
  now = Date.now(),
): RemakeLongVideoQuoteEvaluation {
  const estimateId = safeId(input?.estimateId);
  const clientRequestId = safeId(input?.clientRequestId);
  if (!estimateId || !clientRequestId) {
    return { kind: "invalid", reason: "missing_identity" };
  }

  const issuedAt = safeTimestamp(input?.issuedAt);
  const expiresAt = safeTimestamp(input?.expiresAt);
  if (!issuedAt || !expiresAt || expiresAt <= issuedAt) {
    return { kind: "invalid", reason: "invalid_expiry" };
  }

  if (input?.status !== "created") {
    return { kind: "invalid", reason: "invalid_status" };
  }

  const quote: RemakeLongVideoQuote = {
    clientRequestId,
    estimateId,
    expiresAt,
    issuedAt,
    status: "created",
  };

  return expiresAt <= now ? { kind: "expired", quote } : { kind: "ready", quote };
}

export function canConfirmRemakeLongVideoQuote(conditions: RemakeLongVideoConfirmConditions) {
  return (
    conditions.eligible &&
    !conditions.activeJob &&
    !conditions.isCreating &&
    !conditions.isRecovering &&
    conditions.quote.kind === "ready"
  );
}

export function createRemakeLongVideoConfirmLock() {
  let locked = false;
  return {
    isLocked() {
      return locked;
    },
    release() {
      locked = false;
    },
    tryAcquire() {
      if (locked) return false;
      locked = true;
      return true;
    },
  };
}

export function reduceRemakeLongVideoPendingRecovery(
  state: RemakeLongVideoPendingRecoveryState,
  event: RemakeLongVideoPendingRecoveryEvent,
): RemakeLongVideoPendingRecoveryState {
  switch (event.type) {
    case "mark_uncertain": {
      const clientRequestId = safeId(event.clientRequestId);
      return clientRequestId
        ? { analysisJobId: null, clientRequestId, errorCode: null, status: "uncertain" }
        : EMPTY_LONG_VIDEO_PENDING_RECOVERY;
    }
    case "check_started":
      return state.clientRequestId ? { ...state, errorCode: null, status: "checking" } : state;
    case "processing":
      return state.clientRequestId ? { ...state, errorCode: null, status: "processing" } : state;
    case "completed": {
      const analysisJobId = safeId(event.analysisJobId);
      return state.clientRequestId && analysisJobId
        ? { ...state, analysisJobId, errorCode: null, status: "completed" }
        : state;
    }
    case "failed":
      return state.clientRequestId
        ? { ...state, analysisJobId: null, errorCode: safeId(event.errorCode) || "analysis_failed", status: "failed" }
        : state;
    case "not_found":
      return state.clientRequestId
        ? { ...state, analysisJobId: null, errorCode: null, status: "not_found" }
        : state;
    case "reset":
      return EMPTY_LONG_VIDEO_PENDING_RECOVERY;
  }
}

export function getRemakeLongVideoPendingRecoveryUi(state: RemakeLongVideoPendingRecoveryState) {
  switch (state.status) {
    case "uncertain":
    case "failed":
      return {
        action: "check_status" as const,
        message: "We could not confirm whether the analysis started.",
      };
    case "checking":
    case "processing":
      return {
        action: "none" as const,
        message: "Checking your analysis request.",
      };
    case "completed":
      return {
        action: "open_analysis" as const,
        message: "Your analysis request is ready.",
      };
    case "not_found":
      return {
        action: "new_estimate" as const,
        message: "No analysis request was found. Get a new estimate to continue.",
      };
    default:
      return { action: "none" as const, message: "" };
  }
}
