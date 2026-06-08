import type { UploadMediaItem, UploadMediaRole, UploadMediaType } from "@/types/video";
import type { VideoModelRule } from "@/lib/video/videoModelRules";
import { getFileTypeFromFile } from "@/lib/upload-rules";

type ReferenceCountMap = Record<UploadMediaType, number>;

const mediaTypeLabels: Record<UploadMediaType, string> = {
  audio: "audio references",
  image: "image references",
  video: "video references",
};

function getTypeLimit(rule: VideoModelRule, type: UploadMediaType) {
  return Math.max(0, Number(rule.maxReferences?.[type] || 0));
}

function getTotalLimit(rule: VideoModelRule) {
  return Math.max(0, Number(rule.maxReferences?.total || 0));
}

function countMediaTypes(items: Array<Pick<UploadMediaItem, "type">>): ReferenceCountMap {
  return items.reduce<ReferenceCountMap>(
    (counts, item) => {
      counts[item.type] += 1;
      return counts;
    },
    { audio: 0, image: 0, video: 0 },
  );
}

function uniqueReferenceItems(items: UploadMediaItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.url || item.id;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function getAllowedReferenceTypes(rule: VideoModelRule): UploadMediaType[] {
  return (["image", "video", "audio"] as UploadMediaType[]).filter((type) => {
    if (!rule.supportedMediaTypes.includes(type)) return false;
    if (getTypeLimit(rule, type) <= 0) return false;
    if (type === "image") return rule.supportsImageReference;
    if (type === "video") return rule.supportsVideoReference;
    return rule.supportsAudioReference;
  });
}

export function getReferenceAccept(rule: VideoModelRule) {
  const allowedTypes = getAllowedReferenceTypes(rule);
  return allowedTypes.map((type) => `${type}/*`).join(",");
}

export function getReferenceLimitSummary(rule: VideoModelRule) {
  return {
    allowedTypes: getAllowedReferenceTypes(rule),
    audio: getTypeLimit(rule, "audio"),
    image: getTypeLimit(rule, "image"),
    total: getTotalLimit(rule),
    video: getTypeLimit(rule, "video"),
  };
}

export function getUnsupportedReferenceTypeReason(rule: VideoModelRule, type: UploadMediaType) {
  if (!rule.supportedMediaTypes.includes(type)) {
    return `This model does not support ${mediaTypeLabels[type]}.`;
  }

  if (type === "image" && !rule.supportsImageReference) return "This model does not support image references.";
  if (type === "video" && !rule.supportsVideoReference) return "This model does not support video references.";
  if (type === "audio" && !rule.supportsAudioReference) return "This model does not support audio references.";
  if (getTypeLimit(rule, type) <= 0) return `This model does not support ${mediaTypeLabels[type]}.`;

  return "";
}

export function isReferenceTypeSupported(rule: VideoModelRule, type: UploadMediaType) {
  return !getUnsupportedReferenceTypeReason(rule, type);
}

export function validateFilesForReferenceRule(rule: VideoModelRule, files: File[]) {
  const unsupported = files.find((file) => !isReferenceTypeSupported(rule, getFileTypeFromFile(file, "media")));
  if (!unsupported) return "";
  const type = getFileTypeFromFile(unsupported, "media");
  return getUnsupportedReferenceTypeReason(rule, type);
}

export function validateReferenceSelectionForRule(
  rule: VideoModelRule,
  currentItems: UploadMediaItem[],
  nextItems: UploadMediaItem[],
) {
  const uniqueCurrent = uniqueReferenceItems(currentItems);
  const currentKeys = new Set(uniqueCurrent.map((item) => item.url || item.id));
  const uniqueNext = uniqueReferenceItems(nextItems).filter((item) => !currentKeys.has(item.url || item.id));
  const unsupported = uniqueNext.find((item) => !isReferenceTypeSupported(rule, item.type));

  if (unsupported) return getUnsupportedReferenceTypeReason(rule, unsupported.type);

  const combined = [...uniqueCurrent, ...uniqueNext];
  const totalLimit = getTotalLimit(rule);

  if (totalLimit >= 0 && combined.length > totalLimit) {
    return `Reference limit reached for this model. It supports up to ${totalLimit} media item${totalLimit === 1 ? "" : "s"}.`;
  }

  const counts = countMediaTypes(combined);
  const overLimitType = (["image", "video", "audio"] as UploadMediaType[]).find((type) => {
    const limit = getTypeLimit(rule, type);
    return counts[type] > limit;
  });

  if (overLimitType) {
    const limit = getTypeLimit(rule, overLimitType);
    return `Reference limit reached for this model. It supports up to ${limit} ${mediaTypeLabels[overLimitType]}.`;
  }

  return "";
}

export function getReferenceMediaIssues(rule: VideoModelRule, items: UploadMediaItem[]) {
  const issues = new Map<string, string[]>();
  const counts: ReferenceCountMap = { audio: 0, image: 0, video: 0 };
  const totalLimit = getTotalLimit(rule);
  let totalCount = 0;

  uniqueReferenceItems(items).forEach((item) => {
    const itemIssues: string[] = [];
    const unsupportedReason = getUnsupportedReferenceTypeReason(rule, item.type);

    totalCount += 1;
    counts[item.type] += 1;

    if (unsupportedReason) itemIssues.push(unsupportedReason);
    else {
      if (totalLimit >= 0 && totalCount > totalLimit) itemIssues.push("Reference limit reached for this model.");
      if (counts[item.type] > getTypeLimit(rule, item.type)) {
        itemIssues.push(`This model supports up to ${getTypeLimit(rule, item.type)} ${mediaTypeLabels[item.type]}.`);
      }
    }

    const roleIssue = getReferenceRoleIssue(rule, item.type, item.role || "reference");
    if (roleIssue) itemIssues.push(roleIssue);

    if (itemIssues.length) issues.set(item.id, itemIssues);
  });

  return issues;
}

export function getReferenceRoleIssue(rule: VideoModelRule, type: UploadMediaType, role: UploadMediaRole) {
  if (role === "reference") return "";
  if (type !== "image") return "Start and End frame roles require an image.";
  if (role === "start_frame" && !rule.supportsStartFrame) return "This model does not support Start Frame.";
  if (role === "end_frame" && !rule.supportsEndFrame) return "This model does not support End Frame.";
  return "";
}

export function canUseReferenceRole(rule: VideoModelRule, type: UploadMediaType, role: UploadMediaRole) {
  return !getReferenceRoleIssue(rule, type, role);
}
