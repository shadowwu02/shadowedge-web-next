# Video Remake Beta Status

Last updated: 2026-06-10

This document summarizes the current Video Remake Beta state for internal and small customer testing. It intentionally avoids environment values, keys, tokens, cookies, and sessions.

## 1. 当前 Beta 结论

- Video Remake 已达到内部 Beta 测试标准。
- 可以开放给内部团队和小范围客户试用。
- 暂不建议开放大规模公开测试。
- 暂不建议客户一上来测试长片或 1-5 分钟素材。
- 暂不建议现在做 stitch/export 或自动拼接。
- 当前核心定位是：短剧片段反推、本地化分镜、逐镜头生成。

## 2. 当前支持的视频长度

- 推荐测试素材：5-30 秒。
- `single_clip`：3-60 秒。
- `full_film`：最多 120 秒 / 2 分钟。
- 超过 120 秒的视频应留到后续 batch/queue 版本开放。
- 当前不建议直接测试 1-5 分钟长片。

## 3. 已完成能力

- Source video upload。
- Source video remove / replace。
- Source video 选择后显示 `Ready to analyze / 已准备好分析`。
- `ffprobe` metadata 分析。
- Keyframe extraction。
- B.AI storyboard。
- Storyboard display。
- Keyframe thumbnails。
- Storyboard draft restore。
- `Use prompt`。
- 单个 shot 的 `Generate shot`。
- `Generate all shots` 串行队列。
- Pause / Continue / Skip / Cancel。
- `Retry shot`。
- `Retry all failed`。
- `Remake Outputs / 反推生成结果`。
- History restore。
- Queue draft restore。
- Active job recovery。
- Failure reason display。
- Higgsfield Seedance provider。
- Credits / refund safety preflight。

## 4. 已验证真实链路

- B.AI base64 keyframe vision 已真实成功。
- `meta.vlmProvider=bai`。
- `meta.mock=false`。
- 真实短剧素材 QA 综合约 8/10。
- 单 shot 真实生成成功。
- 小规模 queue 真实 QA 部分通过。
- Shot 1 success / Shot 2 failed 时，queue paused 行为正常。
- Full reload 后，history/meta restore 可以恢复 Remake shot success/failed。
- D3-D.1-QA 已通过：
  - history API 返回 `meta`。
  - Shot 1 刷新后恢复 success。
  - `Open result` / `Retry shot` / `Use prompt` 显示正确。
  - `Generate all` 会跳过已 success shot。
- `Remake Outputs / 反推生成结果` 正确显示 Remake history，不混入普通 Create Video。
- Source video/keyframes 不会进入 `references` / `mediaList` / generate payload。
- Higgsfield CLI / Seedance 真实 provider 可用。
- 服务器 `aspect_ratio=Auto` 问题已修复并部署。
- 后端 provider safety 已补：
  - Higgsfield CLI readiness preflight。
  - Async submit failure immediate fail/refund。

## 5. 当前限制

- 当前不做 stitch/export。
- 当前不做多 shot 自动拼接。
- `Generate all shots` 是串行队列，不是并发队列。
- Running queue 刷新后不会自动继续，必须由用户手动 `Resume`，避免自动继续扣费。
- Public `image_url` 在本地环境可能失败，但 base64 fallback 可用。
- Storyboard draft 只保留 24 小时。
- Queue draft 只保留 24 小时。
- 不保存 source video 文件本体。
- 不保存 base64 keyframes。
- 不保存 key/token/cookie/session。
- B.AI 分镜质量取决于视频内容、画面清晰度、动作/站位信息和可见关键帧。
- 非对话片段可能会生成偏提示驱动的 dialogue cue。
- 生产环境需要保持 Higgsfield CLI 登录态有效。
- 客户测试时不要连续重复点击 `Generate all shots`。

## 6. 客户测试建议

