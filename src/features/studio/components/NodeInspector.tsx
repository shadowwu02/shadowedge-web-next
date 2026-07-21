"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import {
  STUDIO_GENERATION_ORCHESTRATOR_ENABLED,
  STUDIO_HIGGSFIELD_VIDEO_GENERATION_ENABLED,
  STUDIO_MOTION_CONTROL_EXECUTION_ENABLED,
  STUDIO_VIDEO_EDIT_EXECUTION_ENABLED,
} from "@/config/studioFeatures";
import { MAX_STUDIO_VIDEO_TASKS_PER_RUN } from "@/features/studio/runtime/generationQueue";
import { CAMERA_CONTROL_PRESETS } from "@/features/studio/capabilities/studioCapabilities";
import { useStudioStore } from "@/features/studio/store/studioStore";
import {
  formatStudioVideoModelSelectorLabel,
  getStudioVideoModelParameterOptions,
  getStudioVideoModelAvailabilityPresentation,
  normalizeStudioVideoModelParams,
  normalizeStudioVideoModelParamsForChange,
  resolveStudioVideoProviderCostRule,
  resolveStudioVideoGenerationModel,
  type StudioProviderModelInventory,
} from "@/features/studio/capabilities/studioVideoModelResolver";
import { getStudioProviderReadinessBlocker } from "@/features/studio/capabilities/studioProviderReadiness";
import { getImageModels } from "@/lib/image-api";
import { loadStudioProviderModelInventory } from "@/lib/studio-provider-models-api";
import {
  getDefaultImageParams,
  getImageModelById,
} from "@/lib/image/imageModelRules";
import type { ImageModel } from "@/types/image";
import { StudioModelRecommendation } from "@/features/studio/components/StudioModelRecommendation";
import { recordStudioModelRecommendationSelection } from "@/lib/studio-model-recommendation-api";

function InspectorField({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="studio-inspector-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function CharacterAttributesEditor({
  onChange,
  value,
}: {
  onChange: (value: Record<string, string>) => void;
  value: Record<string, string>;
}) {
  const serialized = JSON.stringify(value, null, 2);
  const [draft, setDraft] = useState(serialized);
  const [error, setError] = useState("");

  return (
    <InspectorField label="Attributes (JSON)">
      <textarea
        aria-invalid={Boolean(error)}
        onBlur={() => {
          try {
            const parsed = JSON.parse(draft) as unknown;
            if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
              throw new Error("Attributes must be a JSON object.");
            }
            onChange(
              Object.fromEntries(
                Object.entries(parsed).map(([key, item]) => [key, String(item)]),
              ),
            );
            setError("");
          } catch {
            setError("Use a JSON object such as {\"age\":\"adult\"}.");
          }
        }}
        onChange={(event) => setDraft(event.target.value)}
        rows={5}
        value={draft}
      />
      {error ? <span className="studio-node-error">{error}</span> : null}
    </InspectorField>
  );
}

