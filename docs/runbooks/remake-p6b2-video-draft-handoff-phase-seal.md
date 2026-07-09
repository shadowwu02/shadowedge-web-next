# Remake P6-B2 Video Draft Handoff Phase Seal

Date: 2026-07-09

Scope: docs-only phase seal for P6-B2 Remake shot to Video Workspace draft handoff. This document does not change app code, deploy, push, run PM2, execute SQL, modify env/database/schema/provider/payment/R2/Supabase/admin tokens, call provider/VLM/B.AI/OpenAI/Higgsfield, Generate, upload, checkout, bill, credit, or submit `backups/` or `outputs/`.

## 1. Purpose

Phase seal for P6-B2 Remake shot to Video Workspace draft handoff.

P6-B2 seals only the draft handoff bridge from a Remake storyboard shot into `/workspace/video`. It does not approve direct Remake generation or real B.AI/VLM smoke.

## 2. Final Baseline

Frontend `origin/main`:
- `9589eb91331601f2e15a5c86a8addadfa00ee323`
- `docs: record remake video draft handoff deploy`

Backend unchanged:
- `0c77a5516962b45f147e7a990c61ba0bd70bd69e`

Admin unchanged:
- `545e4da17f06c018ec4563fba889ad386dd5aab1`

Relevant commits:
- P6-B1 plan: `11d71d1514509783fd27a192fdbe2e6a284b6921`
- P6-B2 implementation: `b88353636e721a68dece000bec52a05812965764`
- P6-B2 safety review: `30033b735dfb50ca640dedb2fcd997d660500821`
- P6-B2 deploy approval: `5bee1356d6415a7965a2cc6115f44849b2d81b56`
- P6-B2 deploy result: `9589eb91331601f2e15a5c86a8addadfa00ee323`

## 3. Phase Scope Sealed

Sealed P6-B2 behavior:
- A Remake storyboard shot can be sent to `/workspace/video` as a draft.
- Button:
  - `Use in Video Workspace`
  - `带入视频工作区`
- localStorage key:
  - `shadowedge_remake_video_handoff_v1`
- route:
  - `/workspace/video?from=remake-shot`
- `VideoWorkspace` consumes the handoff once.
- The user must manually click the normal Video Workspace Generate button if they choose to generate.

This phase seals a draft bridge only. It does not start generation and does not call a provider.

## 4. Explicitly Not Sealed / Not Approved

Not sealed and not approved:
- Full auto Remake.
- `Generate all shots`.
- `Generate shot`.
- `Retry all failed`.
- `Retry shot`.
- Shot queue restoration.
- Provider rerun or provider trigger buttons.
- User-facing Shadow VLM.
- Full Episode real provider.
- Real B.AI smoke.
- Backend/API/Admin/provider/payment/database change.
- Upload, billing, credits, refund, or checkout.

These items require separate design, safety review, approval, and smoke.

## 5. Implementation Summary

Helper added:
- `src/lib/video/remakeShotVideoHandoff.ts`

Remake panel action added:
- `src/components/video/remake/RemakeStoryboardPanel.tsx`

Video Workspace consume behavior added:
- `src/components/video/VideoWorkspace.tsx`

i18n copy added:
- `src/i18n/dictionary.ts`

The implementation is frontend-only and routes users through the existing `/workspace/video` draft surface.

## 6. Safety Summary

Safety confirmations:
- Frontend-only implementation.
- No backend changes.
- No provider/VLM/B.AI/OpenAI/Higgsfield call.
- No Generate.
- No upload.
- No billing/credits/refund/checkout.
- No SQL/env/schema/token change.
- Unsafe URL protocols are rejected.
- Sensitive query params are stripped or rejected.
- Handoff is consumed once and removed.
- Existing draft state is preserved.
- Hidden Remake generation controls remain hidden.

URL safety:
- Rejects `blob:`, `data:`, `file:`, and `javascript:`.
- Rejects localhost-style targets.
- Strips sensitive token, secret, signature, authorization, and signed URL params.

