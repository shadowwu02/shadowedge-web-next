import type { DictionaryKey } from "@/i18n/useI18n";

const ownershipCodes = new Set([
  "PROVIDER_MEDIA_OWNERSHIP_MISMATCH",
  "PROVIDER_MEDIA_BINDING_REQUIRED",
  "PROVIDER_MEDIA_ID_REQUIRED",
]);

const unavailableCodes = new Set([
  "PROVIDER_MEDIA_INPUT_UNVERIFIED",
  "PROVIDER_MEDIA_INPUT_NOT_VERIFIED",
  "PROVIDER_MEDIA_UPLOAD_ID_MISSING",
  "HIGGSFIELD_CLI_SUBMIT_FAILED",
]);

function field(reason: unknown, key: "code" | "message") {
  if (!reason || typeof reason !== "object") return "";
  const value = (reason as Record<string, unknown>)[key];
  return value == null ? "" : String(value);
}

export function providerMediaErrorKey(reason: unknown): DictionaryKey | null {
  const code = field(reason, "code");
  const message = field(reason, "message") || (typeof reason === "string" ? reason : "");
  if (code === "PROVIDER_MEDIA_INPUT_REQUIRED") return "provider.mediaInputRequired";
  if (unavailableCodes.has(code) || /media input not found/i.test(message) || message === "[object Object]" || /^\s*\{.*\}\s*$/.test(message)) {
    return "provider.mediaInputUnavailable";
  }
  return ownershipCodes.has(code) ? "provider.mediaOwnershipMismatch" : null;
}
