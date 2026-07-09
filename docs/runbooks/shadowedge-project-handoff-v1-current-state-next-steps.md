# ShadowEdge Project Handoff v1 - Current State and Next Steps

Date: 2026-07-09

This handoff records the current state of the ShadowEdge main frontend, backend API, Admin frontend, NewBrand / Gold-Tide frontend, sealed phases, open items, and recommended next steps.

This round only created this documentation. No code, deployment, SQL, environment, provider, VLM, Generate, upload, checkout, billing, credit, Admin, database, R2, Supabase, or payment action was performed.

## 1. Current Overall State

### ShadowEdge Main Frontend

Repository:
- `C:\Users\WEll\Documents\shadowedge-web-next`

Current local branch:
- `feature/video-reference-prompt-builder-v1-a`

Current local HEAD:
- `6807c550bc9d96da84a4ab61bd1febfb8adce6cc`
- `docs: record customer feedback v1d deploy`

Remote relation:
- Local HEAD equals `origin/main`.
- `origin/main` also points to `6807c550bc9d96da84a4ab61bd1febfb8adce6cc`.
- The branch name is still a feature branch, but it is currently aligned with remote main.

Recent main frontend state:
- Customer Feedback v1-D deploy result docs are pushed.
- Remake hide-shot-generation and ratio contract frontend commit is pushed:
  - `7a3fd6a fix: align remake ratio and hide shot generation`
- Account menu global layer fix is pushed:
  - `13aa1a8 fix: keep account menu above page content`
- Video reference rich token editor and tray polish sequence is pushed.
- Video reference tray drag reorder is pushed.
- Asset Library `/assets` route and Image reuse handoff are on main.

Open local status:
- No local ahead commits at the time of this handoff.
- No tracked working tree changes.

### Backend API

Primary active repository:
- `C:\Users\WILL\Documents\shadowedge-api`

Alternate local copy observed:
- `C:\Users\WEll\Documents\New project\shadowedge-api`
- This alternate copy exists and is on `main...origin/main` at `d88f384791101d681ccd6c8e0ded25fee4cb1f3e`.
- Do not use the alternate copy as the active backend workspace unless explicitly re-verified; the active backend repo for recent production work is `C:\Users\WILL\Documents\shadowedge-api`.

Current primary local branch:
- `main`

Current primary local HEAD:
- `0c77a5516962b45f147e7a990c61ba0bd70bd69e`
- `fix: propagate remake target ratio`

Remote relation:
- Local HEAD equals `origin/main`.

Local untracked:
- `backups/`
- `outputs/`

These are existing untracked directories and must not be submitted.

Production API:
- Host: `root@2.24.209.120`
- Path: `/var/www/shadowedge-api-git`
- PM2 process: `shadowedge-api`
- Production HEAD: `0c77a5516962b45f147e7a990c61ba0bd70bd69e`
- Git status: `main...origin/main`, with existing untracked `outputs/`
- PM2: `online`

Recent backend state:
- Customer Feedback v1-D ratio contract deployed.
- Higgsfield upload root P1 deployed.
- Higgsfield media bridge P0 deployed.
- Higgsfield nsfw / policy failure status handling deployed.
- Production Jobs P0 orphan video job closeout deployed.
- Prompt Studio template state isolation backend changes deployed.

### Admin Frontend

Repository:
- `C:\Users\WEll\Documents\shadowedge-admin-next`

Current local branch:
- `main`

Current local HEAD:
- `545e4da17f06c018ec4563fba889ad386dd5aab1`
- `fix: classify remote media failures in admin`

Remote relation:
- Local HEAD equals `origin/main`.

Local untracked:
- `outputs/`

This is existing untracked output data and must not be submitted.

Current Admin state:
- Admin Shadow VLM audit panel is implemented, deployed, and phase-sealed.
- Admin job sync errors and credits display have been fixed.
- Admin policy/material failure classification has been fixed.
- Admin remote media/material failure classification has been fixed.

