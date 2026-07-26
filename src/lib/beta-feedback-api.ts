import { apiRequest } from "@/lib/api";
import type { Locale } from "@/i18n/dictionary";

export type BetaFeedbackCategory = "BUG_REPORT" | "FEATURE_REQUEST" | "UX_FEEDBACK";
export type BetaFeedbackErrorType =
  | "AUTH_ERROR"
  | "NETWORK_ERROR"
  | "PAGE_ERROR"
  | "WORKFLOW_ERROR"
  | "OTHER";

export type BetaFeedbackInput = {
  category: BetaFeedbackCategory;
  title: string;
  description: string;
  locale: Locale;
  appVersion: string;
  source: string;
  errorReport?: {
    errorType: BetaFeedbackErrorType;
    pageSource: string;
    occurredAt: string;
    actionPath: string;
  };
};

export type BetaFeedbackReceipt = {
  feedbackId: string;
  reference: string;
  category: BetaFeedbackCategory;
  createdAt: string;
};

export function sanitizeBetaFeedbackText(value: string, maximum = 3000) {
  return String(value || "")
    .trim()
    .replace(/\r\n?/g, "\n")
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]")
    .replace(
      /\b(access[_-]?token|refresh[_-]?token|token|secret|password|passwd|api[_-]?key|authorization|cookie|session)\b\s*[:=]\s*([^\s,;]+)/gi,
      "$1=[REDACTED]",
    )
    .replace(
      /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{8,}\b/g,
      "[REDACTED_JWT]",
    )
    .slice(0, maximum);
}

export function getSafeFeedbackPath(value: string) {
  const path = String(value || "").trim().split(/[?#]/, 1)[0];
  return path.startsWith("/") && !path.startsWith("//") ? path.slice(0, 240) : "/";
}

export function getBetaReleaseVersion() {
  return (
    process.env.NEXT_PUBLIC_RELEASE_VERSION ||
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ||
    "p2-e3"
  );
}

export function buildBetaFeedbackInput(input: BetaFeedbackInput): BetaFeedbackInput {
  const source = getSafeFeedbackPath(input.source);
  return {
    category: input.category,
    title: sanitizeBetaFeedbackText(input.title, 160),
    description: sanitizeBetaFeedbackText(input.description, 3000),
    locale: input.locale,
    appVersion: input.appVersion.replace(/[^A-Za-z0-9._-]/g, "").slice(0, 80) || "unknown",
    source,
    ...(input.category === "BUG_REPORT" && input.errorReport
      ? {
          errorReport: {
            errorType: input.errorReport.errorType,
            pageSource: getSafeFeedbackPath(input.errorReport.pageSource || source),
            occurredAt: input.errorReport.occurredAt,
            actionPath: sanitizeBetaFeedbackText(input.errorReport.actionPath, 800),
          },
        }
      : {}),
  };
}

export async function submitBetaFeedback(input: BetaFeedbackInput) {
  const response = await apiRequest<{
    feedback: BetaFeedbackReceipt;
    appended: boolean;
  }>("/api/feedback", {
    method: "POST",
    body: JSON.stringify(buildBetaFeedbackInput(input)),
  });
  if (!response.data?.feedback?.feedbackId) {
    throw new Error("Beta feedback was not recorded.");
  }
  return response.data.feedback;
}
