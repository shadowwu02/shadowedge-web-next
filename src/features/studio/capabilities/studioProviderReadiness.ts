export type StudioProviderReadinessChecks = {
  catalog: boolean;
  auth: boolean;
  credential: boolean;
  transport: boolean;
  runtime: boolean;
  workspace: boolean;
  cost: boolean;
};

export type StudioProviderReadiness = {
  provider: string;
  ready: boolean;
  checks: StudioProviderReadinessChecks;
  blockers: string[];
  error: {
    code: string;
    sourceCode: string;
    message: string;
  } | null;
  credential: {
    strategy: string;
    configured: boolean;
    environmentVariables: string[];
  };
  checkedAt: string;
  cached: boolean;
};

export type StudioProviderReadinessBlocker = {
  code: string;
  sourceCode: string;
  message: string;
};

export class StudioProviderReadinessError extends Error {
  code: string;
  sourceCode: string;

  constructor(blocker: StudioProviderReadinessBlocker) {
    super(`${blocker.code}: ${blocker.message}`);
    this.name = "StudioProviderReadinessError";
    this.code = blocker.code;
    this.sourceCode = blocker.sourceCode;
  }
}

function messageForReadinessCode(code: string) {
  if (
    code === "PROVIDER_AUTH_REQUIRED" ||
    code === "HIGGSFIELD_CLI_NOT_AUTHENTICATED"
  ) {
    return "Higgsfield 服务未连接，请先完成 Provider 配置。";
  }
  if (code === "PROVIDER_CREDENTIAL_INVALID") {
    return "Higgsfield Provider 凭据无效，请检查运行环境配置。";
  }
  if (code === "PROVIDER_COST_NOT_CONFIGURED") {
    return "Higgsfield 费用规则尚未准备完成。";
  }
  if (code === "MODEL_CATALOG_UNAVAILABLE") {
    return "Higgsfield Runtime Catalog 当前不可用。";
  }
  return "Higgsfield Runtime 当前不可用，请稍后检查 Provider 配置。";
}

export function getStudioProviderReadinessBlocker(
  readiness: StudioProviderReadiness | null | undefined,
): StudioProviderReadinessBlocker | null {
  if (readiness?.ready) return null;
  const sourceCode =
    readiness?.error?.sourceCode ||
    readiness?.blockers?.[0] ||
    "STUDIO_PROVIDER_READINESS_UNAVAILABLE";
  const code = readiness?.error?.code ||
    (sourceCode === "HIGGSFIELD_CLI_NOT_AUTHENTICATED"
      ? "PROVIDER_AUTH_REQUIRED"
      : sourceCode === "PROVIDER_COST_NOT_CONFIGURED"
        ? sourceCode
        : "PROVIDER_RUNTIME_UNAVAILABLE");
  return {
    code,
    sourceCode,
    message: messageForReadinessCode(code || sourceCode),
  };
}

export function assertStudioProviderExecutionReady(
  readiness: StudioProviderReadiness | null | undefined,
) {
  const blocker = getStudioProviderReadinessBlocker(readiness);
  if (blocker) throw new StudioProviderReadinessError(blocker);
}
