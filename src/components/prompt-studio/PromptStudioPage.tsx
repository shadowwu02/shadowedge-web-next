"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { useI18n } from "@/i18n/useI18n";
import {
  consumeWorkspaceToPromptStudioDraft,
  getPromptStudioDraftLocale,
  savePromptStudioToImageDraft,
  savePromptStudioToVideoDraft,
} from "@/lib/prompt-studio-draft-bridge";
import {
  fetchPromptStudioCatalog,
  generatePromptStudioPrompt,
  type PromptStudioAdvancedControls,
  type PromptStudioAdvancedOption,
  type PromptStudioCatalog,
  type PromptStudioGenerateResult,
  type PromptStudioLibraryItem,
  type PromptStudioMode,
  type PromptStudioStoryboardShot,
} from "@/lib/prompt-studio-api";

type Target = "video" | "image" | "storyboard";
type Engine = "seedance" | "higgsfield" | "gpt-image" | "nano-banana";
type ResultKey = "basicPrompt" | "standardPrompt" | "enhancedPrompt";
type LibraryKind = "style" | "module";
type TextMode = Exclude<PromptStudioMode, "all">;

type LibraryItemWithKind = PromptStudioLibraryItem & { libraryKind: LibraryKind };

const targetOptions: Array<{ id: Target; labelZh: string; labelEn: string }> = [
  { id: "video", labelZh: "视频", labelEn: "Video" },
  { id: "image", labelZh: "图像", labelEn: "Image" },
  { id: "storyboard", labelZh: "分镜", labelEn: "Storyboard" },
];

const engineOptions: Array<{ id: Engine; label: string; target: Target | "both" }> = [
  { id: "seedance", label: "Seedance", target: "video" },
  { id: "higgsfield", label: "Higgsfield", target: "video" },
  { id: "gpt-image", label: "GPT Image", target: "image" },
  { id: "nano-banana", label: "Nano Banana", target: "image" },
];

const modeOptions: Array<{
  id: TextMode;
  labelZh: string;
  labelEn: string;
  descriptionZh: string;
  descriptionEn: string;
}> = [
  {
    id: "generate",
    labelZh: "生成提示词",
    labelEn: "Generate",
    descriptionZh: "从中文想法生成三档英文 prompt",
    descriptionEn: "Create three English prompt versions from an idea",
  },
  {
    id: "optimize",
    labelZh: "优化已有 Prompt",
    labelEn: "Optimize",
    descriptionZh: "诊断并增强已有 prompt",
    descriptionEn: "Diagnose and improve an existing prompt",
  },
  {
    id: "convert",
    labelZh: "转换 Prompt",
    labelEn: "Convert",
    descriptionZh: "转换比例、目标或引擎语言",
    descriptionEn: "Convert target, ratio, or engine language",
  },
  {
    id: "layerEdit",
    labelZh: "只改一层",
    labelEn: "Layer Edit",
    descriptionZh: "只调整光线、色调、构图等一层",
    descriptionEn: "Change only lighting, color, composition, or style",
  },
  {
    id: "storyboard",
    labelZh: "分镜流水线",
    labelEn: "Storyboard",
    descriptionZh: "生成风格宪法、关键帧和视频 prompt",
    descriptionEn: "Create a style bible, keyframes, and video prompts",
  },
];

const layerEditOptions = [
  { id: "lighting", labelZh: "光线", labelEn: "Lighting" },
  { id: "color", labelZh: "色调", labelEn: "Color" },
  { id: "composition", labelZh: "构图", labelEn: "Composition" },
  { id: "camera", labelZh: "运镜", labelEn: "Camera" },
  { id: "mood", labelZh: "情绪", labelEn: "Mood" },
  { id: "style", labelZh: "风格", labelEn: "Style" },
];

const resultTabs: Array<{ key: ResultKey; labelZh: string; labelEn: string }> = [
  { key: "basicPrompt", labelZh: "基础版", labelEn: "Basic" },
  { key: "standardPrompt", labelZh: "标准版", labelEn: "Standard" },
  { key: "enhancedPrompt", labelZh: "增强版", labelEn: "Enhanced" },
];

const signalGroups: Array<{
  key: keyof NonNullable<PromptStudioGenerateResult["detectedSignals"]>;
  labelZh: string;
  labelEn: string;
}> = [
  { key: "scenes", labelZh: "场景", labelEn: "Scene" },
  { key: "actions", labelZh: "动作", labelEn: "Action" },
  { key: "styles", labelZh: "风格", labelEn: "Style" },
  { key: "lighting", labelZh: "光线", labelEn: "Lighting" },
  { key: "mood", labelZh: "情绪", labelEn: "Mood" },
  { key: "subjects", labelZh: "主体", labelEn: "Subject" },
];

const quickPrompts = [
  {
    label: "旧房改造广告",
    value: "高端室内设计广告，旧房改造成豪宅，现代极简，暖色自然光",
  },
  {
    label: "王家卫雨夜",
    value: "帮我写一个王家卫风格的雨夜便利店重逢短视频提示词，竖屏，孤独但温柔。",
  },
  {
    label: "中世纪黑暗奇幻",
    value: "中世纪黑暗奇幻短片第二幕，主角进入废弃教堂，发现核心道具",
  },
  {
    label: "赛博朋克人物海报",
    value: "赛博朋克霓虹城市中的独行女人人物海报，冷蓝调，电影级质感",
  },
  {
    label: "分镜短片",
    value: "分镜短片：雨夜街头，主角追逐一辆出租车，最后在桥下停住回头",
  },
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
  advancedControls: {
    shotSizes: [],
    cameraAngles: [],
    cameraMoves: [],
    lightingOptions: [],
    colorTones: [],
    moods: [],
    timeWeather: [],
    subjects: [],
  },
};

const subtleScrollbar =
  "[scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.18)_transparent] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20";

