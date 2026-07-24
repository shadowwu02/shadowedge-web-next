"use client";

import { useEffect, useState } from "react";
import {
  studioShotTypeLabel,
  type StudioCreativeShot,
  type StudioCreativeStoryboard,
  type StudioShotDraft,
  type StudioShotGenerationDraft,
} from "@/features/studio/capabilities/studioStoryboard";
import { useStudioStore } from "@/features/studio/store/studioStore";
import {
  confirmStudioShotDraft,
  confirmStudioShotGenerationDraft,
  createStudioShotGenerationDraft,
  getStudioSceneShots,
  getStudioStoryboards,
  previewStudioShotDraft,
} from "@/lib/studio-storyboard-api";

export function StudioStoryboardPanel() {
  const projectId = useStudioStore((state) => state.projectId);
  const [bundle, setBundle] = useState<{ projectId: string; storyboards: readonly StudioCreativeStoryboard[]; error: string } | null>(null);
  const [selectedStoryboardId, setSelectedStoryboardId] = useState<string | null>(null);
  const [sceneShots, setSceneShots] = useState<{ sceneId: string; shots: readonly StudioCreativeShot[] } | null>(null);
  const [shotDraft, setShotDraft] = useState<StudioShotDraft | null>(null);
  const [generationDraft, setGenerationDraft] = useState<StudioShotGenerationDraft | null>(null);
  const [busyShotId, setBusyShotId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!projectId) return;
    const controller = new AbortController();
    void getStudioStoryboards(projectId, controller.signal).then((value) => {
      setBundle({ projectId, storyboards: value.storyboards, error: "" });
      setSelectedStoryboardId((current) =>
        value.storyboards.some((storyboard) => storyboard.storyboardId === current)
          ? current
          : value.storyboards[0]?.storyboardId || null,
      );
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) {
        setBundle({ projectId, storyboards: [], error: reason instanceof Error ? reason.message : "Storyboard Workspace is unavailable." });
      }
    });
    return () => controller.abort();
  }, [projectId]);

  const storyboards = bundle?.projectId === projectId ? bundle.storyboards : [];
  const selectedStoryboard = storyboards.find((storyboard) => storyboard.storyboardId === selectedStoryboardId) || storyboards[0] || null;
  const selectedSceneId = selectedStoryboard?.sceneId || null;

  useEffect(() => {
    if (!selectedSceneId) return;
    const controller = new AbortController();
    void getStudioSceneShots(selectedSceneId, controller.signal).then((value) => {
      setSceneShots({ sceneId: value.sceneId, shots: value.shots });
    }).catch(() => undefined);
    return () => controller.abort();
  }, [selectedSceneId]);

  const shots = sceneShots && selectedSceneId && sceneShots.sceneId === selectedSceneId
    ? sceneShots.shots
    : selectedStoryboard?.shots || [];

  const previewShotDraft = async (shot: StudioCreativeShot) => {
    setBusyShotId(shot.shotId);
    setMessage("");
    try {
      const result = await previewStudioShotDraft(shot.sceneId, shot.shotId);
      setShotDraft(result.draft);
      setMessage("SHOT_DRAFT preview ready. Timeline remains unchanged.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Could not preview the Shot Draft.");
    } finally {
      setBusyShotId(null);
    }
  };

  const confirmShotDraft = async () => {
    if (!shotDraft) return;
    setBusyShotId(shotDraft.shotId);
    setMessage("");
    try {
      const result = await confirmStudioShotDraft(shotDraft.sceneId, shotDraft.shotId, shotDraft.draftId);
      setShotDraft(result.draft);
      setMessage("SHOT_DRAFT created. No Timeline, Agent, or Runtime action was started.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Could not confirm the Shot Draft.");
    } finally {
      setBusyShotId(null);
    }
  };

  const createGenerationDraft = async (shot: StudioCreativeShot) => {
    setBusyShotId(shot.shotId);
    setMessage("");
    try {
      const result = await createStudioShotGenerationDraft(shot.shotId);
      setGenerationDraft(result.draft);
      setMessage(
        result.draft.status === "CONFIRMED"
          ? "Existing Video Workflow Draft is ready. Execution still requires a separate confirmation."
          : "Generation Draft preview ready. No Job, Provider call, or Credits action occurred.",
      );
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Could not create the Generation Draft preview.");
    } finally {
      setBusyShotId(null);
    }
  };

  const confirmGenerationDraft = async () => {
    if (!generationDraft) return;
    setBusyShotId(generationDraft.shotId);
    setMessage("");
    try {
      const result = await confirmStudioShotGenerationDraft(generationDraft.shotId, generationDraft.draftId);
      setGenerationDraft(result.draft);
      setMessage("Existing Video Workflow Draft created. Runtime execution remains unstarted and separately gated.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Could not confirm the Generation Draft.");
    } finally {
      setBusyShotId(null);
    }
  };

  return (
    <section className="studio-storyboard-workspace" id="storyboard-workspace" aria-label="Storyboard Workspace">
      <header>
        <div>
          <span>AI Scene Planning</span>
          <h2>Storyboard Workspace</h2>
          <p>Scene → Storyboard → Shot → Generation Draft</p>
        </div>
        <small>Draft only · no Timeline edits, Job creation, Provider calls, or Credits</small>
      </header>

      {!projectId ? (
        <div className="studio-storyboard-empty">Open a saved project to plan its Scenes and Shots.</div>
      ) : bundle?.projectId !== projectId ? (
        <div className="studio-storyboard-empty">Building Storyboards from the Unified Timeline…</div>
      ) : bundle.error ? (
        <div className="studio-storyboard-error" role="status">{bundle.error}</div>
      ) : !storyboards.length ? (
        <div className="studio-storyboard-empty">Add a visual Scene to create its first reference-only Storyboard.</div>
      ) : (
        <div className="studio-storyboard-layout">
          <nav aria-label="Storyboard scenes">
            {storyboards.map((storyboard) => (
              <button
                className={storyboard.storyboardId === selectedStoryboard?.storyboardId ? "is-active" : ""}
                key={storyboard.storyboardId}
                onClick={() => {
                  setSelectedStoryboardId(storyboard.storyboardId);
                  setShotDraft(null);
                  setGenerationDraft(null);
                  setMessage("");
                }}
                type="button"
              >
                <strong>{storyboard.sceneName}</strong>
                <span>{storyboard.shots.length} shots</span>
                <small>{storyboard.agentSource}</small>
              </button>
            ))}
          </nav>

          <div className="studio-storyboard-shot-list" aria-label="Shot cards">
            {shots.map((shot, index) => (
              <article className="studio-storyboard-shot" key={shot.shotId}>
                <header>
                  <span>Shot {String(index + 1).padStart(2, "0")}</span>
                  <b>{studioShotTypeLabel(shot.shotType)}</b>
                </header>
                <h3>{shot.description}</h3>
                <dl>
                  <div><dt>Camera</dt><dd>{shot.camera}</dd></div>
                  <div><dt>Duration</dt><dd>{shot.duration}s</dd></div>
                  <div><dt>Timeline</dt><dd>{shot.timelinePlaceholder.status.replaceAll("_", " ")}</dd></div>
                </dl>
                <div className="studio-storyboard-references">
                  <strong>References</strong>
                  <span>{shot.references.length ? shot.references.join(" · ") : "No bound reference"}</span>
                </div>
                <p>{shot.promptDraft.text}</p>
                <div className="studio-storyboard-shot-actions">
                  <button disabled={Boolean(busyShotId)} onClick={() => void previewShotDraft(shot)} type="button">
                    {busyShotId === shot.shotId ? "Preparing…" : "Preview SHOT_DRAFT"}
                  </button>
                  <button disabled={Boolean(busyShotId)} onClick={() => void createGenerationDraft(shot)} type="button">
                    {busyShotId === shot.shotId ? "Preparing…" : "Create Generation Draft"}
                  </button>
                </div>
              </article>
            ))}
          </div>

          <aside className="studio-storyboard-draft" aria-label="Storyboard Draft Preview">
            <section className="studio-storyboard-draft-section">
              <span>Copilot Shot Planning</span>
              {shotDraft ? (
                <>
                  <strong>{shotDraft.status === "CONFIRMED" ? "SHOT_DRAFT confirmed" : "Preview ready"}</strong>
                  <p>{shotDraft.reason}</p>
                  <dl>
                    <div><dt>Camera</dt><dd>{shotDraft.proposal.camera}</dd></div>
                    <div><dt>Duration</dt><dd>{shotDraft.proposal.duration}s</dd></div>
                    <div><dt>Impact</dt><dd>Placeholder reference only</dd></div>
                  </dl>
                  <blockquote>{shotDraft.proposal.prompt}</blockquote>
                  {shotDraft.status === "PREVIEWED" ? (
                    <button disabled={Boolean(busyShotId)} onClick={() => void confirmShotDraft()} type="button">Confirm Shot Draft</button>
                  ) : <small>Draft created. Existing Timeline remains unchanged.</small>}
                </>
              ) : (
                <p>Preview a Shot Draft to review its prompt and Timeline placeholder.</p>
              )}
            </section>

            <section className="studio-storyboard-draft-section" aria-label="Generation Draft Panel">
              <span>Generation Draft Panel</span>
              {generationDraft ? (
                <>
                  <strong>{generationDraft.modelSuggestion.displayName} · {generationDraft.confidence}</strong>
                  <p>{generationDraft.modelSuggestion.reason}</p>
                  <dl>
                    <div><dt>Scope</dt><dd>{generationDraft.parameters.duration}s · {generationDraft.parameters.resolution} · {generationDraft.parameters.ratio}</dd></div>
                    <div><dt>Cost</dt><dd>{generationDraft.estimatedCost.kind} · {generationDraft.estimatedCost.shadowCredits} Credits</dd></div>
                    <div><dt>Gate</dt><dd>{generationDraft.modelSuggestion.availability} · {generationDraft.modelSuggestion.costStatus}</dd></div>
                  </dl>
                  <blockquote>{generationDraft.prompt}</blockquote>
                  <div className="studio-storyboard-generation-references" aria-label="Reference bindings">
                    {generationDraft.references.map((reference) => (
                      <span key={reference.referenceId}>{reference.type} · bound</span>
                    ))}
                  </div>
                  {generationDraft.status === "PREVIEWED" ? (
                    <button disabled={Boolean(busyShotId)} onClick={() => void confirmGenerationDraft()} type="button">
                      Confirm Generation Draft
                    </button>
                  ) : (
                    <small>Video Workflow Draft ready. A separate Execution Confirm is still required.</small>
                  )}
                </>
              ) : (
                <p>Create Generation Draft to preview the recommended model, verified scope, references, and estimated cost.</p>
              )}
            </section>
            {message ? <small role="status">{message}</small> : null}
          </aside>
        </div>
      )}
    </section>
  );
}
