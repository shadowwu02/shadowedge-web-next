# ShadowEdge UI Direction Audit

## 1. 当前 UI 结论

ShadowEdge 的 Video Workspace 已经具备可测试的核心产品能力：Create Video、Remake、History、动态积分、素材引用、音频开关、Remake Outputs、队列恢复和 retry queue 都已经接入到同一工作区中。当前体验已经从功能验证阶段进入 Beta 可用阶段。

下一步不应该一次性重构全站，而应该把现有界面逐步统一成更稳定的 premium AI SaaS 风格：更清晰的工作区分栏、更克制的暗色面板、更统一的橙金色强调、更像任务 dashboard 的 History/Outputs，以及更可信的 credits/billing 表达。

当前 Video 页面已经有一些正确方向：

- 左侧已经承载 prompt、model、upload、audio、params、generate 等生成输入。
- Remake 已形成 Source video -> Analyze -> AI storyboard -> Generate shot -> Remake Outputs 的闭环。
- History 已开始使用 segmented filters、状态 badge、preview card 和 output detail。
- 生成按钮、状态 badge、语言切换、@ 元素 picker 已做过初步视觉统一。

仍需要继续收口的地方：

- 全站 design tokens 还没有完全统一到一个明确规范。
- Video Workspace 的中间 output/current task 区和右侧 history/detail 区还可以更像专业 AI generation workspace。
- Model Library、History、Pricing/Credits 的视觉语言需要和 Video Workspace 对齐。
- Credits 与 billing 体验需要更像 SaaS dashboard，而不是附属页面。

## 2. 推荐设计方向

推荐 ShadowEdge 采用以下方向：

- **Dark premium**：以深黑、深灰、低透明面板为基础，减少亮色铺满，强调高级感和内容可读性。
- **Orange-gold accent**：继续使用橙金作为主强调色，用于 primary button、active filter、focus ring、重要状态和 credits 信息。
- **Three-column generation workspace**：Video 工作区以左输入、中输出、右任务/历史为长期方向，符合现代 AI image/video generation dashboard。
- **SaaS dashboard task/status style**：History、Outputs、Queue、Credits 都应像任务 dashboard，强调状态、成本、时间、重试和可追溯。
- **Credits-first billing experience**：余额、预计成本、扣费记录、退款记录和充值入口要清楚可见，建立用户信任。
- **Avoid pink/purple**：避免粉色、紫色大渐变和廉价霓虹，保持黑金、深色和低饱和状态色。
- **Avoid overly artistic Dribbble-only layouts**：不要为了视觉效果牺牲可用性，不做难维护的大面积装饰。
- **Production-ready, readable, fast**：优先保证按钮可点、状态可读、任务可追踪、移动端不溢出。

## 3. ShadowEdge Design Tokens 建议

以下是建议方向，不要求本轮直接改代码。

### Background

- App background: `#05070b`
- Page band / shell: `#080a0f`
- Panel surface: `#111318`
- Elevated surface: `#1a1c22`
- Overlay surface: `rgba(8, 10, 14, 0.72)`
- Quiet card: `rgba(255, 255, 255, 0.035)`

### Borders

- Subtle border: `rgba(244, 244, 244, 0.08)`
- Strong border: `rgba(244, 244, 244, 0.14)`
- Accent border: `rgba(255, 180, 77, 0.32)`
- Hover border: `rgba(255, 199, 102, 0.42)`

### Orange-Gold Accent

- Accent base: `#ffb44d`
- Accent hover: `#ffc766`
- Accent deep: `#a86320`
- Accent muted background: `rgba(255, 180, 77, 0.12)`
- Accent active background: `linear-gradient(135deg, #f0a63a, #ffcb70)`

### Status Badge Colors

- Completed: low-saturation cyan  
  Background `#12313a`, border `rgba(111, 183, 200, 0.32)`, text `#b8e7ee`
- Failed: low-saturation red-brown  
  Background `#2a1410`, border `rgba(140, 70, 50, 0.4)`, text `#f2b3a1`
- Processing: orange-gold  
  Background `rgba(255, 180, 77, 0.14)`, border `rgba(255, 180, 77, 0.35)`, text `#ffd28a`
- Neutral / queued: graphite  
  Background `rgba(255, 255, 255, 0.05)`, border `rgba(244, 244, 244, 0.1)`, text `#b9b9b9`

### Text Hierarchy

- Primary: `#f4f4f4`
- Secondary: `#d6d6d6`
- Muted: `#a8adb7`
- Weak: `rgba(244, 244, 244, 0.48)`
- Eyebrow: 10-11px, uppercase, letter spacing 0.08em
- Body: 13-14px
- Compact metadata: 10-12px

