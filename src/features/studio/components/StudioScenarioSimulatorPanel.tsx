"use client";

import { useEffect, useState } from "react";
import {
  studioScenarioTypeLabel,
  type StudioScenarioSimulationBundle,
} from "@/features/studio/capabilities/studioScenarioSimulation";
import { getStudioScenarioSimulation } from "@/lib/studio-scenario-simulation-api";

export function StudioScenarioSimulatorPanel({ projectId }: { projectId: string }) {
  const [bundleState, setBundleState] = useState<{ projectId: string; bundle: StudioScenarioSimulationBundle } | null>(null);
  const [errorState, setErrorState] = useState<{ projectId: string; message: string } | null>(null);
  const bundle = bundleState?.projectId === projectId ? bundleState.bundle : null;
  const error = errorState?.projectId === projectId ? errorState.message : "";

  useEffect(() => {
    let active = true;
    void getStudioScenarioSimulation(projectId)
      .then((value) => {
        if (!active) return;
        setBundleState({ projectId, bundle: value });
        setErrorState(null);
      })
      .catch(() => {
        if (active) setErrorState({ projectId, message: "Scenario Simulator is temporarily unavailable." });
      });
    return () => { active = false; };
  }, [projectId]);

  return (
    <section className="studio-scenario-simulator" aria-label="Creative Scenario Simulator">
      <header>
        <div><span>Outcome forecasting</span><strong>Scenario Simulator</strong></div>
        <small>{bundle ? `${bundle.summary.scenarioCount} scenarios · ${bundle.summary.costStatus}` : "Private"}</small>
      </header>
      {bundle ? (
        <div className="studio-scenario-list">
          {bundle.scenarios.map((scenario) => (
            <article key={scenario.scenarioId}>
              <header>
                <div><span>{studioScenarioTypeLabel(scenario.type)}</span><strong>{scenario.title}</strong></div>
                <small>{scenario.confidence}</small>
              </header>
              <div className="studio-scenario-impact">
                <div><span>Cost</span><strong>{scenario.expectedImpact.costImpact}</strong></div>
                <div><span>Quality</span><strong>{scenario.expectedImpact.qualityImpact}</strong></div>
                <div><span>Speed</span><strong>{scenario.expectedImpact.speedImpact}</strong></div>
              </div>
              <div className="studio-scenario-detail">
                <small><b>Workflow</b> {scenario.expectedImpact.efficiencyImpact}</small>
                <small><b>Resources</b> {scenario.expectedImpact.resourceImpact}</small>
                <small><b>Assumptions</b> {scenario.assumptions.join(" · ")}</small>
                <small><b>Risks</b> {scenario.expectedImpact.risks.join(" · ") || "No measured risk; uncertainty still applies."}</small>
              </div>
              <small>{scenario.expectedImpact.disclaimer}</small>
            </article>
          ))}
        </div>
      ) : error ? (
        <span className="studio-project-copilot-error" role="alert">{error}</span>
      ) : (
        <span className="studio-project-copilot-empty">Simulating directional impact from project evidence...</span>
      )}
      <small>Forecasts are directional only. Compare here, then Preview and Confirm one scenario in Action Center to create a Draft; no option is selected or executed automatically.</small>
    </section>
  );
}
