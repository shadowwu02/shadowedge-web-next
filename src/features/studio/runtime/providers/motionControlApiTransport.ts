import type {
  MotionControlBridgePayload,
  MotionControlTransport,
  MotionControlTransportResult,
} from "./motionControlProviderAdapter.ts";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeBridgeResponse(value: unknown): MotionControlTransportResult {
  const envelope = asRecord(value);
  const data = asRecord(envelope.data);
  const job = asRecord(data.job || data.result || data);
  const status = stringValue(job.status).toLowerCase();
  return {
    clientJobId: stringValue(job.clientJobId || job.client_job_id),
    databaseJobId: stringValue(job.databaseJobId || job.database_job_id),
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
  };
}

async function request(path: string, init: { method?: string; body?: string } = {}) {
  const { apiRequest } = await import("../../../../lib/api.ts");
  return apiRequest<unknown>(path, init);
}

export function createMotionControlApiTransport(): MotionControlTransport {
  const basePath = "/studio/providers/motion-control/jobs";
  return {
    async submit(payload: MotionControlBridgePayload) {
      return normalizeBridgeResponse(
        await request(basePath, { method: "POST", body: JSON.stringify(payload) }),
      );
    },
    async status(statusJobId) {
      return normalizeBridgeResponse(
        await request(`${basePath}/${encodeURIComponent(statusJobId)}`),
      );
    },
    async cancel(statusJobId) {
      return normalizeBridgeResponse(
        await request(`${basePath}/${encodeURIComponent(statusJobId)}`, {
          method: "DELETE",
        }),
      );
    },
  };
}