function cx(...classes: Array<false | null | string | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function isEngineAllowed(engine: Engine, target: Target) {
  const option = engineOptions.find((item) => item.id === engine);
  if (!option) return false;
  if (target === "storyboard") return option.target === "video";
  return option.target === target || option.target === "both";
}

function toggleId(list: string[], id: string) {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}

function itemSearchText(item: PromptStudioLibraryItem) {
  return `${item.nameZh} ${item.category} ${item.categoryId} ${item.path}`.toLowerCase();
}

function filterItems(items: LibraryItemWithKind[], query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return items;
  return items.filter((item) => itemSearchText(item).includes(normalized));
}

function isLibraryItemSelected(item: LibraryItemWithKind, selectedStyles: string[], selectedModules: string[]) {
  return item.libraryKind === "style" ? selectedStyles.includes(item.id) : selectedModules.includes(item.id);
}

function selectedCountForItems(items: LibraryItemWithKind[], selectedStyles: string[], selectedModules: string[]) {
  return items.reduce((count, item) => count + (isLibraryItemSelected(item, selectedStyles, selectedModules) ? 1 : 0), 0);
}

function SectionLabel({ children }: { children: string }) {
  return <div className="text-[11px] font-black uppercase tracking-[.22em] text-[#f6c66f]/80">{children}</div>;
}

function ControlPill({
  active,
  children,
  disabled,
  onClick,
}: {
  active?: boolean;
  children: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      className={cx(
        "inline-flex min-h-9 items-center rounded-full border px-3.5 text-xs font-black transition",
        active
          ? "border-[#f6a935]/32 bg-[#f6a935]/14 text-[#ffd48a] shadow-[0_0_26px_rgba(246,169,53,.08)]"
          : "border-white/[.07] bg-white/[.035] text-white/58 hover:border-[#f6a935]/22 hover:text-white/78",
        disabled ? "cursor-not-allowed opacity-35 hover:border-white/[.07] hover:text-white/58" : "",
      )}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function AdvancedOptionGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: PromptStudioAdvancedOption[];
  value?: string;
  onChange: (value: string) => void;
}) {
  if (!options.length) return null;
  return (
    <div>
      <div className="mb-2 text-[11px] font-black uppercase tracking-[.18em] text-white/36">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {options.slice(0, 10).map((option) => (
          <ControlPill
            active={value === option.id}
            key={option.id}
            onClick={() => onChange(value === option.id ? "" : option.id)}
          >
            {option.labelZh || option.labelEn}
          </ControlPill>
        ))}
      </div>
    </div>
  );
}

function PrimaryGenerateButton({
  children,
  disabled,
  isLoading,
  label,
  onClick,
}: {
  children: string;
  disabled?: boolean;
  isLoading?: boolean;
  label?: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cx(
        "group relative inline-flex min-h-12 items-center justify-center overflow-hidden rounded-2xl border px-6 text-sm font-black text-[#0a0805] outline-none transition duration-200 ease-out",
        "border-[#ffd48a]/42 bg-[linear-gradient(110deg,#ffe08d_0%,#ffc35a_30%,#f6a935_56%,#c8872e_100%)] shadow-[0_18px_46px_rgba(246,169,53,.28),inset_0_1px_0_rgba(255,255,255,.42)]",
        "hover:-translate-y-0.5 hover:border-[#ffe4ad]/70 hover:bg-[linear-gradient(110deg,#fff0b7_0%,#ffd36f_28%,#ffb845_58%,#d99534_100%)] hover:shadow-[0_24px_62px_rgba(246,169,53,.42),0_0_30px_rgba(255,195,90,.18),inset_0_1px_0_rgba(255,255,255,.55)]",
        "active:translate-y-px active:scale-[.985] active:shadow-[0_10px_28px_rgba(246,169,53,.24),inset_0_2px_8px_rgba(68,38,6,.24)]",
        "focus-visible:ring-2 focus-visible:ring-[#ffe4ad]/85 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07080a]",
        disabled
          ? "cursor-not-allowed opacity-70 hover:translate-y-0 hover:border-[#ffd48a]/42 hover:bg-[linear-gradient(110deg,#ffe08d_0%,#ffc35a_30%,#f6a935_56%,#c8872e_100%)] hover:shadow-[0_18px_46px_rgba(246,169,53,.22),inset_0_1px_0_rgba(255,255,255,.34)] active:scale-100 active:translate-y-0"
          : "",
      )}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(110deg,transparent_0%,rgba(255,255,255,.44)_45%,transparent_62%)] opacity-0 transition duration-700 group-hover:translate-x-full group-hover:opacity-100" />
      <span className="pointer-events-none absolute inset-x-3 top-0 h-px bg-white/55" />
      <span className="relative z-10 inline-flex items-center gap-2">
        {isLoading ? (
          <span className="size-4 rounded-full border-2 border-[#3a2206]/25 border-t-[#3a2206] animate-spin" aria-hidden="true" />
        ) : null}
        <span>{label || children}</span>
      </span>
    </button>
  );
}

function KnowledgeToken({ children, onRemove }: { children: string; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#f6a935]/18 bg-[#f6a935]/10 px-3 py-1.5 text-xs font-bold text-[#ffd48a]/90">
      {children}
      {onRemove ? (
        <button className="text-[#ffd48a]/54 hover:text-white" onClick={onRemove} type="button">
          x
        </button>
      ) : null}
    </span>
  );
}

function getSelectedItems(catalog: PromptStudioCatalog, selectedStyles: string[], selectedModules: string[]) {
  const styleItems = catalog.styles.filter((item) => selectedStyles.includes(item.id));
  const moduleItems = catalog.modules.filter((item) => selectedModules.includes(item.id));
  return [...styleItems, ...moduleItems];
}

function LibraryToggleButton({
  item,
  selected,
  onToggle,
}: {
  item: LibraryItemWithKind;
  selected: boolean;
  onToggle: (item: LibraryItemWithKind) => void;
}) {
  return (
    <button
      className={cx(
        "group inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold leading-5 transition",
        selected
          ? "border-[#f6a935]/55 bg-[linear-gradient(135deg,rgba(246,169,53,.28),rgba(255,195,90,.13))] text-[#fff0c9] shadow-[0_0_22px_rgba(246,169,53,.12)]"
          : "border-white/[.07] bg-white/[.035] text-white/58 hover:border-[#f6a935]/22 hover:text-white/82",
      )}
      onClick={() => onToggle(item)}
      type="button"
    >
      {selected ? <span className="grid size-4 place-items-center rounded-full bg-[#ffd48a] text-[10px] font-black text-[#100b04]">✓</span> : null}
      {item.nameZh}
      {selected ? <span className="rounded-full border border-[#ffd48a]/24 bg-black/20 px-1.5 py-0.5 text-[9px] uppercase tracking-[.12em] text-[#ffe4ad]/80">Selected</span> : null}
    </button>
  );
}

