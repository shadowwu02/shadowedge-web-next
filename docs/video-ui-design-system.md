# ShadowEdge Video Workspace 视觉规范

本文档用于约束新版 `/workspace/video` 的视觉方向、组件层级和后续 UI polish 范围。后续涉及 Video Workspace 视觉任务时，先读本文档，再进入具体代码。

## A. 设计目标

- ShadowEdge Video Workspace 要像成熟的 AI video model workspace，而不是后台表单或历史列表。
- 保留 ShadowEdge 黑橙品牌，以深色画布、克制边框、橙色焦点建立识别度。
- 可以参考 Higgsfield 的信息层级、主画布权重、字体层级和卡片克制感。
- 不复制 Higgsfield 的品牌、logo、图片、绿色按钮、文案或 CSS 类名。
- 整体目标是 Apple-like 简约、科技感、专业感：少噪音、强主画布、轻操作、清楚状态。

## B. 色彩 Token

- `background`: `#05070B`
- `surface`: `#111318`
- `elevated`: `#1A1C22`
- `panel`: `#33323A`
- `border subtle`: `rgba(244, 244, 244, 0.08)`
- `border strong`: `rgba(255, 180, 77, 0.32)`
- `text high`: `#F4F4F4`
- `text muted`: `#B9B9B9`
- `action orange`: `#FFB44D`
- `danger`: 暗红，例如 `#2A1012` / `#7F2D2D`，不要粉色。
- `success`: 深绿、低饱和，避免荧光绿。

## C. 字体建议

- 优先系统字体栈：
  `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif`
- 中文 fallback：
  `"PingFang SC", "Microsoft YaHei", "Noto Sans SC"`
- 不要全局粗体过多。
- 标题建议 `600`，正文 `400/500`，按钮 `600`。
- 避免到处使用 `font-black` 或 `font-bold`，否则会显得粗糙和拥挤。

## D. 布局规则

- 左侧 Create Form 保持约 `320px`，优先承载上传、Prompt、模型、参数、Generate。
- 中央 generation canvas / history stream 是主视觉。
- 每条 generation item 使用大视频画布 + 随行详情卡。
- detail card 不抢画布宽度，桌面下视频画布应明显大于详情卡。
- 右侧不要再恢复完整 Saved History list。
- History / How it works 位于主画布上方。
- 失败 / NSFW / refunded / stale 使用黑色大卡片，不用空白卡。
- hover 时才显示辅助操作，默认状态保持干净。

## E. 组件风格建议

### TopBar

- 保持轻量导航，不要增加过厚按钮。
- active / hover 使用 `action orange`，不要粉色或蓝紫色。
- 品牌 logo 后续优先使用 SVG/S mark，当前文字品牌可保留。

### Left Create Form

- 卡片更圆润，但边框要克制。
- 输入框背景使用 `surface/elevated`，避免纯黑硬块。
- Prompt / upload / params 不要像后台表单堆叠。
- 主要操作只有 Generate 一个强按钮。

### Model Card / ModelSelector

- 模型 logo 使用统一尺寸，例如 `20px` 或 `24px`。
- 当前模型行保持紧凑，模型描述最多一行。
- 下拉列表内部滚动，不撑高左栏。

### Params Chips

- chip 高度稳定，中文和英文都不能挤压。
- Duration slider / Ratio / Quality popover 使用深色浮层和橙色焦点。
- 不要回退原生 select。

### Generate Button

- 使用 `#FFB44D` 作为主按钮。
- 文案和 credits 保持清楚，禁用态降低对比即可。
- 不要做横跨主画布的大条按钮。

### Generation Canvas

- 大视频画布是页面主角。
- 成功视频使用 `object-contain`。
- 失败/敏感/退款/过期状态使用黑色大卡片，错误详情截断，更多信息放在详情卡。
- hover 操作使用轻量圆形图标按钮。

### Output Detail Card

- 信息密度高但不要像后台表格。
- prompt 要 line clamp，不撑爆。
- reference thumbnails 尺寸统一，点击行为清楚。
- params chips 更轻，不要强边框。
- 不显示 Hide / 隐藏，避免误操作。

### History Filters

- 放在中央 History 流顶部。
- active 使用橙色，count 使用 muted 文本。
- 不要放回右侧详情卡。

### How It Works

- 主画布内的大教程面板。
- 使用简短步骤和 tips，不要大段说明。
- 后续可加入品牌视觉素材，但不要复制参考站图片。

### Popovers / Dropdowns

- 必须深色、贴近触发 chip、z-index 清楚。
- 内部滚动不能误触关闭。
- hover/active 统一橙色，不要粉色。

### Media Thumbnails

- 图片/视频/音频卡尺寸稳定。
- role、ready、token label 不要堆满图片。
- 默认干净，hover 才出现更多操作。

## F. 禁止事项

- 不要粉色 hover/active。
- 不要后台表格感。
- 不要把右侧再改成完整 Saved History 列表。
- 不要让详情卡抢中央画布宽度。
- 不要让参数 popover 漂移。
- 不要把 prompt/reference 操作做成大按钮堆叠。
- 不要改 generate payload。
- 不要改后端。
- 不要改 upload API。
- 不要改 PromptBox / `@` parser。
- 不要改 polling / retry / history merge 主逻辑。

## G. 品牌资产建议

建议后续补充以下品牌素材：

- `public/brand/shadowedge-logo.svg`
- `public/brand/shadowedge-mark.svg`
- 深色版 logo
- 浅色版 logo
- 模型 logo SVG 版本

当前模型 PNG 资产路径：

- `public/model-icons/seedance.png`
- `public/model-icons/kling.png`
- `public/model-icons/veo.png`
- `public/model-icons/wan.png`
- `public/model-icons/grok.png`
- `public/model-icons/hailuo.png`
- `public/model-icons/gpt-image-2.png`

## H. 后续拆分建议

1. `UI-Polish-1`: 统一颜色、字体、圆角、按钮、chip。
2. `UI-Polish-2`: Generation canvas + detail card 高级感细化。
3. `UI-Polish-3`: ModelSelector / params / UploadBox 精修。
4. `UI-QA-2`: 1280px / 1440px / 中文 / 英文截图回归。
