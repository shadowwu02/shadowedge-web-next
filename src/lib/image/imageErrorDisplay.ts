import { ApiError } from "@/types/api";
import type { DictionaryKey } from "@/i18n/useI18n";

export type ImageErrorCategory = "CONTENT_POLICY" | "TENANT" | "REFERENCE" | "CREDITS" | "CONCURRENCY" | "MATERIALIZATION" | "PROVIDER" | "NETWORK" | "UNKNOWN";
export type ImageErrorReasonCode = "material" | "parameter" | "policy" | "temporary" | "not_found" | "unknown";
export type ImageUserFacingErrorDisplay = { title: string; message: string; suggestion: string; tone: "warning" | "error" | "info"; reasonCode: ImageErrorReasonCode; canRetry: boolean; canRestoreDraft: boolean };

function classify(code: string, kind: string | undefined): ImageErrorCategory {
  const value = code.toUpperCase();
  if (kind === "network") return "NETWORK";
  if (kind === "credits" || /CREDIT|BALANCE|INSUFFICIENT/.test(value)) return "CREDITS";
  if (kind === "membership" || /TENANT|MEMBERSHIP/.test(value)) return "TENANT";
  if (/POLICY|COPYRIGHT|SAFETY|MODERATION|CONTENT/.test(value)) return "CONTENT_POLICY";
  if (/REFERENCE|ASSET|MIME|UPLOAD/.test(value)) return "REFERENCE";
  if (/CONCURRENC|ACTIVE_JOB/.test(value)) return "CONCURRENCY";
  if (/MATERIAL|R2|STORAGE/.test(value)) return "MATERIALIZATION";
  if (kind === "server" || /PROVIDER|TIMEOUT|UNAVAILABLE/.test(value)) return "PROVIDER";
  return "UNKNOWN";
}

const COPY: Record<ImageErrorCategory, string> = {
  CONTENT_POLICY: "本次图片请求未通过内容规则，请修改提示词或参考素材后重试。",
  TENANT: "账号归属尚未完成，请联系管理员。",
  REFERENCE: "参考素材不可用或需要重新上传后再生成。",
  CREDITS: "积分不足，无法创建图片任务。",
  CONCURRENCY: "已有图片任务正在处理中，请等待后再试。",
  MATERIALIZATION: "图片结果已生成但保存仍在处理中或失败，请查看历史记录。",
  PROVIDER: "生成服务暂时不可用，请稍后再试。",
  NETWORK: "网络请求未能完成，请检查连接后重试。",
  UNKNOWN: "图片任务未能完成。",
};

export function getImageGenerationErrorDisplay(error: unknown) {
  const apiError = error instanceof ApiError ? error : null;
  const category = classify(apiError?.code || "", apiError?.kind);
  const correlationId = String(apiError?.correlationId || "").trim();
  return {
    category,
    code: String(apiError?.code || "").trim(),
    correlationId,
    message: `${COPY[category]}${correlationId ? ` Correlation ID: ${correlationId}` : ""}`,
  };
}

function reasonFor(category: ImageErrorCategory): ImageErrorReasonCode {
  if (category === "CONTENT_POLICY") return "policy";
  if (category === "REFERENCE") return "material";
  if (category === "PROVIDER" || category === "NETWORK" || category === "MATERIALIZATION") return "temporary";
  return "unknown";
}

export function getImageErrorReasonCode(message: string | null | undefined, options: { errorCode?: string | null; classificationMessage?: string | null } = {}): ImageErrorReasonCode {
  return reasonFor(classify(`${options.errorCode || ""} ${options.classificationMessage || message || ""}`, undefined));
}

type ImageDisplayOptions = { errorCode?: string | null; classificationMessage?: string | null; publicMessage?: string | null; refunded?: boolean; refundStatus?: string | null };

export function getImageUserFacingErrorDisplay(
  message: string | null | undefined,
  _t: (key: DictionaryKey) => string,
  options: ImageDisplayOptions = {},
): ImageUserFacingErrorDisplay {
  const category = classify(`${options.errorCode || ""} ${options.classificationMessage || message || ""}`, undefined);
  const reasonCode = reasonFor(category);
  return {
    title: category === "CONTENT_POLICY" ? "内容规则未通过" : "图片生成失败",
    message: String(options.publicMessage || COPY[category]),
    suggestion: category === "CONTENT_POLICY" ? "请修改提示词或参考素材后重试。" : "请根据提示处理后再试。",
    tone: category === "CONTENT_POLICY" || category === "REFERENCE" ? "warning" : category === "PROVIDER" ? "info" : "error",
    reasonCode,
    canRetry: true,
    canRestoreDraft: true,
  };
}

export function getImageUserFacingError(message: string | null | undefined, t: (key: DictionaryKey) => string, options: ImageDisplayOptions = {}) {
  return getImageUserFacingErrorDisplay(message, t, options).message;
}
