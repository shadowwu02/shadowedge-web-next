import type { HiggsfieldVideoEditProviderConfig } from "./higgsfieldVideoEditConfig.ts";
import type {
  HiggsfieldVideoEditBridgePayload,
  HiggsfieldVideoEditTransport,
  HiggsfieldVideoEditTransportResult,
} from "./higgsfieldVideoEditAdapter.ts";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeBridgeResponse(value: unknown): HiggsfieldVideoEditTransportResult {
  const envelope = asRecord(value);
  const data = asRecord(envelope.data);
  const job = asRecord(data.job || data.result || data);
  const status = stringValue(job.status).toLowerCase();
  return {
    clientJobId: stringValue(job.clientJobId || job.client_job_id),
    databaseJobId: stringValue(
      job.databaseJobId || job.database_job_id || job.dbJobId,
    ),
    providerJobId: stringValue(job.providerJobId || job.provider_job_id),
    statusJobId: stringValue(job.statusJobId || job.status_job_id),
    status:
      status === "completed" ||
      status === "failed" ||
      status === "cancelled" ||
      status === "processing"
        ? status
        : "queued",
    videoUrl: stringValue(job.videoUrl || job.video_url || job.outputUrl),
    thumbnail: stringValue(job.thumbnail || job.thumbnail_url),
    errorCode: stringValue(job.errorCode || job.error_code),
    errorMessage: stringValue(job.errorMessage || job.error_message),
    providerStatus: stringValue(job.providerStatus || job.provider_status),
  };
}

async function authenticatedStudioRequest(
  path: string,
  init: { method?: string; body?: string } = {},
) {
  // Dynamic import keeps credentials and auth behavior in the existing
  // ShadowEdge API client while allowing adapter contract tests to inject a
  // zero-network transport.
  const { apiRequest } = await import("../../../../lib/api.ts");
  return apiRequest<unknown>(path, init);
}

export function createHiggsfieldVideoEditApiTransport(
  config: HiggsfieldVideoEditProviderConfig,
): HiggsfieldVideoEditTransport {
  const jobPath = (statusJobId: string) =>
    config.routes.status.replace(
      ":statusJobId",
      encodeURIComponent(statusJobId),
    );

  return {
    async submit(payload: HiggsfieldVideoEditBridgePayload) {
      const response = await authenticatedStudioRequest(config.routes.submit, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      return normalizeBridgeResponse(response);
    },
    async status(statusJobId) {
      return normalizeBridgeResponse(
        await authenticatedStudioRequest(jobPath(statusJobId)),
      );
    },
    async cancel(statusJobId) {
      return normalizeBridgeResponse(
        await authenticatedStudioRequest(jobPath(statusJobId), {
          method: "DELETE",
        }),
      );
    },
  };
}
