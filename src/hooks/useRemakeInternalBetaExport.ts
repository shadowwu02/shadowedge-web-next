"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { RemakeShotGenerationState, RemakeStoryboard } from "@/components/video/remake/remakeTypes";
import type { RemakeExportFlowPanelProps } from "@/components/video/remake/RemakeExportFlowPanel";
import { downloadBrowserFile } from "@/lib/browserDownload";
import {
  buildRemakeInternalBetaSnapshotInput,
  confirmRemakeInternalBetaExport,
  createRemakeInternalBetaPreview,
  getRemakeInternalBetaCapability,
  getRemakeInternalBetaDownloadUrl,
  getRemakeInternalBetaRenderStatus,
  type RemakeInternalBetaPreviewReceipt,
} from "@/lib/video/remakeInternalBetaExportApi";
import {
  createRemakeExportFlowState,
  reduceRemakeExportFlow,
  type RemakeExportFlowState,
} from "@/lib/video/remakeExportProductFlow";

function failureCategory(error: unknown) {
  const code = error && typeof error === "object" && "code" in error ? String(error.code || "") : "";
  return code || "REMAKE_EXPORT_FAILED";
}

export function useRemakeInternalBetaExport(input: {
  enabled: boolean;
  token?: string;
  storyboard: RemakeStoryboard | null;
  sourceAssetRef?: string;
  shotGenerations: Record<string, RemakeShotGenerationState>;
  aspectRatio: string;
}): RemakeExportFlowPanelProps | undefined {
  const [available, setAvailable] = useState(false);
  const [state, setState] = useState<RemakeExportFlowState>(() => createRemakeExportFlowState());
  const receiptRef = useRef<RemakeInternalBetaPreviewReceipt | null>(null);
  const mutationPendingRef = useRef(false);

  useEffect(() => {
    let active = true;
    setAvailable(false);
    if (!input.enabled || !input.token) return () => { active = false; };
    getRemakeInternalBetaCapability(input.token)
      .then((result) => { if (active) setAvailable(result); })
      .catch(() => { if (active) setAvailable(false); });
    return () => { active = false; };
  }, [input.enabled, input.token]);

  useEffect(() => {
    receiptRef.current = null;
    mutationPendingRef.current = false;
    setState(createRemakeExportFlowState());
  }, [input.storyboard?.id]);

  const requestPreview = useCallback(async () => {
    if (mutationPendingRef.current || !input.storyboard || !input.sourceAssetRef) return;
    mutationPendingRef.current = true;
    setState((current) => reduceRemakeExportFlow(current, { type: "REQUEST_PREVIEW" }));
    try {
      const snapshotInput = buildRemakeInternalBetaSnapshotInput({
        storyboard: input.storyboard,
        sourceAssetRef: input.sourceAssetRef,
        shotGenerations: input.shotGenerations,
        aspectRatio: input.aspectRatio,
      });
      const receipt = await createRemakeInternalBetaPreview({ snapshotInput, token: input.token });
      receiptRef.current = receipt;
      setState((current) => reduceRemakeExportFlow(current, { type: "PREVIEW_RECEIVED", preview: receipt }));
    } catch (error) {
      setState((current) => reduceRemakeExportFlow(current, { type: "ERROR", failureCategory: failureCategory(error) }));
    } finally {
      mutationPendingRef.current = false;
    }
  }, [input.aspectRatio, input.shotGenerations, input.sourceAssetRef, input.storyboard, input.token]);

  const confirm = useCallback(async () => {
    const receipt = receiptRef.current;
    if (mutationPendingRef.current || !receipt) return;
    mutationPendingRef.current = true;
    setState((current) => reduceRemakeExportFlow(current, { type: "CONFIRM" }));
    try {
      const render = await confirmRemakeInternalBetaExport({ receipt, token: input.token });
      setState((current) => reduceRemakeExportFlow(current, { type: "RENDER_RECEIVED", render }));
    } catch (error) {
      setState((current) => reduceRemakeExportFlow(current, { type: "ERROR", failureCategory: failureCategory(error) }));
    } finally {
      mutationPendingRef.current = false;
    }
  }, [input.token]);

  const cancel = useCallback(() => {
    receiptRef.current = null;
    setState((current) => reduceRemakeExportFlow(current, { type: "CANCEL" }));
  }, []);

  useEffect(() => {
    if (state.phase !== "queued" && state.phase !== "processing") return;
    let active = true;
    const timer = globalThis.setTimeout(() => {
      getRemakeInternalBetaRenderStatus(state.render.renderJobRef, input.token)
        .then((render) => {
          if (active) setState((current) => reduceRemakeExportFlow(current, { type: "RENDER_RECEIVED", render }));
        })
        .catch((error) => {
          if (active) setState((current) => reduceRemakeExportFlow(current, { type: "ERROR", failureCategory: failureCategory(error) }));
        });
    }, 3000);
    return () => {
      active = false;
      globalThis.clearTimeout(timer);
    };
  }, [input.token, state]);

  const download = useCallback(async () => {
    if (state.phase !== "completed") return;
    await downloadBrowserFile({
      filename: `remake-${state.render.renderJobRef}.mp4`,
      headers: input.token ? { Authorization: `Bearer ${input.token}` } : undefined,
      url: getRemakeInternalBetaDownloadUrl(state.render.renderJobRef),
    });
  }, [input.token, state]);

  return useMemo(() => available && Boolean(input.sourceAssetRef) ? {
    state,
    onCancel: cancel,
    onConfirm: confirm,
    onDownload: download,
    onRequestPreview: requestPreview,
  } : undefined, [available, cancel, confirm, download, input.sourceAssetRef, requestPreview, state]);
}
