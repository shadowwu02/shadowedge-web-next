"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { useI18n } from "@/i18n/useI18n";
import { saveImageWorkspaceDraft } from "@/lib/image/imageWorkspaceDraft";
import {
  fetchPromptStudioCatalog,
  generatePromptStudioPrompt,
  type PromptStudioCatalog,
  type PromptStudioGenerateResult,
  type PromptStudioLibraryItem,
} from "@/lib/prompt-studio-api";
import { saveVideoDraft } from "@/lib/video/videoDraft";

type Target = "video" | "image" | "storyboard";
type Engine = "seedance" | "higgsfield" | "gpt-image" | "nano-banana";
type ResultKey = "basicPrompt" | "standardPrompt" | "enhancedPrompt";
type LibraryKind = "style" | "module";

const targetOptions: Array<{ id: Target; label: string }> = [
  { id: "video", label: "视频 Video" },
  { id: "image", label: "图像 Image" },
  { id: "storyboard", label: "分镜 Storyboard" },
];

const engineOptions: Array<{ id: Engine; label: string; target: Target | "both" }> = [
  { id: "seedance", label: "Seedance 2.0", target: "video" },
  { id: "higgsfield", label: "Higgsfield", target: "video" },
  { id: "gpt-image", label: "GPT Image", target: "image" },
  { id: "nano-banana", label: "Nano Banana", target: "image" },
];

const resultTabs: Array<{ key: ResultKey; label: string; hint: string }> = [
  { key: "basicPrompt", label: "基础版", hint: "快速测试" },
  { key: "standardPrompt", label: "标准版", hint: "正式使用" },
  { key: "enhancedPrompt", label: "增强版", hint: "电影感更强" },
];

const signalGroups: Array<{
  key: keyof NonNullable<PromptStudioGenerateResult["detectedSignals"]>;
  label: string;
}> = [
  { key: "scenes", label: "\u573a\u666f Scene" },
  { key: "actions", label: "\u52a8\u4f5c Action" },
  { key: "styles", label: "\u98ce\u683c Style" },
  { key: "lighting", label: "\u5149\u7ebf Lighting" },
  { key: "mood", label: "\u60c5\u7eea Mood" },
  { key: "subjects", label: "\u4e3b\u4f53 Subject" },
];

const fallbackCatalog: PromptStudioCatalog = {
  engines: [],
  libraryCategories: [],
  styles: [],
  modules: [],
  recommendedStyles: [],
  aspectRatios: ["9:16", "16:9", "1:1", "4:3", "2.39:1"],
  shotTypes: [],
  cameraMoves: [],
};

function isEngineAllowed(engine: Engine, target: Target) {
  const option = engineOptions.find((item) => item.id === engine);
  if (!option) return false;
  if (target === "storyboard") return option.target === "video";
  return option.target === target || option.target === "both";
}

