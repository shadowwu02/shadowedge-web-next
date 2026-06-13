"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CanvasBoard } from "@/components/canvas/CanvasBoard";
import { CanvasTemplatePanel, canvasTemplates } from "@/components/canvas/CanvasTemplatePanel";
import type { CanvasNodeType, CanvasPosition, CanvasTemplateId, CanvasWorkflow } from "@/components/canvas/canvasTypes";
import {
  CANVAS_WORKFLOW_STORAGE_KEY,
  createDefaultCanvasWorkflow,
  readCanvasWorkflow,
  saveCanvasWorkflow,
  withCanvasUpdatedAt,
} from "@/lib/canvas/canvasStorage";
import { useI18n, type DictionaryKey } from "@/i18n/useI18n";
import { cn } from "@/lib/utils";

type NoticeTone = "success" | "warning" | "muted";

type CanvasNotice = {
  message: string;
  tone: NoticeTone;
};

const nodeGroups: Array<{
  titleKey: "canvas.group.input" | "canvas.group.generation" | "canvas.group.utility";
  nodes: CanvasNodeType[];
}> = [
  { titleKey: "canvas.group.input", nodes: ["prompt"] },
  { titleKey: "canvas.group.generation", nodes: ["image", "video"] },
  { titleKey: "canvas.group.utility", nodes: ["history"] },
];

const nodeLabelKeys = {
  prompt: "canvas.promptNode",
  image: "canvas.imageNode",
  video: "canvas.videoNode",
  history: "canvas.historyNode",
} satisfies Record<CanvasNodeType, DictionaryKey>;

const nodeHintKeys = {
  prompt: "canvas.promptNodeHint",
  image: "canvas.imageNodeHint",
  video: "canvas.videoNodeHint",
  history: "canvas.historyNodeHint",
} satisfies Record<CanvasNodeType, DictionaryKey>;

function getNodeKey(type: CanvasNodeType) {
  return nodeLabelKeys[type];
}

function getNodeHintKey(type: CanvasNodeType) {
  return nodeHintKeys[type];
}

function getPromptFromWorkflow(workflow: CanvasWorkflow) {
  return (workflow.nodes.prompt?.prompt || "").trim();
}

function sanitizePromptQuery() {
  if (typeof window === "undefined") return "";
  try {
    const params = new URLSearchParams(window.location.search);
    const prompt = String(params.get("prompt") || "").trim();
    return prompt.slice(0, 1200);
  } catch {
    return "";
  }
}

function NoticeBanner({ notice }: { notice: CanvasNotice | null }) {
  if (!notice) return null;
  return (
    <div
      className={cn(
        "rounded-2xl border px-3 py-2 text-xs font-semibold",
        notice.tone === "success" ? "border-[#6fd7d7]/22 bg-[#6fd7d7]/10 text-[#9be7e7]" : "",
        notice.tone === "warning" ? "border-[#ffb44d]/24 bg-[#ffb44d]/10 text-[#ffcf83]" : "",
        notice.tone === "muted" ? "border-[rgba(244,244,244,0.10)] bg-[#111318]/74 text-[#d6d0c4]/68" : "",
      )}
    >
      {notice.message}
    </div>
  );
}

