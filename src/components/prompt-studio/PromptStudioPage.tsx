"use client";

import { type ChangeEvent, type DragEvent, type RefObject, useEffect, useMemo, useRef, useState } from "react";
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
  analyzePromptStudioReference,
  deletePromptStudioProject,
  fetchPromptStudioProject,
  fetchPromptStudioProjects,
  fetchPromptStudioCatalog,
  generatePromptStudioProjectPlan,
  generatePromptStudioPrompt,
  generatePromptStudioReferenceStylePrompt,
  savePromptStudioProject,
  type PromptStudioAdvancedControls,
  type PromptStudioAdvancedOption,
  type PromptStudioCatalog,
  type PromptStudioGenerateResult,
  type PromptStudioLibraryItem,
  type PromptStudioMode,
  type PromptStudioAssetReferenceImage,
  type PromptStudioProjectPlanResult,
  type PromptStudioProjectType,
  type PromptStudioReferenceAnalysisResult,
  type PromptStudioReferencePreserveMode,
  type PromptStudioReferenceStyleMode,
  type PromptStudioReferenceStylePromptResult,
  type PromptStudioReferenceStyleCard,
  type PromptStudioSavedProject,
  type PromptStudioSavedProjectSummary,
  type PromptStudioStoryboardShot,
  updatePromptStudioProject,
  uploadPromptStudioAssetImage,
} from "@/lib/prompt-studio-api";

type Target = "video" | "image" | "storyboard";
type Engine = "seedance" | "higgsfield" | "gpt-image" | "nano-banana";
type ResultKey = "basicPrompt" | "standardPrompt" | "enhancedPrompt";
type LibraryKind = "style" | "module";
type LibraryGroupId = "recommended" | "cinematic" | "camera" | "character" | "scene" | "all";
type TextMode = Exclude<PromptStudioMode, "all">;
type ProjectAssetKind = "characters" | "locations" | "props";
type ProjectAssetItem =
  | PromptStudioProjectPlanResult["assetPlan"]["characters"][number]
  | PromptStudioProjectPlanResult["assetPlan"]["locations"][number]
  | PromptStudioProjectPlanResult["assetPlan"]["props"][number];
type BridgeReferenceImage = NonNullable<Parameters<typeof savePromptStudioToImageDraft>[0]["referenceImages"]>[number];

type LibraryItemWithKind = PromptStudioLibraryItem & { libraryKind: LibraryKind };

