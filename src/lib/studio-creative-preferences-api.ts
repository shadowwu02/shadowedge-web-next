import { apiRequest } from "@/lib/api";
import type { StudioCreativePreferenceProfile } from "@/features/studio/capabilities/studioCreativePreference";

export async function getStudioCreativePreferences() {
  const envelope = await apiRequest<{ profile: StudioCreativePreferenceProfile }>("/api/user/creative-preferences");
  if (!Array.isArray(envelope.data?.profile?.preferences)) throw new Error("Creative Preferences were not returned.");
  return envelope.data.profile;
}

export async function deleteStudioCreativePreference(preferenceId: string) {
  const envelope = await apiRequest<{ deleted: true; preferenceId: string }>(
    `/api/user/creative-preferences/${encodeURIComponent(preferenceId)}`,
    { method: "DELETE" },
  );
  if (!envelope.data?.deleted) throw new Error("Creative Preference was not deleted.");
  return envelope.data;
}