export function NodeInspector() {
  const nodes = useStudioStore((state) => state.nodes);
  const selectedNodeId = useStudioStore((state) => state.selectedNodeId);
  const updateNodeData = useStudioStore((state) => state.updateNodeData);
  const deleteNode = useStudioStore((state) => state.deleteNode);
  const createVideoNodeFromRemakeShot = useStudioStore(
    (state) => state.createVideoNodeFromRemakeShot,
  );
  const generationPlans = useStudioStore((state) => state.generationPlans);
  const generationQueue = useStudioStore((state) => state.generationQueue);
  const projectId = useStudioStore((state) => state.projectId);
  const createGenerationPlanFromNode = useStudioStore(
    (state) => state.createGenerationPlanFromNode,
  );
  const createGenerationPlan = useStudioStore(
    (state) => state.createGenerationPlan,
  );
  const startGenerationPlan = useStudioStore(
    (state) => state.startGenerationPlan,
  );
  const cancelGenerationPlan = useStudioStore(
    (state) => state.cancelGenerationPlan,
  );
  const selectedNode = nodes.find((node) => node.id === selectedNodeId);
  const selectedGenerationPlan = selectedNode
    ? selectedNode.data.kind === "remakePipeline"
      ? generationPlans.find(
          (plan) =>
            plan.id === selectedNode.data.generationPlanId ||
            (!selectedNode.data.generationPlanId &&
              plan.sourceNodeId === selectedNode.id),
        )
      : selectedNode.data.kind === "videoGenerate" ||
          selectedNode.data.kind === "videoEdit" ||
          selectedNode.data.kind === "motionControl" ||
          selectedNode.data.kind === "cameraControl"
        ? generationPlans.find(
            (plan) =>
              plan.id === selectedNode.data.generationPlanId ||
              plan.items.some((item) => item.nodeId === selectedNode.id),
          )
        : undefined
    : undefined;
  const selectedPlanItemCredits =
    selectedGenerationPlan?.items.map((item) => item.estimatedCredits) || [];
  const selectedPlanUnitCost = selectedPlanItemCredits.length
    ? Math.min(...selectedPlanItemCredits) === Math.max(...selectedPlanItemCredits)
      ? `${selectedPlanItemCredits[0]} credits`
      : `${Math.min(...selectedPlanItemCredits)}–${Math.max(...selectedPlanItemCredits)} credits`
    : "Not calculated";
  const [imageModels, setImageModels] = useState<ImageModel[]>([]);
  const [imageModelsError, setImageModelsError] = useState("");
  const [videoInventory, setVideoInventory] =
    useState<StudioProviderModelInventory | null>(null);
  const videoModels = videoInventory?.models || [];
  const [videoModelsError, setVideoModelsError] = useState("");
  const loadingImageModels =
    selectedNode?.type === "imageGenerate" &&
    !imageModels.length &&
    !imageModelsError;
  const loadingVideoModels =
    selectedNode?.type === "videoGenerate" &&
    !videoInventory &&
    !videoModelsError;

  useEffect(() => {
    if (selectedNode?.type !== "imageGenerate" || imageModels.length) return;
    let cancelled = false;
    void getImageModels()
      .then((models) => {
        if (cancelled) return;
        if (models.length) {
          setImageModels(models);
          setImageModelsError("");
        }
        else setImageModelsError("No image models are currently available.");
      })
      .catch(() => {
        if (!cancelled) setImageModelsError("Image models could not be loaded.");
      });

    return () => {
      cancelled = true;
    };
  }, [imageModels.length, selectedNode?.type]);

  useEffect(() => {
    if (selectedNode?.type !== "videoGenerate" || videoInventory) return;
    let cancelled = false;
    void loadStudioProviderModelInventory("higgsfield", "video_generate")
      .then((inventory) => {
        if (cancelled) return;
        setVideoInventory(inventory);
        if (inventory.models.length) {
          setVideoModelsError("");
        } else {
          setVideoModelsError("No Higgsfield runtime video models are currently available.");
        }
      })
      .catch(() => {
        if (!cancelled) setVideoModelsError("Video models could not be loaded.");
      });

    return () => {
      cancelled = true;
    };
  }, [selectedNode?.type, videoInventory]);

  if (!selectedNode) {
    return (
      <aside className="studio-side-panel studio-inspector" aria-label="Node inspector">
        <div className="studio-panel-heading">
          <p>Inspector</p>
          <h2>No node selected</h2>
          <span>Select a node to edit its P0 data structure.</span>
        </div>
        <div className="studio-empty-inspector">
          <span aria-hidden="true">↖</span>
          <p>Choose a node on the canvas or add one from the library.</p>
        </div>
      </aside>
    );
  }

  const data = selectedNode.data;
  const update = (patch: Record<string, unknown>) =>
    updateNodeData(selectedNode.id, patch);
  const updateText =
    (field: string) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      update({ [field]: event.target.value });
  const selectedImageModel =
    data.kind === "imageGenerate"
      ? getImageModelById(imageModels, data.model)
      : null;
  const imageRatios = selectedImageModel?.capabilities.ratios || [];
  const imageSizes = selectedImageModel?.capabilities.resolutions || [];
  const imageQualities = selectedImageModel?.capabilities.qualities || [];
  const selectedVideoModel =
    data.kind === "videoGenerate"
      ? (() => {
          if (!videoInventory) return null;
          try {
            return resolveStudioVideoGenerationModel(videoInventory, {
              providerId: data.providerId || "higgsfield",
              modelId: data.modelId || data.model,
            });
          } catch {
            return null;
          }
        })()
      : null;
  const selectedInventoryVideoModel =
    data.kind === "videoGenerate"
      ? videoModels.find(
          (model) => model.id === (data.modelId || data.model),
        ) || null
      : null;
  const selectedVideoReadiness = selectedInventoryVideoModel
    ? getStudioVideoModelAvailabilityPresentation(selectedInventoryVideoModel)
    : null;
  const recommendationPromptNode =
    data.kind === "videoGenerate"
      ? nodes.find((node) => node.id === data.promptInput)
      : null;
  const recommendationPrompt =
    recommendationPromptNode?.data.kind === "prompt"
      ? recommendationPromptNode.data.prompt
      : "";
  const recommendationReferenceMedia =
    data.kind === "videoGenerate"
      ? ([
          ...(data.imageInput ? [{ type: "image" as const }] : []),
          ...(data.videoInput ? [{ type: "video" as const }] : []),
        ])
      : [];
  const videoParameterOptions = selectedVideoModel
    ? getStudioVideoModelParameterOptions(selectedVideoModel)
    : null;
  const videoDurations = videoParameterOptions?.durations || [];
  const videoRatios = videoParameterOptions?.ratios || [];
  const videoQualities = videoParameterOptions?.resolutions || [];
  const videoModes = videoParameterOptions?.modes || [];
  const videoAudioOptions = videoParameterOptions?.audio || [];
  const videoAcceptedMediaTypes = new Set(
    videoParameterOptions?.acceptedMediaTypes || [],
  );
  const videoReadinessBlocker = getStudioProviderReadinessBlocker(
    videoInventory?.readiness,
  );
  const videoParameterBlocker = (() => {
    if (data.kind !== "videoGenerate" || !selectedVideoModel) return "";
    try {
      const params = normalizeStudioVideoModelParams(selectedVideoModel, {
        duration: data.duration,
        ratio: data.ratio,
        quality: data.quality,
        resolution: data.resolution,
        mode: data.mode,
        audio: data.generateAudio,
      });
      resolveStudioVideoProviderCostRule(selectedVideoModel, params);
      return "";
    } catch {
      return "Selected parameters are outside the verified cost scope.";
    }
  })();
  const updateVideoParameters = (
    patch: Partial<{
      duration: number;
      ratio: string;
      quality: string;
      resolution: string;
      mode: string;
      audio: boolean;
    }>,
  ) => {
    if (data.kind !== "videoGenerate" || !selectedVideoModel) return;
    const params = normalizeStudioVideoModelParamsForChange(
      selectedVideoModel,
      {
        duration: data.duration,
        ratio: data.ratio,
        quality: data.quality,
        resolution: data.resolution,
        mode: data.mode,
        audio: data.generateAudio,
      },
      patch,
    );
    update({
      duration: params.duration,
      ratio: params.ratio,
      quality: params.quality,
      resolution: params.resolution,
      mode: params.mode,
      generateAudio: params.audio,
    });
  };

  return (
    <aside className="studio-side-panel studio-inspector" aria-label="Node inspector">
      <div className="studio-panel-heading">
        <p>Inspector</p>
        <h2>{data.title}</h2>
        <span>{selectedNode.type} · {selectedNode.id}</span>
      </div>

      <div className="studio-inspector-fields">
        <InspectorField label="Title">
          <input value={data.title} onChange={updateText("title")} />
        </InspectorField>

        {data.kind === "asset" ? (
          <>
            <InspectorField label="Asset ID">
              <input
                placeholder="asset_..."
                value={data.assetId}
                onChange={updateText("assetId")}
              />
            </InspectorField>
            <InspectorField label="Asset type">
              <select value={data.assetType} onChange={updateText("assetType")}>
                <option value="image">Image</option>
                <option value="video">Video</option>
                <option value="audio">Audio</option>
              </select>
            </InspectorField>
            <InspectorField label="Asset URL">
              <input
                placeholder="https://..."
                value={data.url || ""}
                onChange={updateText("url")}
              />
            </InspectorField>
            <InspectorField label="Source">
              <select value={data.source || "upload"} onChange={updateText("source")}>
                <option value="upload">Upload</option>
                <option value="history">History</option>
                <option value="generated">Generated</option>
                <option value="remake">Remake</option>
              </select>
            </InspectorField>
            {data.originNodeId ? (
              <InspectorField label="Origin node">
                <input disabled value={data.originNodeId} />
              </InspectorField>
            ) : null}
            <InspectorField label="Status">
              <select value={data.status} onChange={updateText("status")}>
                <option value="ready">Ready</option>
                <option value="missing">Missing</option>
                <option value="processing">Processing</option>
              </select>
            </InspectorField>
          </>
        ) : null}

        {data.kind === "character" ? (
          <>
            <InspectorField label="Character name">
              <input value={data.name} onChange={updateText("name")} />
            </InspectorField>
            <InspectorField label="Reference image URLs">
              <textarea
                placeholder="One existing asset URL per line"
                rows={5}
                value={data.referenceImages.join("\n")}
                onChange={(event) =>
                  update({
                    referenceImages: event.target.value
                      .split(/\r?\n/)
                      .map((value) => value.trim())
                      .filter(Boolean),
                  })
                }
              />
            </InspectorField>
            <InspectorField label="Description">
              <textarea rows={4} value={data.description} onChange={updateText("description")} />
            </InspectorField>
            <InspectorField label="Style">
              <input value={data.style} onChange={updateText("style")} />
            </InspectorField>
            <CharacterAttributesEditor
              key={`${selectedNode.id}-${JSON.stringify(data.attributes)}`}
              onChange={(attributes) => update({ attributes })}
              value={data.attributes}
            />
            <p className="studio-node-footnote">
              Metadata only. References are not analyzed, embedded, trained, or sent to a provider.
            </p>
          </>
        ) : null}

        {data.kind === "prompt" ? (
          <>
            <InspectorField label="Prompt">
              <textarea rows={6} value={data.prompt} onChange={updateText("prompt")} />
            </InspectorField>
            <InspectorField label="Style">
              <input value={data.style} onChange={updateText("style")} />
            </InspectorField>
            <InspectorField label="Camera">
              <input value={data.camera} onChange={updateText("camera")} />
            </InspectorField>
            <div className="studio-inspector-grid">
              <InspectorField label="Duration">
                <input
                  min={1}
                  type="number"
                  value={data.duration}
                  onChange={(event) =>
                    update({ duration: Math.max(1, Number(event.target.value) || 1) })
                  }
                />
              </InspectorField>
              <InspectorField label="Ratio">
                <select value={data.ratio} onChange={updateText("ratio")}>
                  <option value="16:9">16:9</option>
                  <option value="9:16">9:16</option>
                  <option value="1:1">1:1</option>
                  <option value="4:5">4:5</option>
                </select>
              </InspectorField>
            </div>
          </>
        ) : null}

        {data.kind === "remakeAnalysis" ? (
          <>
            <InspectorField label="Video input node ID">
              <input
                placeholder="Connect a Video Asset Node"
                value={data.videoInput}
                onChange={updateText("videoInput")}
              />
            </InspectorField>
            <div className="studio-inspector-grid">
              <InspectorField label="Mode">
                <input disabled value="Single clip" />
              </InspectorField>
              <InspectorField label="Target ratio">
                <select value={data.targetRatio} onChange={updateText("targetRatio")}>
                  <option value="16:9">16:9</option>
                  <option value="9:16">9:16</option>
                  <option value="1:1">1:1</option>
                  <option value="4:5">4:5</option>
                </select>
              </InspectorField>
            </div>
            <InspectorField label="Target region">
              <select value={data.targetRegion} onChange={updateText("targetRegion")}>
                <option value="US">US</option>
                <option value="Middle East">Middle East</option>
                <option value="Japan">Japan</option>
                <option value="Southeast Asia">Southeast Asia</option>
              </select>
            </InspectorField>
            <InspectorField label="Character rules">
              <textarea
                rows={3}
                value={data.characterRules}
                onChange={updateText("characterRules")}
              />
            </InspectorField>
            <InspectorField label="Scene style">
              <textarea rows={3} value={data.sceneStyle} onChange={updateText("sceneStyle")} />
            </InspectorField>
            <InspectorField label="Translate dialogue">
              <select
                value={data.translateDialogue ? "yes" : "no"}
                onChange={(event) => update({ translateDialogue: event.target.value === "yes" })}
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </InspectorField>
            <div className="studio-inspector-grid">
              <InspectorField label="Status">
                <input disabled value={data.status} />
              </InspectorField>
              <InspectorField label="Shots">
                <input disabled value={data.shotCount} />
              </InspectorField>
            </div>
            {data.storyboardId ? (
              <InspectorField label="Storyboard ID">
                <input disabled value={data.storyboardId} />
              </InspectorField>
            ) : null}
            {data.errorMessage ? (
              <div className="studio-inspector-runtime-error" role="alert">
                <strong>{data.errorCode || "REMAKE_ANALYSIS_FAILED"}</strong>
                <span>{data.errorMessage}</span>
              </div>
            ) : null}
          </>
        ) : null}

        {data.kind === "remakePipeline" ? (
          <>
            <InspectorField label="Source video">
              <input
                disabled
                placeholder="Connect the analyzed Video Asset"
                value={data.sourceVideo?.sourceNodeId || ""}
              />
            </InspectorField>
            <InspectorField label="Completed analysis">
              <input
                disabled
                placeholder="Connect or reuse a completed Remake Analysis"
                value={data.analysisNodeId}
              />
            </InspectorField>
            <div className="studio-inspector-grid">
              <InspectorField label="Shots">
                <input disabled value={data.shotCount} />
              </InspectorField>
              <InspectorField label="Video nodes">
                <input disabled value={data.videoNodeCount} />
              </InspectorField>
            </div>
            <div className="studio-inspector-grid">
              <InspectorField label="Timeline clips">
                <input disabled value={data.timelineClipCount} />
              </InspectorField>
              <InspectorField label="Confirmation">
                <input disabled value={data.confirmationState} />
              </InspectorField>
            </div>
            <div className="studio-node-copy" role="status">
              <strong>Remake Plan</strong>
              <span>
                {data.status === "completed"
                  ? `${data.shotCount} shots / ${data.videoNodeCount} planned videos / Timeline ready`
                  : "Run this node after Remake Analysis has created Shot Nodes."}
              </span>
            </div>
            {selectedGenerationPlan ? (
              <>
                <div className="studio-inspector-grid">
                  <InspectorField label="Queue status">
                    <input disabled value={selectedGenerationPlan.status} />
                  </InspectorField>
                  <InspectorField label="Video tasks">
                    <input disabled value={selectedGenerationPlan.items.length} />
                  </InspectorField>
                </div>
                <div className="studio-inspector-grid">
                  <InspectorField label="Per-task credits">
                    <input disabled value={selectedPlanUnitCost} />
                  </InspectorField>
                  <InspectorField label="Estimated total">
                    <input disabled value={`${selectedGenerationPlan.estimatedCredits} credits`} />
                  </InspectorField>
                </div>
              </>
            ) : null}
            <p className="studio-node-footnote">
              Video tasks: {selectedGenerationPlan?.items.length || data.videoNodeCount} / concurrency: 1
            </p>
            <button
              className="studio-node-action"
              disabled={data.status !== "completed" || generationQueue.running}
              onClick={() => createGenerationPlan(selectedNode.id)}
              type="button"
            >
              Generate Plan
            </button>
            <button
              className="studio-node-action"
              disabled={
                !selectedGenerationPlan ||
                generationQueue.running ||
                selectedGenerationPlan.status !== "draft"
              }
              onClick={() => {
                if (selectedGenerationPlan) {
                  void startGenerationPlan(selectedGenerationPlan.id);
                }
              }}
              title={
                STUDIO_GENERATION_ORCHESTRATOR_ENABLED
                  ? "Confirm and run the controlled paid video queue"
                  : "STUDIO_GENERATION_DISABLED"
              }
              type="button"
            >
              Start Generation
            </button>
            <button
              className="studio-node-action"
              disabled={
                !selectedGenerationPlan ||
                selectedGenerationPlan.status === "completed" ||
                selectedGenerationPlan.status === "cancelled"
              }
              onClick={() => {
                if (selectedGenerationPlan) {
                  cancelGenerationPlan(selectedGenerationPlan.id);
                }
              }}
              type="button"
            >
              Cancel
            </button>
            <p className="studio-node-footnote">
              Cost uses existing model rules. Real worker {STUDIO_GENERATION_ORCHESTRATOR_ENABLED ? "enabled" : "disabled"}; concurrency 1, max {MAX_STUDIO_VIDEO_TASKS_PER_RUN} tasks, no automatic retry.
            </p>
            {data.errorMessage ? (
              <div className="studio-inspector-runtime-error" role="alert">
                <strong>{data.errorCode || "REMAKE_PIPELINE_FAILED"}</strong>
                <span>{data.errorMessage}</span>
              </div>
            ) : null}
          </>
        ) : null}

        {data.kind === "remakeShot" ? (
          <>
            <div className="studio-inspector-grid">
              <InspectorField label="Shot ID">
                <input disabled value={data.shotId} />
              </InspectorField>
              <InspectorField label="Duration">
                <input
                  min={1}
                  type="number"
                  value={data.duration}
                  onChange={(event) =>
                    update({ duration: Math.max(1, Number(event.target.value) || 1) })
                  }
                />
              </InspectorField>
            </div>
            <InspectorField label="Description">
              <textarea rows={4} value={data.description} onChange={updateText("description")} />
            </InspectorField>
            <InspectorField label="Prompt">
              <textarea rows={7} value={data.prompt} onChange={updateText("prompt")} />
            </InspectorField>
            <InspectorField label="Camera">
              <input value={data.camera} onChange={updateText("camera")} />
            </InspectorField>
            <InspectorField label="Character refs">
              <input disabled value={data.characterRefs.join(", ")} />
            </InspectorField>
            <div className="studio-inspector-grid">
              <InspectorField label="Model">
                <input value={data.model} onChange={updateText("model")} />
              </InspectorField>
              <InspectorField label="Ratio">
                <input value={data.ratio} onChange={updateText("ratio")} />
              </InspectorField>
            </div>
            <InspectorField label="Reference frames">
              <textarea
                rows={4}
                value={data.referenceFrames.join("\n")}
                onChange={(event) =>
                  update({
                    referenceFrames: event.target.value
                      .split("\n")
                      .map((value) => value.trim())
                      .filter(Boolean),
                  })
                }
              />
            </InspectorField>
            <button
              className="studio-node-action"
              onClick={() => createVideoNodeFromRemakeShot(selectedNode.id)}
              type="button"
            >
              Create Video Node
            </button>
            <p className="studio-node-footnote">The new video node is not run automatically.</p>
          </>
        ) : null}

        {data.kind === "imageGenerate" ? (
          <>
            <InspectorField label="Advanced model selector">
              <select
                disabled={loadingImageModels || !imageModels.length}
                value={selectedImageModel?.id || data.model}
                onChange={(event) => {
                  const model = getImageModelById(imageModels, event.target.value);
                  const defaults = getDefaultImageParams(model);
                  update({
                    model: model.id,
                    ratio: defaults.ratio,
                    quality: defaults.quality,
                    size: defaults.resolution,
                    count: defaults.batchCount,
                  });
                }}
              >
                {!imageModels.length ? (
                  <option value={data.model}>{loadingImageModels ? "Loading models..." : data.model}</option>
                ) : null}
                {imageModels.map((model) => (
                  <option key={model.id} value={model.id}>{model.label}</option>
                ))}
              </select>
            </InspectorField>
            {imageModelsError ? <p className="studio-inspector-error">{imageModelsError}</p> : null}
            <div className="studio-inspector-grid">
              <InspectorField label="Ratio">
                <select value={data.ratio || "auto"} onChange={updateText("ratio")}>
                  {!imageRatios.includes(data.ratio || "auto") ? (
                    <option value={data.ratio || "auto"}>{data.ratio || "auto"}</option>
                  ) : null}
                  {imageRatios.map((ratio) => <option key={ratio} value={ratio}>{ratio}</option>)}
                </select>
              </InspectorField>
              <InspectorField label="Count">
                <input
                  max={selectedImageModel?.capabilities.maxBatchCount || 1}
                  min={1}
                  type="number"
                  value={data.count || 1}
                  onChange={(event) =>
                    update({
                      count: Math.max(
                        1,
                        Math.min(
                          selectedImageModel?.capabilities.maxBatchCount || 1,
                          Number(event.target.value) || 1,
                        ),
                      ),
                    })
                  }
                />
              </InspectorField>
            </div>
            <div className="studio-inspector-grid">
              <InspectorField label="Size">
                <select value={data.size || ""} onChange={updateText("size")}>
                  <option value="">Default</option>
                  {imageSizes.map((size) => <option key={size} value={size}>{size}</option>)}
                </select>
              </InspectorField>
              <InspectorField label="Quality">
                <select value={data.quality || ""} onChange={updateText("quality")}>
                  <option value="">Default</option>
                  {imageQualities.map((quality) => <option key={quality} value={quality}>{quality}</option>)}
                </select>
              </InspectorField>
            </div>
            <InspectorField label="Prompt input">
              <input value={data.promptInput} onChange={updateText("promptInput")} />
            </InspectorField>
            <InspectorField label="Asset input">
              <input value={data.assetInput} onChange={updateText("assetInput")} />
            </InspectorField>
            <InspectorField label="Status">
              <input disabled value={data.status || "idle"} />
            </InspectorField>
            <InspectorField label="Job ID">
              <input disabled placeholder="Created after Run" value={data.jobId || ""} />
            </InspectorField>
            <InspectorField label="Image result">
              <input
                disabled
                placeholder="Available after completion"
                value={data.imageUrl || data.result || ""}
              />
            </InspectorField>
            {data.errorMessage ? (
              <div className="studio-inspector-runtime-error" role="alert">
                <strong>{data.errorCode || "IMAGE_GENERATION_FAILED"}</strong>
                <span>{data.errorMessage}</span>
              </div>
            ) : null}
          </>
        ) : null}

        {data.kind === "videoGenerate" ? (
          <>
            <InspectorField label="Provider">
              <input disabled value={data.providerId || "higgsfield"} />
            </InspectorField>
            <InspectorField label="Model">
              <select
                disabled={loadingVideoModels || !videoModels.length}
                value={selectedVideoModel?.id || data.modelId || data.model}
                onChange={(event) => {
                  const model = videoModels.find((item) => item.id === event.target.value);
                  if (!model) return;
                  const params = normalizeStudioVideoModelParams(model, {
                    mode: model.metadata.defaultMode,
                    audio: false,
                  });
                  const selectedAt = new Date().toISOString();
                  const modelRecommendation = data.modelRecommendation
                    ? {
                        ...data.modelRecommendation,
                        selectedProviderId: model.providerId,
                        selectedModelId: model.id,
                        accepted: model.id === data.modelRecommendation.recommendedModelId,
                        selectedAt,
                      }
                    : undefined;
                  update({
                    providerId: model.providerId,
                    modelId: model.id,
                    model: model.id,
                    duration: params.duration,
                    ratio: params.ratio,
                    quality: params.quality,
                    resolution: params.resolution,
                    mode: params.mode,
                    generateAudio: params.audio,
                    ...(modelRecommendation ? { modelRecommendation } : {}),
                  });
                  if (modelRecommendation) {
                    void recordStudioModelRecommendationSelection(
                      modelRecommendation.recommendationId,
                      model.id,
                      model.providerId,
                    ).catch(() => undefined);
                  }
                }}
              >
                {!videoModels.length ? (
                  <option value={data.modelId || data.model}>
                    {loadingVideoModels ? "Loading runtime inventory..." : data.model}
                  </option>
                ) : null}
                {videoModels.length && !selectedVideoModel ? (
                  <option value={data.modelId || data.model}>
                    Unavailable: {data.modelId || data.model}
                  </option>
                ) : null}
                {videoModels.map((model) => (
                  <option
                    disabled={!getStudioVideoModelAvailabilityPresentation(model).selectable}
                    key={model.id}
                    value={model.id}
                  >
                    {formatStudioVideoModelSelectorLabel(model)}
                  </option>
                ))}
              </select>
            </InspectorField>
            {selectedVideoReadiness ? (
              <div
                className={`studio-model-readiness studio-model-readiness-${selectedVideoReadiness.status.toLowerCase()}`}
                role="status"
              >
                <strong>
                  {selectedVideoReadiness.indicator} {selectedVideoReadiness.label}
                </strong>
                <span>{selectedVideoReadiness.reason}</span>
                <span>Cost: {selectedVideoReadiness.costLabel}</span>
              </div>
            ) : null}
            {videoInventory ? (
              <StudioModelRecommendation
                duration={data.duration}
                inventory={videoInventory}
                onApply={update}
                onObserved={(modelRecommendation) => update({ modelRecommendation })}
                prompt={recommendationPrompt}
                qualityGoal={data.quality || data.resolution}
                ratio={data.ratio}
                referenceMedia={recommendationReferenceMedia}
              />
            ) : null}
            {videoModelsError ? <p className="studio-inspector-error">{videoModelsError}</p> : null}
            {videoInventory && videoReadinessBlocker ? (
              <div className="studio-inspector-runtime-error" role="alert">
                <strong>{videoReadinessBlocker.code}</strong>
                <span>{videoReadinessBlocker.message}</span>
              </div>
            ) : null}
            {videoParameterBlocker ? (
              <p className="studio-inspector-error">{videoParameterBlocker}</p>
            ) : null}
            {!STUDIO_HIGGSFIELD_VIDEO_GENERATION_ENABLED ? (
              <p className="studio-node-footnote">
                Runtime models are visible, but Studio Higgsfield execution is disabled by feature flag.
              </p>
            ) : null}
            <div className="studio-inspector-grid">
              <InspectorField label="Duration">
                <select
                  value={String(data.duration)}
                  disabled={!selectedVideoModel}
                  onChange={(event) =>
                    updateVideoParameters({ duration: Number(event.target.value) })
                  }
                >
                  {!videoDurations.includes(data.duration) ? (
                    <option disabled value={data.duration}>{data.duration}s — unavailable</option>
                  ) : null}
                  {videoDurations.map((duration) => (
                    <option key={duration} value={duration}>{duration}s</option>
                  ))}
                </select>
              </InspectorField>
              <InspectorField label="Ratio">
                <select
                  disabled={!selectedVideoModel}
                  value={data.ratio}
                  onChange={(event) =>
                    updateVideoParameters({ ratio: event.target.value })
                  }
                >
                  {!videoRatios.includes(data.ratio) ? (
                    <option disabled value={data.ratio}>{data.ratio} — unavailable</option>
                  ) : null}
                  {videoRatios.map((ratio) => (
                    <option key={ratio} value={ratio}>{ratio}</option>
                  ))}
                </select>
              </InspectorField>
            </div>
            <div className="studio-inspector-grid">
              <InspectorField label="Mode">
                <select
                  value={data.mode || selectedVideoModel?.metadata.defaultMode || "std"}
                  disabled={!selectedVideoModel}
                  onChange={(event) =>
                    updateVideoParameters({ mode: event.target.value })
                  }
                >
                  {(videoModes.length ? videoModes : ["std"]).map((mode) => (
                    <option key={mode} value={mode}>{mode}</option>
                  ))}
                </select>
              </InspectorField>
              <InspectorField label="Generate audio">
                <select
                  value={
                    typeof data.generateAudio === "boolean"
                      ? String(data.generateAudio)
                      : videoAudioOptions.length
                        ? String(videoAudioOptions[0])
                        : ""
                  }
                  disabled={!selectedVideoModel || videoAudioOptions.length <= 1}
                  onChange={(event) =>
                    updateVideoParameters({ audio: event.target.value === "true" })
                  }
                >
                  {videoAudioOptions.map((audio) => (
                    <option key={String(audio)} value={String(audio)}>
                      {audio ? "On" : "Off"}
                    </option>
                  ))}
                </select>
              </InspectorField>
            </div>
            <div className="studio-inspector-grid">
              <InspectorField label="Quality">
                <select
                  value={data.quality}
                  disabled={!selectedVideoModel}
                  onChange={(event) =>
                    updateVideoParameters({
                      quality: event.target.value,
                      resolution: event.target.value,
                    })
                  }
                >
                  {!videoQualities.includes(data.quality) ? (
                    <option disabled value={data.quality}>{data.quality} — unavailable</option>
                  ) : null}
                  {videoQualities.map((quality) => (
                    <option key={quality} value={quality}>{quality}</option>
                  ))}
                </select>
              </InspectorField>
              <InspectorField label="Resolution">
                <input disabled value={data.resolution} />
              </InspectorField>
            </div>
            <InspectorField label="Prompt input">
              <input value={data.promptInput} onChange={updateText("promptInput")} />
            </InspectorField>
            <InspectorField label="Image input">
              <input
                disabled={Boolean(selectedVideoModel) && !videoAcceptedMediaTypes.has("image")}
                placeholder={
                  selectedVideoModel && !videoAcceptedMediaTypes.has("image")
                    ? "Not supported by this model"
                    : undefined
                }
                value={data.imageInput}
                onChange={updateText("imageInput")}
              />
            </InspectorField>
            <InspectorField label="Video input">
              <input
                disabled={Boolean(selectedVideoModel) && !videoAcceptedMediaTypes.has("video")}
                placeholder={
                  selectedVideoModel && !videoAcceptedMediaTypes.has("video")
                    ? "Not supported by this model"
                    : undefined
                }
                value={data.videoInput}
                onChange={updateText("videoInput")}
              />
            </InspectorField>
            <InspectorField label="Status">
              <input disabled value={data.status || "idle"} />
            </InspectorField>
            {data.queueStatus ? (
              <InspectorField label="Queue status">
                <input disabled value={data.queueStatus} />
              </InspectorField>
            ) : null}
            <div className="studio-node-copy" role="status">
              <strong>Generation Plan</strong>
              <span>
                {selectedGenerationPlan
                  ? `${selectedGenerationPlan.items.length} Video task · ${selectedGenerationPlan.status}`
                  : "Run creates a cost preview. No provider call occurs before confirmation."}
              </span>
            </div>
            {selectedGenerationPlan ? (
              <>
                <div className="studio-inspector-grid">
                  <InspectorField label="Plan status">
                    <input disabled value={selectedGenerationPlan.status} />
                  </InspectorField>
                  <InspectorField label="Tasks">
                    <input disabled value={selectedGenerationPlan.items.length} />
                  </InspectorField>
                </div>
                <div className="studio-inspector-grid">
                  <InspectorField label="Model">
                    <input disabled value={data.model} />
                  </InspectorField>
                  <InspectorField label="Estimated cost">
                    <input
                      disabled
                      value={`${selectedGenerationPlan.estimatedCredits} credits`}
                    />
                  </InspectorField>
                </div>
              </>
            ) : null}
            <button
              className="studio-node-action"
              disabled={
                generationQueue.running ||
                Boolean(videoReadinessBlocker) ||
                Boolean(videoParameterBlocker) ||
                !selectedVideoModel ||
                (data.status === "completed" && Boolean(data.videoUrl || data.result))
              }
              onClick={() =>
                createGenerationPlanFromNode({
                  nodeId: selectedNode.id,
                  nodeType: "videoGenerate",
                  projectId,
                })
              }
              type="button"
            >
              {selectedGenerationPlan ? "Review Generation Plan" : "Create Generation Plan"}
            </button>
            <button
              className="studio-node-action"
              disabled={
                !selectedGenerationPlan ||
                generationQueue.running ||
                Boolean(videoReadinessBlocker) ||
                Boolean(videoParameterBlocker) ||
                !selectedVideoModel ||
                selectedGenerationPlan.status !== "draft"
              }
              onClick={() => {
                if (selectedGenerationPlan) {
                  void startGenerationPlan(selectedGenerationPlan.id);
                }
              }}
              title={
                STUDIO_GENERATION_ORCHESTRATOR_ENABLED
                  ? "Confirm and run the controlled paid video queue"
                  : "STUDIO_GENERATION_DISABLED"
              }
              type="button"
            >
              Confirm Generation
            </button>
            <button
              className="studio-node-action"
              disabled={
                !selectedGenerationPlan ||
                selectedGenerationPlan.status === "completed" ||
                selectedGenerationPlan.status === "cancelled"
              }
              onClick={() => {
                if (selectedGenerationPlan) {
                  cancelGenerationPlan(selectedGenerationPlan.id);
                }
              }}
              type="button"
            >
              Cancel
            </button>
            <p className="studio-node-footnote">
              {data.duration}s · {data.ratio} · concurrency 1 · no automatic retry
            </p>
            <InspectorField label="Job ID">
              <input disabled placeholder="Created after confirmation" value={data.jobId || ""} />
            </InspectorField>
            <InspectorField label="Video result">
              <input
                disabled
                placeholder="Available after completion"
                value={data.videoUrl || data.result || ""}
              />
            </InspectorField>
            <InspectorField label="Character refs">
              <input disabled value={data.characterRefs.join(", ")} />
            </InspectorField>
            {data.errorMessage ? (
              <div className="studio-inspector-runtime-error" role="alert">
                <strong>{data.errorCode || "VIDEO_GENERATION_FAILED"}</strong>
                <span>{data.errorMessage}</span>
              </div>
            ) : null}
          </>
        ) : null}

        {data.kind === "videoEdit" ? (
          <>
            <InspectorField label="Mode">
              <select value={data.mode} onChange={updateText("mode")}>
                <option value="video_to_video">Video To Video</option>
                <option value="replace_background">Replace Background</option>
                <option value="extend">Extend Video</option>
              </select>
            </InspectorField>
            <InspectorField label="Edit prompt">
              <textarea
                maxLength={2_000}
                placeholder="Change the background to a futuristic city"
                rows={7}
                value={data.prompt}
                onChange={updateText("prompt")}
              />
            </InspectorField>
            <InspectorField label="Source video">
              <input
                disabled
                placeholder="Connect a Video Asset Node"
                value={data.sourceVideo?.sourceNodeId || ""}
              />
            </InspectorField>
            <div className="studio-inspector-grid">
              <InspectorField label="Status">
                <input disabled value={data.status} />
              </InspectorField>
              <InspectorField label="Execution">
                <input
                  disabled
                  value={
                    data.result?.mock
                      ? "Mock Completed"
                      : STUDIO_VIDEO_EDIT_EXECUTION_ENABLED
                        ? "Provider gate enabled / mock adapter"
                        : "Mock adapter only"
                  }
                />
              </InspectorField>
            </div>
            {data.queueStatus ? (
              <InspectorField label="Queue status">
                <input disabled value={data.queueStatus} />
              </InspectorField>
            ) : null}
            <div className="studio-node-copy" role="status">
              <strong>Edit Generation Plan</strong>
              <span>
                {selectedGenerationPlan
                  ? `${selectedGenerationPlan.items.length} Video Edit task · ${selectedGenerationPlan.status}`
                  : "Create a zero-credit mock plan before queue execution."}
              </span>
            </div>
            {selectedGenerationPlan ? (
              <div className="studio-inspector-grid">
                <InspectorField label="Plan status">
                  <input disabled value={selectedGenerationPlan.status} />
                </InspectorField>
                <InspectorField label="Estimated cost">
                  <input disabled value={`${selectedGenerationPlan.estimatedCredits} credits`} />
                </InspectorField>
              </div>
            ) : null}
            <button
              className="studio-node-action"
              disabled={
                generationQueue.running ||
                (data.status === "completed" && Boolean(data.result?.videoUrl))
              }
              onClick={() =>
                createGenerationPlanFromNode({
                  nodeId: selectedNode.id,
                  nodeType: "video_edit",
                  projectId,
                })
              }
              type="button"
            >
              {selectedGenerationPlan ? "Review Edit Plan" : "Create Edit Generation Plan"}
            </button>
            <button
              className="studio-node-action"
              disabled={
                !selectedGenerationPlan ||
                generationQueue.running ||
                selectedGenerationPlan.status !== "draft"
              }
              onClick={() => {
                if (selectedGenerationPlan) void startGenerationPlan(selectedGenerationPlan.id);
              }}
              type="button"
            >
              Confirm Mock Edit
            </button>
            <button
              className="studio-node-action"
              disabled={
                !selectedGenerationPlan ||
                selectedGenerationPlan.status === "completed" ||
                selectedGenerationPlan.status === "cancelled"
              }
              onClick={() => {
                if (selectedGenerationPlan) cancelGenerationPlan(selectedGenerationPlan.id);
              }}
              type="button"
            >
              Cancel
            </button>
            <InspectorField label="Result video">
              <input
                disabled
                placeholder="Mock result appears after Run"
                value={data.result?.videoUrl || ""}
              />
            </InspectorField>
            <p className="studio-node-footnote">
              P2-A1 uses the unified queue and a local adapter. It never calls a provider or charges credits.
            </p>
            {data.errorMessage ? (
              <div className="studio-inspector-runtime-error" role="alert">
                <strong>{data.errorCode || "VIDEO_EDIT_FAILED"}</strong>
                <span>{data.errorMessage}</span>
              </div>
            ) : null}
          </>
        ) : null}

        {data.kind === "motionControl" ? (
          <>
            <InspectorField label="Mode">
              <select value={data.mode} onChange={updateText("mode")}>
                <option value="character_motion">Character Motion</option>
                <option value="camera_motion">Camera Motion</option>
                <option value="motion_transfer">Motion Transfer</option>
              </select>
            </InspectorField>
            <InspectorField label="Motion prompt">
              <textarea
                maxLength={2_000}
                placeholder="Preserve identity and transfer the reference action"
                rows={6}
                value={data.prompt}
                onChange={updateText("prompt")}
              />
            </InspectorField>
            <div className="studio-inspector-grid">
              <InspectorField label="Character image">
                <input
                  disabled
                  placeholder="Connect a Character or Image Asset"
                  value={data.characterRefs.join(", ") || data.sourceImage?.sourceNodeId || ""}
                />
              </InspectorField>
              <InspectorField label="Motion video">
                <input
                  disabled
                  placeholder="Connect a Video Asset"
                  value={data.motionReferenceVideo?.sourceNodeId || ""}
                />
              </InspectorField>
            </div>
            <div className="studio-inspector-grid">
              <InspectorField label="Status">
                <input disabled value={data.status} />
              </InspectorField>
              <InspectorField label="Execution">
                <input
                  disabled
                  value={
                    data.result?.mock
                      ? "Mock Completed"
                      : STUDIO_MOTION_CONTROL_EXECUTION_ENABLED
                        ? "Provider gate enabled / mock adapter"
                        : "Mock adapter only"
                  }
                />
              </InspectorField>
            </div>
            {data.queueStatus ? (
              <InspectorField label="Queue status">
                <input disabled value={data.queueStatus} />
              </InspectorField>
            ) : null}
            <div className="studio-node-copy" role="status">
              <strong>Motion Generation Plan</strong>
              <span>
                {selectedGenerationPlan
                  ? `${selectedGenerationPlan.items.length} Motion task · ${selectedGenerationPlan.status}`
                  : "Create a zero-credit mock plan before queue execution."}
              </span>
            </div>
            {selectedGenerationPlan ? (
              <div className="studio-inspector-grid">
                <InspectorField label="Plan status">
                  <input disabled value={selectedGenerationPlan.status} />
                </InspectorField>
                <InspectorField label="Estimated cost">
                  <input disabled value={`${selectedGenerationPlan.estimatedCredits} credits`} />
                </InspectorField>
              </div>
            ) : null}
            <button
              className="studio-node-action"
              disabled={
                generationQueue.running ||
                (data.status === "completed" && Boolean(data.result?.videoUrl))
              }
              onClick={() =>
                createGenerationPlanFromNode({
                  nodeId: selectedNode.id,
                  nodeType: "motion_control",
                  projectId,
                })
              }
              type="button"
            >
              {selectedGenerationPlan
                ? "Review Motion Plan"
                : "Create Motion Generation Plan"}
            </button>
            <button
              className="studio-node-action"
              disabled={
                !selectedGenerationPlan ||
                generationQueue.running ||
                selectedGenerationPlan.status !== "draft"
              }
              onClick={() => {
                if (selectedGenerationPlan) void startGenerationPlan(selectedGenerationPlan.id);
              }}
              type="button"
            >
              Confirm Mock Motion
            </button>
            <button
              className="studio-node-action"
              disabled={
                !selectedGenerationPlan ||
                selectedGenerationPlan.status === "completed" ||
                selectedGenerationPlan.status === "cancelled"
              }
              onClick={() => {
                if (selectedGenerationPlan) cancelGenerationPlan(selectedGenerationPlan.id);
              }}
              type="button"
            >
              Cancel
            </button>
            <InspectorField label="Result video">
              <input
                disabled
                placeholder="Mock result appears after Queue execution"
                value={data.result?.videoUrl || ""}
              />
            </InspectorField>
            <p className="studio-node-footnote">
              P2-A2 uses a local adapter and reference-video pass-through. It never calls a provider or charges credits.
            </p>
            {data.errorMessage ? (
              <div className="studio-inspector-runtime-error" role="alert">
                <strong>{data.errorCode || "MOTION_CONTROL_FAILED"}</strong>
                <span>{data.errorMessage}</span>
              </div>
            ) : null}
          </>
        ) : null}

        {data.kind === "cameraControl" ? (
          <>
            <InspectorField label="Camera preset">
              <select value={data.preset} onChange={updateText("preset")}>
                {CAMERA_CONTROL_PRESETS.map((preset) => (
                  <option key={preset} value={preset}>
                    {preset[0].toUpperCase() + preset.slice(1)}
                  </option>
                ))}
              </select>
            </InspectorField>
            <InspectorField label="Camera prompt">
              <textarea
                maxLength={2_000}
                placeholder="Slow dolly in while preserving the subject"
                rows={5}
                value={data.prompt}
                onChange={updateText("prompt")}
              />
            </InspectorField>
            <div className="studio-inspector-grid">
              <InspectorField label="Duration">
                <input
                  min={1}
                  type="number"
                  value={data.duration}
                  onChange={(event) =>
                    update({ duration: Math.max(1, Number(event.target.value) || 1) })
                  }
                />
              </InspectorField>
              <InspectorField label="Strength (optional)">
                <input
                  max={1}
                  min={0}
                  placeholder="Provider-dependent"
                  step={0.1}
                  type="number"
                  value={data.strength ?? ""}
                  onChange={(event) =>
                    update({
                      strength: event.target.value
                        ? Math.min(1, Math.max(0, Number(event.target.value)))
                        : undefined,
                    })
                  }
                />
              </InspectorField>
            </div>
            <InspectorField label="Character / image input">
              <input
                disabled
                placeholder="Connect a Character or Image Asset"
                value={data.characterRefs.join(", ") || data.sourceImage?.sourceNodeId || ""}
              />
            </InspectorField>
            <div className="studio-inspector-grid">
              <InspectorField label="Status">
                <input disabled value={data.status} />
              </InspectorField>
              <InspectorField label="Execution">
                <input disabled value={data.result?.mock ? "Mock Completed" : "Mock adapter only"} />
              </InspectorField>
            </div>
            <div className="studio-node-copy" role="status">
              <strong>Camera Generation Plan</strong>
              <span>
                {selectedGenerationPlan
                  ? `${selectedGenerationPlan.items.length} Camera task / ${selectedGenerationPlan.status}`
                  : "Create a zero-credit mock plan before queue execution."}
              </span>
            </div>
            <button
              className="studio-node-action"
              disabled={
                generationQueue.running ||
                (data.status === "completed" && Boolean(data.result?.videoUrl))
              }
              onClick={() =>
                createGenerationPlanFromNode({
                  nodeId: selectedNode.id,
                  nodeType: "camera_control",
                  projectId,
                })
              }
              type="button"
            >
              {selectedGenerationPlan ? "Review Camera Plan" : "Create Camera Generation Plan"}
            </button>
            <button
              className="studio-node-action"
              disabled={
                !selectedGenerationPlan ||
                generationQueue.running ||
                selectedGenerationPlan.status !== "draft"
              }
              onClick={() => {
                if (selectedGenerationPlan) void startGenerationPlan(selectedGenerationPlan.id);
              }}
              type="button"
            >
              Confirm Mock Camera
            </button>
            <button
              className="studio-node-action"
              disabled={
                !selectedGenerationPlan ||
                selectedGenerationPlan.status === "completed" ||
                selectedGenerationPlan.status === "cancelled"
              }
              onClick={() => {
                if (selectedGenerationPlan) cancelGenerationPlan(selectedGenerationPlan.id);
              }}
              type="button"
            >
              Cancel
            </button>
            <p className="studio-node-footnote">
              P2-A4 stores provider-neutral camera metadata and runs only the local mock.
            </p>
            {data.errorMessage ? (
              <div className="studio-inspector-runtime-error" role="alert">
                <strong>{data.errorCode || "CAMERA_CONTROL_FAILED"}</strong>
                <span>{data.errorMessage}</span>
              </div>
            ) : null}
          </>
        ) : null}

        {data.kind === "output" ? (
          <>
            <InspectorField label="Result preview">
              <textarea
                rows={4}
                value={data.resultPreview}
                onChange={updateText("resultPreview")}
              />
            </InspectorField>
            <InspectorField label="Type">
              <select value={data.outputType} onChange={updateText("outputType")}>
                <option value="image">Image</option>
                <option value="video">Video</option>
                <option value="audio">Audio</option>
              </select>
            </InspectorField>
            <InspectorField label="Created time">
              <input
                placeholder="Not created"
                value={data.createdAt}
                onChange={updateText("createdAt")}
              />
            </InspectorField>
            <InspectorField label="Status">
              <input disabled value={data.status || "idle"} />
            </InspectorField>
            <InspectorField label="Job ID">
              <input disabled value={data.jobId || ""} />
            </InspectorField>
            {data.errorMessage ? (
              <div className="studio-inspector-runtime-error" role="alert">
                <strong>OUTPUT_FAILED</strong>
                <span>{data.errorMessage}</span>
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      <button
        className="studio-delete-button"
        onClick={() => deleteNode(selectedNode.id)}
        type="button"
      >
        Delete node
      </button>
    </aside>
  );
}
