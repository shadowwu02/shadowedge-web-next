export type StudioExperienceMode = "CREATOR" | "ADVANCED";

export const STUDIO_EXPERIENCE_MODE_STORAGE_KEY = "shadowedge_studio_experience_mode_v1";

export function readStudioExperienceMode(): StudioExperienceMode {
  if (typeof window === "undefined") return "CREATOR";
  try {
    return window.localStorage.getItem(STUDIO_EXPERIENCE_MODE_STORAGE_KEY) === "ADVANCED"
      ? "ADVANCED"
      : "CREATOR";
  } catch {
    return "CREATOR";
  }
}

export function saveStudioExperienceMode(mode: StudioExperienceMode) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STUDIO_EXPERIENCE_MODE_STORAGE_KEY, mode);
  } catch {
    // The mode is a display preference only, so storage failures are non-fatal.
  }
}
