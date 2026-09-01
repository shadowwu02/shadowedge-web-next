import type { UploadMediaItem, UploadMediaRole, UploadMediaType } from "@/types/video";
import type { VideoModelRule } from "@/lib/video/videoModelRules";
import { getFileTypeFromFile } from "@/lib/upload-rules";
import {
  LEGACY_REFERENCE_REUPLOAD_REQUIRED,
  isCanonicalReferenceItem,
} from "@/lib/video/canonicalReferenceAssets";
import { getCanonicalReferenceIdentity } from "@/lib/reference/referenceIdentity";

type ReferenceCountMap = Record<UploadMediaType, number>;

export const AUDIO_REFERENCE_GENERATED_AUDIO_CONFLICT = "Audio Reference cannot be combined with generated audio.";
export const VIDEO_REFERENCE_GENERATED_AUDIO_UNVERIFIED = "Video Reference with generated audio is awaiting compatibility certification.";

export function getGeneratedAudioImageLimitMessage(rule: VideoModelRule) {
  const maximum = Math.max(0, Number(rule.generatedAudioReference?.imageMax || 0));
  return `${rule.label} generated audio is certified with up to ${maximum} reference image${maximum === 1 ? "" : "s"}.`;
}

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

export function hasAudioReference(items: Array<Pick<UploadMediaItem, "type">>) {
  return items.some((item) => item.type === "audio");
}

export function getGeneratedAudioReferenceIssue(
  rule: VideoModelRule,
  generateAudio: boolean,
  items: Array<Pick<UploadMediaItem, "type">>,
) {
  if (!generateAudio) return "";
  const counts = countMediaTypes(items);
  if (counts.audio > Math.max(0, Number(rule.generatedAudioReference?.audioMax || 0))) {
    return rule.audioReference?.generatedAudioCompatible === true
      ? ""
      : AUDIO_REFERENCE_GENERATED_AUDIO_CONFLICT;
  }
  if (counts.video > Math.max(0, Number(rule.generatedAudioReference?.videoMax || 0))) {
    return VIDEO_REFERENCE_GENERATED_AUDIO_UNVERIFIED;
  }
  if (counts.image > Math.max(0, Number(rule.generatedAudioReference?.imageMax || 0))) {
    return getGeneratedAudioImageLimitMessage(rule);
  }
  return "";
}

export function normalizeGeneratedAudioForReferences<T extends { generateAudio: boolean }>(
  rule: VideoModelRule,
  params: T,
  items: Array<Pick<UploadMediaItem, "type">>,
): T {
  return getGeneratedAudioReferenceIssue(rule, params.generateAudio, items) === AUDIO_REFERENCE_GENERATED_AUDIO_CONFLICT
    ? { ...params, generateAudio: false }
    : params;
}

function getMixedImageVideoIssue(rule: VideoModelRule, counts: ReferenceCountMap) {
  if (counts.image <= 0 || counts.video <= 0) return "";
  if (counts.audio > 0 && rule.mixedReference?.imageVideoAudio !== true) {
    return "This model does not support mixed image, video, and audio references.";
  }
  if (rule.mixedReference?.imageVideo !== true) {
    return "This model does not support mixed image and video references.";
  }

  // Models without explicit mixed limits retain the legacy verified 1+1 behavior.
  const imageLimit = Math.max(1, Number(rule.mixedReference.maxImages || 1));
  const videoLimit = Math.max(1, Number(rule.mixedReference.maxVideos || 1));
  if (counts.image > imageLimit || counts.video > videoLimit) {
    return `Reference limit reached for mixed media. This model supports up to ${imageLimit} images and ${videoLimit} videos.`;
  }
  return "";
}

