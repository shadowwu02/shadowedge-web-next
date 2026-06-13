# ShadowEdge Beta 客户测试包

这份测试包用于内部和小范围客户 Beta 验证，目标是快速确认 Image / Video / Remake 的核心体验是否稳定，并统一收集可定位的问题反馈。

## 1. 测试范围

当前可以测试：

- Image text-to-image
- Image image-to-image
- Video Create
- Video References / @ Elements
- Video Generate shot
- Remake 短剧反推 Beta
- History / Open / Download

暂不建议测试：

- 长片 Remake
- 自动拼接 / export
- 大批量 Generate all
- 高并发
- 1-5 分钟长视频直接反推
- 重复快速点击生成

## 2. 测试素材建议

Image：

- 清晰产品图 / 人像图 / 场景图
- 参考图建议 1-3 张
- 不建议一次上传很多参考图

Video：

- 5-10 秒优先
- 先用简单 prompt
- 如使用 references，先上传 1 张图或 1 个短视频

Remake：

- 5-30 秒短剧片段
- 1-3 个明显镜头
- 1-2 个人物
- 场景清晰、动作 / 站位明确
- 不建议长片

## 3. Image 测试流程

Checklist：

- [ ] 登录
- [ ] 进入 `/workspace/image`
- [ ] 切中文 / 英文确认文案
- [ ] 选择模型
- [ ] 选择比例
- [ ] 输入 prompt
- [ ] text-to-image 生成
- [ ] 上传参考图
- [ ] image-to-image 生成
- [ ] 查看 Latest Output
- [ ] 打开 / 下载
- [ ] 查看 History
- [ ] 刷新页面确认历史还在

注意：

- 如果失败，记录 jobId、错误提示、模型、是否有参考图、credits 前后。
- 不要连续重复点击 Generate。
- 如果错误提示与实际操作不符，请截图记录。

## 4. Video 测试流程

Checklist：

- [ ] 进入 `/workspace/video`
- [ ] 选择模型
- [ ] 上传图片 / 视频 / 音频 reference
- [ ] 点击 @ Elements 选择素材
- [ ] 确认 prompt 中插入 `@图1` / `@视频1` / `@音频1`
- [ ] 音频开关默认 ON
- [ ] 切换 resolution / duration 看积分变化
- [ ] 单次生成
- [ ] 查看 History / Latest Output
- [ ] Open / Download

注意：

- 不要连续重复点击 Generate。
- 如果失败，记录 jobId、错误提示、模型和参数。
- 如果 references 或 @ token 显示异常，请同时记录上传素材类型和数量。

## 5. Remake 测试流程

Checklist：

- [ ] 进入 Video Workspace
- [ ] 切到 Remake / 短剧反推
- [ ] 上传 source video
- [ ] 确认 Ready to analyze
- [ ] 点击 Analyze source video
- [ ] 查看 AI storyboard
- [ ] 单独 Generate shot
- [ ] 查看 Remake Outputs
- [ ] Retry shot
- [ ] 小规模 Generate all 2-3 shots
- [ ] 如果 queue failed，确认 paused
- [ ] Skip / Continue
- [ ] 刷新页面确认 restore
- [ ] Remove source video

注意：

- 不测试 1-5 分钟长片。
- 不测试自动拼接。
- 不连续重复点 Generate all。
- 如果队列失败，先记录错误提示，不要连续重试。

## 6. 反馈记录表

| 字段 | 示例 |
| --- | --- |
| 测试人 | 客户 A |
| 测试账号 email | [xxx@example.com](mailto:xxx@example.com) |
| 测试时间 | 2026-06-xx |
| 功能 | Image / Video / Remake |
| 输入素材长度 / 数量 | 10s / 1 image |
| 模型 | Seedream / Nano Banana / Seedance |
| 参数 | 16:9 / 720p / 5s |
| jobId | xxx |
| credits 前 | 100 |
| credits 后 | 98 |
| 结果 | 成功 / 失败 / 卡住 |
| 错误提示 | xxx |
| 是否刷新后恢复 | 是 / 否 |
| 截图 / 录屏 | 文件名 |
| 备注 | xxx |

## 7. 客户话术

我们现在开放小范围 Beta 测试，建议先用 5-30 秒短素材，不建议长片和批量高并发。测试中如果失败，请记录 jobId、错误提示、素材长度、模型和参数，方便我们定位。

建议先从单次生成开始：Image 先测 1 次 text-to-image 和 1 次 image-to-image；Video 先测 1 次单条生成；Remake 先 Analyze，再单独 Generate shot，最后再小规模测试 2-3 个 shots。

## 8. 安全提醒

- 不要上传敏感隐私素材。
- 不要连续重复点击生成。
- 不要测试超长视频。
- 不要把账号密码 / token 发给我们。
- 失败时发截图和 jobId 即可。
- credits 异常请记录前后余额。

## 9. 内部判定标准

P0：

- 无法登录
- 无法生成
- 扣费但无 job
- 扣费不退款

P1：

- 刷新丢结果
- history 不恢复
- 错误提示不可读
- 主按钮不可见

P2：

- 文案问题
- 视觉问题
- 小布局问题
- 个别状态提示不够清楚
