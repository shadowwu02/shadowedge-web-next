# Remake P6-B3 Real B.AI Analysis Smoke Phase Seal

Date: 2026-07-09

Scope: docs-only phase seal for the P6-B3 single-clip real B.AI/VLM Remake analysis smoke. This document does not change app code, deploy, push, run PM2, execute SQL, modify env/backend/Admin/database/schema/provider/payment/R2/Supabase/admin tokens, call provider/VLM/B.AI/OpenAI/Higgsfield again, click `分析原视频`, Generate, upload, checkout, bill, credit, refund, or submit `backups/` or `outputs/`.

## 1. Purpose

Seal P6-B3 single-clip real B.AI/VLM Remake analysis smoke.

P6-B3 confirms that the production single-clip Remake reverse-analyze path can use real B.AI/VLM analysis without restoring Remake generation controls or changing the P6-B2 draft-only boundary.

## 2. Final Baseline

Frontend `origin/main`:
- `3bcf3ee16161e001ae583b750f3152563a0917cf`
- `docs: record remake real bai analysis smoke`

Backend:
- `0c77a5516962b45f147e7a990c61ba0bd70bd69e`

Admin:
- `545e4da17f06c018ec4563fba889ad386dd5aab1`

Relevant documents:
- `docs/runbooks/remake-p6b3-real-bai-analysis-smoke-approval.md`
- `docs/runbooks/remake-p6b3c-real-bai-analysis-smoke-result.md`
- `docs/runbooks/remake-p6b2-video-draft-handoff-phase-seal.md`

## 3. What P6-B3 Proves

P6-B3 proves:
- Single-clip Remake reverse-analyze can use real B.AI/VLM on production.
- The production UI showed:

```text
AI 分析完成。AI 分镜服务：B.AI
```

- No fallback/mock badge was observed.
- Storyboard output was source-specific.
- Keyframes were generated.
- No western, finance, fixed-template, or generic fallback content was observed.

This proves real analysis for the controlled single-clip path only. It does not approve direct Remake video generation.

## 4. Test Asset

Test asset:
- Filename: `短剧1.MP4`
- Uploaded path: `/uploads/videos/1783611901235_61kebofx_1.MP4`
- Size: `2.4 MB`
- Duration: `12.2s`
- Status: `已就绪`
- Use: internal test-only asset.

The original two-minute-plus source video was not used directly. The sealed smoke used the approved short test clip shown in the Remake panel.

## 5. Scope Sealed

Sealed P6-B3 scope:
- One single-clip real B.AI/VLM Remake analysis smoke.
- One approved upload for the test asset.
- One click on `分析原视频`.
- No generation.

The sealed endpoint class is the single-clip reverse-analyze path:

```text
/api/internal/video/reverse-analyze
```

This phase seals only the proof that real B.AI/VLM analysis can work for the single-clip Remake path.

## 6. Safety Confirmed

Confirmed no:
- Generate.
- `/api/video/generate`.
- `/api/remake/analyze-long-video`.
- checkout, billing, credits, refund, or payment action.
- provider video generation submit.
- Shadow VLM raw audit user-facing exposure.
- `Generate shot`.
- `Generate all shots`.
- `Retry shot`.
- `Retry all failed`.
- deploy.
- PM2 restart.
- SQL.
- env change.
- code change during the smoke.

The Remake generation controls remained hidden:
- `Generate shot` absent.
- `Generate all shots` absent.
- `Retry shot` absent.
- `Retry all failed` absent.

## 7. Not Sealed / Not Approved

Not sealed and not approved by P6-B3:
- Long-video real VLM worker.
- Full Episode real provider.
- Selected-shot generation.
- `Generate all shots`.
- Automatic Remake queue.
- Credits/refund/status behavior for Remake generation.
- User-facing Shadow VLM raw audit.
- Backend/Admin/env/schema/provider/payment changes.

These items require separate design, safety review, approval, execution, and result docs.

## 8. Relationship To P6-B2

P6-B2 remains the only safe user-facing next action:

```text
Remake output -> Video Workspace draft -> user manually reviews -> user manually clicks normal Generate if desired
```

P6-B3 does not change the P6-B2 draft-only boundary.

P6-B3 proves that Remake analysis can be real B.AI/VLM for the single-clip path, but it does not approve:
- automatic generation,
- direct Remake generation,
- provider-trigger buttons,
- shot queue restoration,
- billing/credits/refund behavior from Remake.

## 9. Recommended Next Phase

Recommended next phase:
- P6-B3D: long-video real VLM readiness audit for a two-minute video, docs/readiness only.

Only after P6-B3D is complete and explicitly approved:
- Run a long-video real analysis smoke.

Do not proceed directly to full auto generation.

Before P6-B4 selected-shot generation, create a separate safety review covering:
- feature flags,
- allowlists,
- credits,
- refund behavior,
- provider status polling,
- stuck-job closeout,
- reconciler behavior,
- Admin-only/test-only controls.

## 10. Stop / Prohibition Carried Forward

Do not:
- Restore `Generate shot`.
- Restore `Generate all shots`.
- Restore `Retry shot`.
- Restore `Retry all failed`.
- Auto Generate.
- Call `/api/video/generate` from Remake.
- Start full automatic queues.
- Run long-video real VLM without separate approval.
- Make Shadow VLM raw audit user-facing.
- Treat the P6-B3 smoke as approval for selected-shot generation or full Remake generation.

## 11. Final Result

P6-B3 is sealed.

The sealed conclusion is:
- Production single-clip Remake real B.AI/VLM analysis works for the approved internal test clip.
- P6-B2 remains the safe user-facing draft-only bridge.
- Direct Remake generation remains blocked until a separate controlled phase approves it.

## 12. This Round Confirmation

This phase-seal round is docs-only.

No app code, backend, Admin, env, database, schema, provider, payment, R2, Supabase, admin token, deploy, PM2, SQL, provider/VLM/B.AI/OpenAI/Higgsfield call, `分析原视频` click, Generate, upload, checkout, billing, credits, refund, commit, push, `backups/`, or `outputs/` action is authorized by this document.
