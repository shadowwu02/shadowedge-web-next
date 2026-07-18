"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { STUDIO_VIDEO_EDIT_ENABLED } from "@/config/studioFeatures";
import { useStudioStore } from "@/features/studio/store/studioStore";
import { getImageModels } from "@/lib/image-api";
import { getVideoModels } from "@/lib/video-api";
import {
  getDefaultImageParams,
  getImageModelById,
} from "@/lib/image/imageModelRules";
import type { ImageModel } from "@/types/image";
import {
  getVideoModelRule,
  hasVideoModelRule,
  normalizeVideoParamsForModel,
} from "@/lib/video/videoModelRules";
import type { VideoModel } from "@/types/video";

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

function normalizeVideoModelKey(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[./\s-]+/g, "_")
    .replace(/[^\w]/g, "");
}

function getVideoRuleId(model: VideoModel) {
  const candidates = [model.id, model.providerModel, model.label].filter(
    (value): value is string => Boolean(value),
  );
  return candidates.find((candidate) => hasVideoModelRule(candidate)) || candidates[0] || "generic";
}

export function NodeInspector() {
  const nodes = useStudioStore((state) => state.nodes);
  const selectedNodeId = useStudioStore((state) => state.selectedNodeId);
  const updateNodeData = useStudioStore((state) => state.updateNodeData);
  const deleteNode = useStudioStore((state) => state.deleteNode);
  const createVideoNodeFromRemakeShot = useStudioStore(
    (state) => state.createVideoNodeFromRemakeShot,
  );
  const selectedNode = nodes.find((node) => node.id === selectedNodeId);
  const [imageModels, setImageModels] = useState<ImageModel[]>([]);
  const [imageModelsError, setImageModelsError] = useState("");
  const [videoModels, setVideoModels] = useState<VideoModel[]>([]);
  const [videoModelsError, setVideoModelsError] = useState("");
  const loadingImageModels =
    selectedNode?.type === "imageGenerate" &&
    !imageModels.length &&
    !imageModelsError;
  const loadingVideoModels =
    selectedNode?.type === "videoGenerate" &&
    !videoModels.length &&
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
    if (selectedNode?.type !== "videoGenerate" || videoModels.length) return;
    let cancelled = false;
    void getVideoModels()
      .then((models) => {
        if (cancelled) return;
        if (models.length) {
          setVideoModels(models);
          setVideoModelsError("");
        } else {
          setVideoModelsError("Live model registry is empty; the configured Workspace model rule will be used.");
        }
      })
      .catch(() => {
        if (!cancelled) setVideoModelsError("Video models could not be loaded.");
      });

    return () => {
      cancelled = true;
    };
  }, [selectedNode?.type, videoModels.length]);

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
      ? videoModels.find((model) =>
          [model.id, model.providerModel, model.label]
            .map(normalizeVideoModelKey)
            .includes(normalizeVideoModelKey(data.model)),
        ) || null
      : null;
  const selectedVideoRule = selectedVideoModel
    ? getVideoModelRule(getVideoRuleId(selectedVideoModel))
    : null;
  const videoDurations = selectedVideoRule?.durations || selectedVideoModel?.durations || [];
  const videoRatios = selectedVideoRule?.ratios.map(String) || selectedVideoModel?.ratios || [];
  const videoQualities =
    selectedVideoRule?.qualities.length
      ? selectedVideoRule.qualities.map(String)
      : selectedVideoRule?.resolutions.map(String) || selectedVideoModel?.qualities || [];

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
            <button className="studio-node-action" disabled type="button">
              Start Generation
            </button>
            <button
              className="studio-node-action"
              disabled={
                data.status !== "completed" ||
                data.confirmationState === "cancelled"
              }
              onClick={() => update({ confirmationState: "cancelled" })}
              type="button"
            >
              Cancel
            </button>
            <p className="studio-node-footnote">
              P1-A6 only creates and saves a local production plan. It never calls Remake, Video, or provider APIs.
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
            <InspectorField label="Model">
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
            <InspectorField label="Model">
              <select
                disabled={loadingVideoModels || !videoModels.length}
                value={selectedVideoModel?.id || data.model}
                onChange={(event) => {
                  const model = videoModels.find((item) => item.id === event.target.value);
                  if (!model) return;
                  const params = normalizeVideoParamsForModel(getVideoRuleId(model), {
                    duration: model.durationDefault,
                    ratio: model.ratios[0],
                    quality: model.qualities[0],
                    generateAudio: model.supportsAudio !== false,
                  });
                  update({
                    model: model.id,
                    duration: params.duration,
                    ratio: params.ratio,
                    quality: params.quality,
                    resolution: params.resolution,
                  });
                }}
              >
                {!videoModels.length ? (
                  <option value={data.model}>
                    {loadingVideoModels ? "Loading models..." : data.model}
                  </option>
                ) : null}
                {videoModels.map((model) => (
                  <option key={model.id} value={model.id}>{model.label}</option>
                ))}
              </select>
            </InspectorField>
            {videoModelsError ? <p className="studio-inspector-error">{videoModelsError}</p> : null}
            <div className="studio-inspector-grid">
              <InspectorField label="Duration">
                <select
                  value={String(data.duration)}
                  onChange={(event) => update({ duration: Number(event.target.value) })}
                >
                  {!videoDurations.includes(data.duration) ? (
                    <option value={data.duration}>{data.duration}s</option>
                  ) : null}
                  {videoDurations.map((duration) => (
                    <option key={duration} value={duration}>{duration}s</option>
                  ))}
                </select>
              </InspectorField>
              <InspectorField label="Ratio">
                <select value={data.ratio} onChange={updateText("ratio")}>
                  {!videoRatios.includes(data.ratio) ? (
                    <option value={data.ratio}>{data.ratio}</option>
                  ) : null}
                  {videoRatios.map((ratio) => (
                    <option key={ratio} value={ratio}>{ratio}</option>
                  ))}
                </select>
              </InspectorField>
            </div>
            <div className="studio-inspector-grid">
              <InspectorField label="Quality">
                <select
                  value={data.quality}
                  onChange={(event) => update({
                    quality: event.target.value,
                    resolution: event.target.value,
                  })}
                >
                  {!videoQualities.includes(data.quality) ? (
                    <option value={data.quality}>{data.quality}</option>
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
              <input value={data.imageInput} onChange={updateText("imageInput")} />
            </InspectorField>
            <InspectorField label="Video input">
              <input value={data.videoInput} onChange={updateText("videoInput")} />
            </InspectorField>
            <InspectorField label="Status">
              <input disabled value={data.status || "idle"} />
            </InspectorField>
            <InspectorField label="Job ID">
              <input disabled placeholder="Created after Run" value={data.jobId || ""} />
            </InspectorField>
            <InspectorField label="Video result">
              <input
                disabled
                placeholder="Available after completion"
                value={data.videoUrl || data.result || ""}
              />
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
                      : STUDIO_VIDEO_EDIT_ENABLED
                        ? "Provider reserved"
                        : "Mock only"
                  }
                />
              </InspectorField>
            </div>
            <InspectorField label="Result video">
              <input
                disabled
                placeholder="Mock result appears after Run"
                value={data.result?.videoUrl || ""}
              />
            </InspectorField>
            <p className="studio-node-footnote">
              The P1-A5 executor is a local pass-through mock. It never calls a provider or charges credits.
            </p>
            {data.errorMessage ? (
              <div className="studio-inspector-runtime-error" role="alert">
                <strong>{data.errorCode || "VIDEO_EDIT_FAILED"}</strong>
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
