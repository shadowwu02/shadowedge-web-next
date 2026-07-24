"use client";

import { useEffect, useState } from "react";
import {
  studioShotTypeLabel,
  type StudioCreativeShot,
  type StudioCreativeStoryboard,
  type StudioShotBatchGenerationPlan,
  type StudioShotDraft,
  type StudioShotGenerationDraft,
} from "@/features/studio/capabilities/studioStoryboard";
import type { StudioProductionRunPlan } from "@/features/studio/capabilities/studioProductionRunPlan";
import type { StudioProductionExecutionApproval } from "@/features/studio/capabilities/studioProductionExecutionApproval";
import { useStudioStore } from "@/features/studio/store/studioStore";
import {
  confirmStudioShotDraft,
  confirmStudioShotBatchGenerationPlan,
  confirmStudioShotGenerationDraft,
  createStudioShotBatchGenerationPlan,
  createStudioShotGenerationDraft,
  getStudioSceneShots,
  getStudioShotBatchGenerationPlan,
  getStudioStoryboards,
  previewStudioShotDraft,
} from "@/lib/studio-storyboard-api";
import {
  confirmStudioProductionRunPlan,
  createStudioProductionRunPlan,
  getStudioProductionRunPlan,
} from "@/lib/studio-production-run-plan-api";
import {
  confirmStudioProductionExecutionApproval,
  createStudioProductionExecutionApproval,
} from "@/lib/studio-production-execution-approval-api";

