import type { UploadMediaItem, UploadMediaType } from "@/types/video";

export const UPLOAD_LIMITS: Record<string, number> = {
  media: 12,
  reference_images: 9,
  reference_videos: 3,
  reference_audios: 3,
  image: 1,
  start_image: 1,
  end_image: 1,
  first_frame: 1,
  last_frame: 1,
  last_frame_image: 1,
  video: 1,
  reference_video: 1,
  first_clip: 1,
};

export const UPLOAD_TYPE_LIMITS: Record<string, Partial<Record<UploadMediaType, number>>> = {
  media: {
    image: 9,
    video: 3,
    audio: 3,
  },
  reference_images: {
    image: 9,
  },
  reference_videos: {
    video: 3,
  },
  reference_audios: {
    audio: 3,
  },
};

const imageExt = /\.(png|jpg|jpeg|webp|gif|bmp|heic|heif)(\?|$)/i;
const videoExt = /\.(mp4|mov|webm|m4v|avi|mkv)(\?|$)/i;
const audioExt = /\.(mp3|wav|m4a|aac|ogg|flac)(\?|$)/i;

export function isRemoteMediaUrl(url: string) {
  return /^https?:\/\//i.test(String(url || "").trim());
}

export function isTransientMediaUrl(url: string) {
  const value = String(url || "").trim();
  return value.startsWith("blob:") || value.startsWith("data:");
}

export function getSlotAccept(slot = "media") {
  const key = slot.toLowerCase();
  if (key === "media") return "image/*,video/*,audio/*";
  if (key.includes("audio")) return "audio/*";
  if (key.includes("video") || key.includes("clip")) return "video/*";
  return "image/*";
}

export function getFileTypeFromFile(file: File, fallbackSlot = ""): UploadMediaType {
  const mime = String(file.type || "").toLowerCase();
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";

  const name = String(file.name || "").toLowerCase();
  if (imageExt.test(name)) return "image";
  if (videoExt.test(name)) return "video";
  if (audioExt.test(name)) return "audio";

  const slot = fallbackSlot.toLowerCase();
  if (slot.includes("audio")) return "audio";
  if (slot.includes("video") || slot.includes("clip")) return "video";
  return "image";
}

export function getMediaTypeFromUrl(url: string, fallback: unknown = ""): UploadMediaType {
  const hint = String(fallback || "").toLowerCase();
  if (hint.includes("audio")) return "audio";
  if (hint.includes("video")) return "video";
  if (hint.includes("image")) return "image";

  const value = String(url || "").toLowerCase();
  if (audioExt.test(value)) return "audio";
  if (videoExt.test(value)) return "video";
  return "image";
}

export function slotAllowsAssetType(slot = "media", type: UploadMediaType) {
  const realSlot = slot.toLowerCase();
  if (realSlot === "media") return ["image", "video", "audio"].includes(type);
  if (realSlot.includes("audio")) return type === "audio";
  if (realSlot.includes("video") || realSlot.includes("clip")) return type === "video";
  return type === "image";
}

export function validateFilesForSlot(slot: string, files: File[]) {
  const invalid = files.find((file) => !slotAllowsAssetType(slot, getFileTypeFromFile(file, slot)));
  if (!invalid) return "";

  if (slot.toLowerCase() === "media") {
    return "Media only accepts image, video, or audio files.";
  }

  const accept = getSlotAccept(slot);
  if (accept.startsWith("audio")) return "This slot only accepts audio files.";
  if (accept.startsWith("video")) return "This slot only accepts video files.";
  return "This slot only accepts image files.";
}

export function countAssetTypes(items: Array<Pick<UploadMediaItem, "type">>) {
  return items.reduce(
    (counts, item) => {
      if (item.type === "image") counts.image += 1;
      if (item.type === "video") counts.video += 1;
      if (item.type === "audio") counts.audio += 1;
      return counts;
    },
    { image: 0, video: 0, audio: 0 },
  );
}

export function formatUploadLimitMessage(slot: string, type: UploadMediaType, limit: number) {
  const label = type === "audio" ? "audio files" : type === "video" ? "videos" : "images";
  if (slot === "media") return `Reference media supports up to ${limit} ${label}.`;
  return `This slot supports up to ${limit} ${label}.`;
}

export function filterFilesByUploadTypeLimits(slot: string, currentItems: UploadMediaItem[], files: File[]) {
  const limits = UPLOAD_TYPE_LIMITS[slot];
  if (!limits) {
    return {
      files,
      error: "",
      rejected: [] as File[],
    };
  }

  const counts = countAssetTypes(currentItems);
  const accepted: File[] = [];
  const rejected: File[] = [];
  let error = "";

  files.forEach((file) => {
    const type = getFileTypeFromFile(file, slot);
    const limit = Number(limits[type] || 0);
    if (!limit) {
      accepted.push(file);
      return;
    }

    if (counts[type] >= limit) {
      rejected.push(file);
      error ||= formatUploadLimitMessage(slot, type, limit);
      return;
    }

    counts[type] += 1;
    accepted.push(file);
  });

  return { files: accepted, error, rejected };
}

export function validateSelectedMediaForSlot(slot: string, currentItems: UploadMediaItem[], nextItems: UploadMediaItem[]) {
  const combined = [...currentItems, ...nextItems];
  const totalLimit = UPLOAD_LIMITS[slot] || 12;

  if (combined.length > totalLimit) {
    return `This slot supports up to ${totalLimit} media items.`;
  }

  const unsupported = nextItems.find((item) => !slotAllowsAssetType(slot, item.type));
  if (unsupported) {
    return "Unsupported file type for this slot.";
  }

  const typeLimits = UPLOAD_TYPE_LIMITS[slot];
  if (!typeLimits) return "";

  const counts = countAssetTypes(combined);
  const overLimit = (Object.keys(typeLimits) as UploadMediaType[]).find((type) => {
    const limit = Number(typeLimits[type] || 0);
    return limit > 0 && counts[type] > limit;
  });

  return overLimit ? formatUploadLimitMessage(slot, overLimit, Number(typeLimits[overLimit] || 0)) : "";
}
