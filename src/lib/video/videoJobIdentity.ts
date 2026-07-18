export type VideoJobIdentity = {
  jobId: string;
  databaseJobId?: string;
  providerJobId?: string;
  statusJobId: string;
};

export type VideoJobVisibilityProgress = {
  attempt: number;
  code: "JOB_NOT_VISIBLE_YET";
  maxAttempts: number;
  statusJobId: string;
};

type VideoJobIdentitySource = {
  id?: unknown;
  jobId?: unknown;
  dbJobId?: unknown;
  databaseJobId?: unknown;
  generationId?: unknown;
  providerJobId?: unknown;
  statusJobId?: unknown;
};

type VideoJobStatusError = {
  code?: unknown;
  message?: unknown;
  status?: unknown;
};

function firstString(...values: unknown[]) {
  return values.find((value) => typeof value === "string" && value.trim()) as
    | string
    | undefined;
}

export function normalizeVideoJobIdentity(
  source: VideoJobIdentitySource | null | undefined,
): VideoJobIdentity {
  const value = source || {};
  const databaseJobId = firstString(value.databaseJobId, value.dbJobId);
  const providerJobId = firstString(value.providerJobId);
  const jobId =
    firstString(value.jobId, value.generationId, value.id, providerJobId, databaseJobId) ||
    "";
  const statusJobId =
    firstString(value.statusJobId, databaseJobId, jobId, providerJobId) || "";

  return {
    jobId,
    ...(databaseJobId ? { databaseJobId } : {}),
    ...(providerJobId ? { providerJobId } : {}),
    statusJobId,
  };
}

export function isVideoJobNotFoundError(error: unknown) {
  const candidate = (error || {}) as VideoJobStatusError;
  const code = String(candidate.code || "").trim().toUpperCase();
  const message = String(candidate.message || "").toUpperCase();

  return (
    code === "VIDEO_JOB_NOT_FOUND" ||
    (Number(candidate.status) === 404 && message.includes("VIDEO_JOB_NOT_FOUND"))
  );
}

export async function getVideoStatusWithVisibilityGrace<T>({
  identity,
  getStatus,
  maxAttempts,
  onNotVisible,
  wait,
}: {
  identity: VideoJobIdentity;
  getStatus: (statusJobId: string) => Promise<T>;
  maxAttempts: number;
  onNotVisible?: (progress: VideoJobVisibilityProgress) => void;
  wait: () => Promise<void>;
}): Promise<T> {
  const attempts = Math.max(1, Math.floor(maxAttempts));

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await getStatus(identity.statusJobId);
    } catch (error) {
      if (!isVideoJobNotFoundError(error) || attempt >= attempts) throw error;

      onNotVisible?.({
        attempt,
        code: "JOB_NOT_VISIBLE_YET",
        maxAttempts: attempts,
        statusJobId: identity.statusJobId,
      });
      await wait();
    }
  }

  throw new Error("Video status visibility retry loop ended unexpectedly.");
}