### NewBrand / Gold-Tide

Gold-Tide production frontend:
- Host: `ubuntu@103.164.81.15`
- Path: `/var/www/newbrand-web-next`
- PM2 process: `newbrand-web`
- Current deployed hash: `7a3fd6a0eabfd15c4e005d32d98a844cadb35b34`
- Git status: `main...origin/main`
- PM2: `online`

Current Gold-Tide state:
- Gold-Tide HK VPS frontend is online.
- `https://gold-tide.com` serves the NewBrand/Gold-Tide frontend.
- `https://newbrand-web-next.vercel.app` remains the Vercel fallback.
- Gold-Tide shares the ShadowEdge backend, auth, profiles, credits, generation logic, media storage assumptions, history, and billing boundaries.
- Gold-Tide is functionally online but should still be treated as a white-label frontend over shared ShadowEdge infrastructure.

## 2. Completed and Sealed Phases

### P6-A4 Controlled Admin/Test Shadow Auto Phase

Status:
- Sealed.

Evidence:
- Backend runbook: `C:\Users\WILL\Documents\shadowedge-api\docs\runbooks\remake-long-video-p6a4w-controlled-auto-phase-seal.md`

Summary:
- P6-A4 controlled admin/test shadow auto phase is sealed.
- A controlled auto execution completed with approved job/user/asset boundaries.
- Production returned to default-off / AUTO-off.
- This did not authorize user-facing Shadow VLM adoption.

### P6-A5 Admin-only Shadow VLM Audit Visibility

Status:
- Sealed.

Evidence:
- Admin runbook: `C:\Users\WEll\Documents\shadowedge-admin-next\docs\runbooks\remake-long-video-p6a5m-admin-shadow-audit-visibility-phase-seal.md`

Summary:
- Backend read-only endpoint and Admin read-only panel were deployed and verified.
- Admin-only Shadow VLM audit visibility is available.
- No user-facing Shadow VLM adoption was introduced.

### Main-G1 Asset Library v1 Read-only Route

Status:
- Sealed and deployed.

Evidence:
- Main frontend runbook: `docs/runbooks/main-g1h-asset-library-v1-phase-seal.md`
- Deploy result: `docs/runbooks/main-g1f-asset-library-route-deploy-result.md`

Summary:
- `/assets` is production deployed and smoke verified.
- Asset Library v1 is read-only.
- It uses existing auth/API client logic and calls `GET /api/assets`.
- Reuse buttons were initially disabled/deferred for v1 seal.
- No delete, rename, tags, folders, favorites, batch actions, provider trigger, Generate, upload, billing, refund, Admin audit, or Shadow VLM exposure.

### Customer Feedback v1-D Remake Ratio / Hide Shot Generation

Status:
- Deployed and docs pushed.

Evidence:
- Main frontend runbook: `docs/runbooks/customer-feedback-v1d-remake-ratio-hide-shot-generation-deploy-result.md`

Frontend:
- `7a3fd6a0eabfd15c4e005d32d98a844cadb35b34`
- `fix: align remake ratio and hide shot generation`

Backend:
- `0c77a5516962b45f147e7a990c61ba0bd70bd69e`
- `fix: propagate remake target ratio`

Summary:
- Remake / reverse analyze UI hides:
  - Generate shot
  - Generate all shots
  - Retry all failed
  - Retry shot
  - per-shot generation credit notices
  - continue queue / skip failed shot entry points
- Normal `/workspace/video` Create Video Generate path remains.
- Long-video/full-episode remake requests send selected ratio.
- Backend accepts `targetRatio`, `aspectRatio`, `aspect_ratio`, and `ratio`.
- Backend result metadata/storyboard/shot `generationParams` use requested ratio.
- Fallback/mock no longer hardcodes `16:9` when request ratio exists.

### NewBrand / Gold-Tide

Status:
- Online.

