"use client";

import { useState } from "react";
import type { StudioAIProjectDraft } from "@/features/studio/capabilities/studioProjectInitialization";
import { useStudioApiIntegration } from "@/features/studio/components/StudioApiIntegration";
import {
  confirmStudioProjectInitialization,
  previewStudioProjectInitialization,
} from "@/lib/studio-project-initialization-api";

export function StudioProjectInitializationAssistant() {
  const { featureStatus } = useStudioApiIntegration();
  const availability = featureStatus("project_initialization_assistant");
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [brandContext, setBrandContext] = useState("");
  const [goal, setGoal] = useState("");
  const [duration, setDuration] = useState("");
  const [ratio, setRatio] = useState("16:9");
  const [draft, setDraft] = useState<StudioAIProjectDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function preview() {
    if (!prompt.trim() || availability !== "READY") return;
    setBusy(true);
    setMessage("Creating a reviewable Project Draft…");
    try {
      const value = await previewStudioProjectInitialization({
        prompt: prompt.trim(),
        brandContext: brandContext.trim() || undefined,
        goal: goal.trim() || undefined,
        constraints: {
          ...(duration.trim() ? { duration: duration.trim() } : {}),
          ratio,
        },
      });
      setDraft(value);
      setMessage("Preview ready. No formal Studio project was created.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Project Initialization Preview failed.");
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!draft || draft.status !== "PREVIEW") return;
    setBusy(true);
    setMessage("Confirming Project Draft metadata only…");
    try {
      const value = await confirmStudioProjectInitialization(draft.draftId);
      setDraft(value);
      setMessage("Project Draft confirmed. Create the formal Studio project separately when ready.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Project Draft confirmation failed.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <section className="studio-project-init-entry" aria-label="AI Project Initialization">
        <div>
          <span>NEW CREATIVE PROJECT</span>
          <strong>Start with Copilot</strong>
          <p>Describe your idea and review a complete Goal, Strategy, Canvas, Roadmap, and Timeline Draft.</p>
        </div>
        <button disabled={availability !== "READY"} onClick={() => setOpen(true)} type="button">
          {availability === "READY" ? "Start with Copilot" : "Assistant unavailable"}
        </button>
      </section>
    );
  }

  return (
    <section className="studio-project-init" aria-label="Start with Copilot">
      <header>
        <div><span>PROJECT INITIALIZATION</span><strong>Start with Copilot</strong></div>
        <button onClick={() => setOpen(false)} type="button">Close</button>
      </header>
      <div className="studio-project-init-form">
        <label>
          What do you want to create?
          <textarea onChange={(event) => setPrompt(event.target.value)} placeholder="A cinematic launch video for our new product…" value={prompt} />
        </label>
        <label>Brand context<input onChange={(event) => setBrandContext(event.target.value)} placeholder="Style, audience, tone" value={brandContext} /></label>
        <label>Project goal<input onChange={(event) => setGoal(event.target.value)} placeholder="What should this project achieve?" value={goal} /></label>
        <div>
          <label>Duration<input onChange={(event) => setDuration(event.target.value)} placeholder="30s" value={duration} /></label>
          <label>Ratio<select onChange={(event) => setRatio(event.target.value)} value={ratio}><option>16:9</option><option>9:16</option><option>1:1</option></select></label>
        </div>
        <button disabled={!prompt.trim() || busy} onClick={() => void preview()} type="button">Create Project Draft Preview</button>
      </div>
      {draft ? (
        <section className="studio-project-init-preview" aria-label="AI Project Draft Preview">
          <header>
            <div><span>{draft.status}</span><strong>{draft.projectGoal.description}</strong></div>
            <b className={`is-${draft.confidence.toLowerCase()}`}>{draft.confidence} CONFIDENCE</b>
          </header>
          <div className="studio-project-init-grid">
            <article><span>Project Goal</span><strong>{draft.projectGoal.type.replaceAll("_", " ")}</strong><p>{draft.projectGoal.description}</p></article>
            <article><span>Strategy</span><strong>{draft.strategy.type.replaceAll("_", " ")}</strong><p>{draft.strategy.recommendations[0]}</p></article>
            <article><span>Canvas</span><strong>{draft.canvasGraph.nodes.length} nodes · {draft.canvasGraph.edges.length} edges</strong><p>{draft.canvasGraph.nodes.map((node) => node.nodeType).join(" → ")}</p></article>
            <article><span>Timeline</span><strong>{draft.timelineStructure.scenes.length} Scene placeholder</strong><p>No Timeline data was modified.</p></article>
          </div>
          <div className="studio-project-init-roadmap">
            {draft.roadmap.phases.map((phase) => <article key={phase.phase}><span>{phase.phase}</span><p>{phase.goal}</p></article>)}
          </div>
          <section className="studio-project-init-evidence">
            <header><strong>Copilot Evidence</strong><span>{draft.evidence.length} references</span></header>
            {draft.evidence.map((item) => <article key={item.evidenceId}><b>{item.type.replaceAll("_", " ")}</b><p>{item.summary}</p><small>{item.confidence}</small></article>)}
          </section>
          {draft.status === "PREVIEW" ? (
            <button disabled={busy} onClick={() => void confirm()} type="button">Confirm Project Draft</button>
          ) : <p className="studio-project-init-confirmed">Project Draft confirmed · formal project not created</p>}
        </section>
      ) : null}
      {message ? <p className="studio-project-init-message" role="status">{message}</p> : null}
      <footer>Preview → Human Confirm → Project Draft only. No Workflow execution, generation, Provider call, or Credits action.</footer>
    </section>
  );
}
