import type { VideoTaskRecord } from "@/types/video";

export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function isVideoActiveStatus(status: string | undefined | null) {
  const value = String(status || "").toLowerCase();
  return [
    "created",
    "queued",
    "pending",
    "submitted",
    "submitting",
    "starting",
    "waiting",
    "processing",
    "running",
    "generating",
    "finalizing",
    "long_running",
  ].includes(value);
}

export function isVideoCompletedStatus(status: string | undefined | null) {
  const value = String(status || "").toLowerCase();
  return ["completed", "success", "succeeded", "done"].includes(value);
}

export function isVideoFailedStatus(status: string | undefined | null) {
  const value = String(status || "").toLowerCase();
  return ["failed", "error", "canceled", "cancelled", "rejected"].includes(value);
}

export function getVideoOutputUrl(record: Pick<VideoTaskRecord, "videoUrl" | "outputUrl" | "outputUrls"> | null | undefined) {
  return record?.videoUrl || record?.outputUrl || record?.outputUrls?.[0] || "";
}

export function formatCredits(value: number | undefined | null) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return "--";
  return String(Number(value));
}

export function formatTime(value: string | number | undefined) {
  if (!value) return "--";
  const date = typeof value === "number" ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString();
}
