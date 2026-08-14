export type ReverseAnalyzeProxyReadiness = {
  ready: boolean;
  status: "READY" | "CONFIGURATION_MISSING";
  code: "" | "PROXY_CONFIGURATION_MISSING";
};

export function getReverseAnalyzeProxyReadinessFromEnv(
  env?: { INTERNAL_VIDEO_SITE_KEY?: string },
): ReverseAnalyzeProxyReadiness {
  const value = env
    ? env.INTERNAL_VIDEO_SITE_KEY
    : (process.env as Record<string, string | undefined>)["INTERNAL_VIDEO_SITE_KEY"];
  const ready = Boolean(String(value || "").trim());
  return {
    ready,
    status: ready ? "READY" : "CONFIGURATION_MISSING",
    code: ready ? "" : "PROXY_CONFIGURATION_MISSING",
  };
}
