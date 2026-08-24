export type RemakeShotReplacementStatus = "pending" | "processing" | "completed" | "failed";

export type RemakeShotReplacementProjection = {
  contractVersion: "remake-shot-replacement-v1";
  original: {
    version: "v1";
    shotRef: string;
    analysisRef: string;
    shotGroupRef: string;
    shotNumber: number;
  };
  edited: {
    version: "v2";
    draftRevision: number | null;
  };
  generated: {
    version: "v3";
    generationRequestRef: string;
    generationJobRef: string;
    status: RemakeShotReplacementStatus;
    retryAttempt: number;
    replacesGenerationRequestRef: string | null;
    assetLineage: {
      assetRef: string;
      sourceGenerationJobRef: string;
      generationRequestRef: string;
      originalShotRef: string;
      status: "ready";
      mimeType: "video/mp4";
      url: string;
    } | null;
  };
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asPositiveInteger(value: unknown) {
  return Number.isInteger(value) && Number(value) > 0 ? Number(value) : null;
}

function asNonNegativeInteger(value: unknown) {
  return Number.isInteger(value) && Number(value) >= 0 ? Number(value) : 0;
}

export function normalizeRemakeShotReplacement(value: unknown): RemakeShotReplacementProjection | null {
  const root = asRecord(value);
  const original = asRecord(root.original);
  const edited = asRecord(root.edited);
  const generated = asRecord(root.generated);
  const status = asText(generated.status) as RemakeShotReplacementStatus;
  const shotNumber = asPositiveInteger(original.shotNumber);
  const draftRevision = edited.draftRevision === null ? null : asPositiveInteger(edited.draftRevision);

  if (root.contractVersion !== "remake-shot-replacement-v1") return null;
  if (original.version !== "v1" || edited.version !== "v2" || generated.version !== "v3") return null;
  if (!asText(original.shotRef) || !asText(original.analysisRef) || !asText(original.shotGroupRef) || !shotNumber) return null;
  if (!asText(generated.generationRequestRef) || !asText(generated.generationJobRef)) return null;
  if (!["pending", "processing", "completed", "failed"].includes(status)) return null;

  const rawAsset = asRecord(generated.assetLineage);
  const assetLineage = generated.assetLineage === null
    ? null
    : {
        assetRef: asText(rawAsset.assetRef),
        sourceGenerationJobRef: asText(rawAsset.sourceGenerationJobRef),
        generationRequestRef: asText(rawAsset.generationRequestRef),
        originalShotRef: asText(rawAsset.originalShotRef),
        status: asText(rawAsset.status),
        mimeType: asText(rawAsset.mimeType),
        url: asText(rawAsset.url),
      };

  if (status === "completed") {
    if (
      !assetLineage ||
      !assetLineage.assetRef ||
      !assetLineage.sourceGenerationJobRef ||
      !assetLineage.generationRequestRef ||
      assetLineage.originalShotRef !== asText(original.shotRef) ||
      assetLineage.status !== "ready" ||
      assetLineage.mimeType !== "video/mp4" ||
      !assetLineage.url
    ) {
      return null;
    }
  } else if (assetLineage) {
    return null;
  }

  return {
    contractVersion: "remake-shot-replacement-v1",
    original: {
      version: "v1",
      shotRef: asText(original.shotRef),
      analysisRef: asText(original.analysisRef),
      shotGroupRef: asText(original.shotGroupRef),
      shotNumber,
    },
    edited: {
      version: "v2",
      draftRevision,
    },
    generated: {
      version: "v3",
      generationRequestRef: asText(generated.generationRequestRef),
      generationJobRef: asText(generated.generationJobRef),
      status,
      retryAttempt: asNonNegativeInteger(generated.retryAttempt),
      replacesGenerationRequestRef: asText(generated.replacesGenerationRequestRef) || null,
      assetLineage: assetLineage ? {
        assetRef: assetLineage.assetRef,
        sourceGenerationJobRef: assetLineage.sourceGenerationJobRef,
        generationRequestRef: assetLineage.generationRequestRef,
        originalShotRef: assetLineage.originalShotRef,
        status: "ready",
        mimeType: "video/mp4",
        url: assetLineage.url,
      } : null,
    },
  };
}

export function preferRemakeShotReplacement(
  current: RemakeShotReplacementProjection | undefined,
  incoming: RemakeShotReplacementProjection | undefined,
) {
  if (!current) return incoming;
  if (!incoming) return current;
  if (current.original.shotRef !== incoming.original.shotRef) return current;
  if (current.generated.status === "completed" && incoming.generated.status !== "completed") return current;
  return incoming;
}
