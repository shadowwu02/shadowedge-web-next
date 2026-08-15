import type { VideoModel } from "@/types/video";

const artsdanceModelAliases = new Set([
  "seedance_2_0_mini",
  "seedance_2_0_fast",
  "seedance_2_0",
  "seedance_2_5",
  "seedance_2_5_pro",
]);

export function selectWorkspaceProductionCatalog(
  loadedModels: VideoModel[],
  artsdanceProductionEnabled: boolean,
): VideoModel[] {
  const source = Array.isArray(loadedModels) ? loadedModels : [];
  const filtered = artsdanceProductionEnabled
    ? source
    : source.filter((model) => !artsdanceModelAliases.has(model.id.trim().toLowerCase()));

  return filtered.filter((model, index, allModels) =>
    allModels.findIndex((candidate) => candidate.id === model.id) === index,
  );
}

export function isAuthoritativeWorkspaceCatalogReady(models: VideoModel[]): boolean {
  return Array.isArray(models) && models.length > 0;
}