const characterModuleNames = ["人物形象", "表情神态", "服装造型妆发", "姿态动作", "角色一致性"];

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
  {
    id: "styleCard",
    labelZh: "参考图反推",
    labelEn: "Style Card",
    descriptionZh: "上传参考图，反推出风格卡和可复用 prompt",
    descriptionEn: "Analyze a reference image into a reusable style card",
  },
  {
    id: "referenceStyle",
    labelZh: "垫图 + 风格",
    labelEn: "Reference + Style",
    descriptionZh: "保留参考图构图/主体/姿态，再叠加风格生成文本 prompt",
    descriptionEn: "Preserve a reference image layer, then apply a style prompt layer",
  },
  {
    id: "project",
    labelZh: "项目制作",
    labelEn: "Project Studio",
    descriptionZh: "生成风格宪法、资产清单和分镜 prompt 包",
    descriptionEn: "Plan style constitution, assets, and shot prompt packs",
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

const referencePreserveOptions: Array<{ id: PromptStudioReferencePreserveMode; labelZh: string; labelEn: string }> = [
  { id: "composition", labelZh: "保留构图", labelEn: "Preserve composition" },
  { id: "subject", labelZh: "保留主体", labelEn: "Preserve subject" },
  { id: "pose", labelZh: "保留姿态", labelEn: "Preserve pose" },
  { id: "scene", labelZh: "保留场景", labelEn: "Preserve scene" },
  { id: "firstFrame", labelZh: "作为视频首帧", labelEn: "Use as video first frame" },
  { id: "fullReference", labelZh: "尽量保留整张参考", labelEn: "Preserve full reference" },
];

const referenceStyleOptions: Array<{ id: PromptStudioReferenceStyleMode; labelZh: string; labelEn: string }> = [
  { id: "selectedLibraries", labelZh: "使用已选知识库", labelEn: "Use selected libraries" },
  { id: "styleCard", labelZh: "使用风格卡", labelEn: "Use Style Card" },
  { id: "manual", labelZh: "手写风格说明", labelEn: "Manual style instruction" },
];

const projectTypeOptions: Array<{ id: PromptStudioProjectType; labelZh: string; labelEn: string }> = [
  { id: "short-film", labelZh: "短片", labelEn: "Short Film" },
  { id: "short-drama", labelZh: "短剧", labelEn: "Short Drama" },
  { id: "commercial", labelZh: "广告", labelEn: "Commercial" },
  { id: "music-video", labelZh: "MV", labelEn: "Music Video" },
  { id: "storyboard", labelZh: "分镜", labelEn: "Storyboard" },
];

const projectShotCountOptions = [3, 5, 8];

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

const referenceSignalGroups: Array<{
  key: keyof PromptStudioReferenceAnalysisResult["detectedSignals"];
  labelZh: string;
  labelEn: string;
}> = [
  { key: "scene", labelZh: "场景", labelEn: "Scene" },
  { key: "subject", labelZh: "主体", labelEn: "Subject" },
  { key: "lighting", labelZh: "光线", labelEn: "Lighting" },
  { key: "color", labelZh: "色彩", labelEn: "Color" },
  { key: "mood", labelZh: "氛围", labelEn: "Mood" },
  { key: "composition", labelZh: "构图", labelEn: "Composition" },
  { key: "texture", labelZh: "质感", labelEn: "Texture" },
];

const styleCardGroups: Array<{
  key: keyof PromptStudioReferenceStyleCard;
  labelZh: string;
  labelEn: string;
}> = [
  { key: "subjectMatter", labelZh: "主体题材", labelEn: "Subject Matter" },
  { key: "composition", labelZh: "构图", labelEn: "Composition" },
  { key: "shotSize", labelZh: "景别", labelEn: "Shot Size" },
  { key: "cameraAngle", labelZh: "机位", labelEn: "Camera Angle" },
  { key: "depthOfField", labelZh: "景深", labelEn: "Depth of Field" },
  { key: "lighting", labelZh: "光线", labelEn: "Lighting" },
  { key: "colorPalette", labelZh: "色调", labelEn: "Color Palette" },
  { key: "textureAndMedium", labelZh: "质感", labelEn: "Texture / Medium" },
  { key: "mood", labelZh: "氛围", labelEn: "Mood" },
  { key: "visualEra", labelZh: "视觉年代", labelEn: "Visual Era" },
  { key: "cameraMovementSuggestion", labelZh: "运镜建议", labelEn: "Camera Movement" },
];

const referenceSummaryGroups: Array<{
  key: keyof PromptStudioReferenceStylePromptResult["referenceSummary"];
  labelZh: string;
  labelEn: string;
}> = [
  { key: "subject", labelZh: "主体", labelEn: "Subject" },
  { key: "composition", labelZh: "构图", labelEn: "Composition" },
  { key: "spatialLayout", labelZh: "空间布局", labelEn: "Spatial Layout" },
  { key: "poseOrAction", labelZh: "姿态/动作", labelEn: "Pose / Action" },
  { key: "cameraAngle", labelZh: "机位", labelEn: "Camera Angle" },
  { key: "lighting", labelZh: "光线", labelEn: "Lighting" },
  { key: "colorPalette", labelZh: "色彩", labelEn: "Color Palette" },
  { key: "sceneElements", labelZh: "场景元素", labelEn: "Scene Elements" },
];

const knowledgeProfileGroups: Array<{
  key: keyof NonNullable<PromptStudioGenerateResult["selectedKnowledge"][number]["knowledgeProfile"]>;
  label: string;
}> = [
  { key: "visualLanguage", label: "Visual" },
  { key: "cinematography", label: "Cinematography" },
  { key: "lighting", label: "Lighting" },
  { key: "composition", label: "Composition" },
  { key: "colorGrading", label: "Color" },
  { key: "textureAndMedium", label: "Texture" },
  { key: "cameraMovement", label: "Camera" },
  { key: "characterDirection", label: "Character" },
  { key: "continuityRules", label: "Continuity" },
  { key: "negativeConstraints", label: "Negative" },
  { key: "usageTips", label: "Tips" },
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

function itemMatches(item: PromptStudioLibraryItem, pattern: RegExp) {
  return pattern.test(`${item.nameZh} ${item.category} ${item.categoryId} ${item.path}`);
}

function uniqueLibraryItems(items: LibraryItemWithKind[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.libraryKind}:${item.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sortByPreferredNames(items: LibraryItemWithKind[], preferredNames: string[]) {
  return [...items].sort((a, b) => {
    const aIndex = preferredNames.indexOf(a.nameZh);
    const bIndex = preferredNames.indexOf(b.nameZh);
    const normalizedA = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
    const normalizedB = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;
    if (normalizedA !== normalizedB) return normalizedA - normalizedB;
    return a.nameZh.localeCompare(b.nameZh, "zh-Hans-CN");
  });
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
      {items.length ? (
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
      ) : (
        <div className="rounded-2xl border border-dashed border-white/[.08] bg-white/[.025] px-4 py-6 text-sm font-semibold text-white/42">
          No items in this category
        </div>
      )}
    </section>
  );
}

function BrowseLibrariesDialog({
  activeLibraryCategory,
  catalog,
  isOpen,
  onClose,
  onClearSelection,
  onLibraryCategoryChange,
  onToggle,
  query,
  selectedModules,
  selectedStyles,
  setQuery,
}: {
  activeLibraryCategory: LibraryGroupId;
  catalog: PromptStudioCatalog;
  isOpen: boolean;
  onClose: () => void;
  onClearSelection: () => void;
  onLibraryCategoryChange: (categoryId: LibraryGroupId) => void;
  onToggle: (item: LibraryItemWithKind) => void;
  query: string;
  selectedModules: string[];
  selectedStyles: string[];
  setQuery: (query: string) => void;
}) {
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
  const allItems = useMemo(() => [...styleItems, ...moduleItems], [moduleItems, styleItems]);
  const filteredItems = useMemo(() => filterItems(allItems, query).slice(0, 80), [allItems, query]);
  const cameraItems = useMemo(
    () =>
      uniqueLibraryItems([
        ...moduleItems.filter(
          (item) =>
            item.categoryId === "horizontal" &&
            itemMatches(item, /运镜|镜头|机位|camera|motion|dolly|orbit|push|follow|tracking|shot/i),
        ),
        ...styleItems.filter((item) => item.categoryId === "technical" && itemMatches(item, /镜头|摄影|运镜|camera|motion|dolly|tracking|shot/i)),
      ]),
    [moduleItems, styleItems],
  );
  const characterItems = useMemo(
    () =>
      sortByPreferredNames(
        moduleItems.filter(
          (item) =>
            item.categoryId === "character" ||
            item.category === "人物模块" ||
            characterModuleNames.includes(item.nameZh) ||
            itemMatches(item, /人物模块|人物形象|表情神态|服装造型妆发|姿态动作|角色一致性|character|face|costume|expression|pose|identity/i),
        ),
        characterModuleNames,
      ),
    [moduleItems],
  );
  const sceneItems = useMemo(
    () =>
      uniqueLibraryItems(
        styleItems.filter(
          (item) =>
            item.categoryId === "scene" ||
            item.categoryId === "narrative" ||
            itemMatches(item, /拍摄场景|叙事类型|片种类型|场景|类型|教堂|室内|城市|genre|scene|location|setting|interior|fantasy|commercial/i),
        ),
      ),
    [styleItems],
  );
  const selectedCount = selectedStyles.length + selectedModules.length;
  const libraryGroups = useMemo<Array<{ id: LibraryGroupId; label: string; sublabel: string; items: LibraryItemWithKind[] }>>(
    () => [
      { id: "recommended", label: "Recommended", sublabel: "常用推荐", items: recommendedItems },
      { id: "cinematic", label: "Cinematic Styles", sublabel: "电影风格", items: styleItems },
      { id: "camera", label: "Camera Motion", sublabel: "运镜", items: cameraItems },
      { id: "character", label: "Character", sublabel: "人物模块", items: characterItems },
      { id: "scene", label: "Scene / Genre", sublabel: "场景类型", items: sceneItems },
      { id: "all", label: "All Libraries", sublabel: "全部", items: allItems },
    ],
    [allItems, cameraItems, characterItems, recommendedItems, sceneItems, styleItems],
  );
  const activeGroup = libraryGroups.find((group) => group.id === activeLibraryCategory) || libraryGroups[0];
  const visibleItems = query.trim() ? filteredItems : activeGroup.items;
  const selectLibraryCategory = (categoryId: LibraryGroupId) => {
    if (query.trim()) setQuery("");
    onLibraryCategoryChange(categoryId);
  };

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
              {libraryGroups.map((group) => {
                const tabSelectedCount = selectedCountForItems(group.items, selectedStyles, selectedModules);
                return (
                  <button
                    aria-pressed={!query.trim() && activeLibraryCategory === group.id}
                    className={cx(
                      "rounded-2xl border px-3 py-3 text-left transition",
                      !query.trim() && activeLibraryCategory === group.id
                        ? "border-[#f6a935]/34 bg-[#f6a935]/12 shadow-[0_0_26px_rgba(246,169,53,.10)]"
                        : "border-white/[.055] bg-white/[.025] hover:border-[#f6a935]/18 hover:bg-white/[.04]",
                    )}
                    key={group.id}
                    onClick={() => selectLibraryCategory(group.id)}
                    type="button"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-black text-white/82">{group.label}</span>
                      <span className="text-xs font-bold text-white/34">{group.items.length}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2 text-xs text-white/42">
                      <span>{group.sublabel}</span>
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
              title={query.trim() ? `Search results (${filteredItems.length})` : `${activeGroup.label} / ${activeGroup.sublabel}`}
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

function ReferenceDetectedSignalsPanel({ locale, result }: { locale: string; result: PromptStudioReferenceAnalysisResult | null }) {
  const signals = result?.detectedSignals;
  const hasSignals = Boolean(signals && referenceSignalGroups.some((group) => signals[group.key]?.length));

  if (!hasSignals) return null;

  return (
    <section className="rounded-[28px] border border-white/[.065] bg-[#101216]/86 p-4">
      <SectionLabel>{locale === "zh" ? "识别到的风格信号" : "Detected Style Signals"}</SectionLabel>
      <div className={cx("mt-3 grid max-h-52 gap-3 overflow-y-auto pr-1", subtleScrollbar)}>
        {referenceSignalGroups.map((group) => {
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

function formatFileSize(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function styleCardToGuidance(result: PromptStudioReferenceAnalysisResult) {
  return [
    "Reference Style Card",
    `Analysis source: ${result.analysisSource}`,
    `Lighting: ${result.styleCard.lighting.join(", ")}`,
    `Color: ${result.styleCard.colorPalette.join(", ")}`,
    `Composition: ${result.styleCard.composition.join(", ")}`,
    `Texture: ${result.styleCard.textureAndMedium.join(", ")}`,
    `Mood: ${result.styleCard.mood.join(", ")}`,
    `Camera movement: ${(result.styleCard.cameraMovementSuggestion || []).join(", ")}`,
    `Matched libraries: ${result.matchedLibraries.map((item) => item.nameZh).join(", ")}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function ReferenceUploadCard({
  file,
  inputRef,
  isZh,
  onClear,
  onDrop,
  onInput,
  preview,
}: {
  file: File | null;
  inputRef: RefObject<HTMLInputElement | null>;
  isZh: boolean;
  onClear: () => void;
  onDrop: (event: DragEvent<HTMLButtonElement>) => void;
  onInput: (event: ChangeEvent<HTMLInputElement>) => void;
  preview: string;
}) {
  return (
    <div className="grid gap-3">
      <input
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={onInput}
        ref={inputRef}
        type="file"
      />
      <button
        className={cx(
          "group grid min-h-[260px] place-items-center overflow-hidden rounded-[26px] border border-dashed border-[#f6a935]/26 bg-[linear-gradient(180deg,rgba(246,169,53,.08),rgba(255,255,255,.025))] p-4 text-center transition",
          "hover:border-[#ffc35a]/48 hover:bg-[linear-gradient(180deg,rgba(246,169,53,.13),rgba(255,255,255,.035))]",
        )}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => event.preventDefault()}
        onDrop={onDrop}
        type="button"
      >
        {preview ? (
          <div className="grid w-full gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt={isZh ? "参考图预览" : "Reference preview"}
              className="mx-auto max-h-[260px] w-full rounded-[22px] border border-white/[.08] object-contain shadow-[0_20px_80px_rgba(0,0,0,.35)]"
              src={preview}
            />
            <div className="flex flex-wrap items-center justify-between gap-2 text-left">
              <div>
                <div className="text-sm font-black text-white">{file?.name || (isZh ? "参考图" : "Reference image")}</div>
                <div className="mt-1 text-xs text-white/42">{formatFileSize(file?.size)} · PNG / JPEG / WebP</div>
              </div>
              <span className="rounded-full border border-[#f6a935]/24 bg-[#f6a935]/10 px-3 py-1.5 text-xs font-black text-[#ffd48a]">
                {isZh ? "点击更换" : "Click to replace"}
              </span>
            </div>
          </div>
        ) : (
          <div>
            <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl border border-[#f6a935]/20 bg-[#f6a935]/10 text-lg font-black text-[#ffd48a]">
              IMG
            </div>
            <h3 className="text-base font-black text-white">{isZh ? "上传参考图生成风格卡" : "Upload a reference image"}</h3>
            <p className="mt-2 max-w-lg text-sm leading-6 text-white/48">
              {isZh
                ? "拖拽或点击上传 PNG、JPEG、WebP，最多 10MB。只分析画面风格，不生成图片/视频，不扣积分。"
                : "Drop or click to upload a PNG, JPEG, or WebP up to 10MB. This only analyzes visual style; it does not generate media or use credits."}
            </p>
          </div>
        )}
      </button>
      {file ? (
        <div className="flex justify-end">
          <button
            className="rounded-full border border-white/[.08] bg-white/[.035] px-3 py-1.5 text-xs font-black text-white/58 hover:text-white"
            onClick={onClear}
            type="button"
          >
            {isZh ? "移除参考图" : "Remove reference"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function StyleCardOutput({
  isZh,
  onApply,
  onClear,
  onCopy,
  onSaveImage,
  onSaveVideo,
  onUseAsReferenceStyle,
  result,
}: {
  isZh: boolean;
  onApply: () => void;
  onClear: () => void;
  onCopy: (prompt: string) => void;
  onSaveImage: () => void;
  onSaveVideo: () => void;
  onUseAsReferenceStyle?: () => void;
  result: PromptStudioReferenceAnalysisResult;
}) {
  const promptCards = [
    { key: "imagePrompt", title: "Image Prompt", prompt: result.reusablePrompt.imagePrompt },
    { key: "videoPrompt", title: "Video Prompt", prompt: result.reusablePrompt.videoPrompt },
    { key: "enhancedPrompt", title: "Enhanced Prompt", prompt: result.reusablePrompt.enhancedPrompt },
    { key: "negativePrompt", title: "Negative Prompt", prompt: result.reusablePrompt.negativePrompt || "" },
  ].filter((item) => item.prompt);

  return (
    <div className="mt-5 grid gap-4">
      <section className="rounded-[26px] border border-[#f6a935]/18 bg-[#f6a935]/[.06] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <SectionLabel>{isZh ? "参考图风格卡" : "Reference Style Card"}</SectionLabel>
            <h3 className="mt-2 text-xl font-black text-white">
              {result.analysisSource === "vlm" ? (isZh ? "AI 分析完成" : "AI analysis complete") : isZh ? "备用风格卡" : "Fallback style card"}
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[#f6a935]/24 bg-[#f6a935]/12 px-3 py-1.5 text-xs font-black text-[#ffd48a]">
              {result.analysisSource}
            </span>
            <span className="rounded-full border border-white/[.08] bg-white/[.04] px-3 py-1.5 text-xs font-black text-white/58">
              Provider: {result.provider || result.vlmProvider || (result.analysisSource === "fallback" ? "fallback" : "AI")}
            </span>
          </div>
        </div>
        <p className="mt-3 rounded-2xl border border-white/[.06] bg-black/16 px-3 py-2 text-sm leading-6 text-white/68">
          {result.analysisSource === "vlm"
            ? isZh
              ? "AI 视觉分析完成。"
              : "AI vision analysis completed."
            : isZh
              ? "当前为模板风格分析版，未调用真实视觉模型。"
              : "Template-based style analysis. Vision model analysis was not used."}
        </p>
        {result.fallbackReason ? (
          <p className="mt-2 text-xs leading-5 text-white/42">{result.fallbackReason}</p>
        ) : null}
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {styleCardGroups.map((group) => {
          const rawValues = result.styleCard[group.key];
          const values = Array.isArray(rawValues) ? rawValues : [];
          if (!values.length) return null;
          return (
            <article className="rounded-[22px] border border-white/[.06] bg-white/[.025] p-3" key={group.key}>
              <div className="text-[11px] font-black uppercase tracking-[.16em] text-[#ffd48a]/70">
                {isZh ? group.labelZh : group.labelEn}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {values.slice(0, 8).map((value) => (
                  <span className="rounded-full border border-white/[.07] bg-black/18 px-2.5 py-1 text-[11px] font-semibold text-white/62" key={value}>
                    {value}
                  </span>
                ))}
              </div>
            </article>
          );
        })}
      </section>

      {result.matchedLibraries.length ? (
        <section className="rounded-[24px] border border-white/[.06] bg-white/[.025] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <SectionLabel>{isZh ? "匹配风格库" : "Matched Libraries"}</SectionLabel>
            <span className="text-xs font-bold text-white/38">{result.matchedLibraries.length}</span>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {result.matchedLibraries.slice(0, 8).map((item) => (
              <div className="rounded-2xl border border-white/[.06] bg-black/16 p-3" key={item.id}>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-black text-white/78">{item.nameZh}</div>
                  <span className="rounded-full border border-[#f6a935]/18 bg-[#f6a935]/10 px-2 py-0.5 text-[10px] font-black text-[#ffd48a]">
                    {Math.round(item.confidence * 100)}%
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-white/34">{item.category}</div>
                <p className="mt-2 text-xs leading-5 text-white/50">{item.reason}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid gap-3">
        {promptCards.map((item) => (
          <article className="rounded-[24px] border border-white/[.06] bg-[#0c0e12] p-4" key={item.key}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-xs font-black uppercase tracking-[.18em] text-[#ffd48a]/72">{item.title}</div>
              <button
                className="rounded-full border border-white/[.08] bg-white/[.04] px-3 py-1.5 text-xs font-black text-white/70 hover:text-white"
                onClick={() => onCopy(item.prompt)}
                type="button"
              >
                Copy
              </button>
            </div>
            <pre className={cx("max-h-48 overflow-y-auto whitespace-pre-wrap break-words pr-2 font-mono text-[13px] leading-6 text-white/72", subtleScrollbar)}>
              {item.prompt}
            </pre>
          </article>
        ))}
      </section>

      {result.safety?.caution?.length ? (
        <section className="rounded-[24px] border border-[#f6a935]/18 bg-[#f6a935]/8 p-4">
          <SectionLabel>{isZh ? "安全提示" : "Safety"}</SectionLabel>
          <ul className="mt-3 grid gap-2 text-sm leading-6 text-[#ffd48a]/78">
            {result.safety.caution.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="grid gap-2.5 sm:grid-cols-2">
        {onUseAsReferenceStyle ? (
          <button className="min-h-11 rounded-2xl border border-[#f6a935]/20 bg-[#f6a935]/12 px-4 text-sm font-black text-[#ffd48a]" onClick={onUseAsReferenceStyle} type="button">
            {isZh ? "用作垫图 + 风格" : "Use as Reference + Style"}
          </button>
        ) : null}
        <button className="min-h-11 rounded-2xl border border-[#f6a935]/20 bg-[#f6a935]/12 px-4 text-sm font-black text-[#ffd48a]" onClick={onApply} type="button">
          {isZh ? "套用到 Generate 模式" : "Apply to Generate"}
        </button>
        <button className="min-h-11 rounded-2xl border border-white/[.07] bg-white/[.035] px-4 text-sm font-black text-white/68" onClick={onSaveVideo} type="button">
          {isZh ? "填入视频工作区草稿" : "Fill Video Draft"}
        </button>
        <button className="min-h-11 rounded-2xl border border-white/[.07] bg-white/[.035] px-4 text-sm font-black text-white/68" onClick={onSaveImage} type="button">
          {isZh ? "填入图片工作区草稿" : "Fill Image Draft"}
        </button>
        <button className="min-h-11 rounded-2xl border border-white/[.07] bg-white/[.035] px-4 text-sm font-black text-white/68" onClick={onClear} type="button">
          {isZh ? "清空风格卡" : "Clear style card"}
        </button>
      </div>
    </div>
  );
}

function ReferenceStyleOutput({
  isZh,
  onClear,
  onCopy,
  onSaveImage,
  onSaveVideo,
  result,
}: {
  isZh: boolean;
  onClear: () => void;
  onCopy: (prompt: string) => void;
  onSaveImage: () => void;
  onSaveVideo: () => void;
  result: PromptStudioReferenceStylePromptResult;
}) {
  const promptCards = [
    { key: "imageToImagePrompt", title: "Image-to-Image Prompt", prompt: result.prompts.imageToImagePrompt },
    { key: "imageToVideoPrompt", title: "Image-to-Video Prompt", prompt: result.prompts.imageToVideoPrompt },
    { key: "enhancedPrompt", title: "Enhanced Reference Prompt", prompt: result.prompts.enhancedPrompt },
    { key: "negativePrompt", title: "Negative Prompt", prompt: result.prompts.negativePrompt || "" },
  ].filter((item) => item.prompt);

  return (
    <div className="mt-5 grid gap-4">
      <section className="rounded-[26px] border border-[#f6a935]/18 bg-[#f6a935]/[.06] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <SectionLabel>{isZh ? "垫图 + 风格 Prompt" : "Reference + Style Prompt"}</SectionLabel>
            <h3 className="mt-2 text-xl font-black text-white">
              {result.analysisSource === "vlm" ? (isZh ? "AI 视觉分析完成" : "AI vision analysis completed") : isZh ? "模板参考分析" : "Template reference analysis"}
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[#f6a935]/24 bg-[#f6a935]/12 px-3 py-1.5 text-xs font-black text-[#ffd48a]">
              {result.analysisSource}
            </span>
            <span className="rounded-full border border-white/[.08] bg-white/[.04] px-3 py-1.5 text-xs font-black text-white/58">
              Provider: {result.provider || (result.analysisSource === "fallback" ? "fallback" : "AI")}
            </span>
            <span className="rounded-full border border-white/[.08] bg-white/[.04] px-3 py-1.5 text-xs font-black text-white/58">
              {result.preserveMode} / {result.styleMode}
            </span>
          </div>
        </div>
        {result.fallbackReason ? (
          <p className="mt-3 rounded-2xl border border-white/[.06] bg-black/16 px-3 py-2 text-sm leading-6 text-white/62">{result.fallbackReason}</p>
        ) : null}
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {referenceSummaryGroups.map((group) => {
          const values = result.referenceSummary[group.key] || [];
          if (!values.length) return null;
          return (
            <article className="rounded-[22px] border border-white/[.06] bg-white/[.025] p-3" key={group.key}>
              <div className="text-[11px] font-black uppercase tracking-[.16em] text-[#ffd48a]/70">
                {isZh ? group.labelZh : group.labelEn}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {values.slice(0, 8).map((value) => (
                  <span className="rounded-full border border-white/[.07] bg-black/18 px-2.5 py-1 text-[11px] font-semibold text-white/62" key={value}>
                    {value}
                  </span>
                ))}
              </div>
            </article>
          );
        })}
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <article className="rounded-[24px] border border-white/[.06] bg-white/[.025] p-4">
          <SectionLabel>{isZh ? "保留指令" : "Preserve Directives"}</SectionLabel>
          <ul className="mt-3 grid gap-2 text-sm leading-6 text-white/62">
            {result.preserveDirectives.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </article>
        <article className="rounded-[24px] border border-white/[.06] bg-white/[.025] p-4">
          <SectionLabel>{isZh ? "风格指令" : "Style Directives"}</SectionLabel>
          <ul className="mt-3 grid gap-2 text-sm leading-6 text-white/62">
            {result.styleDirectives.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </article>
      </section>

      {result.matchedLibraries.length ? (
        <section className="rounded-[24px] border border-white/[.06] bg-white/[.025] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <SectionLabel>{isZh ? "匹配/使用的知识库" : "Matched / Used Libraries"}</SectionLabel>
            <span className="text-xs font-bold text-white/38">{result.matchedLibraries.length}</span>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {result.matchedLibraries.slice(0, 10).map((item) => (
              <div className="rounded-2xl border border-white/[.06] bg-black/16 p-3" key={item.id}>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-black text-white/78">{item.nameZh}</div>
                  <span className="rounded-full border border-[#f6a935]/18 bg-[#f6a935]/10 px-2 py-0.5 text-[10px] font-black text-[#ffd48a]">
                    {Math.round((item.confidence || 0) * 100)}%
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-white/34">{item.category}</div>
                <p className="mt-2 text-xs leading-5 text-white/50">{item.reason}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid gap-3">
        {promptCards.map((item) => (
          <article className="rounded-[24px] border border-white/[.06] bg-[#0c0e12] p-4" key={item.key}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-xs font-black uppercase tracking-[.18em] text-[#ffd48a]/72">{item.title}</div>
              <button
                className="rounded-full border border-white/[.08] bg-white/[.04] px-3 py-1.5 text-xs font-black text-white/70 hover:text-white"
                onClick={() => onCopy(item.prompt)}
                type="button"
              >
                Copy
              </button>
            </div>
            <pre className={cx("max-h-56 overflow-y-auto whitespace-pre-wrap break-words pr-2 font-mono text-[13px] leading-6 text-white/72", subtleScrollbar)}>
              {item.prompt}
            </pre>
          </article>
        ))}
      </section>

      {result.safety?.caution?.length ? (
        <section className="rounded-[24px] border border-[#f6a935]/18 bg-[#f6a935]/8 p-4">
          <SectionLabel>{isZh ? "安全提示" : "Safety"}</SectionLabel>
          <ul className="mt-3 grid gap-2 text-sm leading-6 text-[#ffd48a]/78">
            {result.safety.caution.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="grid gap-2.5 sm:grid-cols-3">
        <button className="min-h-11 rounded-2xl border border-white/[.07] bg-white/[.035] px-4 text-sm font-black text-white/68" onClick={onSaveVideo} type="button">
          {isZh ? "填入视频工作区草稿" : "Fill Video Draft"}
        </button>
        <button className="min-h-11 rounded-2xl border border-white/[.07] bg-white/[.035] px-4 text-sm font-black text-white/68" onClick={onSaveImage} type="button">
          {isZh ? "填入图片工作区草稿" : "Fill Image Draft"}
        </button>
        <button className="min-h-11 rounded-2xl border border-white/[.07] bg-white/[.035] px-4 text-sm font-black text-white/68" onClick={onClear} type="button">
          {isZh ? "清空结果" : "Clear result"}
        </button>
      </div>
    </div>
  );
}

function ProjectMiniList({ items, title }: { items?: string[]; title: string }) {
  const values = items || [];
  if (!values.length) return null;
  return (
    <section className="rounded-[22px] border border-white/[.06] bg-white/[.025] p-3">
      <div className="mb-2 text-[11px] font-black uppercase tracking-[.16em] text-[#ffd48a]/70">{title}</div>
      <ul className="grid gap-1.5 text-sm leading-6 text-white/62">
        {values.slice(0, 8).map((item) => (
          <li key={item}>- {item}</li>
        ))}
      </ul>
    </section>
  );
}

function ProjectPromptBlock({
  prompt,
  title,
  onCopy,
}: {
  prompt?: string;
  title: string;
  onCopy: (prompt: string) => void;
}) {
  if (!prompt) return null;
  return (
    <article className="rounded-[20px] border border-white/[.055] bg-black/18 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="text-[11px] font-black uppercase tracking-[.16em] text-white/36">{title}</div>
        <button
          className="rounded-full border border-white/[.08] bg-white/[.04] px-2.5 py-1 text-[11px] font-black text-white/66 hover:text-white"
          onClick={() => onCopy(prompt)}
          type="button"
        >
          Copy
        </button>
      </div>
      <p className={cx("max-h-44 overflow-y-auto whitespace-pre-wrap break-words pr-1 text-sm leading-6 text-white/64", subtleScrollbar)}>{prompt}</p>
    </article>
  );
}

function ProjectTokenList({ items }: { items?: string[] }) {
  const values = (items || []).filter(Boolean).slice(0, 10);
  if (!values.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((item) => (
        <span className="rounded-full border border-[#f6a935]/14 bg-[#f6a935]/8 px-2.5 py-1 text-[11px] font-semibold text-[#ffd48a]/72" key={item}>
          {item}
        </span>
      ))}
    </div>
  );
}

function ProjectIdentityLock({
  identityLock,
}: {
  identityLock?: PromptStudioProjectPlanResult["assetPlan"]["characters"][number]["identityLock"];
}) {
  if (!identityLock) return null;
  const groups = [
    { key: "face", label: "Face" },
    { key: "hair", label: "Hair" },
    { key: "costume", label: "Costume" },
    { key: "body", label: "Body" },
    { key: "signatureDetails", label: "Signature" },
  ] as const;
  return (
    <div className="grid gap-2 rounded-[18px] border border-white/[.055] bg-white/[.025] p-3 md:grid-cols-2 xl:grid-cols-5">
      {groups.map((group) => {
        const values = identityLock[group.key] || [];
        if (!values.length) return null;
        return (
          <div key={group.key}>
            <div className="mb-1 text-[10px] font-black uppercase tracking-[.16em] text-white/32">{group.label}</div>
            <ul className="grid gap-1 text-[11px] leading-4 text-white/54">
              {values.slice(0, 4).map((value) => (
                <li key={value}>- {value}</li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function getProjectAssetPrompt(asset: ProjectAssetItem) {
  if ("threeViewPrompt" in asset) return asset.imageWorkspacePrompt || asset.threeViewPrompt || asset.portraitPrompt || "";
  if ("environmentPrompt" in asset) return asset.imageWorkspacePrompt || asset.environmentPrompt || "";
  return asset.imageWorkspacePrompt || asset.propDesignPrompt || "";
}

function getProjectAssetReferenceImage(asset?: ProjectAssetItem | null) {
  return asset?.assetReferenceImage || null;
}

function getAssetUploadKey(kind: ProjectAssetKind, assetTag: string) {
  return `${kind}:${assetTag}`;
}

function countProjectAssetReferenceImages(projectData?: PromptStudioProjectPlanResult | null) {
  if (!projectData) return 0;
  return [
    ...projectData.assetPlan.characters,
    ...projectData.assetPlan.locations,
    ...projectData.assetPlan.props,
  ].filter((asset) => Boolean(getProjectAssetReferenceImage(asset)?.url)).length;
}

function assetReferenceToDraftReference(asset: ProjectAssetItem): BridgeReferenceImage | null {
  const image = getProjectAssetReferenceImage(asset);
  if (!image?.url) return null;
  return {
    id: image.id || image.url,
    name: image.fileName || `${asset.assetTag} reference`,
    url: image.url,
    mimeType: image.mimeType,
    sizeBytes: image.sizeBytes,
    width: image.width,
    height: image.height,
    uploadedAt: image.uploadedAt,
  };
}

function isBridgeReferenceImage(value: BridgeReferenceImage | null): value is BridgeReferenceImage {
  return Boolean(value?.url);
}

function formatAssetFileMeta(image: PromptStudioAssetReferenceImage) {
  const parts = [
    image.fileName || "Reference image",
    image.sizeBytes ? `${Math.round(image.sizeBytes / 1024)} KB` : "",
    image.uploadedAt ? formatProjectDate(image.uploadedAt) : "",
  ].filter(Boolean);
  return parts.join(" / ");
}

function ProjectAssetReferencePanel({
  asset,
  error,
  isUploading,
  isZh,
  kind,
  onRemove,
  onSaveImage,
  onSaveVideo,
  onUpload,
}: {
  asset: ProjectAssetItem;
  error?: string;
  isUploading: boolean;
  isZh: boolean;
  kind: ProjectAssetKind;
  onRemove: (kind: ProjectAssetKind, assetTag: string) => void;
  onSaveImage: (asset: ProjectAssetItem) => void;
  onSaveVideo: (asset: ProjectAssetItem) => void;
  onUpload: (kind: ProjectAssetKind, assetTag: string, file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const image = getProjectAssetReferenceImage(asset);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) onUpload(kind, asset.assetTag, file);
  }

  return (
    <section className="mt-3 rounded-[20px] border border-[#f6a935]/12 bg-[#f6a935]/[.045] p-3">
      <input accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFileChange} ref={inputRef} type="file" />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-black uppercase tracking-[.16em] text-[#ffd48a]/70">
            {isZh ? "参考图绑定" : "Reference image"}
          </div>
          <p className="mt-1 text-xs leading-5 text-white/48">
            {isZh
              ? "绑定到该资产草稿。只保存图片链接，不会自动生成。"
              : "Bound to this asset draft. Stores an image URL only; it will not generate automatically."}
          </p>
        </div>
        <button
          className="rounded-full border border-[#f6a935]/22 bg-[#f6a935]/12 px-3 py-1.5 text-xs font-black text-[#ffd48a] disabled:cursor-not-allowed disabled:opacity-45"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          {isUploading ? (isZh ? "上传中..." : "Uploading...") : image?.url ? (isZh ? "替换图片" : "Replace image") : (isZh ? "上传参考图" : "Upload reference")}
        </button>
      </div>

      {image?.url ? (
        <div className="mt-3 grid gap-3 md:grid-cols-[120px_minmax(0,1fr)]">
          <img
            alt={`${asset.assetTag} reference`}
            className="h-28 w-full rounded-2xl border border-white/[.08] object-cover"
            src={image.url}
          />
          <div className="min-w-0">
            <div className="truncate text-sm font-black text-white/82">{image.fileName || `${asset.assetTag} reference`}</div>
            <div className="mt-1 text-xs text-white/42">{formatAssetFileMeta(image)}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="rounded-full border border-white/[.08] bg-white/[.04] px-3 py-1.5 text-xs font-black text-white/70 hover:text-white" onClick={() => onSaveImage(asset)} type="button">
                {isZh ? "填入图片草稿" : "Use in Image Draft"}
              </button>
              <button className="rounded-full border border-white/[.08] bg-white/[.04] px-3 py-1.5 text-xs font-black text-white/70 hover:text-white" onClick={() => onSaveVideo(asset)} type="button">
                {isZh ? "填入视频草稿" : "Use in Video Draft"}
              </button>
              <button className="rounded-full border border-red-300/18 bg-red-400/10 px-3 py-1.5 text-xs font-black text-red-100/80" onClick={() => onRemove(kind, asset.assetTag)} type="button">
                {isZh ? "移除绑定" : "Remove image"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-3 rounded-2xl border border-dashed border-white/[.08] bg-black/16 p-3 text-xs leading-5 text-white/42">
          {isZh ? "还没有为该资产绑定参考图。" : "No reference image is bound to this asset yet."}
        </div>
      )}

      {error ? <div className="mt-3 rounded-2xl border border-red-300/20 bg-red-400/10 p-3 text-xs leading-5 text-red-100">{error}</div> : null}
    </section>
  );
}

function ProjectPlanOutput({
  isZh,
  onClear,
  onCopy,
  onOpenHistory,
  onSaveProject,
  onSaveAssetImage,
  onSaveAssetVideo,
  onSaveShotVideo,
  onRemoveAssetReference,
  onUploadAssetReference,
  result,
  savedProjectId,
  isSavingProject,
  assetUploadErrors,
  assetUploadingKey,
}: {
  isZh: boolean;
  onClear: () => void;
  onCopy: (prompt: string) => void;
  onOpenHistory: () => void;
  onSaveProject: () => void;
  onSaveAssetImage: (asset: ProjectAssetItem) => void;
  onSaveAssetVideo: (asset: ProjectAssetItem) => void;
  onSaveShotVideo: (prompt: string) => void;
  onRemoveAssetReference: (kind: ProjectAssetKind, assetTag: string) => void;
  onUploadAssetReference: (kind: ProjectAssetKind, assetTag: string, file: File) => void;
  result: PromptStudioProjectPlanResult;
  savedProjectId?: string;
  isSavingProject: boolean;
  assetUploadErrors: Record<string, string>;
  assetUploadingKey: string;
}) {
  const styleSections = [
    { title: "Visual Style", items: result.styleConstitution.visualStyle },
    { title: "Color Palette", items: result.styleConstitution.colorPalette },
    { title: "Lighting Rules", items: result.styleConstitution.lightingRules },
    { title: "Camera Rules", items: result.styleConstitution.cameraRules },
    { title: "Composition Rules", items: result.styleConstitution.compositionRules },
    { title: "Texture / Medium", items: result.styleConstitution.textureAndMedium },
    { title: "Continuity Rules", items: result.styleConstitution.continuityRules },
    { title: "Negative Rules", items: result.styleConstitution.negativeRules },
  ];

  return (
    <div className="mt-5 grid gap-4">
      <section className="rounded-[26px] border border-[#f6a935]/18 bg-[#f6a935]/[.06] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <SectionLabel>{isZh ? "项目制作方案" : "Project Studio Plan"}</SectionLabel>
            <h3 className="mt-2 text-2xl font-black text-white">{result.projectTitle}</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/62">{result.projectLogline}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-full border border-[#f6a935]/24 bg-[#f6a935]/12 px-3 py-1.5 text-xs font-black text-[#ffd48a] disabled:cursor-not-allowed disabled:opacity-45"
              disabled={isSavingProject}
              onClick={onSaveProject}
              type="button"
            >
              {isSavingProject ? (isZh ? "保存中..." : "Saving...") : savedProjectId ? (isZh ? "更新项目" : "Update Project") : (isZh ? "保存项目" : "Save Project")}
            </button>
            <button
              className="rounded-full border border-white/[.08] bg-white/[.04] px-3 py-1.5 text-xs font-black text-white/70 hover:text-white"
              onClick={onOpenHistory}
              type="button"
            >
              {isZh ? "项目历史" : "Project History"}
            </button>
            <span className="rounded-full border border-[#f6a935]/24 bg-[#f6a935]/12 px-3 py-1.5 text-xs font-black text-[#ffd48a]">
              {result.projectType || "project"}
            </span>
            <span className="rounded-full border border-white/[.08] bg-white/[.04] px-3 py-1.5 text-xs font-black text-white/58">
              {result.shotCount || result.shotPlan.length} shots
            </span>
            <span className="rounded-full border border-white/[.08] bg-white/[.04] px-3 py-1.5 text-xs font-black text-white/58">
              {result.aspectRatio || "9:16"}
            </span>
          </div>
        </div>
        <p className="mt-3 rounded-2xl border border-white/[.06] bg-black/16 px-3 py-2 text-sm leading-6 text-white/64">
          {isZh
            ? "这里只生成文本项目包，不生成图片/视频，不提交 provider，也不会扣积分。"
            : "This creates a text-only project prompt pack. It does not generate media, submit providers, or use credits."}
        </p>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {styleSections.map((section) => (
          <ProjectMiniList items={section.items} key={section.title} title={section.title} />
        ))}
      </section>

      <section className="rounded-[24px] border border-[#f6a935]/14 bg-[#f6a935]/[.045] p-4">
        <SectionLabel>@Asset Reference Notes</SectionLabel>
        <p className="mt-2 max-w-5xl text-sm leading-6 text-white/64">
          @assets are text references used to lock characters, locations, and props inside prompts. This beta does not bind real image files automatically. Generate asset master images first, then reuse them for continuity.
        </p>
      </section>

      <section className="rounded-[24px] border border-white/[.06] bg-white/[.025] p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <SectionLabel>Project Asset Drafts</SectionLabel>
          <span className="text-xs font-bold text-white/38">
            {result.assetPlan.characters.length + result.assetPlan.locations.length + result.assetPlan.props.length} drafts / {countProjectAssetReferenceImages(result)} references attached
          </span>
        </div>
        <div className="grid gap-5">
          {result.assetPlan.characters.length ? (
            <div className="grid gap-3">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-black text-white">Characters</h4>
                <span className="text-xs font-bold text-white/34">{result.assetPlan.characters.length}</span>
              </div>
              {result.assetPlan.characters.map((item) => (
                <article className="rounded-[22px] border border-white/[.06] bg-[#0c0e12] p-4" key={item.assetTag}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-black text-[#ffd48a]">{item.assetTag}</div>
                      <h4 className="mt-1 text-base font-black text-white">{item.name}</h4>
                      <p className="mt-2 text-sm leading-6 text-white/58">{item.description}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button className="rounded-full border border-white/[.08] bg-white/[.04] px-3 py-1.5 text-xs font-black text-white/70" onClick={() => onCopy(getProjectAssetPrompt(item))} type="button">
                        Copy Asset Prompt
                      </button>
                      <button className="rounded-full border border-[#f6a935]/20 bg-[#f6a935]/12 px-3 py-1.5 text-xs font-black text-[#ffd48a]" onClick={() => onSaveAssetImage(item)} type="button">
                        Fill Image Draft
                      </button>
                      {item.negativePrompt ? (
                        <button className="rounded-full border border-white/[.08] bg-white/[.04] px-3 py-1.5 text-xs font-black text-white/70" onClick={() => onCopy(item.negativePrompt || "")} type="button">
                          Copy Negative
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <ProjectAssetReferencePanel
                    asset={item}
                    error={assetUploadErrors[getAssetUploadKey("characters", item.assetTag)]}
                    isUploading={assetUploadingKey === getAssetUploadKey("characters", item.assetTag)}
                    isZh={isZh}
                    kind="characters"
                    onRemove={onRemoveAssetReference}
                    onSaveImage={onSaveAssetImage}
                    onSaveVideo={onSaveAssetVideo}
                    onUpload={onUploadAssetReference}
                  />
                  <div className="mt-3 grid gap-3 lg:grid-cols-2">
                    <ProjectPromptBlock onCopy={onCopy} prompt={item.imageWorkspacePrompt || item.threeViewPrompt} title="Image Workspace Prompt" />
                    <ProjectPromptBlock onCopy={onCopy} prompt={item.negativePrompt} title="Negative Prompt" />
                    <ProjectPromptBlock onCopy={onCopy} prompt={item.threeViewPrompt} title="Three-view Prompt" />
                    <ProjectPromptBlock onCopy={onCopy} prompt={item.portraitPrompt} title="Portrait Prompt" />
                  </div>
                  <div className="mt-3 grid gap-3">
                    <ProjectIdentityLock identityLock={item.identityLock} />
                    <ProjectTokenList items={item.consistencyRules} />
                    {item.usageNotes?.length ? <ProjectMiniList items={item.usageNotes} title="Usage Notes" /> : null}
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          {result.assetPlan.locations.length ? (
            <div className="grid gap-3">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-black text-white">Locations</h4>
                <span className="text-xs font-bold text-white/34">{result.assetPlan.locations.length}</span>
              </div>
              {result.assetPlan.locations.map((item) => (
                <article className="rounded-[22px] border border-white/[.06] bg-[#0c0e12] p-4" key={item.assetTag}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-black text-[#ffd48a]">{item.assetTag}</div>
                      <h4 className="mt-1 text-base font-black text-white">{item.name}</h4>
                      <p className="mt-2 text-sm leading-6 text-white/58">{item.description}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button className="rounded-full border border-white/[.08] bg-white/[.04] px-3 py-1.5 text-xs font-black text-white/70" onClick={() => onCopy(getProjectAssetPrompt(item))} type="button">
                        Copy Asset Prompt
                      </button>
                      <button className="rounded-full border border-[#f6a935]/20 bg-[#f6a935]/12 px-3 py-1.5 text-xs font-black text-[#ffd48a]" onClick={() => onSaveAssetImage(item)} type="button">
                        Fill Image Draft
                      </button>
                    </div>
                  </div>
                  <ProjectAssetReferencePanel
                    asset={item}
                    error={assetUploadErrors[getAssetUploadKey("locations", item.assetTag)]}
                    isUploading={assetUploadingKey === getAssetUploadKey("locations", item.assetTag)}
                    isZh={isZh}
                    kind="locations"
                    onRemove={onRemoveAssetReference}
                    onSaveImage={onSaveAssetImage}
                    onSaveVideo={onSaveAssetVideo}
                    onUpload={onUploadAssetReference}
                  />
                  <div className="mt-3 grid gap-3 lg:grid-cols-2">
                    <ProjectPromptBlock onCopy={onCopy} prompt={item.imageWorkspacePrompt || item.environmentPrompt} title="Image Workspace Prompt" />
                    <ProjectPromptBlock onCopy={onCopy} prompt={item.environmentPrompt} title="Environment Prompt" />
                  </div>
                  <div className="mt-3 grid gap-3">
                    <ProjectTokenList items={item.keyVisualElements} />
                    <ProjectTokenList items={item.continuityRules} />
                    {item.usageNotes?.length ? <ProjectMiniList items={item.usageNotes} title="Usage Notes" /> : null}
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          {result.assetPlan.props.length ? (
            <div className="grid gap-3">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-black text-white">Props</h4>
                <span className="text-xs font-bold text-white/34">{result.assetPlan.props.length}</span>
              </div>
              {result.assetPlan.props.map((item) => (
                <article className="rounded-[22px] border border-white/[.06] bg-[#0c0e12] p-4" key={item.assetTag}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-black text-[#ffd48a]">{item.assetTag}</div>
                      <h4 className="mt-1 text-base font-black text-white">{item.name}</h4>
                      <p className="mt-2 text-sm leading-6 text-white/58">{item.description}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button className="rounded-full border border-white/[.08] bg-white/[.04] px-3 py-1.5 text-xs font-black text-white/70" onClick={() => onCopy(getProjectAssetPrompt(item))} type="button">
                        Copy Asset Prompt
                      </button>
                      <button className="rounded-full border border-[#f6a935]/20 bg-[#f6a935]/12 px-3 py-1.5 text-xs font-black text-[#ffd48a]" onClick={() => onSaveAssetImage(item)} type="button">
                        Fill Image Draft
                      </button>
                      {item.negativePrompt ? (
                        <button className="rounded-full border border-white/[.08] bg-white/[.04] px-3 py-1.5 text-xs font-black text-white/70" onClick={() => onCopy(item.negativePrompt || "")} type="button">
                          Copy Negative
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <ProjectAssetReferencePanel
                    asset={item}
                    error={assetUploadErrors[getAssetUploadKey("props", item.assetTag)]}
                    isUploading={assetUploadingKey === getAssetUploadKey("props", item.assetTag)}
                    isZh={isZh}
                    kind="props"
                    onRemove={onRemoveAssetReference}
                    onSaveImage={onSaveAssetImage}
                    onSaveVideo={onSaveAssetVideo}
                    onUpload={onUploadAssetReference}
                  />
                  <div className="mt-3 grid gap-3 lg:grid-cols-2">
                    <ProjectPromptBlock onCopy={onCopy} prompt={item.imageWorkspacePrompt || item.propDesignPrompt} title="Image Workspace Prompt" />
                    <ProjectPromptBlock onCopy={onCopy} prompt={item.propDesignPrompt} title="Prop Design Prompt" />
                    <ProjectPromptBlock onCopy={onCopy} prompt={item.negativePrompt} title="Negative Prompt" />
                  </div>
                  <div className="mt-3 grid gap-3">
                    <ProjectTokenList items={item.keyDesignElements} />
                    <ProjectTokenList items={item.continuityRules} />
                    {item.usageNotes?.length ? <ProjectMiniList items={item.usageNotes} title="Usage Notes" /> : null}
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-[24px] border border-white/[.06] bg-white/[.025] p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <SectionLabel>{isZh ? "资产清单" : "Asset Plan"}</SectionLabel>
          <span className="text-xs font-bold text-white/38">
            {result.assetPlan.characters.length + result.assetPlan.locations.length + result.assetPlan.props.length}
          </span>
        </div>
        <div className="grid gap-3">
          {result.assetPlan.characters.map((item) => (
            <article className="rounded-[22px] border border-white/[.06] bg-[#0c0e12] p-4" key={item.assetTag}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-black text-[#ffd48a]">{item.assetTag}</div>
                  <h4 className="mt-1 text-base font-black text-white">{item.name}</h4>
                  <p className="mt-2 text-sm leading-6 text-white/58">{item.description}</p>
                </div>
                <button className="rounded-full border border-white/[.08] bg-white/[.04] px-3 py-1.5 text-xs font-black text-white/70" onClick={() => onCopy(item.threeViewPrompt)} type="button">
                  Copy three-view
                </button>
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <ProjectPromptBlock onCopy={onCopy} prompt={item.threeViewPrompt} title="Three-view prompt" />
                <ProjectPromptBlock onCopy={onCopy} prompt={item.portraitPrompt} title="Portrait prompt" />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {item.consistencyRules.slice(0, 8).map((rule) => (
                  <span className="rounded-full border border-[#f6a935]/14 bg-[#f6a935]/8 px-2.5 py-1 text-[11px] font-semibold text-[#ffd48a]/72" key={rule}>
                    {rule}
                  </span>
                ))}
              </div>
            </article>
          ))}
          {result.assetPlan.locations.map((item) => (
            <article className="rounded-[22px] border border-white/[.06] bg-[#0c0e12] p-4" key={item.assetTag}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-black text-[#ffd48a]">{item.assetTag}</div>
                  <h4 className="mt-1 text-base font-black text-white">{item.name}</h4>
                  <p className="mt-2 text-sm leading-6 text-white/58">{item.description}</p>
                </div>
                <button className="rounded-full border border-white/[.08] bg-white/[.04] px-3 py-1.5 text-xs font-black text-white/70" onClick={() => onCopy(item.environmentPrompt)} type="button">
                  Copy environment
                </button>
              </div>
              <ProjectPromptBlock onCopy={onCopy} prompt={item.environmentPrompt} title="Environment prompt" />
            </article>
          ))}
          {result.assetPlan.props.map((item) => (
            <article className="rounded-[22px] border border-white/[.06] bg-[#0c0e12] p-4" key={item.assetTag}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-black text-[#ffd48a]">{item.assetTag}</div>
                  <h4 className="mt-1 text-base font-black text-white">{item.name}</h4>
                  <p className="mt-2 text-sm leading-6 text-white/58">{item.description}</p>
                </div>
                <button className="rounded-full border border-white/[.08] bg-white/[.04] px-3 py-1.5 text-xs font-black text-white/70" onClick={() => onCopy(item.propDesignPrompt)} type="button">
                  Copy prop
                </button>
              </div>
              <ProjectPromptBlock onCopy={onCopy} prompt={item.propDesignPrompt} title="Prop design prompt" />
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionLabel>{isZh ? "分镜计划" : "Shot Plan"}</SectionLabel>
          <span className="text-xs font-bold text-white/38">{result.shotPlan.length} shots</span>
        </div>
        {result.shotPlan.map((shot) => (
          <article className="rounded-[24px] border border-white/[.06] bg-white/[.025] p-4" key={shot.shotNumber}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs font-black uppercase tracking-[.18em] text-[#ffd48a]/72">Shot {shot.shotNumber}</div>
                <h4 className="mt-1 text-lg font-black text-white">{shot.title}</h4>
                <p className="mt-2 text-sm leading-6 text-white/58">{shot.storyPurpose}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="rounded-full border border-white/[.08] bg-white/[.04] px-3 py-1.5 text-xs font-black text-white/70" onClick={() => onCopy(shot.keyframeImagePrompt)} type="button">
                  Copy keyframe
                </button>
                <button className="rounded-full border border-white/[.08] bg-white/[.04] px-3 py-1.5 text-xs font-black text-white/70" onClick={() => onCopy(shot.videoPrompt)} type="button">
                  Copy video
                </button>
                <button className="rounded-full border border-[#f6a935]/20 bg-[#f6a935]/12 px-3 py-1.5 text-xs font-black text-[#ffd48a]" onClick={() => onSaveShotVideo(shot.videoPrompt)} type="button">
                  Fill Video Draft
                </button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {shot.assetReferences.map((asset) => (
                <span className="rounded-full border border-[#f6a935]/18 bg-[#f6a935]/10 px-2.5 py-1 text-[11px] font-black text-[#ffd48a]/82" key={asset}>
                  {asset}
                </span>
              ))}
            </div>
            {shot.requiredAssets?.length ? (
              <div className="mt-3 grid gap-2 rounded-[18px] border border-white/[.055] bg-black/18 p-3">
                <div className="text-[11px] font-black uppercase tracking-[.16em] text-white/36">Required Assets</div>
                <div className="flex flex-wrap gap-2">
                  {shot.requiredAssets.map((asset) => (
                    <span className="rounded-full border border-white/[.07] bg-white/[.035] px-2.5 py-1 text-[11px] font-semibold text-white/58" key={`${shot.shotNumber}-${asset.assetTag}-${asset.usage}`}>
                      <strong className="text-[#ffd48a]/78">{asset.assetTag}</strong> · {asset.usage}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            <ProjectPromptBlock onCopy={onCopy} prompt={shot.assetContinuityPrompt} title="Asset continuity prompt" />
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <ProjectPromptBlock onCopy={onCopy} prompt={shot.keyframeImagePrompt} title="Keyframe image prompt" />
              <ProjectPromptBlock onCopy={onCopy} prompt={shot.videoPrompt} title="Video prompt" />
            </div>
            <div className="mt-3 text-xs leading-5 text-white/42">
              {shot.cameraMove} / {shot.durationHint}
            </div>
            <ul className="mt-2 grid gap-1 text-xs leading-5 text-white/42">
              {shot.continuityNotes.slice(0, 6).map((note) => (
                <li key={note}>- {note}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <ProjectMiniList items={result.assetReferenceGuide} title="Asset Reference Guide" />
        <ProjectMiniList items={result.continuityChecklist} title="Continuity Checklist" />
      </section>

      <section className="rounded-[24px] border border-white/[.06] bg-[#0c0e12] p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <SectionLabel>{isZh ? "导出项目提示词包" : "Export Project Pack"}</SectionLabel>
          <button className="rounded-full border border-[#f6a935]/20 bg-[#f6a935]/12 px-3 py-1.5 text-xs font-black text-[#ffd48a]" onClick={() => onCopy(result.exportText)} type="button">
            {isZh ? "复制完整项目包" : "Copy full pack"}
          </button>
        </div>
        <pre className={cx("max-h-72 overflow-y-auto whitespace-pre-wrap break-words pr-2 font-mono text-[12px] leading-6 text-white/66", subtleScrollbar)}>
          {result.exportText}
        </pre>
      </section>

      <button className="min-h-11 rounded-2xl border border-white/[.07] bg-white/[.035] px-4 text-sm font-black text-white/68" onClick={onClear} type="button">
        {isZh ? "清空项目方案" : "Clear project plan"}
      </button>
    </div>
  );
}

function formatProjectDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function compactProjectItems(items?: string[], limit = 4) {
  return (items || []).filter(Boolean).slice(0, limit);
}

function projectPackText(projectData?: PromptStudioProjectPlanResult) {
  if (!projectData) return "";
  if (projectData.exportText) return projectData.exportText;

  const style = projectData.styleConstitution;
  const assets = projectData.assetPlan;
  const lines = [
    `# ${projectData.projectTitle || "Untitled Project"}`,
    "",
    `Logline: ${projectData.projectLogline || ""}`,
    "",
    "## Style Constitution",
    `Visual Style: ${(style?.visualStyle || []).join("; ")}`,
    `Color Palette: ${(style?.colorPalette || []).join("; ")}`,
    `Lighting Rules: ${(style?.lightingRules || []).join("; ")}`,
    `Continuity Rules: ${(style?.continuityRules || []).join("; ")}`,
    "",
    "## Asset Plan",
    ...(assets?.characters || []).map((asset) => `Character ${asset.assetTag}: ${asset.description}`),
    ...(assets?.locations || []).map((asset) => `Location ${asset.assetTag}: ${asset.description}`),
    ...(assets?.props || []).map((asset) => `Prop ${asset.assetTag}: ${asset.description}`),
    "",
    "## Shot Plan",
    ...(projectData.shotPlan || []).map((shot) => (
      `Shot ${shot.shotNumber}: ${shot.title}\nAssets: ${(shot.assetReferences || []).join(", ")}\n${shot.videoPrompt}`
    )),
    "",
    "## Continuity Checklist",
    ...(projectData.continuityChecklist || []).map((item) => `- ${item}`),
  ];

  return lines.filter(Boolean).join("\n");
}

function firstProjectShotPrompt(project?: PromptStudioSavedProject | null) {
  return project?.projectData?.shotPlan?.[0]?.videoPrompt || "";
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ProjectHistoryDrawer({
  error,
  isLoading,
  isOpen,
  isZh,
  onClose,
  onCopy,
  onDelete,
  onOpen,
  onRefresh,
  projects,
}: {
  error: string;
  isLoading: boolean;
  isOpen: boolean;
  isZh: boolean;
  onClose: () => void;
  onCopy: (project: PromptStudioSavedProjectSummary) => void;
  onDelete: (project: PromptStudioSavedProjectSummary) => void;
  onOpen: (project: PromptStudioSavedProjectSummary) => void;
  onRefresh: () => void;
  projects: PromptStudioSavedProjectSummary[];
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/62 backdrop-blur-sm">
      <button aria-label="Close Project History" className="absolute inset-0 cursor-default" onClick={onClose} type="button" />
      <aside className={cx("relative z-10 flex h-full w-full max-w-[460px] flex-col border-l border-white/[.08] bg-[#0b0d10] shadow-[-24px_0_80px_rgba(0,0,0,.45)]", subtleScrollbar)}>
        <div className="border-b border-white/[.07] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <SectionLabel>{isZh ? "项目历史" : "Project History"}</SectionLabel>
              <h2 className="mt-2 text-2xl font-black text-white">{isZh ? "已保存项目" : "Saved Projects"}</h2>
              <p className="mt-2 text-sm leading-6 text-white/52">
                {isZh ? "只保存文本项目包，不生成图片/视频，不扣积分。" : "Text-only project packs. No media generation or credits."}
              </p>
            </div>
            <button className="rounded-full border border-white/[.08] bg-white/[.04] px-3 py-1.5 text-xs font-black text-white/68" onClick={onClose} type="button">
              Close
            </button>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              className="rounded-full border border-[#f6a935]/20 bg-[#f6a935]/10 px-3 py-1.5 text-xs font-black text-[#ffd48a]"
              onClick={onRefresh}
              type="button"
            >
              {isLoading ? (isZh ? "加载中..." : "Loading...") : isZh ? "刷新" : "Refresh"}
            </button>
          </div>
          {error ? <div className="mt-3 rounded-2xl border border-red-300/20 bg-red-400/10 p-3 text-sm text-red-100">{error}</div> : null}
        </div>
        <div className={cx("grid flex-1 content-start gap-3 overflow-y-auto p-5", subtleScrollbar)}>
          {!isLoading && !projects.length ? (
            <div className="rounded-[22px] border border-white/[.06] bg-white/[.03] p-4 text-sm leading-6 text-white/52">
              {isZh ? "还没有保存项目。生成项目制作方案后点击保存项目。" : "No saved projects yet. Generate a Project Studio plan, then save it."}
            </div>
          ) : null}
          {projects.map((project) => (
            <article className="rounded-[22px] border border-white/[.06] bg-white/[.035] p-4" key={project.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-black text-white">{project.title || "Untitled Project"}</h3>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-white/48">{project.brief}</p>
                </div>
                <span className="rounded-full border border-[#f6a935]/18 bg-[#f6a935]/10 px-2.5 py-1 text-[11px] font-black text-[#ffd48a]/86">
                  {project.projectType || "project"}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold text-white/42">
                <span>{project.shotCount || 0} shots</span>
                <span>{project.assetCount || 0} assets</span>
                <span>{formatProjectDate(project.updatedAt || project.createdAt)}</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <button className="rounded-2xl border border-[#f6a935]/20 bg-[#f6a935]/10 px-2 py-2 text-xs font-black text-[#ffd48a]" onClick={() => onOpen(project)} type="button">
                  {isZh ? "打开" : "Open"}
                </button>
                <button className="rounded-2xl border border-white/[.08] bg-white/[.04] px-2 py-2 text-xs font-black text-white/66" onClick={() => onCopy(project)} type="button">
                  {isZh ? "复制" : "Copy"}
                </button>
                <button className="rounded-2xl border border-red-300/20 bg-red-400/10 px-2 py-2 text-xs font-black text-red-100/82" onClick={() => onDelete(project)} type="button">
                  {isZh ? "删除" : "Delete"}
                </button>
              </div>
            </article>
          ))}
        </div>
      </aside>
    </div>
  );
}

function ProjectHistoryDrawerV2({
  error,
  isDetailLoading,
  isLoading,
  isOpen,
  isZh,
  onClose,
  onCopy,
  onDelete,
  onOpen,
  onRefresh,
  onSelect,
  onSendFirstShot,
  projects,
  selectedProject,
}: {
  error: string;
  isDetailLoading: boolean;
  isLoading: boolean;
  isOpen: boolean;
  isZh: boolean;
  onClose: () => void;
  onCopy: (project: PromptStudioSavedProjectSummary) => void;
  onDelete: (project: PromptStudioSavedProjectSummary) => void;
  onOpen: (project: PromptStudioSavedProjectSummary) => void;
  onRefresh: () => void;
  onSelect: (project: PromptStudioSavedProjectSummary) => void;
  onSendFirstShot: (project: PromptStudioSavedProject) => void;
  projects: PromptStudioSavedProjectSummary[];
  selectedProject: PromptStudioSavedProject | null;
}) {
  if (!isOpen) return null;

  const detail = selectedProject?.projectData;
  const style = detail?.styleConstitution;
  const assets = detail?.assetPlan;
  const selectedAssetCount =
    (assets?.characters?.length || selectedProject?.characterCount || 0) +
    (assets?.locations?.length || selectedProject?.locationCount || 0) +
    (assets?.props?.length || selectedProject?.propCount || 0);

  return (
    <div className="fixed inset-0 z-50 flex justify-end overflow-hidden bg-black/62 backdrop-blur-sm">
      <button aria-label="Close Project History" className="absolute inset-0 cursor-default" onClick={onClose} type="button" />
      <aside className={cx("relative z-10 flex h-full w-full max-w-[900px] flex-col border-l border-white/[.08] bg-[#0b0d10] shadow-[-24px_0_80px_rgba(0,0,0,.45)]", subtleScrollbar)}>
        <div className="border-b border-white/[.07] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <SectionLabel>{isZh ? "项目历史" : "Project History"}</SectionLabel>
              <h2 className="mt-2 text-2xl font-black text-white">{isZh ? "项目库" : "Project Library"}</h2>
              <p className="mt-2 text-sm leading-6 text-white/52">
                {isZh
                  ? "保存文本项目包、资产草稿和分镜 prompt。不会生成图片/视频，不扣积分。"
                  : "Saved text project packs, asset drafts, and shot prompts. No media generation or credits."}
              </p>
            </div>
            <button className="rounded-full border border-white/[.08] bg-white/[.04] px-3 py-1.5 text-xs font-black text-white/68 hover:text-white" onClick={onClose} type="button">
              Close
            </button>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              className="rounded-full border border-[#f6a935]/20 bg-[#f6a935]/10 px-3 py-1.5 text-xs font-black text-[#ffd48a]"
              onClick={onRefresh}
              type="button"
            >
              {isLoading ? (isZh ? "加载中..." : "Loading...") : isZh ? "刷新" : "Refresh"}
            </button>
          </div>
          {error ? <div className="mt-3 rounded-2xl border border-red-300/20 bg-red-400/10 p-3 text-sm text-red-100">{error}</div> : null}
        </div>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className={cx("min-h-0 overflow-y-auto p-5", subtleScrollbar)}>
            {!isLoading && !projects.length ? (
              <div className="rounded-[28px] border border-white/[.06] bg-white/[.03] p-6 text-sm leading-6 text-white/56">
                {isZh
                  ? "还没有保存的项目。生成项目制作方案后，可以保存到这里继续编辑。"
                  : "No saved projects yet. Save a Project Studio plan to continue editing later."}
              </div>
            ) : null}

            <div className="grid gap-4 xl:grid-cols-2">
              {projects.map((project) => {
                const active = selectedProject?.id === project.id;
                const styleChips = compactProjectItems(project.styleSummary, 3);
                const assetTags = compactProjectItems(project.primaryAssetTags, 3);

                return (
                  <article
                    className={cx(
                      "overflow-hidden rounded-[28px] border bg-[#111318] shadow-[0_18px_60px_rgba(0,0,0,.22)] transition",
                      active ? "border-[#f6a935]/38 ring-1 ring-[#f6a935]/18" : "border-white/[.07] hover:border-white/[.14]",
                    )}
                    key={project.id}
                  >
                    <button className="block w-full text-left" onClick={() => onSelect(project)} type="button">
                      <div className="relative min-h-[118px] overflow-hidden border-b border-white/[.06] bg-[radial-gradient(circle_at_20%_20%,rgba(246,169,53,.22),transparent_34%),linear-gradient(135deg,#161922,#090a0d)] p-4">
                        <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#111318] to-transparent" />
                        <div className="relative flex items-start justify-between gap-3">
                          <span className="rounded-full border border-[#f6a935]/24 bg-[#f6a935]/12 px-2.5 py-1 text-[11px] font-black uppercase tracking-[.16em] text-[#ffd48a]">
                            {project.projectType || "project"}
                          </span>
                          <span className="rounded-full border border-white/[.08] bg-black/24 px-2.5 py-1 text-[11px] font-bold text-white/58">
                            {project.aspectRatio || "9:16"}
                          </span>
                        </div>
                        <p className="relative mt-7 line-clamp-2 text-sm font-black leading-6 text-white">
                          {project.coverSummary || project.title || "Prompt Studio Project"}
                        </p>
                      </div>

                      <div className="p-4">
                        <h3 className="line-clamp-2 text-base font-black leading-6 text-white">{project.title || "Untitled Project"}</h3>
                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-white/50">{project.previewLogline || project.brief}</p>
                        <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-black text-white/48">
                          <span>{project.shotCount || 0} shots</span>
                          <span>{project.assetCount || 0} assets</span>
                          {project.assetWithImagesCount ? <span>{project.assetWithImagesCount} references attached</span> : null}
                          <span>{formatProjectDate(project.updatedAt || project.createdAt)}</span>
                        </div>
                        {assetTags.length ? (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {assetTags.map((tag) => (
                              <span className="rounded-full border border-white/[.07] bg-white/[.04] px-2 py-1 text-[11px] font-bold text-white/56" key={tag}>
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        {styleChips.length ? (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {styleChips.map((chip) => (
                              <span className="rounded-full border border-[#f6a935]/14 bg-[#f6a935]/8 px-2 py-1 text-[11px] font-bold text-[#ffd48a]/76" key={chip}>
                                {chip}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </button>

                    <div className="grid grid-cols-4 gap-2 border-t border-white/[.06] p-3">
                      <button className="rounded-2xl border border-[#f6a935]/20 bg-[#f6a935]/10 px-2 py-2 text-xs font-black text-[#ffd48a]" onClick={() => onSelect(project)} type="button">
                        {isZh ? "打开" : "Open"}
                      </button>
                      <button className="rounded-2xl border border-white/[.08] bg-white/[.045] px-2 py-2 text-xs font-black text-white/68 hover:text-white" onClick={() => onOpen(project)} type="button">
                        {isZh ? "继续" : "Continue"}
                      </button>
                      <button className="rounded-2xl border border-white/[.08] bg-white/[.035] px-2 py-2 text-xs font-black text-white/62 hover:text-white" onClick={() => onCopy(project)} type="button">
                        {isZh ? "复制包" : "Copy Pack"}
                      </button>
                      <button className="rounded-2xl border border-red-300/20 bg-red-400/10 px-2 py-2 text-xs font-black text-red-100/82" onClick={() => onDelete(project)} type="button">
                        {isZh ? "删除" : "Delete"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <section className={cx("min-h-0 overflow-y-auto border-t border-white/[.07] bg-[#090b0e] p-5 lg:border-l lg:border-t-0", subtleScrollbar)}>
            {isDetailLoading ? (
              <div className="rounded-[24px] border border-white/[.06] bg-white/[.03] p-5 text-sm text-white/52">
                {isZh ? "正在加载项目详情..." : "Loading project details..."}
              </div>
            ) : selectedProject && detail ? (
              <div className="space-y-5">
                <div>
                  <SectionLabel>{isZh ? "项目详情" : "Project Detail"}</SectionLabel>
                  <h3 className="mt-2 text-2xl font-black leading-8 text-white">{detail.projectTitle || selectedProject.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/56">{detail.projectLogline || selectedProject.previewLogline || selectedProject.brief}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-black text-white/44">
                    <span>{detail.shotPlan?.length || selectedProject.shotCount || 0} shots</span>
                    <span>{selectedAssetCount} assets</span>
                    <span>{countProjectAssetReferenceImages(detail)} references attached</span>
                    <span>{formatProjectDate(selectedProject.updatedAt || selectedProject.createdAt)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button className="rounded-2xl border border-[#f6a935]/22 bg-[#f6a935]/12 px-3 py-2 text-xs font-black text-[#ffd48a]" onClick={() => onOpen(selectedProject)} type="button">
                    {isZh ? "加载到项目制作" : "Load into Project Studio"}
                  </button>
                  <button className="rounded-2xl border border-white/[.08] bg-white/[.04] px-3 py-2 text-xs font-black text-white/68" onClick={() => onCopy(selectedProject)} type="button">
                    {isZh ? "复制项目包" : "Copy Project Pack"}
                  </button>
                  <button
                    className="rounded-2xl border border-white/[.08] bg-white/[.035] px-3 py-2 text-xs font-black text-white/62 disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={!firstProjectShotPrompt(selectedProject)}
                    onClick={() => onSendFirstShot(selectedProject)}
                    type="button"
                  >
                    {isZh ? "填入第一镜头草稿" : "Fill first shot draft"}
                  </button>
                  <button className="rounded-2xl border border-red-300/20 bg-red-400/10 px-3 py-2 text-xs font-black text-red-100/82" onClick={() => onDelete(selectedProject)} type="button">
                    {isZh ? "删除" : "Delete"}
                  </button>
                </div>

                <div className="rounded-[22px] border border-white/[.06] bg-white/[.03] p-4">
                  <h4 className="text-sm font-black text-white">{isZh ? "风格宪法摘要" : "Style Constitution"}</h4>
                  <div className="mt-3 space-y-3 text-xs leading-5 text-white/54">
                    <div><b className="text-white/78">Visual:</b> {compactProjectItems(style?.visualStyle, 3).join("; ") || "-"}</div>
                    <div><b className="text-white/78">Color:</b> {compactProjectItems(style?.colorPalette, 3).join("; ") || "-"}</div>
                    <div><b className="text-white/78">Lighting:</b> {compactProjectItems(style?.lightingRules, 3).join("; ") || "-"}</div>
                    <div><b className="text-white/78">Continuity:</b> {compactProjectItems(style?.continuityRules, 3).join("; ") || "-"}</div>
                  </div>
                </div>

                <div className="rounded-[22px] border border-white/[.06] bg-white/[.03] p-4">
                  <h4 className="text-sm font-black text-white">{isZh ? "资产概览" : "Assets"}</h4>
                  <div className="mt-3 grid gap-2 text-xs text-white/56">
                    <div><b className="text-white/78">Characters:</b> {(assets?.characters || []).map((item) => `${item.assetTag}${item.assetReferenceImage?.url ? " (image)" : ""}`).join(", ") || "-"}</div>
                    <div><b className="text-white/78">Locations:</b> {(assets?.locations || []).map((item) => `${item.assetTag}${item.assetReferenceImage?.url ? " (image)" : ""}`).join(", ") || "-"}</div>
                    <div><b className="text-white/78">Props:</b> {(assets?.props || []).map((item) => `${item.assetTag}${item.assetReferenceImage?.url ? " (image)" : ""}`).join(", ") || "-"}</div>
                  </div>
                </div>

                <div className="rounded-[22px] border border-white/[.06] bg-white/[.03] p-4">
                  <h4 className="text-sm font-black text-white">{isZh ? "分镜概览" : "Shot Plan"}</h4>
                  <div className="mt-3 grid gap-3">
                    {(detail.shotPlan || []).slice(0, 6).map((shot) => (
                      <div className="rounded-2xl border border-white/[.05] bg-black/18 p-3" key={`${shot.shotNumber}-${shot.title}`}>
                        <div className="text-xs font-black text-[#ffd48a]">Shot {shot.shotNumber}</div>
                        <div className="mt-1 text-sm font-black text-white/82">{shot.title}</div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {(shot.assetReferences || []).map((tag) => (
                            <span className="rounded-full border border-white/[.07] bg-white/[.04] px-2 py-1 text-[11px] font-bold text-white/56" key={tag}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[22px] border border-white/[.06] bg-white/[.03] p-4">
                  <h4 className="text-sm font-black text-white">{isZh ? "连续性检查" : "Continuity Checklist"}</h4>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(detail.continuityChecklist || []).slice(0, 10).map((item) => (
                      <span className="rounded-full border border-[#f6a935]/14 bg-[#f6a935]/8 px-2 py-1 text-[11px] font-bold text-[#ffd48a]/76" key={item}>
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-[24px] border border-white/[.06] bg-white/[.03] p-5 text-sm leading-6 text-white/52">
                {isZh ? "选择一个项目卡片查看详情。" : "Select a project card to view details."}
              </div>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}

function ProjectDeleteConfirmModal({
  error,
  isDeleting,
  isZh,
  onCancel,
  onConfirm,
  project,
}: {
  error: string;
  isDeleting: boolean;
  isZh: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  project: PromptStudioSavedProjectSummary | null;
}) {
  if (!project) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-[460px] rounded-[28px] border border-white/[.08] bg-[#101216] p-5 shadow-[0_28px_90px_rgba(0,0,0,.55)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <SectionLabel>{isZh ? "删除确认" : "Delete confirmation"}</SectionLabel>
            <h2 className="mt-2 text-2xl font-black text-white">{isZh ? "删除项目？" : "Delete project?"}</h2>
          </div>
          <span className="rounded-full border border-red-300/20 bg-red-400/10 px-2.5 py-1 text-[11px] font-black uppercase tracking-[.16em] text-red-100/80">
            {isZh ? "危险操作" : "Destructive"}
          </span>
        </div>

        <div className="mt-4 rounded-2xl border border-white/[.06] bg-black/20 p-3">
          <div className="text-sm font-black text-white">{project.title || "Untitled Project"}</div>
          <div className="mt-1 text-xs font-bold text-white/45">
            {project.shotCount || 0} shots · {project.assetCount || 0} assets
          </div>
        </div>

        <p className="mt-4 text-sm leading-6 text-white/58">
          {isZh
            ? "此操作会从 Project History 中删除该项目。不会影响已经生成的图片或视频，但删除后无法从项目历史恢复。"
            : "This will remove the project from Project History. It will not affect generated images or videos, but the project cannot be restored from history."}
        </p>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-300/20 bg-red-400/10 p-3 text-sm leading-6 text-red-100">
            {error}
          </div>
        ) : null}

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            className="rounded-2xl border border-white/[.08] bg-white/[.04] px-4 py-3 text-sm font-black text-white/72 transition hover:bg-white/[.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
            disabled={isDeleting}
            onClick={onCancel}
            type="button"
          >
            {isZh ? "取消" : "Cancel"}
          </button>
          <button
            className="rounded-2xl border border-red-300/24 bg-red-500/18 px-4 py-3 text-sm font-black text-red-50 shadow-[0_14px_34px_rgba(248,113,113,.14)] transition hover:bg-red-500/24 disabled:cursor-not-allowed disabled:opacity-55"
            disabled={isDeleting}
            onClick={onConfirm}
            type="button"
          >
            {isDeleting ? (isZh ? "删除中..." : "Deleting...") : isZh ? "确认删除" : "Delete project"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function PromptStudioPage() {
  const router = useRouter();
  const { locale } = useI18n();
  const mainRef = useRef<HTMLElement | null>(null);
  const outputRef = useRef<HTMLElement | null>(null);
  const referenceInputRef = useRef<HTMLInputElement | null>(null);
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
  const [activeLibraryCategory, setActiveLibraryCategory] = useState<LibraryGroupId>("recommended");
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [result, setResult] = useState<PromptStudioGenerateResult | null>(null);
  const [projectResult, setProjectResult] = useState<PromptStudioProjectPlanResult | null>(null);
  const [savedProjectId, setSavedProjectId] = useState<string | undefined>();
  const [projectHistory, setProjectHistory] = useState<PromptStudioSavedProjectSummary[]>([]);
  const [selectedHistoryProject, setSelectedHistoryProject] = useState<PromptStudioSavedProject | null>(null);
  const [isProjectDetailLoading, setIsProjectDetailLoading] = useState(false);
  const [isProjectSaving, setIsProjectSaving] = useState(false);
  const [isProjectHistoryOpen, setIsProjectHistoryOpen] = useState(false);
  const [isProjectHistoryLoading, setIsProjectHistoryLoading] = useState(false);
  const [projectHistoryError, setProjectHistoryError] = useState("");
  const [projectPendingDelete, setProjectPendingDelete] = useState<PromptStudioSavedProjectSummary | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState("");
  const [deleteProjectError, setDeleteProjectError] = useState("");
  const [assetUploadingKey, setAssetUploadingKey] = useState("");
  const [assetUploadErrors, setAssetUploadErrors] = useState<Record<string, string>>({});
  const [styleCardResult, setStyleCardResult] = useState<PromptStudioReferenceAnalysisResult | null>(null);
  const [referenceStyleResult, setReferenceStyleResult] = useState<PromptStudioReferenceStylePromptResult | null>(null);
  const [referenceImageFile, setReferenceImageFile] = useState<File | null>(null);
  const [referenceImagePreview, setReferenceImagePreview] = useState("");
  const [referencePreserveMode, setReferencePreserveMode] = useState<PromptStudioReferencePreserveMode>("composition");
  const [referenceStyleMode, setReferenceStyleMode] = useState<PromptStudioReferenceStyleMode>("selectedLibraries");
  const [referenceStyleInstruction, setReferenceStyleInstruction] = useState("high-end cinematic style, refined lighting, premium texture");
  const [projectType, setProjectType] = useState<PromptStudioProjectType>("short-film");
  const [projectShotCount, setProjectShotCount] = useState(5);
  const [useStyleCardForProject, setUseStyleCardForProject] = useState(false);
  const [useReferenceStyleForProject, setUseReferenceStyleForProject] = useState(false);
  const [activeResult, setActiveResult] = useState<ResultKey>("standardPrompt");
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isReferenceLoading, setIsReferenceLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const [bridgeLocale, setBridgeLocale] = useState<"zh" | "en">(locale === "zh" ? "zh" : "en");
  const isZh = bridgeLocale === "zh";

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setBridgeLocale(getPromptStudioDraftLocale(locale));
    }, 0);

    return () => window.clearTimeout(timer);
  }, [locale]);

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
    return () => {
      if (referenceImagePreview) URL.revokeObjectURL(referenceImagePreview);
    };
  }, [referenceImagePreview]);

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
  const styleCardPrompt = styleCardResult
    ? styleCardResult.reusablePrompt.videoPrompt || styleCardResult.reusablePrompt.enhancedPrompt || styleCardResult.reusablePrompt.imagePrompt || ""
    : "";
  const referenceStylePrompt = referenceStyleResult
    ? referenceStyleResult.prompts.imageToVideoPrompt || referenceStyleResult.prompts.enhancedPrompt || referenceStyleResult.prompts.imageToImagePrompt || ""
    : "";
  const projectPrompt = projectResult?.exportText || "";
  const currentPrompt = mode === "styleCard"
    ? styleCardPrompt
    : mode === "referenceStyle"
      ? referenceStylePrompt
      : mode === "project"
        ? projectPrompt
    : result
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
  const usageTips = mode === "styleCard"
    ? styleCardResult?.usageTips || []
    : mode === "referenceStyle"
      ? referenceStyleResult?.usageTips || []
      : mode === "project"
        ? projectResult?.productionTips || []
      : result?.usageTips || [];
  const knowledgeUsed: Array<{
    id: string;
    label: string;
    detail?: string;
    phrases?: string[];
    profile?: PromptStudioGenerateResult["selectedKnowledge"][number]["knowledgeProfile"];
  }> = mode === "referenceStyle" && referenceStyleResult?.matchedLibraries?.length
    ? referenceStyleResult.matchedLibraries.map((item) => ({
        id: item.id,
        label: item.nameZh,
        detail: `${item.category} · ${Math.round((item.confidence || 0) * 100)}%`,
        phrases: [item.reason],
      }))
    : mode === "project" && projectResult?.selectedKnowledge?.length
      ? projectResult.selectedKnowledge.map((item) => ({
        id: item.id,
        label: item.nameZh,
        detail: item.appliedAs || item.category,
        phrases: item.keyPhrases || [],
        profile: item.knowledgeProfile,
      }))
    : mode === "styleCard" && styleCardResult?.matchedLibraries?.length
    ? styleCardResult.matchedLibraries.map((item) => ({
        id: item.id,
        label: item.nameZh,
        detail: `${item.category} · ${Math.round(item.confidence * 100)}%`,
        phrases: [item.reason],
      }))
    : result?.selectedKnowledge?.length
      ? result.selectedKnowledge.map((item) => ({
        id: item.id,
        label: item.nameZh,
        detail: item.appliedAs || item.category,
        phrases: item.keyPhrases || [],
        profile: item.knowledgeProfile,
      }))
      : selectedItems.map((item) => ({ id: item.id, label: item.nameZh, detail: item.category, phrases: [] }));
  const modeOption = modeOptions.find((item) => item.id === mode) || modeOptions[0];
  const needsExistingPrompt = mode === "optimize" || mode === "convert" || mode === "layerEdit";
  const isStyleCardMode = mode === "styleCard";
  const isReferenceStyleMode = mode === "referenceStyle";
  const isProjectMode = mode === "project";
  const isReferenceImageMode = isStyleCardMode || isReferenceStyleMode;
  const isBusy = isLoading || isReferenceLoading;
  const isGenerateDisabled = isBusy || (isReferenceImageMode ? !referenceImageFile : needsExistingPrompt ? !existingPrompt.trim() : !intent.trim());
  const generateButtonLabel = isBusy
    ? isZh
      ? "生成中..."
      : isReferenceImageMode
        ? "Analyzing..."
        : "Generating..."
    : isZh
      ? {
          generate: "生成三档 Prompt",
          optimize: "优化 Prompt",
          convert: "转换 Prompt",
          layerEdit: "只改这一层",
          storyboard: "生成分镜流水线",
          styleCard: "生成风格卡",
          project: "生成项目制作方案",
        }[mode === "referenceStyle" ? "styleCard" : mode]
      : {
          generate: "Generate three prompts",
          optimize: "Optimize prompt",
          convert: "Convert prompt",
          layerEdit: "Edit this layer",
          storyboard: "Generate storyboard pipeline",
          styleCard: "Generate style card",
          project: "Generate Project Plan",
        }[mode === "referenceStyle" ? "styleCard" : mode];
  const resolvedGenerateButtonLabel =
    mode === "project" && !isBusy
      ? isZh
        ? "生成项目制作方案"
        : "Generate Project Plan"
      : mode === "referenceStyle" && !isBusy
      ? isZh
        ? "生成垫图风格 Prompt"
        : "Generate reference style prompt"
      : generateButtonLabel;

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

  function handleReferenceFile(file?: File | null) {
    if (!file) return;
    const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
    if (!allowedTypes.has(file.type)) {
      setError(isZh ? "只支持 PNG、JPEG 或 WebP 参考图。" : "Only PNG, JPEG, or WebP reference images are supported.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError(isZh ? "参考图不能超过 10MB。" : "Reference image must be 10MB or smaller.");
      return;
    }
    setReferenceImageFile(file);
    setReferenceImagePreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
    setStyleCardResult(null);
    setReferenceStyleResult(null);
    setProjectResult(null);
    setSavedProjectId(undefined);
    setResult(null);
    setError("");
    setNotice("");
  }

  function handleReferenceInput(event: ChangeEvent<HTMLInputElement>) {
    handleReferenceFile(event.target.files?.[0]);
    event.target.value = "";
  }

  function handleReferenceDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    handleReferenceFile(event.dataTransfer.files?.[0]);
  }

  async function handleAnalyzeReference() {
    if (!referenceImageFile) {
      setError(isZh ? "请先上传一张参考图。" : "Please upload a reference image first.");
      return;
    }
    setIsReferenceLoading(true);
    setError("");
    setNotice("");
    try {
      const data = await analyzePromptStudioReference({
        image: referenceImageFile,
        target: target === "storyboard" ? "video" : target,
        engine,
        language: locale === "en" ? "en" : "zh",
      });
      setStyleCardResult(data || null);
      setResult(null);
      setProjectResult(null);
      setSavedProjectId(undefined);
      setNotice(
        isZh
          ? "已生成参考图风格卡。未提交图片/视频生成任务，也不会扣积分。"
          : "Reference style card created. No image or video generation job was submitted and no credits were used.",
      );
      window.requestAnimationFrame(scrollToOutput);
    } catch (referenceError) {
      setError(referenceError instanceof Error ? referenceError.message : isZh ? "参考图分析失败，请稍后重试。" : "Unable to analyze the reference image. Please try again.");
    } finally {
      setIsReferenceLoading(false);
    }
  }

  async function handleGenerateReferenceStyle() {
    if (!referenceImageFile) {
      setError(isZh ? "请先上传一张参考图。" : "Please upload a reference image first.");
      return;
    }
    setIsReferenceLoading(true);
    setError("");
    setNotice("");
    try {
      const data = await generatePromptStudioReferenceStylePrompt({
        image: referenceImageFile,
        intent,
        target: target === "image" ? "image" : "video",
        engine,
        aspectRatio,
        duration,
        language: locale === "en" ? "en" : "zh",
        preserveMode: referencePreserveMode,
        styleMode: referenceStyleMode,
        selectedStyles,
        selectedModules,
        styleCard: referenceStyleMode === "styleCard" ? styleCardResult?.styleCard || null : null,
        styleInstruction: referenceStyleInstruction,
        advancedControls,
      });
      setReferenceStyleResult(data || null);
      setResult(null);
      setProjectResult(null);
      setSavedProjectId(undefined);
      setNotice(
        isZh
          ? "已生成垫图 + 风格文本 prompt。未提交图片/视频生成任务，也不会扣积分。"
          : "Reference + Style prompts created. No image or video generation job was submitted and no credits were used.",
      );
      window.requestAnimationFrame(scrollToOutput);
    } catch (referenceError) {
      setError(referenceError instanceof Error ? referenceError.message : isZh ? "垫图风格 prompt 生成失败，请稍后重试。" : "Unable to create reference style prompts. Please try again.");
    } finally {
      setIsReferenceLoading(false);
    }
  }

  async function handleGenerateProject() {
    if (!intent.trim()) {
      setError(isZh ? "请先输入项目想法。" : "Please enter a project brief first.");
      return;
    }
    setIsLoading(true);
    setError("");
    setNotice("");
    try {
      const data = await generatePromptStudioProjectPlan({
        projectBrief: intent,
        projectType,
        target: target === "storyboard" ? "storyboard" : "video",
        engine,
        aspectRatio,
        shotCount: projectShotCount,
        selectedStyles,
        selectedModules,
        styleCard: useStyleCardForProject ? styleCardResult?.styleCard || null : null,
        referenceStylePrompt: useReferenceStyleForProject ? referenceStylePrompt : "",
        language: locale === "en" ? "en" : "zh",
      });
      setProjectResult(data || null);
      setSavedProjectId(undefined);
      setResult(null);
      setNotice(
        isZh
          ? "已生成项目制作提示词包。不会生成图片/视频，不会提交 provider，也不会扣积分。"
          : "Project prompt pack created. No media generation, provider submit, or credits were used.",
      );
      window.requestAnimationFrame(scrollToOutput);
    } catch (projectError) {
      setError(projectError instanceof Error ? projectError.message : isZh ? "项目制作方案生成失败，请稍后重试。" : "Unable to create the project plan. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  function useStyleCardAsReferenceStyle() {
    if (!styleCardResult) return;
    setReferenceStyleMode("styleCard");
    setMode("referenceStyle");
    setReferenceStyleResult(null);
    setNotice(isZh ? "已切换到垫图 + 风格模式。请确认参考图和保留方式后手动生成 prompt。" : "Switched to Reference + Style. Review the reference and preservation mode, then generate prompts manually.");
    mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }

  function applyStyleCardToGenerate() {
    if (!styleCardResult) return;
    const styleIds = new Set(catalog.styles.map((item) => item.id));
    const moduleIds = new Set(catalog.modules.map((item) => item.id));
    const matchedStyleIds = styleCardResult.matchedLibraries.map((item) => item.id).filter((id) => styleIds.has(id));
    const matchedModuleIds = styleCardResult.matchedLibraries.map((item) => item.id).filter((id) => moduleIds.has(id));
    setSelectedStyles((current) => Array.from(new Set([...current, ...matchedStyleIds])));
    setSelectedModules((current) => Array.from(new Set([...current, ...matchedModuleIds])));
    setIntent(`${isZh ? "基于参考图风格卡生成新的提示词，不要复制原图主体。" : "Use the reference style card to create a new prompt without copying the original subject."}\n\n${styleCardToGuidance(styleCardResult)}`);
    setMode("generate");
    setResult(null);
    setNotice(isZh ? "已套用风格卡到 Generate 模式。不会自动生成，请手动点击生成三档 Prompt。" : "Style card applied to Generate mode. It will not run automatically.");
    mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleModeChange(nextMode: TextMode) {
    setMode(nextMode);
    setResult(null);
    setProjectResult(null);
    setSavedProjectId(undefined);
    setReferenceStyleResult(null);
    setError("");
    setNotice("");
    if (nextMode === "storyboard") {
      handleTargetChange("storyboard");
    } else if (nextMode === "project" && target === "image") {
      handleTargetChange("video");
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
      setProjectResult(null);
      setSavedProjectId(undefined);
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

  function buildProjectSavePayload(projectData: PromptStudioProjectPlanResult) {
    return {
      title: projectData.projectTitle || "Untitled Project",
      projectType: projectData.projectType || projectType,
      brief: intent,
      target: projectData.target || (target === "storyboard" ? "storyboard" : "video"),
      engine: projectData.engine || engine,
      aspectRatio: projectData.aspectRatio || aspectRatio,
      selectedStyles,
      selectedModules,
      projectData,
    };
  }

  function updateProjectAssetReference(kind: ProjectAssetKind, assetTag: string, assetReferenceImage?: PromptStudioAssetReferenceImage | null) {
    setProjectResult((current) => {
      if (!current) return current;
      const updateList = <T extends ProjectAssetItem>(items: T[]) =>
        items.map((item) =>
          item.assetTag === assetTag
            ? ({
                ...item,
                assetReferenceImage: assetReferenceImage || undefined,
              } as T)
            : item,
        );

      return {
        ...current,
        assetPlan: {
          ...current.assetPlan,
          [kind]: updateList(current.assetPlan[kind] as ProjectAssetItem[]),
        },
      } as PromptStudioProjectPlanResult;
    });

    setSelectedHistoryProject((current) => {
      if (!current?.projectData || current.id !== savedProjectId) return current;
      const updateList = <T extends ProjectAssetItem>(items: T[]) =>
        items.map((item) =>
          item.assetTag === assetTag
            ? ({
                ...item,
                assetReferenceImage: assetReferenceImage || undefined,
              } as T)
            : item,
        );
      return {
        ...current,
        projectData: {
          ...current.projectData,
          assetPlan: {
            ...current.projectData.assetPlan,
            [kind]: updateList(current.projectData.assetPlan[kind] as ProjectAssetItem[]),
          },
        } as PromptStudioProjectPlanResult,
      };
    });
  }

  async function uploadAssetReferenceImage(kind: ProjectAssetKind, assetTag: string, file: File) {
    const key = getAssetUploadKey(kind, assetTag);
    const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
    if (!allowedTypes.has(file.type)) {
      setAssetUploadErrors((current) => ({
        ...current,
        [key]: isZh ? "只支持 PNG、JPEG 或 WebP 图片。" : "Only PNG, JPEG, or WebP images are supported.",
      }));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setAssetUploadErrors((current) => ({
        ...current,
        [key]: isZh ? "参考图不能超过 10MB。" : "Reference image must be 10MB or smaller.",
      }));
      return;
    }

    setAssetUploadingKey(key);
    setAssetUploadErrors((current) => ({ ...current, [key]: "" }));
    try {
      const image = await uploadPromptStudioAssetImage(file);
      if (!image?.url) throw new Error("Upload did not return an image URL.");
      updateProjectAssetReference(kind, assetTag, image);
      setNotice(isZh ? "参考图已绑定。点击更新项目即可保存到项目历史。" : "Reference image bound. Click Update Project to save it to Project History.");
    } catch (uploadError) {
      setAssetUploadErrors((current) => ({
        ...current,
        [key]: uploadError instanceof Error ? uploadError.message : isZh ? "参考图上传失败。" : "Reference image upload failed.",
      }));
    } finally {
      setAssetUploadingKey("");
    }
  }

  function removeAssetReferenceImage(kind: ProjectAssetKind, assetTag: string) {
    updateProjectAssetReference(kind, assetTag, null);
    setAssetUploadErrors((current) => ({ ...current, [getAssetUploadKey(kind, assetTag)]: "" }));
    setNotice(isZh ? "已移除该资产的参考图绑定。点击更新项目即可保存。" : "Reference image removed from this asset. Click Update Project to save.");
  }

  async function loadProjectHistory() {
    setIsProjectHistoryLoading(true);
    setProjectHistoryError("");
    try {
      const projects = await fetchPromptStudioProjects();
      setProjectHistory(projects);
    } catch (historyError) {
      setProjectHistoryError(historyError instanceof Error ? historyError.message : isZh ? "项目历史加载失败。" : "Unable to load project history.");
    } finally {
      setIsProjectHistoryLoading(false);
    }
  }

  function openProjectHistory() {
    setIsProjectHistoryOpen(true);
    void loadProjectHistory();
  }

  async function selectSavedProject(project: PromptStudioSavedProjectSummary) {
    setProjectHistoryError("");
    setIsProjectDetailLoading(true);
    try {
      const detail = await fetchPromptStudioProject(project.id);
      if (!detail?.projectData) throw new Error("Project data is missing.");
      setSelectedHistoryProject(detail);
    } catch (detailError) {
      setProjectHistoryError(detailError instanceof Error ? detailError.message : isZh ? "项目详情加载失败。" : "Unable to load project details.");
    } finally {
      setIsProjectDetailLoading(false);
    }
  }

  async function saveCurrentProject() {
    if (!projectResult) return;
    setIsProjectSaving(true);
    setError("");
    try {
      const payload = buildProjectSavePayload(projectResult);
      const saved = savedProjectId
        ? await updatePromptStudioProject(savedProjectId, payload)
        : await savePromptStudioProject(payload);
      setSavedProjectId(saved?.id);
      setNotice(isZh ? "项目已保存。" : "Project saved.");
      if (isProjectHistoryOpen) void loadProjectHistory();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "";
      setError(
        /sign in|auth|unauthorized|401/i.test(message)
          ? isZh
            ? "请先登录后保存项目。"
            : "Please sign in before saving projects."
          : message || (isZh ? "项目保存失败。" : "Unable to save project."),
      );
    } finally {
      setIsProjectSaving(false);
    }
  }

  async function openSavedProject(project: PromptStudioSavedProjectSummary) {
    setProjectHistoryError("");
    try {
      const detail = await fetchPromptStudioProject(project.id);
      const data = detail?.projectData;
      if (!data) throw new Error("Project data is missing.");
      setMode("project");
      setProjectResult(data);
      setResult(null);
      setStyleCardResult(null);
      setReferenceStyleResult(null);
      setSavedProjectId(detail.id);
      setIntent(detail.brief || data.projectLogline || data.projectTitle || "");
      setProjectType((detail.projectType || data.projectType || "short-film") as PromptStudioProjectType);
      setTarget(detail.target === "storyboard" ? "storyboard" : "video");
      setEngine((detail.engine || data.engine || "seedance") as Engine);
      setAspectRatio(detail.aspectRatio || data.aspectRatio || "9:16");
      setProjectShotCount(Number(data.shotCount || data.shotPlan?.length || 5));
      setSelectedStyles(detail.selectedStyles || []);
      setSelectedModules(detail.selectedModules || []);
      setIsProjectHistoryOpen(false);
      setNotice(isZh ? "已加载保存的项目，可以继续编辑或更新。" : "Saved project loaded. You can continue editing or update it.");
      window.requestAnimationFrame(scrollToOutput);
    } catch (openError) {
      setProjectHistoryError(openError instanceof Error ? openError.message : isZh ? "项目打开失败。" : "Unable to open project.");
    }
  }

  async function copySavedProject(project: PromptStudioSavedProjectSummary) {
    setProjectHistoryError("");
    try {
      const detail = await fetchPromptStudioProject(project.id);
      if (!detail) throw new Error("Project data is missing.");
      await copyPrompt(projectPackText(detail.projectData) || detail.title || "");
      setNotice(isZh ? "项目包已复制。" : "Project pack copied.");
    } catch (copyError) {
      setProjectHistoryError(copyError instanceof Error ? copyError.message : isZh ? "项目包复制失败。" : "Unable to copy project pack.");
    }
  }

  function requestDeleteProject(project: PromptStudioSavedProjectSummary) {
    setProjectPendingDelete(project);
    setDeleteProjectError("");
    setProjectHistoryError("");
  }

  function cancelDeleteProject() {
    if (deletingProjectId) return;
    setProjectPendingDelete(null);
    setDeleteProjectError("");
  }

  async function confirmDeleteProject() {
    const project = projectPendingDelete;
    if (!project || deletingProjectId) return;
    setDeletingProjectId(project.id);
    setDeleteProjectError("");
    setProjectHistoryError("");
    try {
      await deletePromptStudioProject(project.id);
      setProjectHistory((current) => current.filter((item) => item.id !== project.id));
      if (savedProjectId === project.id) setSavedProjectId(undefined);
      if (selectedHistoryProject?.id === project.id) setSelectedHistoryProject(null);
      setProjectPendingDelete(null);
      setNotice(isZh ? "\u9879\u76ee\u5df2\u5220\u9664\u3002" : "Project deleted.");
    } catch (deleteError) {
      setDeleteProjectError(deleteError instanceof Error ? deleteError.message : isZh ? "\u9879\u76ee\u5220\u9664\u5931\u8d25\u3002" : "Unable to delete project.");
    } finally {
      setDeletingProjectId("");
    }
  }

  function sendSavedProjectFirstShot(project: PromptStudioSavedProject) {
    const prompt = firstProjectShotPrompt(project);
    if (!prompt) return;
    savePromptStudioToVideoDraft({
      prompt,
      source: "prompt-studio",
      mode: "project",
      target: "video",
      engine,
    });
    setNotice(
      isZh
        ? "已填入第一镜头的视频工作区草稿。不会自动生成，请确认后手动点击生成。"
        : "First shot sent to the video workspace draft. It will not generate automatically.",
    );
    router.push("/workspace/video?from=prompt-studio");
  }

  function saveForVideo() {
    const prompt = mode === "styleCard"
      ? styleCardResult?.reusablePrompt.videoPrompt || styleCardResult?.reusablePrompt.enhancedPrompt || ""
      : mode === "referenceStyle"
        ? referenceStyleResult?.prompts.imageToVideoPrompt || referenceStyleResult?.prompts.enhancedPrompt || ""
      : currentPrompt;
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

  function saveProjectShotForVideo(prompt: string) {
    if (!prompt) return;
    savePromptStudioToVideoDraft({
      prompt,
      source: "prompt-studio",
      mode: "project",
      target: "video",
      engine,
    });
    setNotice(
      isZh
        ? "已填入该镜头的视频工作区草稿。不会自动生成，请确认后手动点击生成。"
        : "This shot was sent to the video workspace draft. It will not generate automatically.",
    );
    router.push("/workspace/video?from=prompt-studio");
  }

  function saveProjectAssetForImage(asset: ProjectAssetItem) {
    const prompt = getProjectAssetPrompt(asset);
    if (!prompt) return;
    const referenceImages = [assetReferenceToDraftReference(asset)].filter(isBridgeReferenceImage);
    savePromptStudioToImageDraft({
      prompt,
      source: "prompt-studio",
      mode: "project",
      target: "image",
      engine,
      referenceImages,
    });
    setNotice(isZh
      ? "已填入资产图片工作区草稿。不会自动生成，请确认后手动点击生成。"
      : "This asset prompt was sent to the image workspace draft. It will not generate automatically.");
    router.push("/workspace/image?from=prompt-studio");
  }

  function saveProjectAssetForVideo(asset: ProjectAssetItem) {
    const prompt = getProjectAssetPrompt(asset);
    if (!prompt) return;
    const referenceImages = [assetReferenceToDraftReference(asset)].filter(isBridgeReferenceImage);
    savePromptStudioToVideoDraft({
      prompt,
      source: "prompt-studio",
      mode: "project",
      target: "video",
      engine,
      referenceImages,
    });
    setNotice(
      isZh
        ? "资产提示词已填入视频工作区草稿。不会自动生成，请确认后手动点击生成。"
        : "This asset prompt was sent to the video workspace draft. It will not generate automatically.",
    );
    router.push("/workspace/video?from=prompt-studio");
  }

  function saveForImage() {
    const prompt = mode === "styleCard"
      ? styleCardResult?.reusablePrompt.imagePrompt || styleCardResult?.reusablePrompt.enhancedPrompt || ""
      : mode === "referenceStyle"
        ? referenceStyleResult?.prompts.imageToImagePrompt || referenceStyleResult?.prompts.enhancedPrompt || ""
      : currentPrompt;
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
    setProjectResult(null);
    setSavedProjectId(undefined);
    setStyleCardResult(null);
    setReferenceStyleResult(null);
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
                    isLoading={isBusy}
                    label={resolvedGenerateButtonLabel}
                    onClick={() => void (isStyleCardMode ? handleAnalyzeReference() : isReferenceStyleMode ? handleGenerateReferenceStyle() : isProjectMode ? handleGenerateProject() : handleGenerate())}
                  >
                    {generateButtonLabel || (isZh ? "生成三档 Prompt" : "Generate three prompts")}
                  </PrimaryGenerateButton>
                </div>

                <div className="mt-5 rounded-[26px] border border-white/[.07] bg-[#0c0e12] p-4 shadow-inner shadow-black/35">
                  <div className="mb-4 grid gap-2 md:grid-cols-3 xl:grid-cols-6">
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

                  {isProjectMode ? (
                    <div className="grid gap-4 rounded-[24px] border border-white/[.06] bg-black/16 p-4">
                      <label>
                        <div className="mb-2 text-[11px] font-black uppercase tracking-[.18em] text-white/36">
                          {isZh ? "项目想法 / Project Brief" : "Project Brief"}
                        </div>
                        <textarea
                          className={cx("h-40 w-full resize-y rounded-2xl border border-white/[.06] bg-black/18 p-4 text-[14px] leading-6 text-white outline-none placeholder:text-white/30 focus:border-[#f6a935]/28", subtleScrollbar)}
                          maxLength={3200}
                          onChange={(event) => setIntent(event.target.value)}
                          placeholder={isZh ? "例如：我要做一部中世纪黑暗奇幻短片第二幕，主角进入废弃教堂，发现核心道具。" : "Example: a medieval dark fantasy short film act two, the protagonist enters an abandoned cathedral and discovers a key relic."}
                          value={intent}
                        />
                        <div className="mt-2 text-right text-xs font-semibold text-white/34">{intent.length} / 3200</div>
                      </label>
                      <div className="grid gap-4 lg:grid-cols-2">
                        <div>
                          <div className="mb-2 text-[11px] font-black uppercase tracking-[.18em] text-white/36">
                            {isZh ? "项目类型" : "Project Type"}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {projectTypeOptions.map((item) => (
                              <ControlPill active={projectType === item.id} key={item.id} onClick={() => setProjectType(item.id)}>
                                {isZh ? item.labelZh : item.labelEn}
                              </ControlPill>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="mb-2 text-[11px] font-black uppercase tracking-[.18em] text-white/36">
                            {isZh ? "Shot 数量" : "Shot Count"}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {projectShotCountOptions.map((count) => (
                              <ControlPill active={projectShotCount === count} key={count} onClick={() => setProjectShotCount(count)}>
                                {String(count)}
                              </ControlPill>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="grid gap-2 md:grid-cols-2">
                        <button
                          className={cx(
                            "rounded-2xl border px-3 py-2 text-left text-xs font-bold transition",
                            useStyleCardForProject
                              ? "border-[#f6a935]/32 bg-[#f6a935]/12 text-[#ffd48a]"
                              : "border-white/[.07] bg-white/[.035] text-white/54 hover:border-[#f6a935]/22",
                            !styleCardResult ? "cursor-not-allowed opacity-45" : "",
                          )}
                          disabled={!styleCardResult}
                          onClick={() => setUseStyleCardForProject((current) => !current)}
                          type="button"
                        >
                          {isZh ? "套用当前 Style Card" : "Use current Style Card"}
                        </button>
                        <button
                          className={cx(
                            "rounded-2xl border px-3 py-2 text-left text-xs font-bold transition",
                            useReferenceStyleForProject
                              ? "border-[#f6a935]/32 bg-[#f6a935]/12 text-[#ffd48a]"
                              : "border-white/[.07] bg-white/[.035] text-white/54 hover:border-[#f6a935]/22",
                            !referenceStyleResult ? "cursor-not-allowed opacity-45" : "",
                          )}
                          disabled={!referenceStyleResult}
                          onClick={() => setUseReferenceStyleForProject((current) => !current)}
                          type="button"
                        >
                          {isZh ? "套用当前垫图风格 prompt" : "Use current Reference + Style prompt"}
                        </button>
                      </div>
                      <p className="rounded-2xl border border-[#f6a935]/18 bg-[#f6a935]/8 px-3 py-2 text-sm leading-6 text-[#ffd48a]/76">
                        {isZh
                          ? "Project Studio 只生成项目提示词方案、资产 prompt 和分镜 prompt，不生成图片/视频，不扣积分。"
                          : "Project Studio only creates planning text, asset prompts, and shot prompts. It does not generate media or use credits."}
                      </p>
                      <button
                        className="w-fit rounded-full border border-white/[.08] bg-white/[.04] px-4 py-2 text-sm font-black text-white/70 transition hover:border-[#f6a935]/24 hover:bg-[#f6a935]/10 hover:text-[#ffd48a]"
                        onClick={openProjectHistory}
                        type="button"
                      >
                        {isZh ? "项目历史" : "Project History"}
                      </button>
                    </div>
                  ) : isReferenceImageMode ? (
                    <div className="grid gap-4">
                      <ReferenceUploadCard
                        file={referenceImageFile}
                        inputRef={referenceInputRef}
                        isZh={isZh}
                        onClear={() => {
                          setReferenceImageFile(null);
                          setReferenceImagePreview((current) => {
                            if (current) URL.revokeObjectURL(current);
                            return "";
                          });
                          setStyleCardResult(null);
                          setReferenceStyleResult(null);
                          setError("");
                          setNotice("");
                        }}
                        onDrop={handleReferenceDrop}
                        onInput={handleReferenceInput}
                        preview={referenceImagePreview}
                      />
                      {isReferenceStyleMode ? (
                        <div className="grid gap-4 rounded-[24px] border border-white/[.06] bg-black/16 p-4">
                          <div className="grid gap-4 lg:grid-cols-2">
                            <div>
                              <div className="mb-2 text-[11px] font-black uppercase tracking-[.18em] text-white/36">
                                {isZh ? "保留模式" : "Preserve Mode"}
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {referencePreserveOptions.map((item) => (
                                  <ControlPill active={referencePreserveMode === item.id} key={item.id} onClick={() => setReferencePreserveMode(item.id)}>
                                    {isZh ? item.labelZh : item.labelEn}
                                  </ControlPill>
                                ))}
                              </div>
                            </div>
                            <div>
                              <div className="mb-2 text-[11px] font-black uppercase tracking-[.18em] text-white/36">
                                {isZh ? "风格来源" : "Style Source"}
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {referenceStyleOptions.map((item) => (
                                  <ControlPill active={referenceStyleMode === item.id} key={item.id} onClick={() => setReferenceStyleMode(item.id)}>
                                    {isZh ? item.labelZh : item.labelEn}
                                  </ControlPill>
                                ))}
                              </div>
                            </div>
                          </div>
                          {referenceStyleMode === "manual" ? (
                            <label>
                              <div className="mb-2 text-[11px] font-black uppercase tracking-[.18em] text-white/36">
                                {isZh ? "手写风格说明" : "Manual Style Instruction"}
                              </div>
                              <textarea
                                className={cx("h-24 w-full resize-y rounded-2xl border border-white/[.06] bg-black/18 p-4 text-[14px] leading-6 text-white outline-none placeholder:text-white/30 focus:border-[#f6a935]/28", subtleScrollbar)}
                                maxLength={1600}
                                onChange={(event) => setReferenceStyleInstruction(event.target.value)}
                                placeholder={isZh ? "例如：高端室内设计广告、现代极简、暖色自然光" : "Example: high-end interior design commercial, modern minimalist, warm natural light"}
                                value={referenceStyleInstruction}
                              />
                            </label>
                          ) : null}
                          {referenceStyleMode === "styleCard" && !styleCardResult ? (
                            <p className="rounded-2xl border border-[#f6a935]/18 bg-[#f6a935]/8 px-3 py-2 text-sm leading-6 text-[#ffd48a]/78">
                              {isZh ? "当前没有可复用的 Style Card。你可以先生成参考图风格卡，或切换到手写风格说明。" : "No Style Card is available yet. Generate a Style Card first, or switch to manual style instruction."}
                            </p>
                          ) : null}
                          <label>
                            <div className="mb-2 text-[11px] font-black uppercase tracking-[.18em] text-white/36">
                              {isZh ? "创作意图（可选）" : "Creative Intent (optional)"}
                            </div>
                            <textarea
                              className={cx("h-24 w-full resize-y rounded-2xl border border-white/[.06] bg-black/18 p-4 text-[14px] leading-6 text-white outline-none placeholder:text-white/30 focus:border-[#f6a935]/28", subtleScrollbar)}
                              maxLength={2400}
                              onChange={(event) => setIntent(event.target.value)}
                              placeholder={isZh ? "例如：保留室内空间构图，改成高端改造广告视觉。" : "Example: preserve the interior layout and transform it into a premium renovation commercial."}
                              value={intent}
                            />
                          </label>
                        </div>
                      ) : null}
                    </div>
                  ) : needsExistingPrompt ? (
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
                      needsExistingPrompt || isReferenceImageMode || isProjectMode ? "hidden" : "h-40 w-full resize-y bg-transparent text-[15px] leading-7 text-white outline-none placeholder:text-white/30",
                      subtleScrollbar,
                    )}
                    maxLength={2400}
                    onChange={(event) => setIntent(event.target.value)}
                    placeholder={isZh ? "例如：雨夜便利店，旧恋人重逢，竖屏短视频，孤独但温柔。" : "Example: a rainy night convenience store, former lovers reunite, vertical short video, lonely yet gentle."}
                    value={intent}
                  />
                  <div className={cx("mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-white/[.06] pt-3", needsExistingPrompt || isReferenceImageMode || isProjectMode ? "hidden" : "")}>
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
                    {targetOptions.map((item) => {
                      const disabled = isProjectMode && item.id === "image";
                      return (
                        <ControlPill active={target === item.id} disabled={disabled} key={item.id} onClick={() => handleTargetChange(item.id)}>
                          {isZh ? item.labelZh : item.labelEn}
                        </ControlPill>
                      );
                    })}
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
                    {mode === "styleCard"
                      ? isZh
                        ? "参考图风格卡"
                        : "Reference Style Card"
                      : mode === "referenceStyle"
                        ? isZh
                          ? "垫图 + 风格 Prompt"
                          : "Reference + Style Prompt"
                      : mode === "project"
                        ? isZh
                          ? "项目制作方案"
                          : "Project Studio Plan"
                      : mode === "generate"
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

              {isStyleCardMode ? (
                styleCardResult ? (
                  <StyleCardOutput
                    isZh={isZh}
                    onApply={applyStyleCardToGenerate}
                    onClear={clearResult}
                    onCopy={(prompt) => void copyPrompt(prompt)}
                    onSaveImage={saveForImage}
                    onSaveVideo={saveForVideo}
                    onUseAsReferenceStyle={useStyleCardAsReferenceStyle}
                    result={styleCardResult}
                  />
                ) : (
                  <div className="mt-5">
                    <EmptyOutputState locale={locale} />
                  </div>
                )
              ) : null}

              {isReferenceStyleMode ? (
                referenceStyleResult ? (
                  <ReferenceStyleOutput
                    isZh={isZh}
                    onClear={clearResult}
                    onCopy={(prompt) => void copyPrompt(prompt)}
                    onSaveImage={saveForImage}
                    onSaveVideo={saveForVideo}
                    result={referenceStyleResult}
                  />
                ) : (
                  <div className="mt-5">
                    <EmptyOutputState locale={locale} />
                  </div>
                )
              ) : null}

              {isProjectMode ? (
                projectResult ? (
                  <ProjectPlanOutput
                    isZh={isZh}
                    onClear={clearResult}
                    onCopy={(prompt) => void copyPrompt(prompt)}
                    onOpenHistory={openProjectHistory}
                  onSaveProject={() => void saveCurrentProject()}
                  onSaveAssetImage={saveProjectAssetForImage}
                  onSaveAssetVideo={saveProjectAssetForVideo}
                  onSaveShotVideo={saveProjectShotForVideo}
                  onRemoveAssetReference={removeAssetReferenceImage}
                  onUploadAssetReference={(kind, assetTag, file) => void uploadAssetReferenceImage(kind, assetTag, file)}
                  result={projectResult}
                  savedProjectId={savedProjectId}
                  isSavingProject={isProjectSaving}
                  assetUploadErrors={assetUploadErrors}
                  assetUploadingKey={assetUploadingKey}
                />
                ) : (
                  <div className="mt-5">
                    <EmptyOutputState locale={locale} />
                  </div>
                )
              ) : null}

              <div className={cx("mt-5 rounded-[26px] border border-white/[.065] bg-[linear-gradient(180deg,rgba(12,14,18,.98),rgba(7,8,10,.98))] p-4 shadow-inner shadow-black/35", isReferenceImageMode || isProjectMode ? "hidden" : "")}>
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

              <div className={cx("mt-4 grid gap-2.5 sm:grid-cols-2", isReferenceImageMode || isProjectMode ? "hidden" : "")}>
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
              {isStyleCardMode ? (
                <ReferenceDetectedSignalsPanel locale={locale} result={styleCardResult} />
              ) : (
                <DetectedSignalsPanel locale={locale} result={result} />
              )}
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
                        {item.profile &&
                        knowledgeProfileGroups.some((group) => (item.profile?.[group.key] || []).length) ? (
                          <details className="mt-2 rounded-xl border border-white/[.05] bg-black/15 px-2.5 py-2">
                            <summary className="cursor-pointer text-[11px] font-black uppercase tracking-[.14em] text-white/38">
                              Applied layers
                            </summary>
                            <div className="mt-2 grid gap-2">
                              {knowledgeProfileGroups.map((group) => {
                                const values = item.profile?.[group.key] || [];
                                if (!values.length) return null;
                                return (
                                  <div key={group.key}>
                                    <div className="text-[10px] font-black uppercase tracking-[.16em] text-[#ffd48a]/52">{group.label}</div>
                                    <div className="mt-1 flex flex-wrap gap-1.5">
                                      {values.slice(0, 4).map((value) => (
                                        <span
                                          className="rounded-full border border-white/[.06] bg-white/[.035] px-2 py-0.5 text-[10px] leading-4 text-white/48"
                                          key={value}
                                        >
                                          {value}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </details>
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
          activeLibraryCategory={activeLibraryCategory}
          catalog={catalog}
          isOpen={isLibraryOpen}
          onClearSelection={() => {
            setSelectedStyles([]);
            setSelectedModules([]);
          }}
          onClose={() => setIsLibraryOpen(false)}
          onLibraryCategoryChange={setActiveLibraryCategory}
          onToggle={handleLibraryToggle}
          query={libraryQuery}
          selectedModules={selectedModules}
          selectedStyles={selectedStyles}
          setQuery={setLibraryQuery}
        />
        <ProjectHistoryDrawerV2
          error={projectHistoryError}
          isDetailLoading={isProjectDetailLoading}
          isLoading={isProjectHistoryLoading}
          isOpen={isProjectHistoryOpen}
          isZh={isZh}
          onClose={() => setIsProjectHistoryOpen(false)}
          onCopy={(project) => void copySavedProject(project)}
          onDelete={requestDeleteProject}
          onOpen={(project) => void openSavedProject(project)}
          onRefresh={() => void loadProjectHistory()}
          onSelect={(project) => void selectSavedProject(project)}
          onSendFirstShot={sendSavedProjectFirstShot}
          projects={projectHistory}
          selectedProject={selectedHistoryProject}
        />
        <ProjectDeleteConfirmModal
          error={deleteProjectError}
          isDeleting={Boolean(deletingProjectId)}
          isZh={isZh}
          onCancel={cancelDeleteProject}
          onConfirm={() => void confirmDeleteProject()}
          project={projectPendingDelete}
        />
      </main>
    </AppShell>
  );
}
