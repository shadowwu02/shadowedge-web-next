import type { RemakeStoryboard } from "@/components/video/remake/remakeTypes";

type RemakeAnalysisEnvelope = {
  analysisStatus?: unknown;
  meta?: unknown;
  status?: unknown;
  storyboard?: RemakeStoryboard | null;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function isValidShot(value: unknown) {
  const shot = asRecord(value);
  const range = asRecord(shot.sourceTimeRange);
  const shotNumber = Number(shot.shot);
  const start = Number(range.start);
  const end = Number(range.end);

  return (
    Number.isInteger(shotNumber) &&
    shotNumber > 0 &&
    String(shot.shotGroupId || "").trim().length > 0 &&
    Number.isFinite(start) &&
    start >= 0 &&
    Number.isFinite(end) &&
    end > start
  );
}

/** Frontend fail-closed boundary for Remake analysis results. */
export function getRenderableRemakeStoryboard(
  envelope: RemakeAnalysisEnvelope | null | undefined,
): RemakeStoryboard | null {
  const storyboard = envelope?.storyboard;
  if (!storyboard || !Array.isArray(storyboard.shots) || storyboard.shots.length === 0) return null;

  const meta = asRecord(envelope?.meta);
  const analysisStatus = String(
    envelope?.analysisStatus || envelope?.status || meta.analysisStatus || meta.status || "",
  ).trim().toLowerCase();
  const analysisSource = String(
    meta.analysisSource || storyboard.analysisSource || (meta.mock === true ? "fallback" : meta.vlmProvider ? "vlm" : ""),
  ).trim().toLowerCase();
  const isRealVlmSource = analysisSource === "vlm" || analysisSource === "real_vlm";
  const vlmCalled = meta.vlmCalled === true || storyboard.vlmCalled === true || isRealVlmSource;
  const providerCallMade = meta.providerCallMade === true || storyboard.providerCallMade === true || vlmCalled;

  const isRejected =
    analysisStatus === "failed" ||
    analysisStatus === "error" ||
    meta.vlmFailed === true ||
    meta.vlmUnavailable === true ||
    meta.mock === true ||
    meta.sandboxVlm === true ||
    storyboard.mock === true ||
    storyboard.sandboxVlm === true ||
    analysisSource === "fallback" ||
    analysisSource === "sandbox_vlm" ||
    !isRealVlmSource ||
    !vlmCalled ||
    !providerCallMade;

  if (isRejected || !storyboard.shots.every(isValidShot)) return null;
  return storyboard;
}

export function isRenderableRemakeStoryboard(
  envelope: RemakeAnalysisEnvelope | null | undefined,
) {
  return getRenderableRemakeStoryboard(envelope) !== null;
}