export function CanvasWorkspace() {
  const router = useRouter();
  const { t } = useI18n();
  const [workflow, setWorkflow] = useState<CanvasWorkflow>(() => createDefaultCanvasWorkflow());
  const [isHydrated, setIsHydrated] = useState(false);
  const [notice, setNotice] = useState<CanvasNotice | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const importedPrompt = sanitizePromptQuery();
      const restored = readCanvasWorkflow();
      const nextWorkflow = importedPrompt
        ? withCanvasUpdatedAt({
            ...restored,
            selectedNodeId: "prompt",
            nodes: {
              ...restored.nodes,
              prompt: {
                ...restored.nodes.prompt,
                prompt: importedPrompt,
              },
            },
          })
        : restored;
      setWorkflow(nextWorkflow);
      setIsHydrated(true);
      setNotice({
        message: importedPrompt ? t("canvas.promptImported") : t("canvas.localRestored"),
        tone: importedPrompt ? "success" : "muted",
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [t]);

  useEffect(() => {
    if (!isHydrated) return;
    saveCanvasWorkflow(workflow);
  }, [isHydrated, workflow]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const selectedNode = workflow.nodes[workflow.selectedNodeId] || workflow.nodes.prompt;

  const setWorkflowWithUpdate = useCallback((updater: (current: CanvasWorkflow) => CanvasWorkflow) => {
    setWorkflow((current) => withCanvasUpdatedAt(updater(current)));
  }, []);

  const handleSelectNode = useCallback(
    (nodeId: string) => {
      if (!workflow.nodes[nodeId]) return;
      setWorkflowWithUpdate((current) => ({ ...current, selectedNodeId: nodeId }));
    },
    [setWorkflowWithUpdate, workflow.nodes],
  );

  const handleMoveNode = useCallback(
    (nodeId: string, position: CanvasPosition) => {
      setWorkflowWithUpdate((current) => ({
        ...current,
        positions: {
          ...current.positions,
          [nodeId]: position,
        },
      }));
    },
    [setWorkflowWithUpdate],
  );

  const handlePromptChange = useCallback(
    (prompt: string) => {
      setWorkflowWithUpdate((current) => ({
        ...current,
        selectedNodeId: "prompt",
        nodes: {
          ...current.nodes,
          prompt: {
            ...current.nodes.prompt,
            prompt,
          },
        },
      }));
    },
    [setWorkflowWithUpdate],
  );

  const handleApplyTemplate = useCallback(
    (templateId: CanvasTemplateId) => {
      const template = canvasTemplates.find((item) => item.id === templateId);
      if (!template) {
        setNotice({ message: t("canvas.templateUnavailable"), tone: "warning" });
        return;
      }
      setWorkflowWithUpdate((current) => ({
        ...current,
        selectedNodeId: "prompt",
        nodes: {
          ...current.nodes,
          prompt: {
            ...current.nodes.prompt,
            prompt: t(template.promptKey),
          },
          image: {
            ...current.nodes.image,
            ...template.image,
          },
          video: {
            ...current.nodes.video,
            ...template.video,
          },
        },
      }));
      setNotice({ message: t("canvas.templateApplied"), tone: "success" });
    },
    [setWorkflowWithUpdate, t],
  );

  const handleSave = useCallback(() => {
    const nextWorkflow = withCanvasUpdatedAt(workflow);
    setWorkflow(nextWorkflow);
    const ok = saveCanvasWorkflow(nextWorkflow);
    setNotice({ message: ok ? t("canvas.saved") : t("canvas.saveFailed"), tone: ok ? "success" : "warning" });
  }, [t, workflow]);

  const handleReset = useCallback(() => {
    const nextWorkflow = createDefaultCanvasWorkflow();
    setWorkflow(nextWorkflow);
    saveCanvasWorkflow(nextWorkflow);
    setNotice({ message: t("canvas.resetDone"), tone: "success" });
  }, [t]);

  const handleSendToWorkspace = useCallback(
    (type: "image" | "video") => {
      const prompt = getPromptFromWorkflow(workflow);
      if (!prompt) {
        setNotice({ message: t("canvas.promptRequired"), tone: "warning" });
        return;
      }
      const target = type === "image" ? "/workspace/image" : "/workspace/video";
      router.push(`${target}?prompt=${encodeURIComponent(prompt.slice(0, 1200))}`);
    },
    [router, t, workflow],
  );

  const handleViewHistory = useCallback(() => {
    router.push("/history");
  }, [router]);

  const settingsRows = useMemo(() => {
    const rows: Array<[string, string]> = [
      [t("canvas.type"), t(getNodeKey(selectedNode.type))],
      [t("canvas.statusLabel"), selectedNode.type === "history" ? t("canvas.archiveReady") : t("canvas.ready")],
    ];
    if (selectedNode.type === "image") {
      rows.push([t("canvas.model"), selectedNode.model || "--"]);
      rows.push([t("canvas.ratio"), selectedNode.ratio || "--"]);
      rows.push([t("canvas.quality"), selectedNode.quality || "--"]);
      rows.push([t("canvas.source"), t("canvas.promptNode")]);
    }
    if (selectedNode.type === "video") {
      rows.push([t("canvas.model"), selectedNode.model || "--"]);
      rows.push([t("canvas.duration"), selectedNode.duration ? `${selectedNode.duration}s` : "--"]);
      rows.push([t("canvas.ratio"), selectedNode.ratio || "--"]);
      rows.push([t("canvas.resolution"), selectedNode.resolution || selectedNode.quality || "--"]);
      rows.push([t("canvas.source"), t("canvas.promptNode")]);
    }
    return rows;
  }, [selectedNode, t]);

  return (
    <div className="se-scrollbar h-full overflow-y-auto overflow-x-hidden">
      <div className="mx-auto flex min-h-full w-full max-w-[1480px] flex-col gap-4 pb-5">
        <section className="se-card-quiet rounded-[30px] p-5 md:p-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-4xl">
              <p className="se-eyebrow">{t("canvas.eyebrow")}</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[#f7f3ea] md:text-4xl">{t("canvas.title")}</h1>
              <p className="mt-3 text-sm leading-6 text-[#d6d0c4]/70 md:text-base">{t("canvas.mvpSubtitle")}</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <span className="inline-flex w-fit rounded-full border border-[#6fd7d7]/20 bg-[#6fd7d7]/10 px-3 py-1.5 text-xs font-semibold text-[#9be7e7]">
                {t("canvas.localOnly")}
              </span>
              <span className="inline-flex w-fit rounded-full border border-[#ffb44d]/24 bg-[#ffb44d]/10 px-3 py-1.5 text-xs font-semibold text-[#ffcf83]">
                {t("canvas.noGeneration")}
              </span>
            </div>
          </div>
        </section>

        <div className="grid min-w-0 gap-4 xl:grid-cols-[250px_minmax(0,1fr)_310px]">
          <aside className="se-card rounded-[28px] p-4 md:p-5">
            <p className="se-eyebrow">{t("canvas.nodeLibrary")}</p>
            <div className="mt-4 space-y-4">
              {nodeGroups.map((group) => (
                <section key={group.titleKey}>
                  <h2 className="text-[11px] font-bold uppercase tracking-[.18em] text-[#d6d0c4]/44">{t(group.titleKey)}</h2>
                  <div className="mt-2 space-y-2">
                    {group.nodes.map((type) => {
                      const node = Object.values(workflow.nodes).find((item) => item.type === type);
                      if (!node) return null;
                      return (
                        <button
                          className={cn(
                            "w-full rounded-[18px] border p-3 text-left transition",
                            workflow.selectedNodeId === node.id
                              ? "border-[#ffb44d]/36 bg-[#ffb44d]/12"
                              : "border-[rgba(244,244,244,0.09)] bg-[#0f1117]/72 hover:border-[#ffb44d]/24 hover:bg-[#15130f]",
                          )}
                          key={node.id}
                          onClick={() => handleSelectNode(node.id)}
                          type="button"
                        >
                          <span className="block text-sm font-semibold text-[#f7f3ea]">{t(getNodeKey(type))}</span>
                          <span className="mt-1 block text-xs leading-5 text-[#d6d0c4]/58">{t(getNodeHintKey(type))}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </aside>

          <CanvasBoard onMoveNode={handleMoveNode} onSelectNode={handleSelectNode} workflow={workflow} />

          <aside className="se-card rounded-[28px] p-4 md:p-5">
            <p className="se-eyebrow">{t("canvas.settings")}</p>
            <h2 className="mt-2 text-xl font-semibold text-[#f7f3ea]">{t(getNodeKey(selectedNode.type))}</h2>
            <p className="mt-2 text-xs leading-5 text-[#d6d0c4]/58">{t(getNodeHintKey(selectedNode.type))}</p>

            <div className="mt-4 space-y-2">
              {settingsRows.map(([label, value]) => (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-[rgba(244,244,244,0.08)] bg-[#0d0f14]/72 px-3 py-2" key={label}>
                  <span className="text-[11px] font-semibold uppercase tracking-[.14em] text-[#d6d0c4]/42">{label}</span>
                  <strong className="text-right text-xs font-semibold text-[#f7f3ea]">{value}</strong>
                </div>
              ))}
            </div>

            {selectedNode.type === "prompt" ? (
              <label className="mt-4 block">
                <span className="text-[11px] font-bold uppercase tracking-[.16em] text-[#ffcf83]">{t("canvas.promptLabel")}</span>
                <textarea
                  className="se-scrollbar mt-2 min-h-[150px] w-full resize-y rounded-[20px] border border-[rgba(244,244,244,0.10)] bg-[#080a0f] px-4 py-3 text-sm leading-6 text-[#f7f3ea] outline-none transition placeholder:text-[#d6d0c4]/32 focus:border-[#ffb44d]/44"
                  onChange={(event) => handlePromptChange(event.target.value)}
                  placeholder={t("canvas.promptPlaceholder")}
                  value={selectedNode.prompt || ""}
                />
              </label>
            ) : null}

            {selectedNode.type === "history" ? (
              <p className="mt-4 rounded-2xl border border-[rgba(244,244,244,0.08)] bg-[#0d0f14]/72 p-3 text-xs leading-5 text-[#d6d0c4]/62">
                {t("canvas.historyPreviewOnly")}
              </p>
            ) : null}

            <div className="mt-4 grid gap-2">
              {selectedNode.type === "prompt" || selectedNode.type === "image" ? (
                <button className="se-button-secondary justify-center rounded-2xl px-4 py-3 text-sm font-semibold" onClick={() => handleSendToWorkspace("image")} type="button">
                  {t("canvas.sendToImage")}
                </button>
              ) : null}
              {selectedNode.type === "prompt" || selectedNode.type === "video" ? (
                <button className="se-button-secondary justify-center rounded-2xl px-4 py-3 text-sm font-semibold" onClick={() => handleSendToWorkspace("video")} type="button">
                  {t("canvas.sendToVideo")}
                </button>
              ) : null}
              {selectedNode.type === "history" ? (
                <button className="se-button-secondary justify-center rounded-2xl px-4 py-3 text-sm font-semibold" onClick={handleViewHistory} type="button">
                  {t("canvas.viewHistory")}
                </button>
              ) : null}
              <button className="se-button-primary justify-center rounded-2xl px-4 py-3 text-sm font-semibold" onClick={handleSave} type="button">
                {t("canvas.saveWorkflow")}
              </button>
              <button className="se-button-ghost justify-center rounded-2xl px-4 py-3 text-sm font-semibold" onClick={handleReset} type="button">
                {t("canvas.resetWorkflow")}
              </button>
            </div>

            <p className="mt-4 text-[11px] leading-5 text-[#d6d0c4]/44">
              {t("canvas.storageKey")}: <span className="font-mono text-[#ffcf83]/78">{CANVAS_WORKFLOW_STORAGE_KEY}</span>
            </p>
          </aside>
        </div>

        <NoticeBanner notice={notice} />
        <CanvasTemplatePanel onApply={handleApplyTemplate} />
      </div>
    </div>
  );
}