function getAudioCombinationIssue(rule: VideoModelRule, counts: ReferenceCountMap) {
  if (counts.audio <= 0) return "";
  const capability = rule.audioReference;
  if (!capability?.enabled) return "This model does not support audio references.";
  if (counts.image > 0 && counts.video > 0) {
    return rule.mixedReference?.imageVideoAudio === true
      ? ""
      : "This model does not support mixed image, video, and audio references.";
  }
  if (counts.image > 0) {
    if (rule.mixedReference?.imageAudio !== true) return "This model does not support mixed image and audio references.";
    const max = Math.max(0, Number(capability.maxMixedImages || 0));
    if (!max || counts.image > max) return `This model supports Audio Reference with up to ${max} image${max === 1 ? "" : "s"}.`;
    return "";
  }
  if (counts.video > 0) {
    if (rule.mixedReference?.videoAudio !== true) return "This model does not support mixed video and audio references.";
    const max = Math.max(0, Number(capability.maxMixedVideos || 0));
    if (!max || counts.video > max) return `This model supports Audio Reference with up to ${max} video${max === 1 ? "" : "s"}.`;
    return "";
  }
  if (capability.audioOnly !== true) return "This model requires one image with an Audio Reference.";
  return "";
}

function getAudioAssetIssue(rule: VideoModelRule, item: Pick<UploadMediaItem, "duration" | "mimeType" | "name" | "type">) {
  const capability = rule.audioReference;
  if (item.type !== "audio" || !capability?.enabled) return "";
  const extension = item.name.split(".").pop()?.toLowerCase() || "";
  const mimeType = String(item.mimeType || "").toLowerCase();
  if ((extension && !capability.formats.includes(extension)) ||
      (mimeType && !capability.mimeTypes.includes(mimeType))) {
    return `Audio Reference accepts ${capability.formats.map((value) => value.toUpperCase()).join(" or ")} files only.`;
  }
  const duration = Number(item.duration);
  if (Number.isFinite(duration) && duration > 0 &&
      (duration < capability.minDurationSeconds || duration > capability.maxDurationSeconds)) {
    return `Audio Reference must be ${capability.minDurationSeconds}-${capability.maxDurationSeconds} seconds.`;
  }
  return "";
}

