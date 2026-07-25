"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getStudioApiVersion,
  studioFeatureAvailability,
  StudioApiVersionError,
  type StudioApiAvailability,
  type StudioApiFeature,
  type StudioApiVersion,
} from "@/lib/studio-api-version";

type StudioApiIntegrationContextValue = Readonly<{
  status: StudioApiAvailability;
  version: StudioApiVersion | null;
  error: string;
  refresh: () => void;
  featureStatus: (feature: StudioApiFeature) => StudioApiAvailability;
}>;

const StudioApiIntegrationContext = createContext<StudioApiIntegrationContextValue | null>(null);

export function StudioApiIntegrationProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [requestVersion, setRequestVersion] = useState(0);
  const [state, setState] = useState<Readonly<{
    status: StudioApiAvailability;
    version: StudioApiVersion | null;
    error: string;
  }>>({
    status: "AVAILABLE",
    version: null,
    error: "",
  });

  useEffect(() => {
    const controller = new AbortController();
    void getStudioApiVersion(controller.signal)
      .then((version) => setState({ status: "READY", version, error: "" }))
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        const notDeployed = reason instanceof StudioApiVersionError && reason.status === 404;
        setState({
          status: notDeployed ? "NOT_DEPLOYED" : "ERROR",
          version: null,
          error: reason instanceof Error ? reason.message : "Studio API is temporarily unavailable.",
        });
      });
    return () => controller.abort();
  }, [requestVersion]);

  const refresh = useCallback(() => {
    setState({ status: "AVAILABLE", version: null, error: "" });
    setRequestVersion((value) => value + 1);
  }, []);
  const value = useMemo<StudioApiIntegrationContextValue>(() => ({
    ...state,
    refresh,
    featureStatus: (feature) => studioFeatureAvailability(state.status, state.version, feature),
  }), [refresh, state]);

  return (
    <StudioApiIntegrationContext.Provider value={value}>
      {children}
    </StudioApiIntegrationContext.Provider>
  );
}

export function useStudioApiIntegration() {
  const value = useContext(StudioApiIntegrationContext);
  if (!value) throw new Error("Studio API integration context is unavailable.");
  return value;
}

export function StudioApiVersionStatus() {
  const { status, version, error, refresh } = useStudioApiIntegration();
  return (
    <section className={`studio-api-version-status is-${status.toLowerCase()}`} aria-label="Studio API version">
      <div>
        <span>Studio API</span>
        <strong>{status}</strong>
        {version ? (
          <small>{version.version} · {version.commit.slice(0, 8)} · {version.features.length} capabilities</small>
        ) : (
          <small>{status === "AVAILABLE" ? "Checking production capabilities…" : error}</small>
        )}
      </div>
      {status === "ERROR" || status === "NOT_DEPLOYED" ? (
        <button onClick={refresh} type="button">Check again</button>
      ) : null}
    </section>
  );
}

export function StudioCapabilityBoundary({
  feature,
  label,
  children,
}: Readonly<{
  feature: StudioApiFeature;
  label: string;
  children: ReactNode;
}>) {
  const { featureStatus, refresh } = useStudioApiIntegration();
  const status = featureStatus(feature);
  if (status === "READY") return children;
  const displayStatus =
    status === "AVAILABLE"
      ? "LOADING"
      : status === "NOT_DEPLOYED"
        ? "UNAVAILABLE"
        : status;

  const message = status === "AVAILABLE"
    ? `Checking ${label} service availability…`
    : status === "NOT_DEPLOYED"
      ? `${label} service version unavailable. This module is not deployed on the current API version.`
      : `${label} is temporarily unavailable. Your project data was not changed.`;

  return (
    <section className={`studio-capability-state is-${status.toLowerCase()}`} aria-label={`${label} availability`}>
      <span>{label}</span>
      <strong>{displayStatus}</strong>
      <p>{message}</p>
      {status === "ERROR" || status === "NOT_DEPLOYED" ? (
        <button onClick={refresh} type="button">Check availability</button>
      ) : null}
    </section>
  );
}