Evidence:
- Main frontend runbook: `docs/runbooks/brand-clone-v1i6-gold-tide-final-readiness.md`
- Launch handoff: `docs/runbooks/brand-clone-v1g6-gold-tide-hk-vps-launch-handoff.md`

Summary:
- Gold-Tide HK VPS frontend is live.
- NewBrand Vercel fallback remains available.
- Gold-Tide is a frontend/branding deployment over shared ShadowEdge backend infrastructure.
- It did not introduce a new backend, database, storage bucket, payment provider, provider key, or Admin app.

### Admin Shadow VLM Audit Panel

Status:
- Online and sealed.

Evidence:
- Admin deploy result: `C:\Users\WEll\Documents\shadowedge-admin-next\docs\runbooks\remake-long-video-p6a5k-admin-shadow-audit-panel-deploy-result.md`
- Phase seal: `C:\Users\WEll\Documents\shadowedge-admin-next\docs\runbooks\remake-long-video-p6a5m-admin-shadow-audit-visibility-phase-seal.md`

### `/assets`

Status:
- Online and sealed as read-only.

Evidence:
- `docs/runbooks/main-g1f-asset-library-route-deploy-result.md`
- `docs/runbooks/main-g1h-asset-library-v1-phase-seal.md`

## 3. Current In-progress / Not Fully Closed Items

### Frontend Branch Hygiene

Current local frontend branch:
- `feature/video-reference-prompt-builder-v1-a`

Current state:
- HEAD equals `origin/main`.
- No local ahead commits at the time this document was created.

Recommendation:
- For hygiene, switch future local work to `main` or create a fresh branch from `origin/main`.
- Do not reset or switch branches during unrelated work unless explicitly approved.

### Backend Branch Hygiene

Current primary backend branch:
- `main`

Current state:
- HEAD equals `origin/main`.
- Existing untracked `backups/` and `outputs/` remain.

Recommendation:
- Keep using `C:\Users\WILL\Documents\shadowedge-api` for backend production work.
- Do not submit `backups/` or `outputs/`.
- Treat `C:\Users\WEll\Documents\New project\shadowedge-api` as a stale/alternate local copy until explicitly re-verified.

### Main-G1-I Image Reuse Draft Bridge

Status:
- Plan pushed:
  - `dc779e1 docs: plan asset reuse draft bridge`
- Implementation pushed:
  - `4ee9ba9 feat: add asset library image reuse handoff`
- Safety review pushed:
  - `4ca44f5 docs: review image reuse draft bridge safety`

Current interpretation:
- Main-G1-I-B / I-C / I-D push appears completed.
- The code is on remote main.
- A separate deploy approval/deploy/smoke/phase seal for Image reuse draft bridge should still be done unless already performed in a later run not captured by these runbooks.

Expected next Main-G1-I steps:
- Main-G1-I-E: deploy approval.
- Main-G1-I-F: deploy + smoke.
- Main-G1-I-G: phase seal.

### Untracked Directories

Do not submit:
- Backend local `backups/`
- Backend local `outputs/`
- Backend production `outputs/`
- Admin local `outputs/`
- Any frontend generated `outputs/` unless explicitly requested and reviewed.

## 4. Current Main Site Functional State

### `/assets` Read-only Asset Library

Status:
- Online.
- Sealed as read-only.

Implemented:
- Auth-required user asset list.
- Filters/search/manual refresh.
- Safe metadata allowlist.
- URL normalization.
- Open / Copy URL / Copy Job ID / Download where applicable.

Not implemented:
- Delete.
- Rename.
- Tags/folders/favorites.
- Batch actions.
- Provider trigger.
- Generate.
- Upload.
- Billing/refund.
- Direct detail route.

### `/workspace/image`

Status:
- Main image workspace is live.
- Existing generation flow remains production-sensitive.
- Asset Library Image reuse handoff code is on main, but deploy/smoke/phase seal should be confirmed before product rollout if not already completed.

Safety note:
- Image reuse must remain draft-only and must not auto Generate.

### `/workspace/video`