- 使用 5-30 秒短视频。
- 优先选择 1-3 个明显镜头的素材。
- 优先选择 1-2 个人物的素材。
- 选择场景清晰、主体清楚、动作/表情/站位明确的素材。
- 不建议一上来测试 1-5 分钟长片。
- 不建议一次性 `Generate all shots` 很多镜头。
- 建议先 `Analyze source video`，确认 AI storyboard 后，再单独 `Generate shot`。
- 单 shot 成功后，再试 `Generate all shots` 生成 2-3 个镜头。
- 如果失败，先查看错误提示，不要连续重复点击。

## 7. 客户测试清单

- [ ] 登录账号。
- [ ] 打开 Video Workspace。
- [ ] 切到 Remake / 短剧反推。
- [ ] 上传 source video。
- [ ] 确认显示 `Ready to analyze / 已准备好分析`。
- [ ] 点击 `Analyze source video / 分析原视频`。
- [ ] 确认 AI storyboard provider 为 B.AI。
- [ ] 确认 storyboard 内容不是 fallback/mock。
- [ ] 刷新页面，确认 storyboard draft 恢复。
- [ ] 点击单个 `Generate shot`。
- [ ] 确认生成成功后显示 `Open result`。
- [ ] 确认 `Remake Outputs / 反推生成结果` 显示结果。
- [ ] 测试 `Retry shot`。
- [ ] 测试 `Generate all shots` 生成 2-3 个镜头。
- [ ] 如果 queue failed，确认队列 paused。
- [ ] 测试 skip / continue。
- [ ] 测试 `Retry all failed`。
- [ ] 刷新页面，确认 history restore 正常。
- [ ] 测试 `Clear draft`。
- [ ] 测试 remove source video。

## 8. 风险和保护

- 每个 shot 独立扣 credits。
- `Generate all shots` 串行执行，失败后暂停。
- Higgsfield CLI readiness 失败会在创建 DB job / 扣 credits 前拦截。
- Provider async submit failure 已有 immediate fail/refund。
- 后端仍应持续观察 durable refund retry；这可以作为后续安全加固项。
- 客户测试时应避免重复点击，尤其是 `Generate all shots`。
- 失败时记录 jobId 和错误信息，便于定位 provider、network、credits、auth 或 payload 问题。
- 不要让客户测试超长视频。
- 不要把单个 shot 失败理解为全部系统失败，应优先查看具体错误码和错误提示。

## 9. 运行和部署注意

- 线上前端：`https://shadowedge-web-next.vercel.app/workspace/video`
- 线上 API：`https://api.shadowedgeai.com`
- 后端实际服务器目录：`/var/www/shadowedge-api-git`
- PM2 app：`shadowedge-api`
- Higgsfield CLI must be logged in。
- `seedance_2_0` must be available。
- Aspect ratio 必须传小写 `auto` 或合法比例：`16:9`、`9:16`、`4:3`、`3:4`、`1:1`、`21:9`。
- 不要使用 `/var/www/shadowedge-api` 作为实际 git 部署目录。
- 服务器拉取代码后需要执行：`pm2 restart shadowedge-api --update-env`。

## 10. 下一步建议

1. Beta 小范围客户测试。
2. 收集失败案例，包括 jobId、错误提示、素材长度、模型参数和用户操作路径。
3. D4-Audit：stitch/export 方案审计。
4. D4-A：下载/导出 shot list。
5. D4-B：可选拼接/export。
6. 后续再考虑长片 batch。

## 11. 禁止事项

- 不要读取 `.env.bak`。
- 不要输出 key/token/cookie/session。
- 不要提交 `.env` / `.env.local`。
- 不要直接公开给大量用户。
- 不要让客户连续重复点击 `Generate all shots`。
- 不要把 source video/keyframes 当 references 自动塞入 generate payload。
- 不要绕过 history/polling/credits 主链路。
- 不要直接做长片批量。
- 不要现在做自动拼接。
