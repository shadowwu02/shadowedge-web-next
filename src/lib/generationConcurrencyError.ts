import { ApiError } from "@/types/api";

const concurrencyLimitCode = "CONCURRENCY_LIMIT_REACHED";

type Translate = (key: "generation.errors.concurrencyLimitReached") => string;
type Format = (
  key: "generation.errors.activeTasks",
  values?: Record<string, string | number | null | undefined>,
) => string;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function pickNumber(...values: unknown[]) {
  for (const value of values) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
  }
  return null;
}

export function isGenerationConcurrencyLimitError(error: unknown) {
  if (error instanceof ApiError && error.code === concurrencyLimitCode) return true;
  if (error && typeof error === "object" && "code" in error) {
    return String((error as { code?: unknown }).code || "") === concurrencyLimitCode;
  }
  return false;
}

export function formatGenerationConcurrencyLimitError(error: unknown, t: Translate, tf: Format) {
  if (!isGenerationConcurrencyLimitError(error)) return "";

  const payload = error instanceof ApiError ? asRecord(error.payload) : asRecord(error);
  const details = asRecord(payload.details);
  const activeCount = pickNumber(payload.activeCount, details.activeCount);
  const maxConcurrency = pickNumber(payload.maxConcurrency, details.maxConcurrency);
  const base = t("generation.errors.concurrencyLimitReached");

  if (activeCount !== null && maxConcurrency !== null) {
    return `${base} ${tf("generation.errors.activeTasks", {
      active: activeCount,
      max: maxConcurrency,
    })}`;
  }

  return base;
}
