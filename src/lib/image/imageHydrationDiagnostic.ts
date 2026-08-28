export type ImageHydrationSafeSnapshot = {
  buildSha: string;
  route: "/workspace/image";
  language: "en" | "zh";
  modelStateCategory: "catalog_pending" | "catalog_ready" | "catalog_unavailable";
  catalogLoaded: boolean;
  draftReady: boolean;
  referenceCount: number;
  resolution: string;
  derivedAspectRatio: string;
  authStateCategory: "loading" | "authenticated" | "anonymous";
};

export type ImageHydrationDiagnostic = ImageHydrationSafeSnapshot & {
  fingerprint: string;
};

function boundedCategory(value: unknown, allowed: readonly string[], fallback: string) {
  const normalized = String(value || "").trim().toLowerCase();
  return allowed.includes(normalized) ? normalized : fallback;
}

function safeBuildSha(value: unknown) {
  const normalized = String(value || "").trim().toLowerCase();
  return /^[a-f0-9]{7,64}$/.test(normalized) ? normalized : "unknown";
}

function safeToken(value: unknown, fallback = "none") {
  const normalized = String(value || "").trim().toLowerCase();
  return /^[a-z0-9:+._-]{1,40}$/.test(normalized) ? normalized : fallback;
}

function fnv1a(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `ihs_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function createImageHydrationDiagnostic(input: Partial<ImageHydrationSafeSnapshot>): ImageHydrationDiagnostic {
  const snapshot: ImageHydrationSafeSnapshot = {
    buildSha: safeBuildSha(input.buildSha),
    route: "/workspace/image",
    language: boundedCategory(input.language, ["en", "zh"], "en") as "en" | "zh",
    modelStateCategory: boundedCategory(
      input.modelStateCategory,
      ["catalog_pending", "catalog_ready", "catalog_unavailable"],
      "catalog_pending",
    ) as ImageHydrationSafeSnapshot["modelStateCategory"],
    catalogLoaded: input.catalogLoaded === true,
    draftReady: input.draftReady === true,
    referenceCount: Math.max(0, Math.min(14, Math.floor(Number(input.referenceCount) || 0))),
    resolution: safeToken(input.resolution),
    derivedAspectRatio: safeToken(input.derivedAspectRatio),
    authStateCategory: boundedCategory(input.authStateCategory, ["loading", "authenticated", "anonymous"], "loading") as ImageHydrationSafeSnapshot["authStateCategory"],
  };
  return Object.freeze({
    ...snapshot,
    fingerprint: fnv1a(JSON.stringify(snapshot)),
  });
}

export function emitImageHydrationDiagnostic(serverFingerprint: string, client: ImageHydrationDiagnostic) {
  if (typeof window === "undefined") return;
  const matches = serverFingerprint === client.fingerprint;
  window.dispatchEvent(new CustomEvent(
    matches ? "shadowedge:image-hydration-initial-state" : "shadowedge:image-hydration-mismatch",
    {
      detail: Object.freeze({
        ...client,
        serverFingerprint: safeToken(serverFingerprint, "missing"),
        clientFingerprint: client.fingerprint,
        matches,
      }),
    },
  ));
}