function cx(...classes: Array<false | null | string | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const subtleScrollbar =
  "[scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.18)_transparent] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20";

function toggleId(list: string[], id: string) {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}

function groupItems(items: PromptStudioLibraryItem[]) {
  return items.reduce<Record<string, PromptStudioLibraryItem[]>>((groups, item) => {
    const key = item.category || "Other";
    groups[key] = groups[key] || [];
    groups[key].push(item);
    return groups;
  }, {});
}

function filterItems(items: PromptStudioLibraryItem[], query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return items;
  return items.filter((item) => {
    const text = `${item.nameZh} ${item.category} ${item.path}`.toLowerCase();
    return text.includes(normalized);
  });
}

function ResultCard({
  active,
  label,
  onCopy,
  prompt,
}: {
  active?: boolean;
  label: string;
  onCopy: () => void;
  prompt: string;
}) {
  return (
    <section
      className={cx(
        "rounded-[22px] border bg-[#101216]/82 p-3.5 shadow-inner shadow-black/20",
        active ? "border-[#ffb44d]/30" : "border-white/8",
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-4">
        <h3 className="min-w-0 text-sm font-black text-white">{label}</h3>
        <button className="se-button-secondary shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold" onClick={onCopy} type="button">
          复制 Copy
        </button>
      </div>
      <pre className={cx("se-scrollbar max-h-[430px] min-h-[360px] overflow-y-auto whitespace-pre-wrap break-words rounded-[18px] border border-white/[.06] bg-[#07080b] p-3.5 pr-4 font-mono text-[12px] leading-6 text-[#f4f4f4]/82", subtleScrollbar)}>
        {prompt || "Generate a prompt to see this version."}
      </pre>
    </section>
  );
}

function LibraryGroup({
  expanded = true,
  items,
  itemLimit = 40,
  onToggleExpanded,
  selected,
  selectedCount = 0,
  title,
  onToggle,
}: {
  expanded?: boolean;
  items: PromptStudioLibraryItem[];
  itemLimit?: number;
  onToggleExpanded?: () => void;
  selected: string[];
  selectedCount?: number;
  title: string;
  onToggle: (id: string) => void;
}) {
  if (!items.length) return null;

  return (
    <section className="rounded-[20px] border border-white/[.065] bg-[#0d0f13]/70 p-2.5">
      <button
        className={cx(
          "flex w-full items-center justify-between gap-2 rounded-2xl px-1 py-1 text-left",
          onToggleExpanded ? "cursor-pointer" : "cursor-default",
        )}
        onClick={onToggleExpanded}
        type="button"
      >
        <h3 className="min-w-0 truncate text-[11px] font-black uppercase tracking-[.14em] text-[#ffcf83]/78">{title}</h3>
        <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-semibold text-white/36">
          {selectedCount ? <span className="rounded-full border border-[#ffb44d]/20 bg-[#ffb44d]/8 px-1.5 py-0.5 text-[#ffd08a]/88">{selectedCount} selected</span> : null}
          <span>{items.length}</span>
          {onToggleExpanded ? <span className="text-white/32">{expanded ? "−" : "+"}</span> : null}
        </span>
      </button>
      {expanded ? (
      <div className={cx("se-scrollbar mt-2 flex max-h-40 flex-wrap gap-1.5 overflow-y-auto pr-1", subtleScrollbar)}>
        {items.slice(0, itemLimit).map((item) => {
          const isSelected = selected.includes(item.id);
          return (
            <button
              className={cx(
                "rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-5 transition",
                isSelected
                  ? "border-[#ffb44d]/42 bg-[#ffb44d]/13 text-[#ffd08a]"
                  : "border-white/[.07] bg-white/[.03] text-white/58 hover:border-[#ffb44d]/24 hover:text-white/82",
              )}
              key={item.id}
              onClick={() => onToggle(item.id)}
              type="button"
            >
              {item.nameZh}
            </button>
          );
        })}
      </div>
      ) : null}
    </section>
  );
}

function LibrarySearchResults({
  modules,
  onToggleModule,
  onToggleStyle,
  selectedModules,
  selectedStyles,
  styles,
}: {
  modules: PromptStudioLibraryItem[];
  onToggleModule: (id: string) => void;
  onToggleStyle: (id: string) => void;
  selectedModules: string[];
  selectedStyles: string[];
  styles: PromptStudioLibraryItem[];
}) {
  const combined: Array<PromptStudioLibraryItem & { libraryKind: LibraryKind }> = [
    ...styles.map((item) => ({ ...item, libraryKind: "style" as const })),
    ...modules.map((item) => ({ ...item, libraryKind: "module" as const })),
  ].slice(0, 30);

  if (!combined.length) {
    return (
      <section className="rounded-[20px] border border-white/[.065] bg-[#0d0f13]/70 p-3 text-sm text-white/42">
        No matching prompt library items.
      </section>
    );
  }

  return (
    <section className="rounded-[20px] border border-white/[.065] bg-[#0d0f13]/70 p-2.5">
      <div className="mb-2 flex items-center justify-between gap-2 px-1 py-1">
        <h3 className="min-w-0 truncate text-[11px] font-black uppercase tracking-[.14em] text-[#ffcf83]/78">Search results</h3>
        <span className="text-[11px] text-white/36">{combined.length}</span>
      </div>
      <div className={cx("se-scrollbar flex max-h-44 flex-wrap gap-1.5 overflow-y-auto pr-1", subtleScrollbar)}>
        {combined.map((item) => {
          const isStyle = item.libraryKind === "style";
          const isSelected = isStyle ? selectedStyles.includes(item.id) : selectedModules.includes(item.id);
          return (
            <button
              className={cx(
                "rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-5 transition",
                isSelected
                  ? "border-[#ffb44d]/42 bg-[#ffb44d]/13 text-[#ffd08a]"
                  : "border-white/[.07] bg-white/[.03] text-white/58 hover:border-[#ffb44d]/24 hover:text-white/82",
              )}
              key={`${item.libraryKind}-${item.id}`}
              onClick={() => (isStyle ? onToggleStyle(item.id) : onToggleModule(item.id))}
              type="button"
            >
              {item.nameZh}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function DetectedSignalsCard({ result }: { result: PromptStudioGenerateResult | null }) {
  const signals = result?.detectedSignals;
  const hasSignals = Boolean(signals && signalGroups.some((group) => signals[group.key]?.length));

  if (!hasSignals) return null;

  return (
    <section className="rounded-[22px] border border-white/[.065] bg-[#101216]/76 p-3.5 lg:col-span-2">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="se-eyebrow">Detected intent signals</p>
          <h3 className="mt-1 text-sm font-black text-white">识别到的关键词</h3>
        </div>
        <span className="text-[11px] font-semibold text-white/36">scene / action / style / lighting / mood / subject</span>
      </div>
      {hasSignals ? (
        <div className={cx("se-scrollbar grid max-h-36 gap-2 overflow-y-auto pr-1 md:grid-cols-2", subtleScrollbar)}>
          {signalGroups.map((group) => {
            const values = signals?.[group.key] || [];
            if (!values.length) return null;
            return (
              <div className="rounded-2xl border border-white/[.065] bg-white/[.022] p-2" key={group.key}>
                <div className="mb-1.5 text-[10px] font-black uppercase tracking-[.12em] text-[#ffcf83]/72">{group.label}</div>
                <div className="flex flex-wrap gap-1">
                  {values.map((value) => (
                    <span className="rounded-full border border-[#ffb44d]/14 bg-[#ffb44d]/7 px-2 py-0.5 text-[10px] font-semibold leading-5 text-[#ffd08a]/84" key={value}>
                      {value}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm leading-6 text-white/42">生成后显示系统识别到的场景、动作、风格、光线、情绪和主体信号。</p>
      )}
    </section>
  );
}

export function PromptStudioPage() {
  const router = useRouter();
  const { locale } = useI18n();
  const [catalog, setCatalog] = useState<PromptStudioCatalog>(fallbackCatalog);
  const [catalogError, setCatalogError] = useState("");
  const [intent, setIntent] = useState("帮我写一个王家卫风格的雨夜便利店重逢短视频提示词，竖屏，孤独但温柔。");
  const [target, setTarget] = useState<Target>("video");
  const [engine, setEngine] = useState<Engine>("seedance");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [duration, setDuration] = useState("15s");
  const [styleQuery, setStyleQuery] = useState("");
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [expandedLibraryGroups, setExpandedLibraryGroups] = useState<string[]>(["recommended"]);
  const [result, setResult] = useState<PromptStudioGenerateResult | null>(null);
  const [activeResult, setActiveResult] = useState<ResultKey>("standardPrompt");
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetchPromptStudioCatalog()
      .then((data) => {
        if (!active || !data) return;
        setCatalog(data);
        const recommended = data.recommendedStyles.slice(0, 3).map((item) => item.id);
        if (recommended.length) setSelectedStyles(recommended);
      })
      .catch((fetchError) => {
        if (!active) return;
        setCatalogError(fetchError instanceof Error ? fetchError.message : "Unable to load prompt catalog.");
      });

    return () => {
      active = false;
    };
  }, []);

  const normalizedStyleQuery = styleQuery.trim();
  const searchStyles = useMemo(() => filterItems(catalog.styles, styleQuery), [catalog.styles, styleQuery]);
  const searchModules = useMemo(() => filterItems(catalog.modules, styleQuery), [catalog.modules, styleQuery]);
  const styleGroups = useMemo(() => groupItems(catalog.styles), [catalog.styles]);
  const moduleGroups = useMemo(() => groupItems(catalog.modules), [catalog.modules]);
  const selectedKnowledgeCount = selectedStyles.length + selectedModules.length;
  const currentPrompt = result?.[activeResult] || "";
  const activeResultTab = resultTabs.find((tab) => tab.key === activeResult) || resultTabs[1];

  function toggleLibraryGroup(groupId: string) {
    setExpandedLibraryGroups((current) => toggleId(current, groupId));
  }

  function getSelectedCount(items: PromptStudioLibraryItem[], selected: string[]) {
    return items.reduce((count, item) => count + (selected.includes(item.id) ? 1 : 0), 0);
  }

  async function handleGenerate() {
    setIsLoading(true);
    setError("");
    setNotice("");
    try {
      const data = await generatePromptStudioPrompt({
        intent,
        target,
        engine,
        aspectRatio,
        selectedStyles,
        selectedModules,
        duration,
        language: locale,
        mode: "all",
      });
      setResult(data || null);
      setActiveResult("standardPrompt");
      setNotice("已生成三档英文提示词。No generation was submitted.");
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "生成提示词失败，请稍后重试。");
    } finally {
      setIsLoading(false);
    }
  }

  async function copyPrompt(prompt: string) {
    if (!prompt) return;
    try {
      await navigator.clipboard?.writeText(prompt);
      setNotice("已复制到剪贴板。");
    } catch {
      setNotice("复制失败，请手动选择文本复制。");
    }
  }

  function saveForVideo() {
    const prompt = currentPrompt;
    if (!prompt) return;
    saveVideoDraft({
      prompt,
      modelId: "seedance_2_0",
      providerModel: "seedance_2_0",
      modelLabel: "Seedance 2.0",
      params: {
        duration: Number.parseInt(duration, 10) || 15,
        ratio: aspectRatio,
        quality: "1080p",
        generateAudio: false,
      },
      referenceMedia: [],
      mentionBindings: [],
    });
    setNotice("已保存为视频工作区草稿，跳转后可继续编辑，不会自动生成。");
    router.push("/workspace/video?from=prompt-studio");
  }

  function saveForImage() {
    const prompt = currentPrompt;
    if (!prompt) return;
    saveImageWorkspaceDraft({
      prompt,
      modelId: "image_auto",
      params: {
        ratio: aspectRatio,
        resolution: "1024",
        quality: "standard",
        batchCount: 1,
      },
      references: [],
    });
    setNotice("已保存为图片工作区草稿，跳转后可继续编辑，不会自动生成。");
    router.push("/workspace/image?from=prompt-studio");
  }

  return (
    <AppShell hideSidebar workspaceNav>
      <div className="grid h-full min-h-0 grid-rows-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-3 overflow-hidden xl:grid-cols-[minmax(340px,370px)_minmax(0,1fr)] xl:grid-rows-none 2xl:grid-cols-[380px_minmax(0,1fr)]">
        <section className="se-card-quiet flex min-h-0 flex-col overflow-hidden rounded-[30px] shadow-2xl shadow-black/20">
          <div className={cx("se-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4 pb-24", subtleScrollbar)}>
          <div className="mb-5">
            <p className="se-eyebrow">ShadowEdge Prompt Studio</p>
            <h1 className="mt-2 text-2xl font-black text-white">影视提示词工作室</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#b9b9b9]/70">
              把中文想法整理成专业英文 prompt。此页面只生成提示词，不调用图片/视频生成，不扣积分。
            </p>
          </div>

          <label className="grid gap-2">
            <span className="text-xs font-black uppercase tracking-[.14em] text-[#ffcf83]/78">用户想法</span>
            <textarea
              className="se-scrollbar h-32 min-h-28 max-h-40 resize-y rounded-[22px] border border-white/8 bg-[#0f1116] p-3.5 text-sm leading-6 text-white outline-none transition focus:border-[#ffb44d]/44"
              maxLength={2400}
              onChange={(event) => setIntent(event.target.value)}
              placeholder="例如：帮我写一个赛博朋克雨夜街头追逐镜头，竖屏，紧张、有速度感。"
              value={intent}
            />
            <span className="text-right text-[11px] text-white/38">{intent.length} / 2400</span>
          </label>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-[.14em] text-[#ffcf83]/78">目标</p>
              <div className="grid grid-cols-3 gap-2">
                {targetOptions.map((item) => (
                  <button
                    className={cx("rounded-2xl border px-3 py-3 text-xs font-black", target === item.id ? "border-[#ffb44d]/48 bg-[#ffb44d]/14 text-[#ffd08a]" : "border-white/8 bg-white/[.035] text-white/58")}
                    key={item.id}
                    onClick={() => {
                      setTarget(item.id);
                      if (!isEngineAllowed(engine, item.id)) {
                        setEngine(item.id === "image" ? "gpt-image" : "seedance");
                      }
                    }}
                    type="button"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-[.14em] text-[#ffcf83]/78">引擎</p>
              <div className="grid grid-cols-2 gap-2">
                {engineOptions.map((item) => {
                  const disabled = !isEngineAllowed(item.id, target);
                  return (
                    <button
                      className={cx(
                        "rounded-2xl border px-3 py-3 text-xs font-black",
                        engine === item.id ? "border-[#ffb44d]/48 bg-[#ffb44d]/14 text-[#ffd08a]" : "border-white/8 bg-white/[.035] text-white/58",
                        disabled ? "cursor-not-allowed opacity-35" : "",
                      )}
                      disabled={disabled}
                      key={item.id}
                      onClick={() => setEngine(item.id)}
                      type="button"
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-xs font-black uppercase tracking-[.14em] text-[#ffcf83]/78">画幅</span>
              <select className="rounded-2xl border border-white/8 bg-[#0f1116] px-3 py-3 text-sm text-white outline-none" onChange={(event) => setAspectRatio(event.target.value)} value={aspectRatio}>
                {catalog.aspectRatios.map((ratio) => (
                  <option key={ratio} value={ratio}>
                    {ratio}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-black uppercase tracking-[.14em] text-[#ffcf83]/78">时长感</span>
              <input className="rounded-2xl border border-white/8 bg-[#0f1116] px-3 py-3 text-sm text-white outline-none" onChange={(event) => setDuration(event.target.value)} value={duration} />
            </label>
          </div>

          <div className="mt-4 grid gap-2">
            <span className="text-xs font-black uppercase tracking-[.14em] text-[#ffcf83]/78">风格库 / 模块搜索</span>
            <input
              className="rounded-2xl border border-white/8 bg-[#0f1116] px-3 py-3 text-sm text-white outline-none transition focus:border-[#ffb44d]/44"
              onChange={(event) => setStyleQuery(event.target.value)}
              placeholder="搜索：王家卫、赛博朋克、A24、构图、角色一致性..."
              value={styleQuery}
            />
          </div>

          {catalogError ? <div className="mt-3 rounded-2xl border border-red-300/20 bg-red-400/10 p-3 text-sm text-red-100">{catalogError}</div> : null}

          <div className={cx("se-scrollbar mt-4 grid max-h-[280px] gap-2.5 overflow-y-auto overflow-x-hidden pr-1", subtleScrollbar)}>
            {normalizedStyleQuery ? (
              <LibrarySearchResults
                modules={searchModules}
                onToggleModule={(id) => setSelectedModules((current) => toggleId(current, id))}
                onToggleStyle={(id) => setSelectedStyles((current) => toggleId(current, id))}
                selectedModules={selectedModules}
                selectedStyles={selectedStyles}
                styles={searchStyles}
              />
            ) : (
              <>
                <LibraryGroup
                  expanded={expandedLibraryGroups.includes("recommended")}
                  itemLimit={30}
                  items={catalog.recommendedStyles}
                  key="recommended"
                  onToggle={(id) => setSelectedStyles((current) => toggleId(current, id))}
                  onToggleExpanded={() => toggleLibraryGroup("recommended")}
                  selected={selectedStyles}
                  selectedCount={getSelectedCount(catalog.recommendedStyles, selectedStyles)}
                  title="常用推荐 Recommended"
                />
                {Object.entries(styleGroups).map(([category, items]) => {
                  const groupId = `style:${category}`;
                  return (
                    <LibraryGroup
                      expanded={expandedLibraryGroups.includes(groupId)}
                      items={items}
                      key={groupId}
                      onToggle={(id) => setSelectedStyles((current) => toggleId(current, id))}
                      onToggleExpanded={() => toggleLibraryGroup(groupId)}
                      selected={selectedStyles}
                      selectedCount={getSelectedCount(items, selectedStyles)}
                      title={category}
                    />
                  );
                })}
                {Object.entries(moduleGroups).map(([category, items]) => {
                  const groupId = `module:${category}`;
                  return (
                    <LibraryGroup
                      expanded={expandedLibraryGroups.includes(groupId)}
                      items={items}
                      key={groupId}
                      onToggle={(id) => setSelectedModules((current) => toggleId(current, id))}
                      onToggleExpanded={() => toggleLibraryGroup(groupId)}
                      selected={selectedModules}
                      selectedCount={getSelectedCount(items, selectedModules)}
                      title={category}
                    />
                  );
                })}
              </>
            )}
          </div>

          </div>

          <div className="shrink-0 border-t border-white/[.07] bg-[linear-gradient(180deg,rgba(8,9,13,0.76),rgba(8,9,13,0.98))] p-4 shadow-[0_-18px_42px_rgba(0,0,0,0.34)] backdrop-blur">
            <button
              className="se-button-primary flex min-h-12 w-full items-center justify-center rounded-2xl px-5 text-sm font-black disabled:cursor-not-allowed disabled:opacity-55"
              disabled={isLoading || !intent.trim()}
              onClick={() => void handleGenerate()}
              type="button"
            >
              {isLoading ? "生成提示词中..." : `生成提示词 · ${selectedKnowledgeCount} 个知识库`}
            </button>
          </div>
        </section>

        <section className="se-card-quiet flex min-h-0 flex-col overflow-hidden rounded-[30px] shadow-2xl shadow-black/20">
          <div className="shrink-0 border-b border-white/[.06] p-4 pb-3">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="se-eyebrow">Prompt Output</p>
              <h2 className="mt-2 text-2xl font-black text-white">三档英文 Prompt</h2>
              <p className="mt-2 text-sm text-[#b9b9b9]/68">复制使用，或保存到视频/图片工作区草稿。不会自动生成。</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {resultTabs.map((tab) => (
                <button
                  className={cx("rounded-full border px-3 py-2 text-xs font-black", activeResult === tab.key ? "border-[#ffb44d]/48 bg-[#ffb44d]/14 text-[#ffd08a]" : "border-white/8 bg-white/[.035] text-white/58")}
                  key={tab.key}
                  onClick={() => setActiveResult(tab.key)}
                  type="button"
                >
                  {tab.label}
                  <span className="ml-1 font-medium text-white/36">{tab.hint}</span>
                </button>
              ))}
            </div>
          </div>

          {notice ? <div className="mb-3 rounded-2xl border border-[#ffb44d]/24 bg-[#ffb44d]/10 p-3 text-sm text-[#ffd08a]">{notice}</div> : null}
          {error ? <div className="mb-3 rounded-2xl border border-red-300/20 bg-red-400/10 p-3 text-sm text-red-100">{error}</div> : null}
          </div>

          <div className={cx("se-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4 pt-3", subtleScrollbar)}>
          <ResultCard active label={activeResultTab.label} onCopy={() => void copyPrompt(currentPrompt)} prompt={currentPrompt} />

          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            <button className="se-button-secondary min-h-11 rounded-2xl px-4 text-xs font-black sm:text-sm" disabled={!currentPrompt} onClick={() => void copyPrompt(currentPrompt)} type="button">
              复制当前版本
            </button>
            <button className="se-button-secondary min-h-11 rounded-2xl px-4 text-xs font-black sm:text-sm" disabled={!result} onClick={saveForVideo} type="button">
              保存到视频工作区草稿
            </button>
            <button className="se-button-secondary min-h-11 rounded-2xl px-4 text-xs font-black sm:text-sm" disabled={!result} onClick={saveForImage} type="button">
              保存到图片工作区草稿
            </button>
            <button className="se-button-secondary min-h-11 rounded-2xl px-4 text-xs font-black sm:text-sm" onClick={() => setResult(null)} type="button">
              清空结果
            </button>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <DetectedSignalsCard result={result} />
            <section className="rounded-[22px] border border-white/[.065] bg-[#101216]/72 p-3.5">
              <h3 className="text-sm font-black text-white">使用建议</h3>
              <ul className="mt-3 grid gap-2 text-sm leading-6 text-[#b9b9b9]/72">
                {(result?.usageTips?.length ? result.usageTips : ["选择风格库后点击生成。", "Prompt Studio 不提交生成任务，也不扣费。"]).map((tip) => (
                  <li key={tip}>• {tip}</li>
                ))}
              </ul>
            </section>
            <section className="rounded-[22px] border border-white/[.065] bg-[#101216]/72 p-3.5">
              <h3 className="text-sm font-black text-white">已选知识</h3>
              <div className={cx("se-scrollbar mt-3 flex max-h-32 flex-wrap gap-1.5 overflow-y-auto pr-1", subtleScrollbar)}>
                {(result?.selectedKnowledge?.length ? result.selectedKnowledge : []).map((item) => (
                  <span className="rounded-full border border-white/[.07] bg-white/[.035] px-2.5 py-1 text-[11px] font-semibold text-white/64" key={item.id}>
                    {item.nameZh}
                  </span>
                ))}
                {!result?.selectedKnowledge?.length ? <span className="text-sm text-white/42">生成后显示本次使用的知识库摘要。</span> : null}
              </div>
            </section>
          </div>

          {result?.warnings?.length ? (
            <section className="mt-4 rounded-[22px] border border-[#ffb44d]/16 bg-[#ffb44d]/7 p-3.5">
              <h3 className="text-sm font-black text-[#ffd08a]">Warnings</h3>
              <ul className="mt-2 grid gap-1 text-sm leading-6 text-[#ffd08a]/74">
                {result.warnings.map((warning) => (
                  <li key={warning}>• {warning}</li>
                ))}
              </ul>
            </section>
          ) : null}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
