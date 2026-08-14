type ProxyPayload = Record<string, unknown>;

function text(value: unknown) {
  return String(value || "").trim();
}

export function classifyReverseAnalyzeBackendError(payload: unknown, status: number) {
  const record = payload && typeof payload === "object" && !Array.isArray(payload)
    ? payload as ProxyPayload
    : {};
  const code = text(record.code || record.error_code || record.error).toUpperCase();

  if (code === "TENANT_MEMBERSHIP_REVIEW_REQUIRED") return "TENANT_MEMBERSHIP_REVIEW_REQUIRED";
  if (code === "CANONICAL_ASSET_REQUIRED" || code.includes("SOURCE_VIDEO_ASSET")) {
    return "CANONICAL_ASSET_REQUIRED";
  }
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403 || code.includes("INTERNAL_SITE") || code.includes("ADMISSION")) {
    return "BACKEND_ADMISSION_DENIED";
  }
  if (status >= 500 || code.includes("PROVIDER") || code.includes("VLM")) return "PROVIDER_FAILURE";
  return code || "BACKEND_ADMISSION_DENIED";
}

export function safeReverseAnalyzeProxyPayload(payload: unknown, status: number) {
  const record = payload && typeof payload === "object" && !Array.isArray(payload)
    ? payload as ProxyPayload
    : {};
  if (status >= 200 && status < 300) return record;
  const code = classifyReverseAnalyzeBackendError(record, status);
  const messages: Record<string, string> = {
    PROXY_CONFIGURATION_MISSING: "Short Remake proxy is not configured.",
    TENANT_MEMBERSHIP_REVIEW_REQUIRED: "Account tenant membership review is required.",
    CANONICAL_ASSET_REQUIRED: "A Canonical Video Asset is required.",
    BACKEND_ADMISSION_DENIED: "Short Remake admission was denied.",
    PROVIDER_FAILURE: "Short Remake analysis could not be completed."
  };
  return {
    ok: false,
    code,
    error: messages[code] || "Short Remake request failed.",
    ...(record.correlationId ? { correlationId: record.correlationId } : {})
  };
}
