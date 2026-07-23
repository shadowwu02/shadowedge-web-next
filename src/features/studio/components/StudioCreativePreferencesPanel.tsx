"use client";

import { useEffect, useState } from "react";
import {
  studioCreativePreferenceConfidenceLabel,
  studioCreativePreferenceLabel,
  type StudioCreativePreferenceProfile,
} from "@/features/studio/capabilities/studioCreativePreference";
import {
  deleteStudioCreativePreference,
  getStudioCreativePreferences,
} from "@/lib/studio-creative-preferences-api";

export function StudioCreativePreferencesPanel() {
  const [profile, setProfile] = useState<StudioCreativePreferenceProfile | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    const value = await getStudioCreativePreferences();
    setProfile(value);
    setError("");
  };

  useEffect(() => {
    let active = true;
    void getStudioCreativePreferences()
      .then((value) => { if (active) setProfile(value); })
      .catch(() => { if (active) setError("Creative Preferences are temporarily unavailable."); });
    return () => { active = false; };
  }, []);

  const remove = async (preferenceId: string) => {
    if (busy) return;
    setBusy(true);
    setMessage("");
    setError("");
    try {
      await deleteStudioCreativePreference(preferenceId);
      await load();
      setPendingDeleteId(null);
      setMessage("Preference removed from your profile.");
    } catch {
      setError("This preference could not be removed. No other profile data changed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="studio-creative-preferences" aria-label="My Creative Preferences">
      <header>
        <div><span>Personal creative identity</span><strong>My Creative Preferences</strong></div>
        <small>{profile ? studioCreativePreferenceConfidenceLabel(profile.confidence) : "Private"}</small>
      </header>
      {profile ? (
        profile.preferences.length ? (
          <div className="studio-creative-preferences-list">
            {profile.preferences.map((preference) => (
              <article key={preference.preferenceId}>
                <header>
                  <strong>{studioCreativePreferenceLabel(preference.type)}</strong>
                  <span>{studioCreativePreferenceConfidenceLabel(preference.confidence)}</span>
                </header>
                <p>{preference.value.replaceAll("_", " ")}</p>
                <small>Source: {preference.sources.map((source) => source.label).filter(Boolean).join(", ") || "Your confirmed history"}</small>
                {pendingDeleteId === preference.preferenceId ? (
                  <div className="studio-creative-preference-delete">
                    <span>Remove this preference from future suggestions?</span>
                    <button disabled={busy} onClick={() => void remove(preference.preferenceId)} type="button">{busy ? "Removing..." : "Confirm remove"}</button>
                    <button disabled={busy} onClick={() => setPendingDeleteId(null)} type="button">Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setPendingDeleteId(preference.preferenceId)} type="button">Remove</button>
                )}
              </article>
            ))}
          </div>
        ) : <span className="studio-project-copilot-empty">No reusable creative preferences yet. Explicit settings and successful confirmed choices can appear here.</span>
      ) : error ? <span className="studio-project-copilot-error" role="alert">{error}</span> : <span className="studio-project-copilot-empty">Reviewing your confirmed creative signals...</span>}
      {message ? <span className="studio-project-copilot-message" role="status">{message}</span> : null}
      {profile && error ? <span className="studio-project-copilot-error" role="alert">{error}</span> : null}
      <small>Preferences are separate from project experience and one-time strategies. You stay in control: Copilot never changes this profile, edits a project, executes, calls a Provider, or charges Credits automatically.</small>
    </section>
  );
}
