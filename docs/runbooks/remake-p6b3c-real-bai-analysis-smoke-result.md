# Remake P6-B3C Real B.AI Analysis Smoke Result

Date: 2026-07-09

Scope: docs-only result record for one approved single-clip real B.AI/VLM Remake reverse-analyze smoke. This document does not change app code, deploy, push, run PM2, execute SQL, modify env/database/schema/provider/payment/R2/Supabase/admin tokens, call provider/VLM/B.AI/OpenAI/Higgsfield again, Generate, upload again, checkout, bill, credit, refund, or submit `backups/` or `outputs/`.

## 1. Purpose

Record the P6-B3C single-clip real B.AI/VLM reverse-analyze smoke result.

The purpose of this smoke was to verify that the production Remake single-clip analysis path can use real B.AI/VLM analysis instead of mock, fallback, or fixed-template output.

## 2. Baseline

Frontend `origin/main`:
- `9d6ff19493998a6c81475b18f4e37b0c6f08ced0`
- `docs: approve remake real bai analysis smoke plan`

Backend:
- `0c77a5516962b45f147e7a990c61ba0bd70bd69e`

Admin:
- `545e4da17f06c018ec4563fba889ad386dd5aab1`

Relevant preceding phases:
- P6-B1 real VLM to Video Workspace draft bridge plan.
- P6-B2 Remake shot to Video Workspace draft handoff, sealed and deployed.
- P6-B3 approval audit for a single controlled real B.AI/VLM analysis smoke.

## 3. Approved Smoke Scope

Approved for this P6-B3C execution only:
- One single-clip Remake real B.AI/VLM analysis.
- Expected endpoint path:
  - `/api/internal/video/reverse-analyze`
- One approved upload for the test video, because no existing short safe asset was available.
- One click on the Remake `Analyze source video` / `分析原视频` action.

Explicitly not approved:
- No Generate.
- No `/api/video/generate`.
- No long-video analyze path.
- No `/api/remake/analyze-long-video`.
- No checkout, billing, credits, refund, or payment action.
- No provider video generation submit.
- No backend/Admin deploy.
- No PM2 restart.
- No SQL.
- No env/schema/provider/payment/R2/Supabase/admin token change.
- No code change, commit, or push during the smoke.

## 4. Test Asset

Test asset:
- Filename: `短剧1.MP4`
- Uploaded path: `/uploads/videos/1783611901235_61kebofx_1.MP4`
- Size: `2.4 MB`
- Duration: `12.2s`
- MIME: `video/mp4`
- Status: ready / `已就绪`
- Use: internal test-only single-clip Remake smoke asset.

The original two-minute-plus source video was not used directly. The approved smoke used the selected short clip shown in the Remake panel.

## 5. Execution

Execution performed:
- Clicked `分析原视频` exactly once.
- One approved upload occurred for `短剧1.MP4`.
- One real B.AI/VLM reverse analysis occurred.
- No Generate action was clicked.
- No retry was performed.
- No long-video/full-episode analysis was started.

## 6. Result

Result: PASS.

The production UI displayed:

```text
AI 分析完成。 AI 分镜服务：B.AI
```

Generated keyframes:

```text
/uploads/remake-frames/remake_1783611903659_vdcbk4xd/group_1_001.jpg
/uploads/remake-frames/remake_1783611903659_vdcbk4xd/group_1_002.jpg
/uploads/remake-frames/remake_1783611903659_vdcbk4xd/group_1_003.jpg
```

No fallback/mock badge was observed.

Storyboard content was source-specific:
- Male and female subjects.
- Office/lobby scene.
- Shot changes across the clip.
- Dialogue and emotion changes.
- Source video metadata shown as `12.2s`, `848x624`, `30fps`, `h264`.

No generic western, finance, or fixed-template fallback content was observed.

## 7. Safety Results

Confirmed no:
- Generate.
- `/api/video/generate`.
- `/api/remake/analyze-long-video`.
- checkout, billing, credits, refund, or payment action.
- provider video generation submit.
- `Generate shot`.
- `Generate all shots`.
- `Retry shot`.
- `Retry all failed`.
- Shadow VLM raw audit exposure on the normal user-facing page.
- deploy.
- PM2 restart.
- SQL.
- env or code change.
- commit or push during the smoke.

PM2 recent log review did not show B.AI failure, fallback, Higgsfield submit, billing, or related smoke errors. Only an unrelated old keyframe cleanup line was observed.

## 8. UI State

Generation controls remained absent:
- `Generate shot` absent.
- `Generate all shots` absent.
- `Retry shot` absent.
- `Retry all failed` absent.

Draft-only actions were visible:
- `使用提示词`
- `带入视频工作区`

These actions remain draft-only. This smoke does not approve direct Remake generation.

## 9. Limitations

Observed response fields were validated through production UI state and sanitized observable evidence, not by publishing raw provider payload.

This smoke validates only:
- Single-clip real B.AI/VLM Remake analysis.
- The production single-clip Remake flow for one approved internal test asset.

This smoke does not validate:
- Long-video real VLM worker.
- Full Episode real provider analysis.
- Selected-shot generation.
- `Generate all shots`.
- Any automatic Remake queue.
- Credits/refund/status behavior for Remake generation.

## 10. Conclusion

P6-B3C succeeded.

Real B.AI/VLM single-clip Remake analysis is proven on the production frontend/backend for the approved test clip.

The safe user-facing next action remains P6-B2 draft bridge only:
- Use Remake analysis output as a draft.
- Route to `/workspace/video`.
- Let the user manually review.
- Do not auto Generate.

Direct Remake generation remains not approved.

Recommended next steps:
1. Commit this P6-B3C safety/result runbook.
2. Create a P6-B3 phase seal.
3. Consider P6-B4 selected-shot generation controlled test only after a separate credits/refund/status/reconciler safety review and explicit approval.

## 11. Carried-Forward Prohibitions

Do not:
- Make Shadow VLM raw audit user-facing.
- Restore `Generate shot`.
- Restore `Generate all shots`.
- Restore `Retry shot`.
- Restore `Retry all failed`.
- Auto Generate.
- Call `/api/video/generate` from Remake.
- Start full automatic queues.
- Proceed to long-video real VLM without separate approval.
- Treat this smoke as approval for selected-shot generation or full Remake generation.

## 12. This Round Confirmation

This result-recording round is docs-only.

No app code, backend, Admin, env, database, schema, provider, payment, R2, Supabase, admin token, deploy, PM2, SQL, provider/VLM/B.AI/OpenAI/Higgsfield call, Generate, upload, checkout, billing, credits, refund, commit, push, `backups/`, or `outputs/` action is authorized by this document.
