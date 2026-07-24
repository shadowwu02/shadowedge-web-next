"use client";

import { useEffect, useState } from "react";
import {
  studioShotTypeLabel,
  type StudioCreativeShot,
  type StudioCreativeStoryboard,
  type StudioShotDraft,
} from "@/features/studio/capabilities/studioStoryboard";
import { useStudioStore } from "@/features/studio/store/studioStore";
import {
  confirmStudioShotDraft,
  getStudioSceneShots,
  getStudioStoryboards,
  previewStudioShotDraft,
} from "@/lib/studio-storyboard-api";

export function StudioStoryboardPanel() {
  const projectId = useStudioStore((state) => state.projectId);
  const [bundle, setBundle] = useState<{ projectId: string; storyboards: readonly StudioCreativeStoryboard[]; error: string } | null>(null);
  const [selectedStoryboardId, setSelectedStoryboardId] = useState<string | null>(null);
  const [sceneShots, setSceneShots] = useState<{ sceneId: string; shots: readonly StudioCreativeShot[] } | null>(null);
  const [draft, setDraft] = useState<StudioShotDraft | null>(null);
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

  const previewDraft = async (shot: StudioCreativeShot) => {
    setBusyShotId(shot.shotId);
    setMessage("");
    try {
      const result = await previewStudioShotDraft(shot.sceneId, shot.shotId);
      setDraft(result.draft);
      setMessage("SHOT_DRAFT preview ready. Timeline remains unchanged.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Could not preview the Shot Draft.");
    } finally {
      setBusyShotId(null);
    }
  };

  const confirmDraft = async () => {
    if (!draft) return;
    setBusyShotId(draft.shotId);
    setMessage("");
    try {
      const result = await confirmStudioShotDraft(draft.sceneId, draft.shotId, draft.draftId);
      setDraft(result.draft);
      setMessage("SHOT_DRAFT created. No Timeline, Agent, or Runtime action was started.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Could not confirm the Shot Draft.");
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
          <p>Scene → Storyboard → Shot → Timeline Placeholder</p>
        </div>
        <small>Planning only · no Timeline edits, Agent execution, Provider calls, or Credits</small>
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
                onClick={() => { setSelectedStoryboardId(storyboard.storyboardId); setDraft(null); }}
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
                <button disabled={Boolean(busyShotId)} onClick={() => void previewDraft(shot)} type="button">
                  {busyShotId === shot.shotId ? "Preparing…" : "Preview SHOT_DRAFT"}
                </button>
              </article>
            ))}
          </div>

          <aside className="studio-storyboard-draft" aria-label="Shot Draft Preview">
            <span>Copilot Shot Planning</span>
            {draft ? (
              <>
                <strong>{draft.status === "CONFIRMED" ? "SHOT_DRAFT confirmed" : "Preview ready"}</strong>
                <p>{draft.reason}</p>
                <dl>
                  <div><dt>Camera</dt><dd>{draft.proposal.camera}</dd></div>
                  <div><dt>Duration</dt><dd>{draft.proposal.duration}s</dd></div>
                  <div><dt>Impact</dt><dd>Placeholder reference only</dd></div>
                </dl>
                <blockquote>{draft.proposal.prompt}</blockquote>
                {draft.status === "PREVIEWED" ? (
                  <button disabled={Boolean(busyShotId)} onClick={() => void confirmDraft()} type="button">Confirm Create Draft</button>
                ) : <small>Draft created. Existing Timeline remains unchanged.</small>}
              </>
            ) : (
              <p>Select “Preview SHOT_DRAFT” to review a Prompt Draft before confirmation.</p>
            )}
            {message ? <small role="status">{message}</small> : null}
          </aside>
        </div>
      )}
    </section>
  );
}
