"use client";

import { useEffect, useState } from "react";
import { studioProjectGoalLabel, type StudioProjectGoalsBundle } from "@/features/studio/capabilities/studioProjectGoals";
import { getStudioProjectGoals } from "@/lib/studio-project-goals-api";

export function StudioProjectGoalsPanel({ projectId }: { projectId: string }) {
  const [bundleState, setBundleState] = useState<{ projectId: string; bundle: StudioProjectGoalsBundle } | null>(null);
  const [errorState, setErrorState] = useState<{ projectId: string; message: string } | null>(null);
  const bundle = bundleState?.projectId === projectId ? bundleState.bundle : null;
  const error = errorState?.projectId === projectId ? errorState.message : "";

  useEffect(() => {
    let active = true;
    void getStudioProjectGoals(projectId)
      .then((value) => { if (active) { setBundleState({ projectId, bundle: value }); setErrorState(null); } })
      .catch(() => { if (active) setErrorState({ projectId, message: "Project Goals are temporarily unavailable." }); });
    return () => { active = false; };
  }, [projectId]);

  return (
    <section className="studio-project-goals" aria-label="Project Goals Panel">
      <header>
        <div><span>Mission alignment</span><strong>Project Goals</strong></div>
        <small>Review only</small>
      </header>
      {bundle ? (
        <>
          <div className="studio-project-goals-mission">
            <div><span>Mission</span><strong>{bundle.mission.mission}</strong></div>
            <div><span>Vision</span><strong>{bundle.mission.vision}</strong></div>
          </div>
          <div className="studio-project-goals-list">
            {bundle.goals.map((goal) => (
              <article key={goal.goalId}>
                <div><span>{studioProjectGoalLabel(goal.type)}</span><strong>{goal.priority}</strong></div>
                <p>{goal.description}</p>
                <small>{goal.status}</small>
              </article>
            ))}
          </div>
          <div className="studio-project-goals-alignment" aria-label="Goal Alignment summary">
            <span>Aligned {bundle.summary.aligned}</span>
            <span>Partial {bundle.summary.partial}</span>
            <span>Misaligned {bundle.summary.misaligned}</span>
          </div>
        </>
      ) : error ? <span className="studio-project-copilot-error" role="alert">{error}</span> : <span className="studio-project-copilot-empty">Analyzing mission and goal alignment...</span>}
      <small>Every Copilot suggestion carries Mission and Goal Alignment metadata. Changes require Preview and Confirm to create a Goal Review Draft; goals, project direction, Workflow, execution, Provider, and Credits remain unchanged.</small>
    </section>
  );
}