### Radius

- Small controls: 12-14px
- Pills / segmented controls: 999px
- Cards: 16-22px
- Main panels: 24-30px

### Shadow / Glow

- Main panel shadow: subtle black depth, not bright glow
- Accent hover glow: low-opacity orange-gold only on focus/hover
- Avoid large decorative orbs, bokeh, or purple-blue gradients

### Button States

- Primary default: dark orange-gold, readable black text
- Primary hover: brighter orange-gold with subtle border/glow
- Primary active: small translate/press effect
- Secondary default: dark translucent panel with subtle border
- Secondary hover: slightly brighter panel and accent border
- Disabled: low contrast gray, no glow, pointer disabled

### Segmented Control Style

- Container: dark translucent pill with subtle border
- Active: filled orange-gold pill, black/dark text
- Inactive: muted text, transparent background
- Count: small, low-emphasis, never brighter than label

### Card Style

- Cards should frame repeated items, modals, or tools.
- Avoid cards inside cards when possible.
- Use section bands or unframed layouts for page-level structure.
- Card hover should increase border/background slightly, not jump or resize.

## 4. Video Workspace 布局建议

长期建议采用三栏 generation workspace：

- **Left**: prompt, model selector, upload/reference tray, @ element picker, audio toggle, duration/resolution/ratio params, generate button, cost estimate.
- **Center**: latest output, current preview, active generation status, progress/polling state, selected output details.
- **Right**: history, task status, output detail, references, reusable outputs, queue/retry state.

当前已经做到：

- 左侧 Create/Remake 模式切换清楚。
- Create 左侧输入面板已经包含 prompt、model、uploads、audio、params 和 dynamic credits。
- History/Generation stream 已经有任务状态、filters、detail panel 的基础。
- Remake 已经有 source、storyboard、queue、outputs 的完整闭环。

建议继续优化：

- 把中间“当前输出 / latest output”变成更稳定的主舞台，而不是只靠 history 找结果。
- 让右侧 History/Outputs/Task detail 在宽屏下更稳定，减少用户切换成本。
- 让 active task status 与 cost estimate 靠近 generate button，形成“操作 -> 成本 -> 状态”的短路径。
- 在窄屏下保持单列顺序：输入 -> 当前输出 -> History/Outputs。
- 不改 `/api/video/generate` 协议，不改 prompt token binding，不改 references/mediaList 行为。

## 5. Remake Workspace 布局建议

Remake 当前核心流程应该保持：

1. Source video
2. Ready to analyze
3. AI storyboard
4. Generate shot
5. Generate all shots
6. Remake Outputs

当前已经做到：

- Source video 选择后有 `Ready to analyze / 已准备好分析`。
- AI storyboard 空态已经去掉 mock 文案。
- Storyboard draft 可以恢复。
- History/meta 可以恢复 shot success/failed。
- Remake Outputs 已能在 Remake 页面内展示生成结果。
- Queue draft、active job recovery、retry queue 已形成可恢复的安全队列。

建议继续优化：

- 把 Remake 顶部做成轻量 stepper：Upload -> Analyze -> Storyboard -> Generate -> Outputs。
- Source video card 保持 compact，但上传成功、删除、替换、metadata 要明显。
- Storyboard shot card 内继续强化 success 状态、Open result、Retry shot、Use prompt。
- Queue 状态应像 task dashboard：running、paused、interrupted、failed、completed 都清晰可见。
- Remake Outputs 按当前 storyboard 分组，必要时显示最近 Remake outputs。
- 现在不要做 stitch/export。先让逐镜头生成、恢复、重试、结果管理稳定，再进入 D4-Audit。

## 6. Model Library 建议

Model Library 应更像 AI tools directory，而不是普通卡片列表。

建议结构：

- Category tabs: Video, Image, Audio, Remake, Experimental
- Model cards:
  - Provider logo
  - Model name
  - Capability summary
  - Supported inputs: text, image, video, audio
  - Supported outputs: video, image, audio
  - Supported duration/resolution/ratio
  - `from xx credits` / `起 xx 积分`
  - Status badge: available, beta, maintenance
  - Use in Video button

视觉建议：

- 卡片密度适中，避免 landing-page 式巨大 hero。
- Provider 和 capability chips 使用低对比深色标签。
- Credits 不要误导为固定价格，应写 `from` 或 `estimated`。
- 模型状态与真实 provider availability 保持一致。

## 7. History 建议

History 应像 SaaS task dashboard：

- Segmented filters: All, Completed, Failed, Processing
- Status badges: completed/failed/processing/queued
- Preview cards: thumbnail/video preview, model, params, cost, createdAt
- Detail drawer/panel: prompt, references count, output URL, jobId, provider status, error summary
- Actions: open result, retry, reuse prompt, use as reference, view metadata
- Source labels: Create, Remake, Retry, Queue
- Refund/cost visibility: cost, refunded, failed before provider submit