Draft safety:
- Existing prompt is preserved and Remake prompt is appended when needed.
- Duplicate references are deduped.
- Reference max-slot behavior is respected.
- Invalid handoffs are ignored with a safe notice.
- Refresh does not reinject a consumed handoff.

## 7. Checks Passed

Checks passed during implementation, safety review, and deploy smoke:
- `npx tsc --noEmit --pretty false`
- `npm run build`
- `git diff --check`
- changed-file eslint
- source eslint excluding `outputs/**`

Known lint caveat:
- Full `npm run lint` was blocked by existing `outputs/.../.chrome-profile...` files.
- This was unrelated to P6-B2 source files.
- `outputs/` must not be submitted as a workaround.

Existing Prompt Studio `<img>` warnings were already known and unrelated.

## 8. Deployment Summary

Deployed/current frontend commit:
- `5bee1356d6415a7965a2cc6115f44849b2d81b56`

Deploy method:
- Vercel auto-deploy from `origin/main`.
- No manual deploy command was run.

Target:
- `https://shadowedge-web-next.vercel.app/workspace/video`

Observed Vercel deployment asset id:
- `dpl_8ELBDwJh1rpBi3tQLtWjf5wupTp2`

Production bundle included:
- `shadowedge_remake_video_handoff_v1`
- `from=remake-shot`

No backend deploy, Admin deploy, PM2 restart, SQL, env, provider, payment, R2, Supabase, or token action was performed.

## 9. Smoke Summary

Production smoke results:
- `/workspace/video` loaded.
- Remake panel loaded.
- `Generate shot` absent.
- `Generate all shots` absent.
- `Retry shot` absent.
- `Retry all failed` absent.
- Normal Generate button present but not clicked.
- `/assets` loaded.
- Reference tray/video draft UI visible.
- Account menu overlay regression passed.
- Invalid handoff route safely showed invalid handoff notice.
- Invalid handoff did not start Generate.

Network/scope safety confirmed no:
- upload
- provider/VLM/B.AI/OpenAI/Higgsfield call
- billing/credits/refund/checkout
- unexpected backend write from handoff
- Generate

## 10. Limited Coverage Note

A live real Remake shot click was not covered because the production browser had no existing Remake storyboard shot.

No upload, no analysis, no fabricated localStorage handoff, and no provider call were performed to stay within smoke boundaries.

Valid handoff append/reference/dedupe behavior is covered by:
- implementation review
- safety review
- type/build checks
- production bundle evidence

This limitation should carry forward into P6-B3/P6-B4 planning. A future real-shot smoke must remain Admin/test only unless separately approved.

## 11. Final Result

P6-B2 phase is sealed with limited live valid-shot-click coverage.

The seal applies only to:
- Remake shot to Video Workspace draft handoff behavior.

The seal does not approve:
- real B.AI analysis smoke
- direct Remake generation
- full auto Remake
- provider triggers
- upload/billing/credits/refund behavior from Remake

P6-B3 real B.AI analysis smoke remains separate and Admin/test only.

## 12. Next Recommended Phase

Recommended next:
- P6-B3: real B.AI analysis smoke, Admin/test only, separately approved.
- P6-B4: selected-shot generation controlled test, only after P6-B3 and credits/refund/status review.

Do not restore direct user generation controls yet.

Do not start Generate all shots or an automatic queue until credits, refund, provider failure, and reconciler safety are proven and separately approved.

## 13. Hard Prohibitions Carried Forward

Do not:
- Make Shadow VLM user-facing.
- Restore `Generate shot`.
- Restore `Generate all shots`.
- Restore `Retry shot`.
- Restore `Retry all failed`.
- Auto Generate.
- Trigger provider/upload/billing from Remake handoff.
- Change backend/env/schema/provider/payment without separate approval.
- Submit `backups/`.
- Submit `outputs/`.

Future Remake work must preserve the Customer Feedback v1-D hidden-generation-control boundary unless a later phase explicitly approves a controlled change.