function LibrarySection({
  items,
  onToggle,
  selectedModules,
  selectedStyles,
  title,
}: {
  items: LibraryItemWithKind[];
  onToggle: (item: LibraryItemWithKind) => void;
  selectedModules: string[];
  selectedStyles: string[];
  title: string;
}) {
  if (!items.length) return null;

  return (
    <section className="rounded-[24px] border border-white/[.065] bg-[#0c0e12]/80 p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="min-w-0 truncate text-xs font-black uppercase tracking-[.16em] text-[#f6c66f]/78">{title}</h3>
        <span className="flex shrink-0 items-center gap-2 text-xs font-bold text-white/32">
          {selectedCountForItems(items, selectedStyles, selectedModules) ? (
            <span className="rounded-full border border-[#f6a935]/22 bg-[#f6a935]/10 px-2 py-0.5 text-[#ffd48a]/80">
              {selectedCountForItems(items, selectedStyles, selectedModules)} selected
            </span>
          ) : null}
          {items.length}
        </span>
      </div>
      <div className={cx("flex max-h-44 flex-wrap gap-2 overflow-y-auto pr-1", subtleScrollbar)}>
        {items.map((item) => (
          <LibraryToggleButton
            item={item}
            key={`${item.libraryKind}-${item.id}`}
            onToggle={onToggle}
            selected={item.libraryKind === "style" ? selectedStyles.includes(item.id) : selectedModules.includes(item.id)}
          />
        ))}
      </div>
    </section>
  );
}

function BrowseLibrariesDialog({
  catalog,
  isOpen,
  onClose,
  onClearSelection,
  onToggle,
  query,
  selectedModules,
  selectedStyles,
  setQuery,
}: {
  catalog: PromptStudioCatalog;
  isOpen: boolean;
  onClose: () => void;
  onClearSelection: () => void;
  onToggle: (item: LibraryItemWithKind) => void;
  query: string;
  selectedModules: string[];
  selectedStyles: string[];
  setQuery: (query: string) => void;
}) {
  const [activeLibraryTab, setActiveLibraryTab] = useState("recommended");
  const styleItems = useMemo(
    () => catalog.styles.map((item) => ({ ...item, libraryKind: "style" as const })),
    [catalog.styles],
  );
  const moduleItems = useMemo(
    () => catalog.modules.map((item) => ({ ...item, libraryKind: "module" as const })),
    [catalog.modules],
  );
  const recommendedItems = useMemo(
    () => catalog.recommendedStyles.map((item) => ({ ...item, libraryKind: "style" as const })),
    [catalog.recommendedStyles],
  );
  const filteredItems = useMemo(() => filterItems([...styleItems, ...moduleItems], query).slice(0, 80), [moduleItems, query, styleItems]);
  const cameraItems = useMemo(
    () =>
      moduleItems.filter((item) =>
        /运镜|镜头|机位|camera|motion|dolly|orbit|push|follow|tracking|shot/i.test(`${item.nameZh} ${item.category} ${item.path}`),
      ),
    [moduleItems],
  );
  const characterItems = useMemo(
    () =>
      moduleItems.filter((item) =>
        /人物|角色|表情|服装|姿态|一致|character|face|costume|expression|pose|identity/i.test(`${item.nameZh} ${item.category} ${item.path}`),
      ),
    [moduleItems],
  );
  const sceneItems = useMemo(
    () =>
      [...styleItems, ...moduleItems].filter((item) =>
        /场景|拍摄|类型|教堂|室内|城市|genre|scene|location|setting|interior|fantasy|commercial/i.test(`${item.nameZh} ${item.category} ${item.path}`),
      ),
    [moduleItems, styleItems],
  );
  const allItems = useMemo(() => [...styleItems, ...moduleItems], [moduleItems, styleItems]);
  const selectedCount = selectedStyles.length + selectedModules.length;
  const libraryTabs = [
    { id: "recommended", label: "Recommended", sublabel: "常用推荐", items: recommendedItems },
    { id: "styles", label: "Cinematic Styles", sublabel: "电影风格", items: styleItems },
    { id: "camera", label: "Camera Motion", sublabel: "运镜", items: cameraItems.length ? cameraItems : moduleItems.slice(0, 16) },
    { id: "character", label: "Character", sublabel: "人物模块", items: characterItems.length ? characterItems : moduleItems.slice(0, 16) },
    { id: "scene", label: "Scene / Genre", sublabel: "场景类型", items: sceneItems.length ? sceneItems : allItems.slice(0, 24) },
    { id: "all", label: "All Libraries", sublabel: "全部", items: allItems },
  ];
  const activeTab = libraryTabs.find((tab) => tab.id === activeLibraryTab) || libraryTabs[0];
  const visibleItems = query.trim() ? filteredItems : activeTab.items;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/68 px-4 py-6 backdrop-blur-sm">
      <section className="flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-[34px] border border-white/[.08] bg-[#101216] shadow-[0_30px_120px_rgba(0,0,0,.55)]">
        <div className="shrink-0 border-b border-white/[.07] bg-[linear-gradient(180deg,rgba(20,23,28,.98),rgba(16,18,22,.94))] p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <SectionLabel>Browse Libraries</SectionLabel>
              <h2 className="mt-2 text-2xl font-black text-white">选择知识库 / Browse Libraries</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/54">选择风格、运镜、人物或场景模块来增强 prompt。已选内容会作为增强层加入，不覆盖原始中文意图。</p>
            </div>
            <button
              className="rounded-full border border-white/[.08] bg-white/[.04] px-4 py-2 text-sm font-black text-white/68 hover:text-white"
              onClick={onClose}
              type="button"
            >
              Close
            </button>
          </div>
          <input
            className="mt-5 w-full rounded-2xl border border-white/[.08] bg-[#0c0e12] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/28 focus:border-[#f6a935]/38"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索：王家卫、A24、广告、运镜、角色一致性、废弃教堂..."
            value={query}
          />
        </div>

        <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="border-b border-white/[.06] bg-[#0c0e12]/54 p-4 lg:border-b-0 lg:border-r">
            <div className="grid gap-2">
              {libraryTabs.map((tab) => {
                const tabSelectedCount = selectedCountForItems(tab.items, selectedStyles, selectedModules);
                return (
                  <button
                    className={cx(
                      "rounded-2xl border px-3 py-3 text-left transition",
                      !query.trim() && activeLibraryTab === tab.id
                        ? "border-[#f6a935]/34 bg-[#f6a935]/12 shadow-[0_0_26px_rgba(246,169,53,.10)]"
                        : "border-white/[.055] bg-white/[.025] hover:border-[#f6a935]/18 hover:bg-white/[.04]",
                    )}
                    key={tab.id}
                    onClick={() => {
                      setActiveLibraryTab(tab.id);
                      if (query.trim()) setQuery("");
                    }}
                    type="button"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-black text-white/82">{tab.label}</span>
                      <span className="text-xs font-bold text-white/34">{tab.items.length}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2 text-xs text-white/42">
                      <span>{tab.sublabel}</span>
                      {tabSelectedCount ? <span className="rounded-full bg-[#f6a935]/14 px-2 py-0.5 text-[#ffd48a]">{tabSelectedCount} selected</span> : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className={cx("min-h-0 overflow-y-auto p-5", subtleScrollbar)}>
            <LibrarySection
              items={visibleItems}
              onToggle={onToggle}
              selectedModules={selectedModules}
              selectedStyles={selectedStyles}
              title={query.trim() ? `Search results (${filteredItems.length})` : `${activeTab.label} / ${activeTab.sublabel}`}
            />
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-white/[.07] bg-[#0b0d10]/94 p-4">
          <div className="text-sm font-semibold text-white/64">
            已选择 <span className="font-black text-[#ffd48a]">{selectedCount}</span> 个 / <span className="text-white/42">Selected {selectedCount}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-full border border-white/[.08] bg-white/[.035] px-4 py-2 text-sm font-black text-white/60 disabled:opacity-35"
              disabled={!selectedCount}
              onClick={onClearSelection}
              type="button"
            >
              清空选择
            </button>
            <button
              className="rounded-full border border-[#f6a935]/36 bg-gradient-to-r from-[#ffc35a] to-[#c8872e] px-5 py-2 text-sm font-black text-[#0d0903] shadow-[0_12px_34px_rgba(246,169,53,.20)]"
              onClick={onClose}
              type="button"
            >
              完成 / Done
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function DetectedSignalsPanel({ locale, result }: { locale: string; result: PromptStudioGenerateResult | null }) {
  const signals = result?.detectedSignals;
  const hasSignals = Boolean(signals && signalGroups.some((group) => signals[group.key]?.length));

  if (!hasSignals) return null;

  return (
    <section className="rounded-[28px] border border-white/[.065] bg-[#101216]/86 p-4">
      <SectionLabel>{locale === "zh" ? "识别到的关键词" : "Detected Signals"}</SectionLabel>
      <div className={cx("mt-3 grid max-h-52 gap-3 overflow-y-auto pr-1", subtleScrollbar)}>
        {signalGroups.map((group) => {
          const values = signals?.[group.key] || [];
          if (!values.length) return null;
          return (
            <div key={group.key}>
              <div className="mb-1.5 text-[10px] font-black uppercase tracking-[.16em] text-white/34">
                {locale === "zh" ? group.labelZh : group.labelEn}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {values.map((value) => (
                  <span className="rounded-full border border-white/[.07] bg-white/[.035] px-2.5 py-1 text-[11px] font-semibold text-white/64" key={value}>
                    {value}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function EmptyOutputState({ locale }: { locale: string }) {
  return (
    <div className="grid h-[460px] place-items-center rounded-[24px] border border-dashed border-white/[.08] bg-[#0c0e12]/62 p-8 text-center">
      <div>
        <div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl border border-[#f6a935]/18 bg-[#f6a935]/10 text-[#ffd48a]">
          SE
        </div>
        <h3 className="text-lg font-black text-white">{locale === "zh" ? "生成三档 Prompt" : "Generate three prompt versions"}</h3>
        <p className="mt-2 max-w-md text-sm leading-6 text-white/48">
          {locale === "zh"
            ? "输入想法，选择目标和风格，然后生成基础版、标准版和增强版英文 prompt。"
            : "Write an idea, choose a target and style, then generate Basic, Standard, and Enhanced prompts."}
        </p>
      </div>
    </div>
  );
}

function listToText(items?: string[]) {
  return items?.length ? items.map((item) => `- ${item}`).join("\n") : "";
}

function styleBibleToText(result: PromptStudioGenerateResult) {
  const bible = result.styleBible;
  if (!bible) return "";
  return [
    `Visual style: ${bible.visualStyle}`,
    `Color palette: ${bible.colorPalette}`,
    `Lighting rules: ${bible.lightingRules}`,
    `Camera rules: ${bible.cameraRules}`,
    `Continuity rules: ${bible.continuityRules}`,
  ].join("\n");
}

function storyboardToText(shots?: PromptStudioStoryboardShot[]) {
  if (!shots?.length) return "";
  return shots
    .map(
      (shot) =>
        `${shot.title}\nPurpose: ${shot.storyPurpose}\nKeyframe: ${shot.keyframeImagePrompt}\nVideo: ${shot.videoPrompt}\nCamera: ${shot.cameraMove}\nContinuity: ${shot.continuityNotes}`,
    )
    .join("\n\n");
}

export function PromptStudioPage() {
  const router = useRouter();
  const { locale } = useI18n();
  const mainRef = useRef<HTMLElement | null>(null);
  const outputRef = useRef<HTMLElement | null>(null);
  const [catalog, setCatalog] = useState<PromptStudioCatalog>(fallbackCatalog);
  const [catalogError, setCatalogError] = useState("");
  const [mode, setMode] = useState<TextMode>("generate");
  const [intent, setIntent] = useState("帮我写一个王家卫风格的雨夜便利店重逢短视频提示词，竖屏，孤独但温柔。");
  const [target, setTarget] = useState<Target>("video");
  const [existingPrompt, setExistingPrompt] = useState("rainy night, a woman standing outside a store, cinematic");
  const [transformGoal, setTransformGoal] = useState("更像王家卫电影，增加孤独感、霓虹反光、浅景深，但不要改变主体");
  const [layerEditType, setLayerEditType] = useState("lighting");
  const [engine, setEngine] = useState<Engine>("seedance");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [duration, setDuration] = useState("15s");
  const [advancedControls, setAdvancedControls] = useState<PromptStudioAdvancedControls>({});
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [libraryQuery, setLibraryQuery] = useState("");
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [result, setResult] = useState<PromptStudioGenerateResult | null>(null);
  const [activeResult, setActiveResult] = useState<ResultKey>("standardPrompt");
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const bridgeLocale = getPromptStudioDraftLocale(locale);
  const isZh = bridgeLocale === "zh";

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    const draft = consumeWorkspaceToPromptStudioDraft();
    if (!draft?.prompt) return;

    const timer = window.setTimeout(() => {
      setMode("optimize");
      setExistingPrompt(draft.prompt);
      setIntent(draft.prompt);
      setTarget(draft.target === "image" ? "image" : "video");
      setEngine(draft.target === "image" ? "gpt-image" : "seedance");
      setResult(null);
      setError("");
      setNotice(
        getPromptStudioDraftLocale(locale) === "zh"
          ? "已从工作区带入当前提示词。不会自动生成，请确认后手动点击生成。"
          : "Current prompt imported from workspace. It will not generate automatically. Please review and generate manually.",
      );
    }, 0);

    return () => window.clearTimeout(timer);
  }, [locale]);

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

  const selectedItems = useMemo(() => getSelectedItems(catalog, selectedStyles, selectedModules), [catalog, selectedModules, selectedStyles]);
  const currentPrompt = result
    ? mode === "optimize"
      ? result.optimizedPrompt || result.standardPrompt || ""
      : mode === "convert"
        ? result.convertedPrompt || result.standardPrompt || ""
          : mode === "layerEdit"
            ? result.revisedPrompt || result.standardPrompt || ""
            : mode === "storyboard"
            ? [styleBibleToText(result), storyboardToText(result.shots), listToText(result.continuityChecklist)].filter(Boolean).join("\n\n") ||
              result.standardPrompt ||
              result.enhancedPrompt ||
              result.basicPrompt ||
              ""
            : result[activeResult] || ""
    : "";
  const activeResultTab = resultTabs.find((tab) => tab.key === activeResult) || resultTabs[1];
  const usageTips = result?.usageTips || [];
  const knowledgeUsed: Array<{ id: string; label: string; detail?: string; phrases?: string[] }> = result?.selectedKnowledge?.length
    ? result.selectedKnowledge.map((item) => ({
        id: item.id,
        label: item.nameZh,
        detail: item.appliedAs || item.category,
        phrases: item.keyPhrases || [],
      }))
    : selectedItems.map((item) => ({ id: item.id, label: item.nameZh, detail: item.category, phrases: [] }));
  const modeOption = modeOptions.find((item) => item.id === mode) || modeOptions[0];
  const needsExistingPrompt = mode === "optimize" || mode === "convert" || mode === "layerEdit";
  const isGenerateDisabled = isLoading || (needsExistingPrompt ? !existingPrompt.trim() : !intent.trim());
  const generateButtonLabel = isLoading
    ? isZh
      ? "生成中..."
      : "Generating..."
    : isZh
      ? {
          generate: "生成三档 Prompt",
          optimize: "优化 Prompt",
          convert: "转换 Prompt",
          layerEdit: "只改这一层",
          storyboard: "生成分镜流水线",
        }[mode]
      : {
          generate: "Generate three prompts",
          optimize: "Optimize prompt",
          convert: "Convert prompt",
          layerEdit: "Edit this layer",
          storyboard: "Generate storyboard pipeline",
        }[mode];

  function scrollToOutput() {
    const main = mainRef.current;
    const output = outputRef.current;
    if (!main || !output) return;
    const mainTop = main.getBoundingClientRect().top;
    const outputTop = output.getBoundingClientRect().top;
    main.scrollTo({
      top: main.scrollTop + outputTop - mainTop - 16,
      behavior: "smooth",
    });
  }

  function handleTargetChange(nextTarget: Target) {
    setTarget(nextTarget);
    if (!isEngineAllowed(engine, nextTarget)) {
      setEngine(nextTarget === "image" ? "gpt-image" : "seedance");
    }
  }

  function updateAdvancedControl(key: keyof PromptStudioAdvancedControls, value: string) {
    setAdvancedControls((current) => ({
      ...current,
      [key]: value || undefined,
    }));
  }

  function handleModeChange(nextMode: TextMode) {
    setMode(nextMode);
    setResult(null);
    setError("");
    setNotice("");
    if (nextMode === "storyboard") {
      handleTargetChange("storyboard");
    } else if (target === "storyboard") {
      handleTargetChange("video");
    }
  }

  function handleLibraryToggle(item: LibraryItemWithKind) {
    if (item.libraryKind === "style") {
      setSelectedStyles((current) => toggleId(current, item.id));
    } else {
      setSelectedModules((current) => toggleId(current, item.id));
    }
  }

  async function handleGenerate() {
    const needsExistingPrompt = mode === "optimize" || mode === "convert" || mode === "layerEdit";
    if (needsExistingPrompt && !existingPrompt.trim()) {
      setError(isZh ? "请先输入已有 Prompt。" : "Please enter an existing prompt first.");
      return;
    }
    if (!needsExistingPrompt && !intent.trim()) {
      setError(isZh ? "请先输入中文想法。" : "Please enter an idea first.");
      return;
    }
    setIsLoading(true);
    setError("");
    setNotice("");
    try {
      const data = await generatePromptStudioPrompt({
        intent: needsExistingPrompt ? `${existingPrompt}\n${transformGoal}` : intent,
        existingPrompt,
        target: mode === "storyboard" ? "storyboard" : target,
        engine,
        aspectRatio,
        selectedStyles,
        selectedModules,
        duration,
        language: locale,
        mode,
        transformGoal,
        layerEditType,
        preserveOriginal: true,
        advancedControls,
      });
      setResult(data || null);
      setActiveResult("standardPrompt");
      setNotice(isZh ? "已生成三档英文提示词。未提交生成任务，也不会扣积分。" : "Generated three prompt versions. No generation job was submitted and no credits were used.");
      window.requestAnimationFrame(scrollToOutput);
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : isZh ? "生成提示词失败，请稍后重试。" : "Unable to generate prompts. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function copyPrompt(prompt: string) {
    if (!prompt) return;
    try {
      await navigator.clipboard?.writeText(prompt);
      setNotice(isZh ? "已复制当前版本。" : "Current version copied.");
    } catch {
      setNotice(isZh ? "复制失败，请手动选择文本复制。" : "Copy failed. Please select and copy the text manually.");
    }
  }

  function saveForVideo() {
    const prompt = currentPrompt;
    if (!prompt) return;
    savePromptStudioToVideoDraft({
      prompt,
      source: "prompt-studio",
      mode,
      target,
      engine,
    });
    setNotice(
      isZh
        ? "已填入视频工作区草稿。不会自动生成，请确认后手动点击生成。"
        : "Draft sent to the video workspace. It will not generate automatically. Please review and generate manually.",
    );
    router.push("/workspace/video?from=prompt-studio");
  }

  function saveForImage() {
    const prompt = currentPrompt;
    if (!prompt) return;
    savePromptStudioToImageDraft({
      prompt,
      source: "prompt-studio",
      mode,
      target,
      engine,
    });
    setNotice(
      isZh
        ? "已填入图片工作区草稿。不会自动生成，请确认后手动点击生成。"
        : "Draft sent to the image workspace. It will not generate automatically. Please review and generate manually.",
    );
    router.push("/workspace/image?from=prompt-studio");
  }

  function clearResult() {
    setResult(null);
    setNotice("");
    setError("");
    setActiveResult("standardPrompt");
  }

  return (
    <AppShell hideSidebar workspaceNav>
      <main
        className={cx("h-full overflow-y-auto overflow-x-hidden bg-[radial-gradient(circle_at_16%_0%,rgba(246,169,53,.10),transparent_30%),radial-gradient(circle_at_84%_18%,rgba(255,195,90,.065),transparent_34%),#07080a] text-white", subtleScrollbar)}
        ref={mainRef}
      >
        <div className="mx-auto grid max-w-[1600px] gap-5 px-4 py-5 md:px-6 xl:px-8">
          <section className="rounded-[34px] border border-white/[.07] bg-[linear-gradient(180deg,rgba(20,23,28,.96),rgba(12,14,18,.98))] p-5 shadow-[0_30px_100px_rgba(0,0,0,.35),inset_0_1px_0_rgba(255,255,255,.035)] md:p-6">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div>
                <SectionLabel>Prompt Composer</SectionLabel>
                <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <h1 className="text-3xl font-black tracking-tight text-white md:text-[32px]">{isZh ? "影视提示词工作室" : "Prompt Studio"}</h1>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-white/58">
                      {isZh
                        ? "把中文想法整理成专业英文 prompt，不生成图片/视频，不扣积分。"
                        : "Turn Chinese ideas into professional English prompts. No image or video generation. No credits used."}
                    </p>
                  </div>
                  <PrimaryGenerateButton
                    disabled={isGenerateDisabled}
                    isLoading={isLoading}
                    label={generateButtonLabel}
                    onClick={() => void handleGenerate()}
                  >
                    {isLoading ? (isZh ? "生成中..." : "Generating...") : isZh ? "生成三档 Prompt" : "Generate three prompts"}
                  </PrimaryGenerateButton>
                </div>

                <div className="mt-5 rounded-[26px] border border-white/[.07] bg-[#0c0e12] p-4 shadow-inner shadow-black/35">
                  <div className="mb-4 grid gap-2 md:grid-cols-5">
                    {modeOptions.map((item) => (
                      <button
                        className={cx(
                          "rounded-2xl border px-3 py-3 text-left transition",
                          mode === item.id
                            ? "border-[#ffc35a]/40 bg-[#f6a935]/14 text-[#ffe4ad] shadow-[0_0_26px_rgba(246,169,53,.10)]"
                            : "border-white/[.06] bg-white/[.025] text-white/54 hover:border-[#f6a935]/20 hover:text-white/78",
                        )}
                        key={item.id}
                        onClick={() => handleModeChange(item.id)}
                        type="button"
                      >
                        <div className="text-xs font-black">{isZh ? item.labelZh : item.labelEn}</div>
                        <div className="mt-1 line-clamp-2 text-[11px] leading-4 opacity-70">
                          {isZh ? item.descriptionZh : item.descriptionEn}
                        </div>
                      </button>
                    ))}
                  </div>

                  {needsExistingPrompt ? (
                    <div className="mb-4 grid gap-4">
                      <label>
                        <div className="mb-2 text-[11px] font-black uppercase tracking-[.18em] text-white/36">
                          {isZh ? "已有 Prompt" : "Existing Prompt"}
                        </div>
                        <textarea
                          className={cx("h-36 w-full resize-y rounded-2xl border border-white/[.06] bg-black/18 p-4 text-[14px] leading-6 text-white outline-none placeholder:text-white/30 focus:border-[#f6a935]/28", subtleScrollbar)}
                          maxLength={6000}
                          onChange={(event) => setExistingPrompt(event.target.value)}
                          placeholder="Paste an existing prompt here..."
                          value={existingPrompt}
                        />
                      </label>
                      {mode === "layerEdit" ? (
                        <div>
                          <div className="mb-2 text-[11px] font-black uppercase tracking-[.18em] text-white/36">
                            {isZh ? "只改哪一层" : "Layer to edit"}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {layerEditOptions.map((item) => (
                              <ControlPill active={layerEditType === item.id} key={item.id} onClick={() => setLayerEditType(item.id)}>
                                {isZh ? item.labelZh : item.labelEn}
                              </ControlPill>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      <label>
                        <div className="mb-2 text-[11px] font-black uppercase tracking-[.18em] text-white/36">
                          {mode === "optimize"
                            ? isZh
                              ? "优化目标"
                              : "Optimization Goal"
                            : mode === "convert"
                              ? isZh
                                ? "转换目标"
                                : "Conversion Goal"
                              : isZh
                                ? "修改说明"
                                : "Edit Instruction"}
                        </div>
                        <textarea
                          className={cx("h-24 w-full resize-y rounded-2xl border border-white/[.06] bg-black/18 p-4 text-[14px] leading-6 text-white outline-none placeholder:text-white/30 focus:border-[#f6a935]/28", subtleScrollbar)}
                          maxLength={2400}
                          onChange={(event) => setTransformGoal(event.target.value)}
                          placeholder={isZh ? "例如：保留主体，只增强王家卫雨夜、霓虹反光和孤独感。" : "Example: preserve the subject, add Wong Kar-wai rain-night neon reflections and loneliness."}
                          value={transformGoal}
                        />
                      </label>
                    </div>
                  ) : null}
                  <textarea
                    className={cx(
                      needsExistingPrompt ? "hidden" : "h-40 w-full resize-y bg-transparent text-[15px] leading-7 text-white outline-none placeholder:text-white/30",
                      subtleScrollbar,
                    )}
                    maxLength={2400}
                    onChange={(event) => setIntent(event.target.value)}
                    placeholder={isZh ? "例如：雨夜便利店，旧恋人重逢，竖屏短视频，孤独但温柔。" : "Example: a rainy night convenience store, former lovers reunite, vertical short video, lonely yet gentle."}
                    value={intent}
                  />
                  <div className={cx("mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-white/[.06] pt-3", needsExistingPrompt ? "hidden" : "")}>
                    <div className="flex flex-wrap gap-2">
                      {quickPrompts.map((item) => (
                        <button
                          className="rounded-full border border-white/[.07] bg-white/[.035] px-3 py-1.5 text-xs font-semibold text-white/56 transition hover:border-[#f6a935]/22 hover:text-white/82"
                          key={item.label}
                          onClick={() => setIntent(item.value)}
                          type="button"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                    <span className="text-xs font-semibold text-white/34">{intent.length} / 2400</span>
                  </div>
                </div>
                {mode !== "generate" ? (
                  <span className="rounded-full border border-[#f6a935]/24 bg-[#f6a935]/10 px-3 py-1.5 text-xs font-black text-[#ffd48a]">
                    {isZh ? modeOption.descriptionZh : modeOption.descriptionEn}
                  </span>
                ) : null}
              </div>

              <aside className="rounded-[28px] border border-[#f6a935]/22 bg-[linear-gradient(180deg,rgba(246,169,53,.085),rgba(20,15,9,.40))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.035)]">
                <div className="flex items-center justify-between gap-3">
                  <SectionLabel>{isZh ? "已选知识" : "Selected Knowledge"}</SectionLabel>
                  <span className="rounded-full border border-[#f6a935]/24 bg-[#f6a935]/12 px-2.5 py-1 text-xs font-black text-[#ffd48a]">
                    {selectedItems.length}
                  </span>
                </div>
                <div className={cx("mt-4 flex max-h-44 flex-wrap gap-2 overflow-y-auto pr-1", subtleScrollbar)}>
                  {selectedItems.slice(0, 16).map((item) => (
                    <KnowledgeToken
                      key={item.id}
                      onRemove={() =>
                        item.kind === "style"
                          ? setSelectedStyles((current) => current.filter((id) => id !== item.id))
                          : setSelectedModules((current) => current.filter((id) => id !== item.id))
                      }
                    >
                      {item.nameZh}
                    </KnowledgeToken>
                  ))}
                  {!selectedItems.length ? (
                    <div className="rounded-2xl border border-dashed border-[#f6a935]/18 bg-black/12 p-3 text-sm leading-6 text-white/46">
                      {isZh ? "还没有选择知识库。打开 Browse Libraries，选择风格、运镜或场景模块。" : "No library items selected yet. Open Browse Libraries to add styles, camera, or scene modules."}
                    </div>
                  ) : null}
                </div>
                <p className="mt-4 text-sm leading-6 text-white/54">
                  {isZh ? "已选知识作为增强层，不覆盖原始中文意图。" : "Selected knowledge enhances the prompt without replacing the original idea."}
                </p>
              </aside>
            </div>
          </section>

          <section className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="rounded-[28px] border border-white/[.065] bg-[#101216]/92 p-4">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <div className="mb-2 text-[11px] font-black uppercase tracking-[.18em] text-white/36">Target</div>
                  <div className="flex flex-wrap gap-1.5">
                    {targetOptions.map((item) => (
                      <ControlPill active={target === item.id} key={item.id} onClick={() => handleTargetChange(item.id)}>
                        {isZh ? item.labelZh : item.labelEn}
                      </ControlPill>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-2 text-[11px] font-black uppercase tracking-[.18em] text-white/36">Engine</div>
                  <div className="flex flex-wrap gap-1.5">
                    {engineOptions.map((item) => {
                      const disabled = !isEngineAllowed(item.id, target);
                      return (
                        <ControlPill active={engine === item.id} disabled={disabled} key={item.id} onClick={() => setEngine(item.id)}>
                          {item.label}
                        </ControlPill>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <div className="mb-2 text-[11px] font-black uppercase tracking-[.18em] text-white/36">Ratio</div>
                  <div className="flex flex-wrap gap-1.5">
                    {catalog.aspectRatios.slice(0, 5).map((ratio) => (
                      <ControlPill active={aspectRatio === ratio} key={ratio} onClick={() => setAspectRatio(ratio)}>
                        {ratio}
                      </ControlPill>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-2 text-[11px] font-black uppercase tracking-[.18em] text-white/36">Duration</div>
                  <div className="flex flex-wrap gap-1.5">
                    {["15s", "8s"].map((value) => (
                      <ControlPill active={duration === value} key={value} onClick={() => setDuration(value)}>
                        {value}
                      </ControlPill>
                    ))}
                    <input
                      className="h-9 w-24 rounded-full border border-white/[.07] bg-white/[.035] px-3 text-xs font-semibold text-white/70 outline-none focus:border-[#f6a935]/28"
                      onChange={(event) => setDuration(event.target.value)}
                      placeholder="Custom"
                      value={duration === "15s" || duration === "8s" ? "" : duration}
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              className="rounded-[28px] border border-white/[.07] bg-[#101216]/92 p-4 text-left transition hover:border-[#f6a935]/26"
              onClick={() => setIsLibraryOpen(true)}
              type="button"
            >
              <div className="flex items-center justify-between gap-3">
                <SectionLabel>Browse Libraries</SectionLabel>
                <span className="rounded-full border border-white/[.07] bg-white/[.035] px-2.5 py-1 text-xs text-white/58">Open</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-white/56">
                {isZh ? "搜索电影风格、运镜、人物模块和场景类型。" : "Search cinematic styles, camera language, character modules, and scene genres."}
              </p>
            </button>
          </section>

          <section className="rounded-[28px] border border-white/[.055] bg-[#101216]/72 p-4">
            <button
              className="flex w-full items-center justify-between gap-3 text-left"
              onClick={() => setIsAdvancedOpen((current) => !current)}
              type="button"
            >
              <div>
                <SectionLabel>{isZh ? "高级控制" : "Advanced Controls"}</SectionLabel>
                <p className="mt-2 text-sm leading-6 text-white/48">
                  {isZh
                    ? "可选：景别、机位、运镜、光线、色调、情绪、时间天气和主体。默认收起，不影响基础生成。"
                    : "Optional shot size, angle, movement, lighting, color, mood, time/weather, and subject controls."}
                </p>
              </div>
              <span className="rounded-full border border-white/[.07] bg-white/[.035] px-3 py-1.5 text-xs font-black text-white/58">
                {isAdvancedOpen ? (isZh ? "收起" : "Collapse") : isZh ? "展开" : "Expand"}
              </span>
            </button>
            {isAdvancedOpen ? (
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <AdvancedOptionGroup
                  label={isZh ? "景别" : "Shot size"}
                  options={catalog.advancedControls?.shotSizes || []}
                  value={advancedControls.shotSize}
                  onChange={(value) => updateAdvancedControl("shotSize", value)}
                />
                <AdvancedOptionGroup
                  label={isZh ? "机位角度" : "Camera angle"}
                  options={catalog.advancedControls?.cameraAngles || []}
                  value={advancedControls.cameraAngle}
                  onChange={(value) => updateAdvancedControl("cameraAngle", value)}
                />
                <AdvancedOptionGroup
                  label={isZh ? "运镜" : "Camera move"}
                  options={catalog.advancedControls?.cameraMoves || []}
                  value={advancedControls.cameraMove}
                  onChange={(value) => updateAdvancedControl("cameraMove", value)}
                />
                <AdvancedOptionGroup
                  label={isZh ? "光线" : "Lighting"}
                  options={catalog.advancedControls?.lightingOptions || []}
                  value={advancedControls.lighting}
                  onChange={(value) => updateAdvancedControl("lighting", value)}
                />
                <AdvancedOptionGroup
                  label={isZh ? "色调" : "Color tone"}
                  options={catalog.advancedControls?.colorTones || []}
                  value={advancedControls.colorTone}
                  onChange={(value) => updateAdvancedControl("colorTone", value)}
                />
                <AdvancedOptionGroup
                  label={isZh ? "氛围情绪" : "Mood"}
                  options={catalog.advancedControls?.moods || []}
                  value={advancedControls.mood}
                  onChange={(value) => updateAdvancedControl("mood", value)}
                />
                <AdvancedOptionGroup
                  label={isZh ? "时间 / 天气" : "Time / weather"}
                  options={catalog.advancedControls?.timeWeather || []}
                  value={advancedControls.timeWeather}
                  onChange={(value) => updateAdvancedControl("timeWeather", value)}
                />
                <AdvancedOptionGroup
                  label={isZh ? "主体" : "Subject"}
                  options={catalog.advancedControls?.subjects || []}
                  value={advancedControls.subject}
                  onChange={(value) => updateAdvancedControl("subject", value)}
                />
              </div>
            ) : null}
          </section>

          <section className="grid gap-3 lg:grid-cols-4">
            {[
              {
                title: isZh ? "常用推荐" : "Recommended",
                description: catalog.recommendedStyles.slice(0, 6).map((item) => item.nameZh).join(", ") || "Wong Kar-wai, A24, cyberpunk neon",
                count: catalog.recommendedStyles.length,
                active: true,
              },
              {
                title: "Cinematic Styles",
                description: isZh ? "电影美学、广告质感、作者风格、类型片调性。" : "Auteur looks, advertising polish, genre aesthetics.",
                count: catalog.styles.length,
              },
              {
                title: "Camera / Motion",
                description: isZh ? "推拉摇移、跟拍、环绕、镜头调度。" : "Push-in, handheld follow, orbit, dolly reveal.",
                count: catalog.modules.filter((item) => /运镜|camera|motion/i.test(`${item.category} ${item.nameZh}`)).length || catalog.modules.length,
              },
              {
                title: "Character + Scene",
                description: isZh ? "人物一致性、服装、表情、场景类型。" : "Character consistency, costume, expression, scene genre.",
                count: catalog.modules.length,
              },
            ].map((card) => (
              <article
                className={cx(
                  "rounded-[26px] border p-4",
                  card.active ? "border-[#f6a935]/18 bg-[#f6a935]/[.065]" : "border-white/[.06] bg-[#101216]/76",
                )}
                key={card.title}
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-black text-white">{card.title}</h3>
                  <span className="text-xs font-bold text-white/36">{card.count}</span>
                </div>
                <p className="mt-2 max-h-10 overflow-hidden text-xs leading-5 text-white/50">{card.description}</p>
                {card.active && selectedItems.length ? (
                  <div className="mt-3 inline-flex rounded-full border border-[#f6a935]/18 bg-[#f6a935]/10 px-2.5 py-1 text-[11px] font-black text-[#ffd48a]/88">
                    {selectedItems.length} selected
                  </div>
                ) : null}
              </article>
            ))}
          </section>

          {catalogError ? <div className="rounded-2xl border border-red-300/20 bg-red-400/10 p-3 text-sm text-red-100">{catalogError}</div> : null}
          {notice ? <div className="rounded-2xl border border-[#f6a935]/24 bg-[#f6a935]/10 p-3 text-sm text-[#ffd48a]">{notice}</div> : null}
          {error ? <div className="rounded-2xl border border-red-300/20 bg-red-400/10 p-3 text-sm text-red-100">{error}</div> : null}

          <section className="grid min-h-[560px] gap-4 xl:grid-cols-[minmax(0,2.28fr)_minmax(320px,.88fr)]" ref={outputRef}>
            <article className="rounded-[34px] border border-white/[.07] bg-[#101216]/92 p-4 shadow-[0_26px_80px_rgba(0,0,0,.28)] md:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <SectionLabel>Prompt Output Editor</SectionLabel>
                  <h2 className="mt-2 text-xl font-black text-white">
                    {mode === "generate"
                      ? `${isZh ? activeResultTab.labelZh : activeResultTab.labelEn} Prompt`
                      : isZh
                        ? modeOption.labelZh
                        : modeOption.labelEn}
                  </h2>
                </div>
                <div className={cx("flex rounded-full border border-white/[.07] bg-[#0c0e12] p-1.5 shadow-inner shadow-black/35", mode !== "generate" ? "hidden" : "")}>
                  {resultTabs.map((tab) => (
                    <button
                      className={cx(
                        "rounded-full px-4 py-2 text-xs font-black transition active:scale-[.98]",
                        activeResult === tab.key
                          ? "border border-[#ffc35a]/45 bg-gradient-to-r from-[#ffc35a] via-[#f6a935] to-[#b87929] text-[#100a03] shadow-[0_10px_30px_rgba(246,169,53,.22)]"
                          : "text-white/38 hover:bg-white/[.04] hover:text-white/72",
                      )}
                      key={tab.key}
                      onClick={() => setActiveResult(tab.key)}
                      type="button"
                    >
                      {isZh ? tab.labelZh : tab.labelEn}
                      {activeResult === tab.key ? (
                        <span className="ml-2 rounded-full bg-black/18 px-1.5 py-0.5 text-[9px] uppercase tracking-[.12em] text-[#211402]/70">
                          {isZh ? "当前选中" : "Selected"}
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
                {mode !== "generate" ? (
                  <span className="rounded-full border border-[#f6a935]/24 bg-[#f6a935]/10 px-3 py-1.5 text-xs font-black text-[#ffd48a]">
                    {isZh ? modeOption.descriptionZh : modeOption.descriptionEn}
                  </span>
                ) : null}
              </div>

              <div className="mt-5 rounded-[26px] border border-white/[.065] bg-[linear-gradient(180deg,rgba(12,14,18,.98),rgba(7,8,10,.98))] p-4 shadow-inner shadow-black/35">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="text-xs font-black uppercase tracking-[.18em] text-white/38">Editable Prompt</span>
                  <button
                    className="rounded-full border border-white/[.08] bg-white/[.04] px-3 py-1.5 text-xs font-black text-white/72 disabled:opacity-35"
                    disabled={!currentPrompt}
                    onClick={() => void copyPrompt(currentPrompt)}
                    type="button"
                  >
                    Copy
                  </button>
                </div>
                {result ? (
                  <pre
                    className={cx(
                      "h-[460px] overflow-y-auto whitespace-pre-wrap break-words pr-2 font-mono text-[13px] leading-6 text-white/80 2xl:h-[520px]",
                      subtleScrollbar,
                    )}
                  >
                    {currentPrompt}
                  </pre>
                ) : (
                  <EmptyOutputState locale={locale} />
                )}
              </div>

              {result && mode === "optimize" ? (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <section className="rounded-[22px] border border-white/[.06] bg-white/[.025] p-4">
                    <div className="text-xs font-black uppercase tracking-[.18em] text-[#ffd48a]/72">Diagnosis</div>
                    <ul className="mt-3 grid gap-2 text-sm leading-6 text-white/62">
                      {(result.diagnosis || []).map((item) => (
                        <li key={item}>- {item}</li>
                      ))}
                    </ul>
                  </section>
                  <section className="rounded-[22px] border border-white/[.06] bg-white/[.025] p-4">
                    <div className="text-xs font-black uppercase tracking-[.18em] text-[#ffd48a]/72">Changes</div>
                    <ul className="mt-3 grid gap-2 text-sm leading-6 text-white/62">
                      {(result.changes || []).map((item) => (
                        <li key={item}>- {item}</li>
                      ))}
                    </ul>
                  </section>
                </div>
              ) : null}

              {result && mode === "convert" ? (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <section className="rounded-[22px] border border-white/[.06] bg-white/[.025] p-4">
                    <div className="text-xs font-black uppercase tracking-[.18em] text-[#ffd48a]/72">Preserved</div>
                    <ul className="mt-3 grid gap-2 text-sm leading-6 text-white/62">
                      {(result.preservedElements || []).map((item) => (
                        <li key={item}>- {item}</li>
                      ))}
                    </ul>
                  </section>
                  <section className="rounded-[22px] border border-white/[.06] bg-white/[.025] p-4">
                    <div className="text-xs font-black uppercase tracking-[.18em] text-[#ffd48a]/72">Changed</div>
                    <ul className="mt-3 grid gap-2 text-sm leading-6 text-white/62">
                      {(result.changedElements || []).map((item) => (
                        <li key={item}>- {item}</li>
                      ))}
                    </ul>
                  </section>
                </div>
              ) : null}

              {result && mode === "layerEdit" ? (
                <div className="mt-4 grid gap-3 md:grid-cols-[1fr_.7fr]">
                  <section className="rounded-[22px] border border-white/[.06] bg-white/[.025] p-4">
                    <div className="text-xs font-black uppercase tracking-[.18em] text-[#ffd48a]/72">Unchanged Elements</div>
                    <ul className="mt-3 grid gap-2 text-sm leading-6 text-white/62">
                      {(result.unchangedElements || []).map((item) => (
                        <li key={item}>- {item}</li>
                      ))}
                    </ul>
                  </section>
                  <section className="rounded-[22px] border border-[#f6a935]/18 bg-[#f6a935]/8 p-4">
                    <div className="text-xs font-black uppercase tracking-[.18em] text-[#ffd48a]/72">Edited Layer</div>
                    <div className="mt-3 text-sm font-black text-white/82">{result.editedLayer?.type || layerEditType}</div>
                    <p className="mt-2 text-sm leading-6 text-white/58">{result.editedLayer?.instruction || transformGoal}</p>
                  </section>
                </div>
              ) : null}

              {result && mode === "storyboard" ? (
                <div className="mt-4 grid gap-3">
                  {result.styleBible ? (
                    <section className="rounded-[22px] border border-[#f6a935]/18 bg-[#f6a935]/8 p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="text-xs font-black uppercase tracking-[.18em] text-[#ffd48a]/72">Style Bible</div>
                        <button
                          className="rounded-full border border-white/[.08] bg-white/[.04] px-3 py-1.5 text-xs font-black text-white/72"
                          onClick={() => void copyPrompt(styleBibleToText(result))}
                          type="button"
                        >
                          Copy
                        </button>
                      </div>
                      <pre className="whitespace-pre-wrap break-words text-sm leading-6 text-white/68">{styleBibleToText(result)}</pre>
                    </section>
                  ) : null}
                  <div className="grid gap-3">
                    {(result.shots || []).map((shot) => (
                      <section className="rounded-[22px] border border-white/[.06] bg-white/[.025] p-4" key={shot.shotNumber}>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-xs font-black uppercase tracking-[.18em] text-[#ffd48a]/72">
                              Shot {shot.shotNumber}
                            </div>
                            <h3 className="mt-1 text-base font-black text-white">{shot.title}</h3>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button className="rounded-full border border-white/[.08] bg-white/[.04] px-3 py-1.5 text-xs font-black text-white/72" onClick={() => void copyPrompt(shot.keyframeImagePrompt)} type="button">
                              Copy keyframe
                            </button>
                            <button className="rounded-full border border-white/[.08] bg-white/[.04] px-3 py-1.5 text-xs font-black text-white/72" onClick={() => void copyPrompt(shot.videoPrompt)} type="button">
                              Copy video
                            </button>
                          </div>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-white/58">{shot.storyPurpose}</p>
                        <div className="mt-3 grid gap-3 lg:grid-cols-2">
                          <div className="rounded-2xl border border-white/[.05] bg-black/16 p-3">
                            <div className="mb-2 text-[11px] font-black uppercase tracking-[.16em] text-white/36">Keyframe Prompt</div>
                            <p className="text-sm leading-6 text-white/64">{shot.keyframeImagePrompt}</p>
                          </div>
                          <div className="rounded-2xl border border-white/[.05] bg-black/16 p-3">
                            <div className="mb-2 text-[11px] font-black uppercase tracking-[.16em] text-white/36">Video Prompt</div>
                            <p className="text-sm leading-6 text-white/64">{shot.videoPrompt}</p>
                          </div>
                        </div>
                        <p className="mt-3 text-xs leading-5 text-white/42">{shot.continuityNotes}</p>
                      </section>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                <button
                  className="min-h-11 rounded-2xl border border-[#f6a935]/20 bg-[#f6a935]/12 px-4 text-sm font-black text-[#ffd48a] disabled:opacity-35"
                  disabled={!currentPrompt}
                  onClick={() => void copyPrompt(currentPrompt)}
                  type="button"
                >
                  {isZh ? "复制当前版本" : "Copy current version"}
                </button>
                <button
                  className="min-h-11 rounded-2xl border border-white/[.07] bg-white/[.035] px-4 text-sm font-black text-white/68 disabled:opacity-35"
                  disabled={!result}
                  onClick={saveForVideo}
                  type="button"
                >
                  {isZh ? "填入视频工作区" : "Fill Video Workspace"}
                </button>
                <button
                  className="min-h-11 rounded-2xl border border-white/[.07] bg-white/[.035] px-4 text-sm font-black text-white/68 disabled:opacity-35"
                  disabled={!result}
                  onClick={saveForImage}
                  type="button"
                >
                  {isZh ? "填入图片工作区" : "Fill Image Workspace"}
                </button>
                <button
                  className="min-h-11 rounded-2xl border border-white/[.07] bg-white/[.035] px-4 text-sm font-black text-white/68"
                  onClick={clearResult}
                  type="button"
                >
                  {isZh ? "清空结果" : "Clear result"}
                </button>
              </div>
            </article>

            <aside className={cx("grid content-start gap-4 overflow-y-auto pr-1 xl:max-h-[calc(100vh-150px)]", subtleScrollbar)}>
              <DetectedSignalsPanel locale={locale} result={result} />
              <section className="rounded-[28px] border border-white/[.065] bg-[#101216]/86 p-4">
                <SectionLabel>{isZh ? "使用的知识" : "Knowledge Used"}</SectionLabel>
                <div className={cx("mt-3 grid max-h-44 gap-2 overflow-y-auto pr-1", subtleScrollbar)}>
                  {knowledgeUsed.length ? (
                    knowledgeUsed.slice(0, 18).map((item) => (
                      <div className="rounded-2xl border border-white/[.06] bg-white/[.025] px-3 py-2" key={`${item.id}-${item.label}`}>
                        <div className="text-sm font-semibold text-white/70">{item.label}</div>
                        {item.detail ? <div className="mt-0.5 text-[11px] text-white/34">{item.detail}</div> : null}
                        {item.phrases?.length ? (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {item.phrases.slice(0, 5).map((phrase) => (
                              <span className="rounded-full border border-[#f6a935]/14 bg-[#f6a935]/8 px-2 py-0.5 text-[10px] font-semibold text-[#ffd48a]/70" key={phrase}>
                                {phrase}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm leading-6 text-white/46">{isZh ? "选择风格或生成后会显示知识库摘要。" : "Selected library items and generated knowledge will appear here."}</p>
                  )}
                </div>
              </section>
              <section className="rounded-[28px] border border-white/[.065] bg-[#101216]/86 p-4">
                <SectionLabel>{isZh ? "使用建议" : "Usage Tips"}</SectionLabel>
                <ul className={cx("mt-3 grid max-h-40 gap-2 overflow-y-auto pr-1 text-sm leading-6 text-white/56", subtleScrollbar)}>
                  {(usageTips.length
                    ? usageTips
                    : [
                        isZh ? "先检查人物、地点和动作连续性，再保存到工作区草稿。" : "Review names, location details, and action continuity before saving to a workspace draft.",
                        isZh ? "Prompt Studio 只生成文本，不提交生成任务。" : "Prompt Studio only generates text. It does not submit generation jobs.",
                      ]
                  ).map((tip) => (
                    <li key={tip}>- {tip}</li>
                  ))}
                </ul>
              </section>
              {result?.warnings?.length ? (
                <section className="rounded-[28px] border border-[#f6a935]/16 bg-[#f6a935]/7 p-4">
                  <SectionLabel>Warnings</SectionLabel>
                  <ul className="mt-3 grid gap-2 text-sm leading-6 text-[#ffd48a]/76">
                    {result.warnings.map((warning) => (
                      <li key={warning}>- {warning}</li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </aside>
          </section>
        </div>

        <BrowseLibrariesDialog
          catalog={catalog}
          isOpen={isLibraryOpen}
          onClearSelection={() => {
            setSelectedStyles([]);
            setSelectedModules([]);
          }}
          onClose={() => setIsLibraryOpen(false)}
          onToggle={handleLibraryToggle}
          query={libraryQuery}
          selectedModules={selectedModules}
          selectedStyles={selectedStyles}
          setQuery={setLibraryQuery}
        />
      </main>
    </AppShell>
  );
}
