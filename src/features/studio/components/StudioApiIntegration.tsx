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
import { useI18n, type DictionaryKey } from "@/i18n/useI18n";
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

const STATUS_KEYS: Record<StudioApiAvailability, DictionaryKey> = {
  AVAILABLE: "studio.status.available",
  READY: "studio.status.ready",
  NOT_DEPLOYED: "studio.status.notDeployed",
  ERROR: "studio.status.error",
};

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
          error: reason instanceof Error ? reason.message : "",
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
  const { t, tf } = useI18n();
  return (
    <section className={`studio-api-version-status is-${status.toLowerCase()}`} aria-label={t("studio.api.aria")}>
      <div>
        <span>{t("studio.api.label")}</span>
        <strong>{t(STATUS_KEYS[status])}</strong>
        {version ? (
          <small>{version.version} · {version.commit.slice(0, 8)} · {tf("studio.api.capabilities", { count: version.features.length })}</small>
        ) : (
          <small>{status === "AVAILABLE" ? t("studio.api.checking") : error || t("studio.api.fallbackError")}</small>
        )}
      </div>
      {status === "ERROR" || status === "NOT_DEPLOYED" ? (
        <button onClick={refresh} type="button">{t("studio.common.checkAgain")}</button>
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
  const { t, tf } = useI18n();
  const status = featureStatus(feature);
  if (status === "READY") return children;
  const displayStatus = status === "AVAILABLE"
    ? t("studio.status.loading")
    : status === "NOT_DEPLOYED"
      ? t("studio.status.unavailable")
      : t(STATUS_KEYS[status]);

  const message = status === "AVAILABLE"
    ? tf("studio.api.checkingService", { label })
    : status === "NOT_DEPLOYED"
      ? tf("studio.api.notDeployed", { label })
      : tf("studio.api.temporarilyUnavailable", { label });

  return (
    <section className={`studio-capability-state is-${status.toLowerCase()}`} aria-label={tf("studio.api.availabilityAria", { label })}>
      <span>{label}</span>
      <strong>{displayStatus}</strong>
      <p>{message}</p>
      {status === "ERROR" || status === "NOT_DEPLOYED" ? (
        <button onClick={refresh} type="button">{t("studio.api.checkAvailability")}</button>
      ) : null}
    </section>
  );
}
