# Video Workspace 迁移上下文

本文件是 ShadowEdge 新版 Next.js Video Workspace 的固定迁移上下文。后续每次处理 `/workspace/video` 相关任务前，先阅读本文件，再进入具体代码。

## 1. 项目路径

- 新版 Next 项目：`C:\Users\WEll\Documents\shadowedge-web-next`
- 旧版 HTML 工作区：`C:\Users\WEll\Documents\shadowedge-workspace`
- 后端 API 项目：`C:\Users\WILL\Documents\shadowedge-api`

## 2. 旧版权威来源文件

- `C:\Users\WEll\Documents\shadowedge-workspace\js\se-models.js`
  - 旧版模型规则、duration、ratio、quality、credits、upload slots 的主要来源。
- `C:\Users\WEll\Documents\shadowedge-workspace\js\se-upload.js`
  - 旧版上传、reference media、`@` token、slot、local assets、start/end frame 逻辑来源。
- `C:\Users\WEll\Documents\shadowedge-workspace\js\se-video-generate.js`
  - 旧版生成 payload、任务提交、polling、错误处理来源。
- `C:\Users\WEll\Documents\shadowedge-workspace\js\se-history.js`
  - 旧版 history、server/local merge、download/delete/reuse、safe render 来源。
- `C:\Users\WEll\Documents\shadowedge-workspace\js\se-config.js`
  - 旧版 API endpoint / config 来源。
- `C:\Users\WEll\Documents\shadowedge-workspace\video-workspace.html`
  - 旧版页面结构、DOM、UI 位置参考。

## 3. 后端权威来源文件

- `C:\Users\WILL\Documents\shadowedge-api\routes\video.js`
  - 当前后端 `/api/video/generate`、status、history 等 video route 的主要入口。
- `C:\Users\WILL\Documents\shadowedge-api\routes\internal-api.js`
  - 如需核对 `/api/internal/video/generate` 兼容入口，优先检查此文件。
- `C:\Users\WILL\Documents\shadowedge-api\routes\public-api.js`
  - 如需核对 public video generate payload 或兼容字段，检查此文件。
- `C:\Users\WILL\Documents\shadowedge-api\services\higgsfield-video-service.js`
  - Higgsfield provider adapter、provider payload、模型参数映射、特殊限制来源。
- `C:\Users\WILL\Documents\shadowedge-api\services\seedance-unified-service.js`
  - Seedance provider payload、duration / ratio / resolution / audio 字段支持来源。
- `C:\Users\WILL\Documents\shadowedge-api\services\wavespeed-video-service.js`
  - WaveSpeed / Wan 等 provider payload 和参数支持来源。
- `C:\Users\WILL\Documents\shadowedge-api\config\video-provider-map.js`
  - providerModel、provider routing、模型别名和后端映射来源。

后端文件用于确认 generate payload 字段、providerModel 映射、duration / ratio / resolution / mode 是否真实支持。前端 UI 不能显示后端不支持的参数。不要凭空猜后端参数。

## 4. 新版 Next 主要迁移目标文件

- `src/components/video/VideoWorkspace.tsx`
  - Video Workspace 总装配、model / params / media / generation 状态入口。
- `src/components/video/ModelSelector.tsx`
  - 模型选择 UI 和模型列表展示。
- `src/components/video/VideoParamsPanel.tsx`
  - Duration / Ratio / Quality / Audio 等参数控件。
- `src/components/video/UploadBox.tsx`
  - 左侧 Upload media 入口、上传触发、drawer anchor。
- `src/components/video/ReferenceMediaTray.tsx`
  - 已选 reference media 展示、role、preview、remove、insert token 入口。
- `src/components/video/MediaPickerDrawer.tsx`
  - floating asset drawer、upload area、media grid、selected / Add selected 流程。
- `src/components/video/PromptBox.tsx`
  - Prompt textarea、`@` mention 菜单、missing warning。
- `src/components/video/HistoryPanel.tsx`
  - Server history、本轮任务、filters、retry、history card。
- `src/components/video/ResultViewer.tsx`
  - Latest output / processing / success / failed preview canvas。
