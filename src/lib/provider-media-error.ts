import type { DictionaryKey } from "@/i18n/useI18n";

const ownershipCodes = new Set([
  "PROVIDER_MEDIA_OWNERSHIP_MISMATCH",
  "PROVIDER_MEDIA_BINDING_REQUIRED",
  "PROVIDER_MEDIA_ID_REQUIRED",
]);

export function providerMediaErrorKey(reason: unknown): DictionaryKey | null {
  const code = reason && typeof reason === "object" && "code" in reason
    ? String((reason as { code?: unknown }).code || "")
    : "";
  return ownershipCodes.has(code) ? "provider.mediaOwnershipMismatch" : null;
}