Status:
- Main video workspace is live.
- Rich prompt editor, reference token UI, reference tray polish, picker fixes, token deletion, Expand editor fixes, reference tray drag reorder, account menu layering, and Remake v1-D changes are on main.
- Higgsfield media bridge P0/P1 backend fixes are deployed.

Current Remake state:
- Remake hides shot-generation actions.
- Remake ratio contract is deployed.
- Remake analysis remains read-only for storyboard/prompt review.
- Normal Create Video Generate remains available in main video workflow.

Known caution:
- Do not reintroduce direct Remake shot-generation actions without a separate provider/billing/safety approval.

### `/history`

Status:
- Existing history route loads.
- Global History action consistency is still a recommended follow-up.

Still needed:
- Save to Assets / reuse draft consistency.
- Better detail normalization for assets/history records.
- Avoid direct rerun/provider triggers without approval.

### Canvas

Status:
- Canvas is not a complete production project persistence surface.
- It is still effectively local-only / incomplete in product terms.

Recommended MVP:
- Project material board.
- Drag in image/video/prompt assets.
- Send selected material to Image/Video workspace drafts.
- Save to project.

Do not yet:
- Bind Canvas writes to production project/asset schema without design approval.
- Add provider/rerun/generate behavior from Canvas.

### Project Studio / Project Library

Status:
- Not a first-class route/system yet.
- Project Studio / Project Library split remains foundation work.

Recommended:
- Separate project model, asset model, prompt drafts, and workspace handoff semantics.

### Video Editing

Status:
- A complete video editor is not implemented.

Still needed:
- EV1 requirements.
- Existing API capability audit.
- Timeline / trim / cut / remix / inpaint / audio controls planning.

### White-label / NewBrand / Gold-Tide

Status:
- Online.
- Shared codebase and shared backend.
- Gold-Tide frontend on HK VPS.
- NewBrand Vercel fallback available.

Known follow-up:
- Harden localStorage keys and brand config boundaries.
- Confirm final brand/legal/support/SEO copy.
- Keep backend/auth/billing shared-infrastructure risks explicit.

## 5. Recommended Next Route

### P0 Closeout

1. Confirm no pending docs-only commits remain.
2. Confirm frontend branch hygiene:
   - local branch may still be `feature/video-reference-prompt-builder-v1-a`;
   - if starting new work, switch to `main` or create a fresh branch from `origin/main`.
3. Confirm backend uses the active repo:
   - `C:\Users\WILL\Documents\shadowedge-api`.
4. Do not submit untracked `backups/` or `outputs/`.

### P1 Continue Main-G1

Recommended next sequence:
1. Main-G1-I-E: Image reuse draft bridge deploy approval.
2. Main-G1-I-F: deploy + smoke.
3. Main-G1-I-G: phase seal.

Important:
- Image reuse must remain draft-only.
- It must append references and preserve existing workspace drafts.
- It must not auto Generate, upload, bill, or call providers.

### P2 Asset Library Follow-up

1. Video reuse draft bridge.
2. Global History action consistency.
3. Save to Assets / reuse draft consistency.
4. History detail normalization.

Do not start delete/rename/tags/favorites/batch actions until separately approved.

### P3 Product Foundation

1. Canvas persistence design.
2. Project Studio / Project Library split.
3. Unified project/asset model.
4. Workspace/project draft model.

### P4 Video Editor

1. EV1 requirements.
2. API and provider capability audit.
3. Timeline / trim / cut design.
4. Remix / inpaint / audio controls later.

## 6. Hard Prohibitions / Safety Reminders

Do not:
- Make Shadow VLM user-facing.
- Add provider rerun/trigger buttons.
- Add automatic Generate behavior.
- Add billing/refund actions to user Asset Library.
- Add delete/rename/tags/folders/favorites/batch actions without approval.
- Modify env.
- Execute SQL.
- Modify database/schema.
- Modify provider/payment/R2/Supabase/admin tokens.
- Submit `backups/`.
- Submit generated `outputs/`.
- Trigger Generate/upload/checkout/billing without explicit approval.
- Deploy or PM2 restart during docs-only/check-only rounds.

