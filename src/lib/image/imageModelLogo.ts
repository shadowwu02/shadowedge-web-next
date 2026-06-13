import type { ImageHistoryItem, ImageModel } from "@/types/image";

type LookupRecord = Record<string, unknown>;

function asRecord(value: unknown): LookupRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as LookupRecord) : {};
}

function pickLookupParts(record: LookupRecord) {
  return [
    record.id,
    record.model,
    record.modelId,
    record.model_id,
    record.name,
    record.label,
    record.displayName,
    record.display_name,
    record.provider,
    record.providerName,
    record.provider_name,
    record.providerModel,
    record.provider_model,
    record.providerModelId,
    record.provider_model_id,
  ];
}

export function getImageModelLogoLookup(model: ImageModel | null | undefined) {
  if (!model) return "";

  const raw = asRecord(model.raw);

  return [
    model.id,
    model.providerModel,
    model.provider,
    model.label,
    model.name,
    ...pickLookupParts(raw),
  ]
    .filter(Boolean)
    .join(" ");
}

export function getImageHistoryModelLogoLookup(item: ImageHistoryItem | null | undefined) {
  if (!item) return "";

  const meta = asRecord(item.meta);
  const raw = asRecord(item.raw);

  return [
    item.model,
    item.providerModel,
    item.provider,
    ...pickLookupParts(meta),
    ...pickLookupParts(raw),
  ]
    .filter(Boolean)
    .join(" ");
}
