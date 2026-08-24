export type RemakeExportRenderStatus = "queued" | "processing" | "completed" | "failed";

export type RemakeExportPreview = {
  snapshot: {
    shotCount: number;
    durationSeconds: number;
  };
  estimate: {
    credits: number;
    currency: "credits";
    status: "ESTIMATE_ONLY";
  };
  creditPreview: {
    balance: number | null;
    sufficient: boolean;
    mutation: "NONE";
  };
  explicitConfirmationRequired: true;
};

export type RemakeExportRenderProjection = {
  renderJobRef: string;
  status: RemakeExportRenderStatus;
  progress: number;
  failureCategory: string | null;
  download: {
    available: boolean;
    mimeType: "video/mp4" | null;
    href: string | null;
  };
};

export type RemakeExportFlowState =
  | { phase: "idle" }
  | { phase: "previewing" }
  | { phase: "awaiting_confirmation"; preview: RemakeExportPreview }
  | { phase: "confirming"; preview: RemakeExportPreview }
  | { phase: "queued" | "processing" | "completed" | "failed"; render: RemakeExportRenderProjection }
  | { phase: "error"; failureCategory: string };

export type RemakeExportFlowAction =
  | { type: "REQUEST_PREVIEW" }
  | { type: "PREVIEW_RECEIVED"; preview: RemakeExportPreview }
  | { type: "CANCEL" }
  | { type: "CONFIRM" }
  | { type: "RENDER_RECEIVED"; render: RemakeExportRenderProjection }
  | { type: "ERROR"; failureCategory: string };

function contractError(code: string) {
  return Object.assign(new Error(code), { code });
}

function assertPreview(preview: RemakeExportPreview) {
  if (
    preview?.explicitConfirmationRequired !== true ||
    preview?.estimate?.status !== "ESTIMATE_ONLY" ||
    preview?.estimate?.currency !== "credits" ||
    !Number.isFinite(preview?.estimate?.credits) ||
    preview.estimate.credits <= 0 ||
    preview?.creditPreview?.mutation !== "NONE" ||
    !Number.isInteger(preview?.snapshot?.shotCount) ||
    preview.snapshot.shotCount <= 0 ||
    !Number.isFinite(preview?.snapshot?.durationSeconds) ||
    preview.snapshot.durationSeconds <= 0
  ) {
    throw contractError("REMAKE_EXPORT_PREVIEW_INVALID");
  }
  return preview;
}

function isSafeDownloadHref(href: string) {
  return /^\/api\/remake\/render-jobs\/[^/]+\/download$/.test(href);
}

function assertRenderProjection(render: RemakeExportRenderProjection) {
  if (!render?.renderJobRef || !["queued", "processing", "completed", "failed"].includes(render.status)) {
    throw contractError("REMAKE_EXPORT_STATUS_INVALID");
  }
  if (!Number.isFinite(render.progress) || render.progress < 0 || render.progress > 100) {
    throw contractError("REMAKE_EXPORT_STATUS_INVALID");
  }
  if (render.status === "completed") {
    if (
      render.download?.available !== true ||
      render.download?.mimeType !== "video/mp4" ||
      !render.download.href ||
      !isSafeDownloadHref(render.download.href)
    ) {
      throw contractError("REMAKE_EXPORT_DOWNLOAD_INVALID");
    }
  } else if (render.download?.available || render.download?.href) {
    throw contractError("REMAKE_EXPORT_DOWNLOAD_NOT_READY");
  }
  return render;
}

export function createRemakeExportFlowState(): RemakeExportFlowState {
  return { phase: "idle" };
}

export function canConfirmRemakeExport(state: RemakeExportFlowState) {
  return state.phase === "awaiting_confirmation" && state.preview.creditPreview.sufficient;
}

export function reduceRemakeExportFlow(
  state: RemakeExportFlowState,
  action: RemakeExportFlowAction,
): RemakeExportFlowState {
  switch (action.type) {
    case "REQUEST_PREVIEW":
      if (!["idle", "error"].includes(state.phase)) throw contractError("REMAKE_EXPORT_PREVIEW_STATE_INVALID");
      return { phase: "previewing" };
    case "PREVIEW_RECEIVED":
      if (state.phase !== "previewing") throw contractError("REMAKE_EXPORT_PREVIEW_STATE_INVALID");
      return { phase: "awaiting_confirmation", preview: assertPreview(action.preview) };
    case "CANCEL":
      if (state.phase !== "awaiting_confirmation") throw contractError("REMAKE_EXPORT_CANCEL_STATE_INVALID");
      return { phase: "idle" };
    case "CONFIRM":
      if (state.phase !== "awaiting_confirmation") throw contractError("REMAKE_EXPORT_CONFIRMATION_REQUIRED");
      if (!state.preview.creditPreview.sufficient) throw contractError("REMAKE_EXPORT_INSUFFICIENT_CREDITS");
      return { phase: "confirming", preview: state.preview };
    case "RENDER_RECEIVED": {
      const render = assertRenderProjection(action.render);
      const currentRender = "render" in state ? state.render : null;
      if (state.phase !== "confirming" && !currentRender) throw contractError("REMAKE_EXPORT_STATUS_STATE_INVALID");
      if (currentRender && currentRender.renderJobRef !== render.renderJobRef) {
        throw contractError("REMAKE_EXPORT_RENDER_IDENTITY_CONFLICT");
      }
      if ((state.phase === "completed" || state.phase === "failed") && state.phase !== render.status) {
        throw contractError("REMAKE_EXPORT_TERMINAL_STATE_CONFLICT");
      }
      return { phase: render.status, render };
    }
    case "ERROR":
      return { phase: "error", failureCategory: action.failureCategory || "REMAKE_EXPORT_FAILED" };
    default:
      return state;
  }
}