## 7. Copyable Prompt for a New GPT Window

Use this prompt when opening a fresh GPT/Codex window:

```text
Continue ShadowEdge project work from the current handoff.

Repositories:
- Main frontend: C:\Users\WEll\Documents\shadowedge-web-next
- Backend API active repo: C:\Users\WILL\Documents\shadowedge-api
- Admin frontend: C:\Users\WEll\Documents\shadowedge-admin-next
- Gold-Tide frontend production: ubuntu@103.164.81.15:/var/www/newbrand-web-next
- Backend production: root@2.24.209.120:/var/www/shadowedge-api-git, PM2 shadowedge-api

Current state as of 2026-07-09:
- Main frontend origin/main: 6807c550bc9d96da84a4ab61bd1febfb8adce6cc
- Backend origin/main and production: 0c77a5516962b45f147e7a990c61ba0bd70bd69e
- Admin origin/main: 545e4da17f06c018ec4563fba889ad386dd5aab1
- Gold-Tide VPS frontend: 7a3fd6a0eabfd15c4e005d32d98a844cadb35b34
- Main frontend local branch may still be feature/video-reference-prompt-builder-v1-a, but HEAD equals origin/main.
- Backend local main equals origin/main; existing untracked backups/ and outputs/ must not be submitted.
- Admin local main equals origin/main; existing untracked outputs/ must not be submitted.

Completed/sealed:
- P6-A4 controlled admin/test shadow auto phase sealed.
- P6-A5 Admin-only Shadow VLM audit visibility sealed.
- Main-G1 Asset Library v1 read-only route sealed and /assets is live.
- Customer Feedback v1-D deployed and docs pushed: Remake shot-generation actions hidden, ratio contract deployed.
- NewBrand / Gold-Tide frontend is online.
- Admin Shadow VLM audit panel is online.

Recommended next:
Start with P0 branch sanity if needed, then continue Main-G1-I:
1. Main-G1-I-E Image reuse draft bridge deploy approval.
2. Main-G1-I-F deploy + smoke.
3. Main-G1-I-G phase seal.

Strict safety:
- Do not make Shadow VLM user-facing.
- Do not add provider rerun/trigger buttons.
- Do not auto Generate.
- Do not add billing/refund to user Asset Library.
- Do not add delete/rename/tags/favorites/batch without separate approval.
- Do not modify env/database/schema/provider/payment/R2/Supabase/admin tokens.
- Do not submit backups/ or outputs/.
- Do not deploy, push, run SQL, call providers, Generate, upload, checkout, or bill unless explicitly approved.

Before any code change, read the relevant runbooks:
- docs/runbooks/shadowedge-project-handoff-v1-current-state-next-steps.md
- docs/runbooks/main-g1h-asset-library-v1-phase-seal.md
- docs/runbooks/main-g1i-asset-library-reuse-draft-bridge-plan.md
- docs/runbooks/main-g1ic-image-reuse-draft-bridge-safety-review.md
- docs/runbooks/customer-feedback-v1d-remake-ratio-hide-shot-generation-deploy-result.md

Proceed conservatively, verify git status first, and preserve existing user changes.
```

## 8. This Round Output

Docs changed:
- `docs/runbooks/shadowedge-project-handoff-v1-current-state-next-steps.md`

Repos checked:
- `C:\Users\WEll\Documents\shadowedge-web-next`
- `C:\Users\WILL\Documents\shadowedge-api`
- `C:\Users\WEll\Documents\New project\shadowedge-api`
- `C:\Users\WEll\Documents\shadowedge-admin-next`
- `ubuntu@103.164.81.15:/var/www/newbrand-web-next`
- `root@2.24.209.120:/var/www/shadowedge-api-git`

No code, deployment, SQL, env, provider, VLM, Generate, upload, billing, or push action was performed in this handoff round.