function uniqueReferenceItems(items: UploadMediaItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = getCanonicalReferenceIdentity(item);
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
  return allowedTypes.flatMap((type) => {
    if (type === "audio" && rule.audioReference?.enabled && rule.audioReference.mimeTypes.length) {
      return rule.audioReference.mimeTypes;
    }
    return [`${type}/*`];
  }).join(",");
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

export function normalizeAudioReferenceBindingsForRule(rule: VideoModelRule, items: UploadMediaItem[]) {
  const withoutAudio = items.filter((item) => item.type !== "audio");
  if (!isReferenceTypeSupported(rule, "audio")) return withoutAudio;
  const audio = items.filter((item) => item.type === "audio").slice(0, getTypeLimit(rule, "audio"));
  if (audio.some((item) => getAudioAssetIssue(rule, item))) return withoutAudio;
  const candidate = [...withoutAudio, ...audio];
  return getAudioCombinationIssue(rule, countMediaTypes(candidate)) ? withoutAudio : candidate;
}

export function validateFilesForReferenceRule(rule: VideoModelRule, files: File[], currentItems: UploadMediaItem[] = []) {
  const unsupported = files.find((file) => !isReferenceTypeSupported(rule, getFileTypeFromFile(file, "media")));
  if (unsupported) {
    const type = getFileTypeFromFile(unsupported, "media");
    return getUnsupportedReferenceTypeReason(rule, type);
  }
  const invalidAudio = files.find((file) => {
    if (getFileTypeFromFile(file, "media") !== "audio" || !rule.audioReference?.enabled) return false;
    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    return !rule.audioReference.formats.includes(extension) || !rule.audioReference.mimeTypes.includes(file.type.toLowerCase());
  });
  if (invalidAudio) return `Audio Reference accepts ${rule.audioReference?.formats.map((value) => value.toUpperCase()).join(" or ")} files only.`;

  const combinedCounts = countMediaTypes([
    ...currentItems,
    ...files.map((file) => ({ type: getFileTypeFromFile(file, "media") })),
  ]);
  const mixedIssue = getMixedImageVideoIssue(rule, combinedCounts);
  if (mixedIssue) return mixedIssue;
  const audioCombinationIssue = getAudioCombinationIssue(rule, combinedCounts);
  if (audioCombinationIssue) return audioCombinationIssue;
  const overLimitType = (["image", "video", "audio"] as UploadMediaType[]).find(
    (type) => combinedCounts[type] > getTypeLimit(rule, type),
  );
  if (overLimitType) {
    return `Reference limit reached for this model. It supports up to ${getTypeLimit(rule, overLimitType)} ${mediaTypeLabels[overLimitType]}.`;
  }
  if (currentItems.length + files.length > getTotalLimit(rule)) {
    return `Reference limit reached for this model. It supports up to ${getTotalLimit(rule)} media items.`;
  }
  return "";
}

export function validateReferenceSelectionForRule(
  rule: VideoModelRule,
  currentItems: UploadMediaItem[],
  nextItems: UploadMediaItem[],
  generateAudio = false,
) {
  const uniqueCurrent = uniqueReferenceItems(currentItems);
  const currentKeys = new Set(uniqueCurrent.map(getCanonicalReferenceIdentity));
  const uniqueNext = uniqueReferenceItems(nextItems).filter((item) => !currentKeys.has(getCanonicalReferenceIdentity(item)));
  const unsupported = uniqueNext.find((item) => !isReferenceTypeSupported(rule, item.type));

  if (unsupported) return getUnsupportedReferenceTypeReason(rule, unsupported.type);

  const combined = [...uniqueCurrent, ...uniqueNext];
  // Existing legacy references keep final readiness fail-closed, but must not
  // misclassify a newly selected canonical Asset as legacy. Picker candidate
  // identity is checked here; full-draft readiness calls this with no current
  // items and still validates every reference.
  if (uniqueNext.some((item) => !isCanonicalReferenceItem(item))) {
    return LEGACY_REFERENCE_REUPLOAD_REQUIRED;
  }
  const totalLimit = getTotalLimit(rule);

  if (totalLimit >= 0 && combined.length > totalLimit) {
    return `Reference limit reached for this model. It supports up to ${totalLimit} media item${totalLimit === 1 ? "" : "s"}.`;
  }

  const counts = countMediaTypes(combined);
  const generatedAudioIssue = getGeneratedAudioReferenceIssue(rule, generateAudio, combined);
  if (generatedAudioIssue) return generatedAudioIssue;
  const invalidAudioAsset = combined.find((item) => getAudioAssetIssue(rule, item));
  if (invalidAudioAsset) return getAudioAssetIssue(rule, invalidAudioAsset);
  const mixedIssue = getMixedImageVideoIssue(rule, counts);
  if (mixedIssue) return mixedIssue;
  const audioCombinationIssue = getAudioCombinationIssue(rule, counts);
  if (audioCombinationIssue) return audioCombinationIssue;
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

    if (!isCanonicalReferenceItem(item)) itemIssues.push(LEGACY_REFERENCE_REUPLOAD_REQUIRED);

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

  const unique = uniqueReferenceItems(items);
  const combinedCounts = countMediaTypes(unique);
  const mixedIssue = getMixedImageVideoIssue(rule, combinedCounts);
  if (mixedIssue) {
    unique.forEach((item) => issues.set(item.id, [...(issues.get(item.id) || []), mixedIssue]));
  }
  const audioCombinationIssue = getAudioCombinationIssue(rule, combinedCounts);
  if (audioCombinationIssue) {
    unique.forEach((item) => issues.set(item.id, [...(issues.get(item.id) || []), audioCombinationIssue]));
  }
  unique.filter((item) => item.type === "audio").forEach((item) => {
    const issue = getAudioAssetIssue(rule, item);
    if (issue) issues.set(item.id, [...(issues.get(item.id) || []), issue]);
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