- `src/hooks/useVideoGeneration.ts`
  - generate submit、payload assembly、retry、credits refresh、active guard。
- `src/hooks/useTaskPolling.ts`
  - task polling、success/failed/long-running 状态更新。
- `src/hooks/useCredits.ts`
  - credits 拉取和刷新。
- `src/hooks/useAuthSession.ts`
  - 登录态、当前用户和 token 读取。
- `src/lib/video/videoModelRules.ts`
  - 新版 video model rules 规则层。
- `src/lib/video-api.ts`
  - video API wrapper、upload / generate / status / history normalize。
- `src/lib/video-mentions.ts`
  - `@图1` / `@视频1` / `@音频1` token 和 media-aware prompt helper。
- `src/lib/media-assets.ts`
  - local media assets / drawer 可复用媒体资产。
- `src/lib/upload-rules.ts`
  - 上传校验、类型、大小、数量等规则。
- `src/types/video.ts`
  - video task、media、params、history 等类型定义。

## 5. 当前已完成阶段

- F1 已完成：Reference media card、Duration slider、Ratio / Quality popover 等 UI 修复。不要重复改同一批 UI 细节，除非用户明确指出回归。
- F2-A 已完成：`src/lib/video/videoModelRules.ts` 规则层已建立。
- F2-B 已完成：参数面板已接入模型规则。
- F2-B.1 已完成：Seedance 参数曾做临时校准。
- F2-B.3 已完成：已从旧版和后端初步迁移更多模型规则。

下一步应该是 F2-C，但必须基于 `videoModelRules.ts` 和旧版/后端权威文件继续做，不能猜。

## 6. 后续阶段规划

- F2-C：上传 / reference media 限制接入。
  - 基于 `videoModelRules.ts` 的 `uploadSlots`、`supportedMediaTypes`、`maxReferences`、start/end frame 能力，接入 UploadBox / MediaPickerDrawer / ReferenceMediaTray。
- F3：上传 / asset drawer 细节。
  - 补齐 local assets、draft restore、unsupported、generated-result-as-reference 限制、drawer tabs、Add selected、失败单卡状态。
- F4：`@` token 结构化增强。
  - mediaId 绑定、删除/重排后编号不乱、token 回填、missing 状态稳定、prompt plain text 与 media-aware prompt 双轨。
- F5：history / latest output 稳定性。
  - server/local merge、safe render、download/delete/reuse、failed shortcut、long-running、成功后停止 polling、失败 retry。
- F6：video i18n。
  - 迁移旧版 video/common 字典，覆盖 upload、status、history、model guide、failed/active jobs。
- F7：生产域名和上线回归。
  - `app.shadowedgeai.com`、Vercel env、CORS、auth redirect、token refresh、upload/generate/history 全链路检查。

## 7. 每次 Codex 开工规则

- 每次 video workspace 任务开始前，先读本文件。
- 涉及模型规则时，先读：
  - `src/lib/video/videoModelRules.ts`
  - `C:\Users\WEll\Documents\shadowedge-workspace\js\se-models.js`
  - `C:\Users\WILL\Documents\shadowedge-api\config\video-provider-map.js`
  - 对应后端 provider service。
- 涉及上传 / reference 时，先读旧版 `se-upload.js`，再改新版 `UploadBox` / `ReferenceMediaTray` / `MediaPickerDrawer`。
- 涉及 generate payload 时，先读旧版 `se-video-generate.js` 和后端 generate route/service。
- 涉及 history 时，先读旧版 `se-history.js`。
- 不确定就输出“未找到/需确认”，不要编造。
- 不要顺手扩大范围。
- 不要改后端，除非任务明确要求。
- 不要改 generate payload，除非任务明确要求。
- 每轮必须输出修改文件、是否改业务逻辑、检查结果。

## 8. 不要乱动的高风险区域

- `generateVideo()` payload 字段结构和后端兼容字段。
- auth/token/CORS、sign-in、refresh token、logout。
- upload API 请求字段和返回 normalize。
- history normalize、server/local merge、retry 原始参数复用。
- `@` token parser 和 media-aware prompt。
- model rules 中不确定的 provider 参数。
- 旧 HTML 项目和后端业务逻辑，除非任务明确要求。