export function StudioStoryboardPanel() {
  const projectId = useStudioStore((state) => state.projectId);
  const [bundle, setBundle] = useState<{ projectId: string; storyboards: readonly StudioCreativeStoryboard[]; error: string } | null>(null);
  const [selectedStoryboardId, setSelectedStoryboardId] = useState<string | null>(null);
  const [sceneShots, setSceneShots] = useState<{ sceneId: string; shots: readonly StudioCreativeShot[] } | null>(null);
  const [shotDraft, setShotDraft] = useState<StudioShotDraft | null>(null);
  const [generationDraft, setGenerationDraft] = useState<StudioShotGenerationDraft | null>(null);
  const [batchPlan, setBatchPlan] = useState<StudioShotBatchGenerationPlan | null>(null);
  const [productionPlan, setProductionPlan] = useState<StudioProductionRunPlan | null>(null);
  const [productionApproval, setProductionApproval] = useState<StudioProductionExecutionApproval | null>(null);
  const [busyShotId, setBusyShotId] = useState<string | null>(null);
  const [batchBusy, setBatchBusy] = useState(false);
  const [productionBusy, setProductionBusy] = useState(false);
  const [productionApprovalBusy, setProductionApprovalBusy] = useState(false);
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

  useEffect(() => {
    if (!projectId) return;
    const controller = new AbortController();
    void getStudioProductionRunPlan(projectId, controller.signal)
      .then((value) => setProductionPlan(value.plan))
      .catch(() => undefined);
    return () => controller.abort();
  }, [projectId]);

  useEffect(() => {
    if (!selectedSceneId) return;
    const controller = new AbortController();
    void getStudioShotBatchGenerationPlan(selectedSceneId, controller.signal)
      .then((value) => setBatchPlan(value.plan))
      .catch(() => undefined);
    return () => controller.abort();
  }, [selectedSceneId]);

  const shots = sceneShots && selectedSceneId && sceneShots.sceneId === selectedSceneId
    ? sceneShots.shots
    : selectedStoryboard?.shots || [];
  const activeProductionPlan = productionPlan?.projectId === projectId ? productionPlan : null;
  const activeProductionApproval = productionApproval?.projectId === projectId ? productionApproval : null;

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

  const createBatchPlan = async () => {
    if (!selectedSceneId) return;
    setBatchBusy(true);
    setMessage("");
    try {
      const result = await createStudioShotBatchGenerationPlan(selectedSceneId);
      setBatchPlan(result.plan);
      setMessage(
        result.plan.status === "BLOCKED"
          ? "Batch preview is blocked. Review unknown cost or unavailable Shot models."
          : "Batch Generation Plan preview ready. No Queue, Job, Provider call, or Credits action occurred.",
      );
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Could not create the Batch Generation Plan preview.");
    } finally {
      setBatchBusy(false);
    }
  };

  const confirmBatchPlan = async () => {
    if (!selectedSceneId || !batchPlan) return;
    setBatchBusy(true);
    setMessage("");
    try {
      const result = await confirmStudioShotBatchGenerationPlan(selectedSceneId, batchPlan.batchPlanId);
      setBatchPlan(result.plan);
      setMessage("Batch Plan Draft confirmed. Queue and Jobs remain uncreated; Execution Confirm is still required.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Could not confirm the Batch Generation Plan.");
    } finally {
      setBatchBusy(false);
    }
  };

  const createProductionPlan = async () => {
    if (!projectId) return;
    setProductionBusy(true);
    setMessage("");
    try {
      const result = await createStudioProductionRunPlan(projectId);
      setProductionPlan(result.plan);
      setMessage(
        result.plan.status === "BLOCKED"
          ? "Production Run Preview is blocked. Review Scene, Shot, Agent, or cost risks."
          : "Production Run Plan preview ready. No Job, Queue, Provider call, Generate, or Credits action occurred.",
      );
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Could not create the Production Run Plan preview.");
    } finally {
      setProductionBusy(false);
    }
  };

  const confirmProductionPlan = async () => {
    if (!projectId || !activeProductionPlan) return;
    setProductionBusy(true);
    setMessage("");
    try {
      const result = await confirmStudioProductionRunPlan(projectId, activeProductionPlan.runId);
      setProductionPlan(result.plan);
      setMessage("Production Draft confirmed. Existing Execution Approval remains mandatory; no Job or Queue was created.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Could not confirm the Production Run Plan.");
    } finally {
      setProductionBusy(false);
    }
  };

  const createProductionApproval = async () => {
    if (!projectId || !activeProductionPlan || activeProductionPlan.status !== "CONFIRMED") return;
    setProductionApprovalBusy(true);
    setMessage("");
    try {
      const result = await createStudioProductionExecutionApproval(projectId, activeProductionPlan.runId);
      setProductionApproval(result);
      setMessage(
        result.status === "PENDING"
          ? "Production Approval Package ready. Human Confirm is still required."
          : "Production Approval is blocked by current Capability, model, cost, or policy Gates.",
      );
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Could not create the Production Approval Package.");
    } finally {
      setProductionApprovalBusy(false);
    }
  };

  const confirmProductionApproval = async () => {
    if (!projectId || !activeProductionApproval || activeProductionApproval.status !== "PENDING") return;
    setProductionApprovalBusy(true);
    setMessage("");
    try {
      const result = await confirmStudioProductionExecutionApproval(
        projectId,
        activeProductionApproval.approvalId,
      );
      setProductionApproval(result);
      setMessage(
        "Production Execution Approval confirmed. A separate Runtime start remains required; no Job, Queue, Provider call, Generate, or Credits action occurred.",
      );
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Could not confirm Production Execution Approval.");
    } finally {
      setProductionApprovalBusy(false);
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
                  setBatchPlan(null);
                  setMessage("");
                }}
                type="button"
              >
                <strong>{storyboard.sceneName}</strong>
                <span>{storyboard.shots.length} shots</span>
                <small>{storyboard.agentSource}</small>
              </button>
            ))}
            <button
              className="studio-storyboard-batch-button"
              disabled={batchBusy}
              onClick={() => void createBatchPlan()}
              type="button"
            >
              <strong>{batchBusy ? "Planning…" : "Batch Generation Planning"}</strong>
              <small>Preview all Scene shots</small>
            </button>
            <button
              className="studio-storyboard-production-button"
              disabled={productionBusy}
              onClick={() => void createProductionPlan()}
              type="button"
            >
              <strong>{productionBusy ? "Planning…" : "Production Run Planner"}</strong>
              <small>Preview all Scenes and Shots</small>
            </button>
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

            <section className="studio-storyboard-draft-section" aria-label="Batch Generation Planning">
              <span>Batch Generation Planning</span>
              {batchPlan ? (
                <>
                  <strong>{batchPlan.shots.length} Shots · {batchPlan.status}</strong>
                  <dl>
                    <div><dt>Total Credits Estimate</dt><dd>{batchPlan.estimatedCost.totalCreditsEstimate}</dd></div>
                    <div><dt>Cost Confidence</dt><dd>{batchPlan.estimatedCost.costConfidence}</dd></div>
                    <div><dt>Unknown Cost</dt><dd>{batchPlan.estimatedCost.unknownCost}</dd></div>
                    <div><dt>Models</dt><dd>{batchPlan.models.map((model) => model.displayName).join(", ") || "Unavailable"}</dd></div>
                  </dl>
                  <div className="studio-storyboard-batch-items">
                    {batchPlan.shots.map((item) => (
                      <div className="studio-storyboard-batch-item" key={item.shotId}>
                        <strong>{item.shotId}</strong>
                        <span>{item.status}</span>
                        <small>
                          {item.model?.displayName || item.blocker || "Model unavailable"}
                          {" · "}
                          {item.estimatedCost.shadowCredits === null ? "Unknown cost" : `${item.estimatedCost.shadowCredits} Credits`}
                        </small>
                      </div>
                    ))}
                  </div>
                  <div className="studio-storyboard-batch-tags" aria-label="Batch dependencies">
                    {batchPlan.dependencies.map((dependency, index) => (
                      <span key={`${dependency.fromShotId}:${dependency.toShotId || "independent"}:${index}`}>
                        {dependency.type}
                      </span>
                    ))}
                    {batchPlan.riskFlags.map((risk) => <span key={risk}>⚠ {risk}</span>)}
                  </div>
                  {batchPlan.status === "PREVIEWED" ? (
                    <button disabled={batchBusy} onClick={() => void confirmBatchPlan()} type="button">
                      Confirm Batch Plan Draft
                    </button>
                  ) : batchPlan.status === "CONFIRMED" ? (
                    <small>Plan Draft confirmed. Existing Execution Preview and Confirm remain mandatory.</small>
                  ) : (
                    <small>Confirmation blocked until every Shot has an allowed model and known cost.</small>
                  )}
                </>
              ) : (
                <p>Preview all Scene Shots, model suggestions, dependencies, and estimated Credits before confirmation.</p>
              )}
            </section>
            <section className="studio-storyboard-draft-section" aria-label="Production Run Planner">
              <span>Production Run Planner</span>
              {activeProductionPlan ? (
                <>
                  <strong>{activeProductionPlan.summary.sceneCount} Scenes · {activeProductionPlan.summary.shotCount} Shots · {activeProductionPlan.status}</strong>
                  <dl>
                    <div><dt>Agents</dt><dd>{activeProductionPlan.summary.agentCount}</dd></div>
                    <div><dt>Quality Checkpoints</dt><dd>{activeProductionPlan.summary.checkpointCount}</dd></div>
                    <div><dt>Credits</dt><dd>{activeProductionPlan.estimatedCost.totalCreditsEstimate}</dd></div>
                    <div><dt>Cost Confidence</dt><dd>{activeProductionPlan.estimatedCost.costConfidence}</dd></div>
                    <div><dt>Unknown Cost</dt><dd>{activeProductionPlan.estimatedCost.unknownCost}</dd></div>
                  </dl>
                  <div className="studio-production-run-scenes" aria-label="Production Scene sequence">
                    {activeProductionPlan.scenes.map((scene) => (
                      <div key={scene.sceneId}>
                        <strong>{String(scene.order).padStart(2, "0")} · {scene.name}</strong>
                        <span>{scene.shotCount} Shots · {scene.status}</span>
                      </div>
                    ))}
                  </div>
                  <div className="studio-production-run-steps" aria-label="Production Steps">
                    {activeProductionPlan.shots.map((step) => (
                      <div key={step.stepId}>
                        <strong>{step.agent.replaceAll("_", " ")}</strong>
                        <span>{step.status}</span>
                        <small>
                          {step.sceneId} · {step.shotId} · {step.model?.displayName || "Model unavailable"}
                        </small>
                      </div>
                    ))}
                  </div>
                  <div className="studio-storyboard-batch-tags" aria-label="Production dependencies and risks">
                    {Array.from(new Set(activeProductionPlan.dependencies.map((dependency) => dependency.type))).map((type) => (
                      <span key={type}>{type}</span>
                    ))}
                    {activeProductionPlan.riskFlags.map((risk) => <span key={risk}>⚠ {risk}</span>)}
                  </div>
                  {activeProductionPlan.status === "PREVIEWED" ? (
                    <button disabled={productionBusy} onClick={() => void confirmProductionPlan()} type="button">
                      Confirm Production Draft
                    </button>
                  ) : activeProductionPlan.status === "CONFIRMED" ? (
                    <small>Production Draft confirmed. Existing Execution Approval and Runtime confirmation remain mandatory.</small>
                  ) : (
                    <small>Confirmation blocked until all Scenes, Shots, Agent planning, and cost evidence are ready.</small>
                  )}
                </>
              ) : (
                <p>Aggregate every Scene Batch Plan, Agent Plan, dependency, checkpoint, and estimated Credit into one production preview.</p>
              )}
            </section>
            <section className="studio-storyboard-draft-section studio-production-approval" aria-label="Production Approval Panel">
              <span>Production Approval Panel</span>
              {activeProductionApproval ? (
                <>
                  <strong>{activeProductionApproval.status} · {activeProductionApproval.approvalId}</strong>
                  <dl>
                    <div><dt>Scenes</dt><dd>{activeProductionApproval.executionSummary.sceneCount}</dd></div>
                    <div><dt>Shots</dt><dd>{activeProductionApproval.executionSummary.shotCount}</dd></div>
                    <div><dt>Agents</dt><dd>{activeProductionApproval.executionSummary.agentCount}</dd></div>
                    <div><dt>Tasks</dt><dd>{activeProductionApproval.executionSummary.taskCount}</dd></div>
                    <div><dt>Credits</dt><dd>{activeProductionApproval.cost.estimatedCredits}</dd></div>
                    <div><dt>Cost Confidence</dt><dd>{activeProductionApproval.cost.confidence}</dd></div>
                    <div><dt>Agent Policy</dt><dd>{activeProductionApproval.policy.status}</dd></div>
                  </dl>
                  <div className="studio-production-approval-gates" aria-label="Production Gate summary">
                    {([
                      ["Capability", activeProductionApproval.gates.capability],
                      ["Availability", activeProductionApproval.gates.availability],
                      ["Readiness", activeProductionApproval.gates.readiness],
                      ["Verified Scope", activeProductionApproval.gates.verifiedScope],
                      ["Cost", activeProductionApproval.gates.cost],
                      ["Agent Policy", activeProductionApproval.gates.agentPolicy],
                    ] as const).map(([label, gate]) => (
                      <div className={gate.passed ? "is-passed" : "is-blocked"} key={label}>
                        <strong>{label}</strong>
                        <span>{gate.passed ? "PASS" : "BLOCKED"}</span>
                        {gate.blockers.length ? <small>{gate.blockers.join(", ")}</small> : null}
                      </div>
                    ))}
                  </div>
                  <div className="studio-storyboard-batch-tags" aria-label="Production Approval risks">
                    {activeProductionApproval.riskFlags.length
                      ? activeProductionApproval.riskFlags.map((risk) => <span key={risk}>⚠ {risk}</span>)
                      : <span>No current risk flags</span>}
                  </div>
                  {activeProductionApproval.status === "PENDING" ? (
                    <button
                      disabled={productionApprovalBusy}
                      onClick={() => void confirmProductionApproval()}
                      type="button"
                    >
                      {productionApprovalBusy ? "Confirming…" : "Confirm Production Execution Approval"}
                    </button>
                  ) : activeProductionApproval.status === "APPROVED" ? (
                    <small>A separate Runtime start remains required. This approval did not create a Queue, Job, or charge.</small>
                  ) : (
                    <small>Approval is blocked or expired. Resolve the displayed Gate failures before creating a new package.</small>
                  )}
                </>
              ) : activeProductionPlan?.status === "CONFIRMED" ? (
                <>
                  <p>Revalidate Capability, Availability, Readiness, Verified Scope, Cost, and Agent Policy.</p>
                  <button
                    disabled={productionApprovalBusy}
                    onClick={() => void createProductionApproval()}
                    type="button"
                  >
                    {productionApprovalBusy ? "Preparing…" : "Prepare Production Approval"}
                  </button>
                </>
              ) : (
                <p>Confirm the Production Run Draft before preparing its unified Execution Approval Package.</p>
              )}
            </section>
            {message ? <small role="status">{message}</small> : null}
          </aside>
        </div>
      )}
    </section>
  );
}
