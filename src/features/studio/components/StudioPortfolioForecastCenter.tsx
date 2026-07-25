"use client";

import { useEffect, useState } from "react";
import {
  studioPortfolioForecastLabel,
  type StudioPortfolioForecastPreview,
  type StudioPortfolioForecastSnapshot,
} from "@/features/studio/capabilities/studioPortfolioForecast";
import {
  confirmStudioPortfolioForecastDraft,
  getStudioPortfolioForecast,
  previewStudioPortfolioForecastDraft,
} from "@/lib/studio-portfolio-forecast-api";

function trendSymbol(direction: string) {
  if (direction === "INCREASING" || direction === "POSSIBLE_GROWTH" || direction === "POSSIBLE_INCREASE") return "↗";
  if (direction === "DECREASING") return "↘";
  if (direction === "STABLE") return "→";
  return "·";
}

function valueOrDash(value: number | null) {
  return value === null ? "—" : value;
}

export function StudioPortfolioForecastCenter() {
  const [snapshot, setSnapshot] = useState<StudioPortfolioForecastSnapshot | null>(null);
  const [preview, setPreview] = useState<StudioPortfolioForecastPreview | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void getStudioPortfolioForecast(controller.signal)
      .then((value) => {
        setSnapshot(value);
        setError("");
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setError(reason instanceof Error ? reason.message : "Portfolio Forecast is unavailable.");
      });
    return () => controller.abort();
  }, []);

  const refresh = async () => {
    setSnapshot(await getStudioPortfolioForecast());
  };

  const previewDraft = async () => {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await previewStudioPortfolioForecastDraft();
      setPreview(result);
      await refresh();
      setMessage("Forecast preview ready. No Strategy, resource, project, or Credits state changed.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Forecast preview failed.");
    } finally {
      setBusy(false);
    }
  };

  const confirmDraft = async () => {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await confirmStudioPortfolioForecastDraft();
      await refresh();
      setMessage(`Portfolio Forecast Draft created: ${result.draft.draftId}. Human review remains required.`);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Portfolio Forecast Draft could not be created.");
    } finally {
      setBusy(false);
    }
  };

  const status = snapshot?.action?.status || "SUGGESTED";

  return (
    <section className="studio-portfolio-forecast" aria-label="Portfolio Forecast Center">
      <header>
        <div>
          <span>History → Current state → Possible future</span>
          <h2>Portfolio Forecast Center</h2>
          <p>Evidence-based trends, possible outcomes, and reviewable scenarios for your portfolio.</p>
        </div>
        <div className={`studio-portfolio-forecast-confidence is-${snapshot?.confidence.toLowerCase() || "waiting"}`}>
          <strong>{snapshot?.confidence || "—"}</strong>
          <span>Forecast confidence</span>
          <small>Outcomes not guaranteed</small>
        </div>
      </header>

      {error ? (
        <div className="studio-portfolio-forecast-empty" role="status">
          <strong>Portfolio Forecast unavailable</strong>
          <span>{error}</span>
        </div>
      ) : !snapshot ? (
        <div className="studio-portfolio-forecast-empty">
          Connecting Performance history, Resources, Roadmaps, Strategy, and Project Memory...
        </div>
      ) : (
        <>
          <section className="studio-portfolio-forecast-trends" aria-label="Portfolio trends">
            {snapshot.trends.map((trend) => (
              <article key={trend.trendId}>
                <header>
                  <span>{studioPortfolioForecastLabel(trend.type)}</span>
                  <strong>{trend.confidence}</strong>
                </header>
                <div>
                  <b>{trendSymbol(trend.possibleFutureDirection)}</b>
                  <strong>{valueOrDash(trend.current)}</strong>
                </div>
                <p>{studioPortfolioForecastLabel(trend.possibleFutureDirection)}</p>
                <small>{trend.history.length} evidence points · {trend.limitation}</small>
              </article>
            ))}
          </section>

          <section className="studio-portfolio-forecast-outcomes">
            <header>
              <strong>Possible outcome forecasts</strong>
              <span>Next project phase · estimates only</span>
            </header>
            <div>
              {snapshot.forecasts.map((forecast) => (
                <article key={forecast.forecastId}>
                  <header>
                    <strong>{studioPortfolioForecastLabel(forecast.type)}</strong>
                    <span>{forecast.confidence}</span>
                  </header>
                  <p>{forecast.expectedImpact}</p>
                  <small>{forecast.evidenceRefs.length} Evidence references</small>
                  <footer>{studioPortfolioForecastLabel(forecast.status)}</footer>
                </article>
              ))}
            </div>
          </section>

          <section className="studio-portfolio-forecast-scenarios">
            <header>
              <strong>Scenario suggestions</strong>
              <span>Compare before Human Confirm</span>
            </header>
            <div>
              {snapshot.scenarios.map((scenario) => (
                <article key={scenario.scenarioId}>
                  <header>
                    <strong>{scenario.title}</strong>
                    <span>{scenario.confidence}</span>
                  </header>
                  <p>{scenario.possibleOutcome}</p>
                  <div>
                    {scenario.risks.map((risk) => <span key={risk}>{studioPortfolioForecastLabel(risk)}</span>)}
                  </div>
                  <small>{scenario.assumptions[0]}</small>
                  <footer>{scenario.disclaimer}</footer>
                </article>
              ))}
            </div>
          </section>

          <div className="studio-portfolio-forecast-evidence">
            <strong>Evidence coverage</strong>
            <span>{snapshot.evidence.length} qualified references</span>
            <div>
              {snapshot.evidence.map((item) => (
                <span key={item.evidenceId}>{studioPortfolioForecastLabel(item.type)} · {item.confidence}</span>
              ))}
            </div>
            <small>{snapshot.disclaimer}</small>
          </div>

          {preview && status !== "CONFIRMED" ? (
            <div className="studio-portfolio-forecast-preview">
              <strong>PORTFOLIO_FORECAST_DRAFT preview</strong>
              <span>{preview.preview.trends.length} trends · {preview.preview.scenarios.length} scenarios</span>
              <small>No guaranteed result, Strategy adjustment, resource allocation, execution, or Credits.</small>
            </div>
          ) : null}

          <footer className="studio-portfolio-forecast-footer">
            <div>
              <span>Current user portfolio only</span>
              <span>Possible outcomes, not promises</span>
              <span>Scenarios are not applied</span>
            </div>
            {status === "CONFIRMED" ? (
              <button disabled type="button">Portfolio Forecast Draft created</button>
            ) : status === "PREVIEWED" ? (
              <button disabled={busy} onClick={() => void confirmDraft()} type="button">
                {busy ? "Creating Draft..." : "Confirm Forecast Draft"}
              </button>
            ) : (
              <button disabled={busy} onClick={() => void previewDraft()} type="button">
                {busy ? "Preparing Preview..." : "Preview Forecast Scenarios"}
              </button>
            )}
          </footer>
          {message ? <div className="studio-portfolio-forecast-message" role="status">{message}</div> : null}
        </>
      )}
    </section>
  );
}
