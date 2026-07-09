# Remake P6-B2 Video Draft Handoff Deploy Approval

Date: 2026-07-09

Scope: docs-only deploy approval package for P6-B2 Remake shot to Video Workspace draft handoff. This document does not change app code, deploy, push, run PM2, execute SQL, modify env/database/schema/provider/payment/R2/Supabase/admin tokens, call provider/VLM/B.AI/OpenAI/Higgsfield, Generate, upload, checkout, bill, credit, or submit `backups/` or `outputs/`.

## 1. Purpose

Deploy approval package for P6-B2 Remake shot to Video Workspace draft handoff.

This package approves only the main frontend deployment path for the P6-B2 draft handoff. It does not approve backend, Admin, provider, upload, billing, SQL, env, or PM2 actions.

## 2. Current Baseline

Main frontend:
- `origin/main`: `30033b735dfb50ca640dedb2fcd997d660500821`
- Latest docs commit: `docs: review remake video draft handoff safety`

Relevant commits:
- P6-B1 plan: `11d71d1514509783fd27a192fdbe2e6a284b6921`
- P6-B2 implementation: `b88353636e721a68dece000bec52a05812965764`
- P6-B2 safety review: `30033b735dfb50ca640dedb2fcd997d660500821`

Other repos remain unchanged for this approval:
- Backend remains `0c77a5516962b45f147e7a990c61ba0bd70bd69e`.
- Admin remains `545e4da17f06c018ec4563fba889ad386dd5aab1`.

## 3. Deploy Scope

Approved scope:
- Main frontend only.
- P6-B2 frontend draft handoff only.
- Standard main frontend deployment path only.

Not approved:
- No backend deploy.
- No Admin deploy.
- No VPS backend deploy.
- No PM2 restart.
- No SQL.
- No env, database, schema, provider, payment, R2, Supabase, or admin token change.

If the proposed deploy plan includes backend/API/Admin/VPS/PM2/env/SQL/provider/payment changes, stop immediately.

## 4. Product Scope

P6-B2 product behavior:
- A Remake storyboard shot can be sent to `/workspace/video` as a draft.
- Button copy:
  - `Use in Video Workspace`
  - `带入视频工作区`
- localStorage key:
  - `shadowedge_remake_video_handoff_v1`
- Route:
  - `/workspace/video?from=remake-shot`
- `VideoWorkspace` consumes the handoff once.
- The user must manually click the normal Video Workspace Generate button if they choose to generate.

P6-B2 is a bridge from Remake storyboard output to an editable Video Workspace draft. It is not a generation trigger.

## 5. Explicit Non-scope

This approval does not include:
- Automatic Generate.
- `Generate shot`.
- `Generate all shots`.
- `Retry shot`.
- `Retry all failed`.
- Remake shot queue restoration.
- Provider rerun or provider trigger buttons.
- Upload.
- Billing, credits, refund, or checkout.
- Shadow VLM user-facing exposure.
- Raw provider, VLM, or Shadow audit exposure.
- Backend, API, Admin, database, schema, payment, provider, R2, Supabase, or env changes.

The normal `/workspace/video` Generate button remains available but is not clicked during deploy smoke.

## 6. Pre-deploy Checks Already Passed

Checks passed during implementation and safety review:
- `npx tsc --noEmit --pretty false`
- `npm run build`
- `git diff --check`
- Changed-file eslint
- Source eslint excluding `outputs/**` passed with only existing Prompt Studio `<img>` warnings

Known unrelated lint caveat:
- Full `npm run lint` was blocked only by existing `outputs/account-menu-global-layer-fix/.chrome-profile...` browser profile files.
- That lint blocker is unrelated to P6-B2 source files and must not be fixed by submitting `outputs/`.

## 7. Approved Deploy Path

Approved path:
- Standard main frontend deployment only.
- If this repo uses Vercel automatic deployment from `origin/main`, confirm the deployment uses the current frontend `main`.
- If Gold-Tide/NewBrand frontend deploy is requested later, it must be separately approved and still remain frontend-only.

Do not:
- Deploy backend.
- Deploy Admin.
- SSH to production backend.
- Restart PM2.
- Touch env files or deployment secrets.
- Run SQL.
- Call providers.
- Trigger Generate/upload/billing/checkout/credits.

## 8. Post-deploy Smoke Plan

Smoke must be draft-only. Do not click Generate.

Required smoke:
1. Open `/workspace/video` and confirm the page loads normally.
2. Open the Remake UI/panel.
3. Confirm shot generation controls remain hidden:
   - `Generate shot` absent
   - `Generate all shots` absent
   - `Retry shot` absent
   - `Retry all failed` absent
4. Confirm existing `Use prompt` remains.
5. Confirm a usable Remake shot shows:
   - `Use in Video Workspace`
   - `带入视频工作区`
6. Click the draft-only action.
7. Confirm the browser routes to `/workspace/video?from=remake-shot`.
8. Confirm Video Workspace shows the draft notice.
9. Confirm prompt is appended or preserved according to implementation.
10. Confirm existing draft prompt/model/params/references are not unexpectedly overwritten.
11. Confirm safe references are added where slots allow.
12. Confirm duplicate references are not duplicated.
13. Confirm invalid or unsafe handoff is ignored safely.
14. Refresh and confirm the handoff is not reinjected.
15. Confirm the normal Generate button remains available but is not clicked.

Network smoke must show:
- No upload.
- No provider/VLM/B.AI/OpenAI/Higgsfield call.
- No billing, credits, refund, or checkout call.
- No unexpected backend write from the handoff.

Regression smoke:
- `/workspace/video` loads.
- `/assets` loads if already deployed.
- Existing image/video draft restore still works visually.
- Reference tray still loads.
- Account menu/global overlay remains unaffected.

## 9. Stop Conditions

Stop deployment or rollback if any of these occur:
- Any automatic Generate starts.
- Any upload appears.
- Any provider/VLM/B.AI/OpenAI/Higgsfield call appears.
- Any billing, credits, refund, or checkout call appears.
- Any backend write appears from the handoff.
- Shadow VLM raw audit appears user-facing.
- `Generate shot`, `Generate all shots`, `Retry shot`, or `Retry all failed` controls reappear.
- Existing draft is overwritten unexpectedly.
- Unsafe URL is injected.
- Handoff loops on refresh.
- `/workspace/video` fails to load.
- Remake panel fails to load.

## 10. Rollback

Rollback strategy:
- Revert frontend commit `b88353636e721a68dece000bec52a05812965764` if needed.
- Do not touch backend, database, env, provider, payment, R2, Supabase, or Admin.
- If only the UI action is problematic, disable or hide the draft handoff button while keeping Remake analysis and the normal Video Workspace intact.
- Keep Customer Feedback v1-D Remake hidden generation controls intact.

Rollback must not restore:
- `Generate shot`
- `Generate all shots`
- `Retry shot`
- `Retry all failed`
- Remake shot queues or provider triggers

## 11. Approval Conclusion

Approved for main frontend deploy only.

Deployment must remain draft-only smoke. This approval does not authorize provider calls, Generate, upload, billing, credits, checkout, backend deploy, Admin deploy, SQL, env changes, PM2 restart, or Shadow VLM user-facing exposure.

Next recommended step after this docs package:
- Push this deploy approval runbook if approved.
- Then request explicit P6-B2 frontend deploy approval.
- Deploy the main frontend only.
- Run the draft-only post-deploy smoke plan.
- Seal P6-B2 only if smoke passes.
