"use client";

import { useState } from "react";
import type { StudioAIProjectDraft } from "@/features/studio/capabilities/studioProjectInitialization";
import { useStudioApiIntegration } from "@/features/studio/components/StudioApiIntegration";
import { useI18n } from "@/i18n/useI18n";
import {
  confirmStudioProjectInitialization,
  previewStudioProjectInitialization,
} from "@/lib/studio-project-initialization-api";

export function StudioProjectInitializationAssistant() {
  const { t, tf } = useI18n();
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
    setMessage(t("studio.init.creating"));
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
      setMessage(t("studio.init.previewReady"));
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : t("studio.init.previewFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!draft || draft.status !== "PREVIEW") return;
    setBusy(true);
    setMessage(t("studio.init.confirming"));
    try {
      const value = await confirmStudioProjectInitialization(draft.draftId);
      setDraft(value);
      setMessage(t("studio.init.confirmedMessage"));
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : t("studio.init.confirmFailed"));
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <section className="studio-project-init-entry" aria-label={t("studio.init.aria")}>
        <div>
          <span>{t("studio.init.entryEyebrow")}</span>
          <strong>{t("studio.init.title")}</strong>
          <p>{t("studio.init.entryMessage")}</p>
        </div>
        <button disabled={availability !== "READY"} onClick={() => setOpen(true)} type="button">
          {availability === "READY" ? t("studio.init.title") : t("studio.init.unavailable")}
        </button>
      </section>
    );
  }

  return (
    <section className="studio-project-init" aria-label={t("studio.init.title")}>
      <header>
        <div><span>{t("studio.init.panelEyebrow")}</span><strong>{t("studio.init.title")}</strong></div>
        <button onClick={() => setOpen(false)} type="button">{t("studio.common.close")}</button>
      </header>
      <div className="studio-project-init-form">
        <label>
          {t("studio.init.promptLabel")}
          <textarea onChange={(event) => setPrompt(event.target.value)} placeholder={t("studio.init.promptPlaceholder")} value={prompt} />
        </label>
        <label>{t("studio.init.brandLabel")}<input onChange={(event) => setBrandContext(event.target.value)} placeholder={t("studio.init.brandPlaceholder")} value={brandContext} /></label>
        <label>{t("studio.init.goalLabel")}<input onChange={(event) => setGoal(event.target.value)} placeholder={t("studio.init.goalPlaceholder")} value={goal} /></label>
        <div>
          <label>{t("studio.init.duration")}<input onChange={(event) => setDuration(event.target.value)} placeholder="30s" value={duration} /></label>
          <label>{t("studio.init.ratio")}<select onChange={(event) => setRatio(event.target.value)} value={ratio}><option>16:9</option><option>9:16</option><option>1:1</option></select></label>
        </div>
        <button disabled={!prompt.trim() || busy} onClick={() => void preview()} type="button">{t("studio.init.createPreview")}</button>
      </div>
      {draft ? (
        <section className="studio-project-init-preview" aria-label={t("studio.init.previewAria")}>
          <header>
            <div><span>{draft.status}</span><strong>{draft.projectGoal.description}</strong></div>
            <b className={`is-${draft.confidence.toLowerCase()}`}>{draft.confidence} · {t("studio.common.confidence")}</b>
          </header>
          <div className="studio-project-init-grid">
            <article><span>{t("studio.init.projectGoal")}</span><strong>{draft.projectGoal.type.replaceAll("_", " ")}</strong><p>{draft.projectGoal.description}</p></article>
            <article><span>{t("studio.init.strategy")}</span><strong>{draft.strategy.type.replaceAll("_", " ")}</strong><p>{draft.strategy.recommendations[0]}</p></article>
            <article><span>{t("studio.init.canvas")}</span><strong>{tf("studio.common.nodes", { count: draft.canvasGraph.nodes.length })} · {tf("studio.common.edges", { count: draft.canvasGraph.edges.length })}</strong><p>{draft.canvasGraph.nodes.map((node) => node.nodeType).join(" → ")}</p></article>
            <article><span>{t("studio.init.timeline")}</span><strong>{tf("studio.init.scenePlaceholder", { count: draft.timelineStructure.scenes.length })}</strong><p>{t("studio.init.timelineUnchanged")}</p></article>
          </div>
          <div className="studio-project-init-roadmap">
            {draft.roadmap.phases.map((phase) => <article key={phase.phase}><span>{phase.phase}</span><p>{phase.goal}</p></article>)}
          </div>
          <section className="studio-project-init-evidence">
            <header><strong>{t("studio.init.copilotEvidence")}</strong><span>{tf("studio.common.references", { count: draft.evidence.length })}</span></header>
            {draft.evidence.map((item) => <article key={item.evidenceId}><b>{item.type.replaceAll("_", " ")}</b><p>{item.summary}</p><small>{item.confidence}</small></article>)}
          </section>
          {draft.status === "PREVIEW" ? (
            <button disabled={busy} onClick={() => void confirm()} type="button">{t("studio.init.confirmDraft")}</button>
          ) : <p className="studio-project-init-confirmed">{t("studio.init.confirmed")}</p>}
        </section>
      ) : null}
      {message ? <p className="studio-project-init-message" role="status">{message}</p> : null}
      <footer>{t("studio.init.boundary")}</footer>
    </section>
  );
}
