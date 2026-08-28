import type { UploadMediaType } from "@/types/video";

export type AudioUploadContract = Readonly<{
  version: string;
  extensions: readonly string[];
  mimeTypes: readonly string[];
}>;

let runtimeContract: AudioUploadContract | null = null;

function stringList(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => String(item || "").trim().toLowerCase()).filter(Boolean)
    : [];
}

export function configureAudioUploadContract(value: unknown) {
  const source = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const version = String(source.version || "").trim();
  const extensions = stringList(source.extensions);
  const mimeTypes = stringList(source.mimeTypes);
  runtimeContract = version && extensions.length && mimeTypes.length
    ? Object.freeze({ version, extensions: Object.freeze(extensions), mimeTypes: Object.freeze(mimeTypes) })
    : null;
  return runtimeContract;
}

export function getAudioUploadContract() {
  return runtimeContract;
}

export function getMediaLibraryUploadTypes(): UploadMediaType[] {
  return runtimeContract ? ["image", "video", "audio"] : ["image", "video"];
}

export function getMediaLibraryUploadAccept() {
  const audio = runtimeContract
    ? [...runtimeContract.extensions, ...runtimeContract.mimeTypes]
    : [];
  return ["image/*", "video/*", ...audio].join(",");
}

export function validateAudioUploadFile(file: Pick<File, "name" | "type">) {
  const extension = `.${String(file.name || "").split(".").pop()?.toLowerCase() || ""}`;
  const mimeType = String(file.type || "").split(";", 1)[0].trim().toLowerCase();
  const looksLikeAudio = mimeType.startsWith("audio/") || [".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac"].includes(extension);
  if (!looksLikeAudio) return "";
  if (!runtimeContract) return "Audio upload capability is temporarily unavailable.";
  if (!runtimeContract.extensions.includes(extension) || !runtimeContract.mimeTypes.includes(mimeType)) {
    return "Audio uploads support MP3, WAV, and M4A files only.";
  }
  return "";
}
