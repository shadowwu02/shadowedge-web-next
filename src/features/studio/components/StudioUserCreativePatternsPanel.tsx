"use client";

import { useEffect, useState } from "react";
import {
  studioCreativeExperienceLabel,
  type StudioUserCreativePatterns,
} from "@/features/studio/capabilities/studioUserCreativeExperience";
import { getStudioUserCreativePatterns } from "@/lib/studio-user-creative-patterns-api";

export function StudioUserCreativePatternsPanel({ projectId }: { projectId: string }) {
  const [bundleState, setBundleState] = useState<{ projectId: string; bundle: StudioUserCreativePatterns } | null>(null);
  const [errorState, setErrorState] = useState<{ projectId: string; message: string } | null>(null);
  const bundle = bundleState?.projectId === projectId ? bundleState.bundle : null;
  const error = errorState?.projectId === projectId ? errorState.message : "";

  useEffect(() => {
    let active = true;
    void getStudioUserCreativePatterns(projectId)
      .then((value) => {
        if (!active) return;
        setBundleState({ projectId, bundle: value });
        setErrorState(null);
      })
      .catch(() => { if (active) setErrorState({ projectId, message: "Creative Patterns are temporarily unavailable." }); });
    return () => { active = false; };
  }, [projectId]);

  return (
    <section className="studio-user-creative-patterns" aria-label="Your Creative Patterns">
      <header>
        <div><span>User-scoped learning</span><strong>Your Creative Patterns</strong></div>
        <small>{bundle ? `${bundle.summary.highConfidence} high confidence` : "Private"}</small>
      </header>
      {bundle ? (
        bundle.experiences.length ? (
          <div className="studio-user-creative-patterns-list">
            {bundle.experiences.map((experience) => (
              <article key={experience.experienceId}>
                <header>
                  <strong>{studioCreativeExperienceLabel(experience.type)}</strong>
                  <span>{experience.confidence}</span>
                </header>
                <p>{experience.summary}</p>
                <small>From {experience.sourceProjectName}</small>
                <small>Signal: {experience.signal.replaceAll("_", " ")}</small>
              </article>
            ))}
          </div>
        ) : <span className="studio-project-copilot-empty">No verified patterns from other projects yet.</span>
      ) : error ? <span className="studio-project-copilot-error" role="alert">{error}</span> : <span className="studio-project-copilot-empty">Reviewing your verified project outcomes...</span>}
      <small>Only your completed, successful project evidence is used. Patterns create suggestions only and never copy a project, edit the current project, execute, call a Provider, or charge Credits.</small>
    </section>
  );
}
