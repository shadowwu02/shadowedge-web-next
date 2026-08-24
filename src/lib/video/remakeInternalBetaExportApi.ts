import { apiRequest, getApiBaseUrl } from "@/lib/api";
import type { RemakeShot, RemakeShotGenerationState, RemakeStoryboard } from "@/components/video/remake/remakeTypes";
import { getRemakeShotGenerationKey } from "@/components/video/remake/remakeTypes";
import type {
  RemakeExportPreview,
  RemakeExportRenderProjection,
} from "@/lib/video/remakeExportProductFlow";

const REQUIRED_ACTIONS = [
  "EXPORT_REVIEW",
  "SNAPSHOT_CONFIRM",
  "CREDIT_PREVIEW",
  "EXPORT_CONFIRM",
  "RENDER_STATUS",
  "FINAL_DOWNLOAD",
] as const;

type Capability = {
  contractVersion: "remake-internal-beta-capability-v1";
  available: boolean;
  visibility: "INTERNAL_BETA" | "HIDDEN";
  allowedActions: string[];
  publicEnabled: false;
};

export type RemakeInternalBetaPreviewReceipt = RemakeExportPreview & {
  snapshotRef: string;
  snapshotHash: string;
  outputSettings: Record<string, unknown>;
  estimateRef: string;
  estimateHash: string;
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function finite(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dataOrThrow<T>(value: { data?: T }, code: string) {
  if (!value.data) throw Object.assign(new Error(code), { code });
  return value.data;
}

export async function getRemakeInternalBetaCapability(token?: string) {
  const envelope = await apiRequest<Capability>("/api/remake/internal-export/capability", { token });
  const capability = dataOrThrow(envelope, "REMAKE_INTERNAL_BETA_CAPABILITY_INVALID");
  const actions = Array.isArray(capability.allowedActions) ? capability.allowedActions : [];
  return capability.contractVersion === "remake-internal-beta-capability-v1" &&
    capability.available === true &&
    capability.visibility === "INTERNAL_BETA" &&
    capability.publicEnabled === false &&
    REQUIRED_ACTIONS.every((action) => actions.includes(action));
}

function shotRef(storyboard: RemakeStoryboard, shot: RemakeShot) {
  return `${storyboard.id}:${shot.shotGroupId}:${shot.shot}`;
}

export function buildRemakeInternalBetaSnapshotInput(input: {
  storyboard: RemakeStoryboard;
  sourceAssetRef: string;
  shotGenerations: Record<string, RemakeShotGenerationState>;
  aspectRatio: string;
}) {
  const sourceAssetRef = text(input.sourceAssetRef);
  if (!sourceAssetRef) throw Object.assign(new Error("REMAKE_EXPORT_SOURCE_ASSET_REQUIRED"), { code: "REMAKE_EXPORT_SOURCE_ASSET_REQUIRED" });
  const orderedShots = input.storyboard.shots.map((shot, index) => {
    const generation = input.shotGenerations[getRemakeShotGenerationKey(input.storyboard.id, shot)];
    const replacement = generation?.replacement?.generated.status === "completed"
      ? generation.replacement.generated.assetLineage
      : null;
    const visualAssetRef = replacement?.assetRef || sourceAssetRef;
    return {
      ordinal: index + 1,
      shotRef: shotRef(input.storyboard, shot),
      visualSource: replacement ? "generated_v3" : "original_v1",
      visualAssetRef,
      visualLineageHash: replacement
        ? `generated:${replacement.generationRequestRef}:${replacement.sourceGenerationJobRef}`
        : `original:${sourceAssetRef}`,
      sourceRange: replacement ? null : {
        startTime: shot.sourceTimeRange.start,
        endTime: shot.sourceTimeRange.end,
      },
      outputDuration: shot.duration,
      audioSource: "original_audio",
      audioAssetRef: sourceAssetRef,
      audioLineageHash: `original:${sourceAssetRef}`,
      audioSourceRange: {
        startTime: shot.sourceTimeRange.start,
        endTime: shot.sourceTimeRange.end,
      },
    };
  });
  return {
    timelineRef: input.storyboard.id,
    timelineVersion: 3,
    orderedShots,
    audioPolicy: { mode: "original_audio", version: "remake-export-audio-v1" },
    outputSettings: {
      container: "mp4",
      resolution: "720p",
      aspectRatio: ["16:9", "9:16", "1:1"].includes(input.aspectRatio) ? input.aspectRatio : "16:9",
      frameRatePolicy: "preserve",
    },
  };
}

export async function createRemakeInternalBetaPreview(input: {
  snapshotInput: ReturnType<typeof buildRemakeInternalBetaSnapshotInput>;
  token?: string;
}) {
  const snapshotEnvelope = await apiRequest<Record<string, unknown>>("/api/remake/internal-export/snapshots", {
    method: "POST",
    body: JSON.stringify(input.snapshotInput),
    token: input.token,
  });
  const snapshot = dataOrThrow(snapshotEnvelope, "REMAKE_EXPORT_SNAPSHOT_INVALID");
  const snapshotRef = text(snapshot.snapshotRef);
  const snapshotHash = text(snapshot.snapshotHash);
  const outputSettings = record(snapshot.outputSettings);
  if (!snapshotRef || !snapshotHash) throw Object.assign(new Error("REMAKE_EXPORT_SNAPSHOT_INVALID"), { code: "REMAKE_EXPORT_SNAPSHOT_INVALID" });

  const previewEnvelope = await apiRequest<Record<string, unknown>>("/api/remake/internal-export/preview", {
    method: "POST",
    body: JSON.stringify({ snapshotRef, expectedSnapshotHash: snapshotHash, outputSettings }),
    token: input.token,
  });
  const raw = dataOrThrow(previewEnvelope, "REMAKE_EXPORT_PREVIEW_INVALID");
  const projectedSnapshot = record(raw.snapshot);
  const estimate = record(raw.estimate);
  const creditPreview = record(raw.creditPreview);
  if (
    raw.explicitConfirmationRequired !== true ||
    text(projectedSnapshot.snapshotRef) !== snapshotRef ||
    text(projectedSnapshot.snapshotHash) !== snapshotHash ||
    estimate.currency !== "credits" ||
    estimate.status !== "ESTIMATE_ONLY" ||
    creditPreview.mutation !== "NONE"
  ) {
    throw Object.assign(new Error("REMAKE_EXPORT_PREVIEW_INVALID"), { code: "REMAKE_EXPORT_PREVIEW_INVALID" });
  }
  const receipt: RemakeInternalBetaPreviewReceipt = {
    snapshot: {
      shotCount: finite(projectedSnapshot.shotCount),
      durationSeconds: finite(projectedSnapshot.durationSeconds),
    },
    estimate: {
      credits: finite(estimate.credits),
      currency: "credits",
      status: "ESTIMATE_ONLY",
    },
    creditPreview: {
      balance: creditPreview.balance === null ? null : finite(creditPreview.balance),
      sufficient: creditPreview.sufficient === true,
      mutation: "NONE",
    },
    explicitConfirmationRequired: true,
    snapshotRef,
    snapshotHash,
    outputSettings,
    estimateRef: text(estimate.estimateRef),
    estimateHash: text(estimate.estimateHash),
  };
  if (!receipt.estimateRef || !receipt.estimateHash) throw Object.assign(new Error("REMAKE_EXPORT_PREVIEW_INVALID"), { code: "REMAKE_EXPORT_PREVIEW_INVALID" });
  return receipt;
}

function normalizeRender(rawValue: unknown): RemakeExportRenderProjection {
  const raw = record(rawValue);
  const download = record(raw.download);
  return {
    renderJobRef: text(raw.renderJobRef),
    status: text(raw.status) as RemakeExportRenderProjection["status"],
    progress: finite(raw.progress),
    failureCategory: text(raw.failureCategory) || null,
    download: {
      available: download.available === true,
      mimeType: download.mimeType === "video/mp4" ? "video/mp4" : null,
      href: text(download.href) || null,
    },
  };
}

export async function confirmRemakeInternalBetaExport(input: {
  receipt: RemakeInternalBetaPreviewReceipt;
  token?: string;
}) {
  const envelope = await apiRequest<Record<string, unknown>>("/api/remake/internal-export/confirm", {
    method: "POST",
    headers: {
      "Idempotency-Key": `remake-export:${input.receipt.snapshotHash}:${input.receipt.estimateHash}`,
    },
    body: JSON.stringify({
      snapshotRef: input.receipt.snapshotRef,
      expectedSnapshotHash: input.receipt.snapshotHash,
      outputSettings: input.receipt.outputSettings,
      estimateRef: input.receipt.estimateRef,
      expectedEstimateHash: input.receipt.estimateHash,
      explicitConfirmation: true,
    }),
    token: input.token,
  });
  return normalizeRender(dataOrThrow(envelope, "REMAKE_EXPORT_CONFIRMATION_FAILED"));
}

export async function getRemakeInternalBetaRenderStatus(renderJobRef: string, token?: string) {
  const envelope = await apiRequest<Record<string, unknown>>(
    `/api/remake/internal-export/render-jobs/${encodeURIComponent(renderJobRef)}`,
    { token },
  );
  return normalizeRender(dataOrThrow(envelope, "REMAKE_EXPORT_STATUS_INVALID"));
}

export function getRemakeInternalBetaDownloadUrl(renderJobRef: string) {
  return `${getApiBaseUrl()}/api/remake/internal-export/render-jobs/${encodeURIComponent(renderJobRef)}/download`;
}