当前已经做到：

- Filter button 已开始胶囊化。
- 状态 badge 已从突兀绿色收敛到更统一的低饱和色。
- Remake Outputs 已避免用户只在通用 History 中找反推结果。

建议继续优化：

- 把 failed 的错误摘要做得更可读，避免只显示 generic failure。
- 对 Remake history 显示 shot number / analysisId / queue 信息。
- 对 refund 和 failed-before-submit 事件增加用户可理解状态。
- 保持 History 与 Remake Outputs 数据一致，避免两处显示相互矛盾。

## 8. Credits / Billing 建议

Credits / Billing 后续应成为独立可信的 SaaS 页面，而不是简单价格入口。

建议模块：

- Balance card:
  - Current balance
  - Estimated remaining generations
  - Recharge button
- Recharge packages:
  - Package amount
  - Bonus credits
  - Popular badge
  - Payment status
- Usage table:
  - Task
  - Model
  - Duration/resolution
  - Credits charged
  - Status
  - Refunded credits
  - CreatedAt
- Order / invoice history:
  - Order id
  - Amount
  - Credits
  - Payment status
  - Invoice/download if available
- Failed/refunded records:
  - Failed before provider submit
  - Provider submit failure
  - Polling failure
  - Refund state
- Task cost estimate:
  - Must align with frontend display and backend actual deduction.

注意：

- 前端显示的 estimated cost 不能长期和后端真实扣费不一致。
- Generate all 应继续强调每个 shot 独立扣 credits。
- Resume queue 前应重新确认 credits/provider readiness。

## 9. 分阶段执行计划

### UI-Phase-1：Design System Cleanup

目标：只统一颜色、按钮、badge、card、segmented filters，不改业务逻辑。

范围：

- 收拢 `globals.css` design tokens。
- 统一 primary/secondary/ghost button。
- 统一 status badge。
- 统一 card/panel/border/radius。
- 统一 segmented filter/button。
- 统一 hover/focus/disabled。

不做：

- 不改 generate payload。
- 不改 credits 扣费。
- 不改 Remake queue。
- 不改 provider。

### UI-Phase-2：Video Workspace Layout Refinement

目标：优化 Video Workspace 三栏布局、spacing、当前输出展示。

范围：

- 左侧输入面板更稳定。
- 中间 latest output / current preview 更明确。
- 右侧 History/detail 更像 task dashboard。
- 窄屏下保持清晰单列顺序。

不做：

- 不改 `/api/video/generate`。
- 不改 @token binding。
- 不改 upload API。

### UI-Phase-3：History / Outputs Polish

目标：优化 History、Remake Outputs 和 detail panel。

范围：

- History cards 更统一。
- Output detail drawer 更完整。
- Remake output source labels 更清晰。
- Failed/refund 状态更可理解。
- Retry/reuse actions 更一致。

不做：

- 不新增复杂 history 系统。
- 不改 backend protocol，除非后续单独 audit 证明必要。

### UI-Phase-4：Model Library Polish

目标：把 Model Library 做成 AI tools directory。

范围：

- Category tabs。
- Model cards。
- Provider logos。
- Capability chips。
- Supported inputs/outputs。
- `from xx credits`。
- Availability/status badge。

不做：

- 不改 provider 接入。
- 不改扣费逻辑。

### UI-Phase-5：Credits / Billing 页面

目标：建立完整 credits-first billing experience。

范围：

- Balance card。
- Recharge packages。
- Usage table。
- Order/invoice history。
- Refund records。
- Task cost estimate。

注意：

- 如需要后端订单/发票/usage API，应单独做后端方案，不混入 UI polish。
- 前后端 cost rules 必须对齐后再扩大客户测试。

## 10. 风险

- 不能为了视觉改造破坏 Video 生成主链路。
- 不能改 `/api/video/generate` 协议。
- 不能改 credits 真实扣费逻辑。
- 不能让前端 estimated credits 与后端真实扣费长期不一致。
- 不能一次性重构全站，应该分阶段做。
- 不能把 Remake source video/keyframes 自动塞入 references/mediaList。
- 不能破坏 @token 绑定、upload、history、polling、Remake queue。
- 不能使用粉色、紫色大渐变或过度 Dribbble 化的装饰。
- 不能为了高级感牺牲可读性、可点击性和移动端稳定性。
- 不能把 stitch/export 提前混入 UI 基础改造。
- 不能公开大规模测试前跳过 credits、refund、provider readiness 的安全验证。
