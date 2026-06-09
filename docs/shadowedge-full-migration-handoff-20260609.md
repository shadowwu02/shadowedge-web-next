# ShadowEdge Full Migration Handoff

Last updated: 2026-06-09

This document is the handoff anchor for ShadowEdge's full workspace migration, with special focus on Video Workspace and Video Remake. Read it before starting a new ShadowEdge Video or Remake task.

Security note: this document intentionally lists environment variable names only. Do not read `.env.bak`, do not print tokens, keys, cookies, sessions, or user passwords, and do not commit `.env` or `.env.local`.

## 1. Project Overview

### Project Paths

- New frontend: `C:\Users\WEll\Documents\shadowedge-web-next`
- Old frontend: `C:\Users\WEll\Documents\shadowedge-workspace`
- Backend API: `C:\Users\WILL\Documents\shadowedge-api`
- Online frontend: `https://shadowedge-web-next.vercel.app`
- Online API: `https://api.shadowedgeai.com`
- Local frontend default: `http://localhost:3000`
- Local backend debug: `http://localhost:4100`

### Current Architecture

- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS 4, app router.
- Backend: Node.js / Express API.
- Auth and credits: Supabase-backed auth and credits/account state.
- Main video APIs:
  - `POST /api/video/generate`
  - `GET /api/video/status`
  - `GET /api/video/history`
- Video generation provider path:
  - `routes/video.js` receives generate/status/history requests.
  - `config/video-provider-map.js` routes model ids to providers.
  - `services/higgsfield-video-service.js` handles the Higgsfield CLI / Seedance branch.
  - `seedance_2_0` enters the Higgsfield branch through `isHiggsfieldVideoModel(requestedModel)`.
- Remake storyboard path:
  - Source video upload.
  - Backend metadata analysis by `ffprobe`.
  - Fixed segment creation.
  - Keyframe extraction by `ffmpeg`.
  - B.AI VLM storyboard adapter.
  - Frontend storyboard panel.
  - Per-shot generation through the existing video generate flow.

## 2. Historical Stages Overview

### 2.1 Old HTML / WordPress Phase

Old frontend path: `C:\Users\WEll\Documents\shadowedge-workspace`

Important old files:

- `video-workspace.html`
- `js/se-models.js`
- `js/se-upload.js`
- `js/se-video-generate.js`
- `js/se-history.js`
- `js/se-asset-drawer.js`
- `js/se-video-api.js`
- `js/se-i18n-video.js`
- `js/se-auth.js`
- `js/se-config.js`
- `js/se-main.js`
- `css/se-upload.css`
- `css/se-asset-drawer.css`
- `css/se-history.css`
- `css/se-base.css`
- `css/se-layout.css`
- `css/se-components.css`
- `css/se-mobile.css`
- `wordpress-pages/07_history.html`
- `wordpress-pages/08_image-workspace.html`
- `wordpress-pages/12_workspace.html`

Old workspace capabilities worth preserving:

- Model-specific rules for duration, ratio, quality, cost, reference slots, and supported media.
- Upload/reference limits with image/video/audio slots.
- Local reusable assets and asset drawer.
- Draft restore.
- Structured `@图1`, `@视频1`, `@音频1` prompt references.
- Media-aware prompt binding instead of plain text only.
- Server/local history merge.
- Latest output cards.
- Generated result as reference, guarded by model support rules.
- History actions such as fill/reuse, retry, download/open, hide/delete in old flows.
- History / How it works switching in the workspace UI.

Migrated into the new frontend:

- Model rules layer and UI binding.
- Upload/reference restrictions.
- Asset drawer and reusable assets.
- Draft restore.
- `@` token binding to real media ids.
- History/latest output handling.
- Video i18n dictionary and language switch.
- Main History / How it works canvas.
- Generation stream with large canvas plus per-item details.
- Remake shell, storyboard analysis, keyframes, VLM adapter, and single-shot generation.

Remaining gaps or future work:

- Remake D1.1 true one-shot generation still needs a clean authenticated browser QA run.
- Remake D2 serial "Generate all shots" queue is not implemented.
- Remake D3 persisted batch/retry orchestration is not implemented.
- Remake D4 stitch/export is optional and low priority.
- Full 1-5 minute batch remake needs queue, cost estimate, and persistence before release.

### 2.2 Backend API Phase

Backend path: `C:\Users\WILL\Documents\shadowedge-api`

Important backend files:

- `server.js`
  - Express app setup.
  - CORS allowlist.
  - Route mounting.
  - Local CORS env extension commit: `c2172a1 fix: allow local dev cors origins`.
- `routes/auth-proxy.js`
  - Login/auth proxy route.
  - `POST /api/auth/login` returns session data.
- `routes/video.js`
  - Main video generate/status/history routes.
  - Auth guard.
  - Credits checks and refresh.
  - Provider routing.
  - Higgsfield branch entry.
- `routes/internal-api.js`
  - Internal video remake route.
  - `POST /api/internal/video/reverse-analyze`.
- `services/higgsfield-video-service.js`
  - Higgsfield CLI adapter.
  - `higgsfield generate create seedance_2_0 ... --json`.
  - `higgsfield generate get <job_id> --json`.
- `services/video-remake-service.js`
  - Source URL validation.
  - `ffprobe` metadata.
  - Fixed segment generation.
  - Keyframe extraction.
  - Remake frame cleanup.
- `services/video-remake-vlm-service.js`
  - OpenAI/Gemini/mock/B.AI VLM storyboard adapter.
  - B.AI base64 keyframe vision path.
- `config/video-provider-map.js`
  - Model/provider mapping.

Backend dependencies:

- `express`
- `cors`
- `dotenv`
- `multer`
- `axios`
- `@supabase/supabase-js`
- `openai`
- `@google/genai`
- `express-rate-limit`

Backend environment requirements are listed in section 6. Do not print values.

### 2.3 Next.js New Frontend Phase

New frontend path: `C:\Users\WEll\Documents\shadowedge-web-next`

Why the migration moved to Next.js:

- Componentized Video Workspace instead of old HTML/JS page-level scripting.
- Typed video/remake state.
- Safer API wrappers and normalized responses.
- Reusable hooks for generation, polling, credits, auth, and task state.
- Better i18n integration.
- Cleaner premium UI system and model logo asset mapping.

Important frontend files:

- `src/components/layout/TopBar.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/components/video/VideoWorkspace.tsx`
- `src/components/video/ModelSelector.tsx`
- `src/components/video/VideoParamsPanel.tsx`
- `src/components/video/PromptBox.tsx`
- `src/components/video/UploadBox.tsx`
- `src/components/video/MediaPickerDrawer.tsx`
- `src/components/video/ReferenceMediaTray.tsx`
- `src/components/video/ResultViewer.tsx`
- `src/components/video/HistoryPanel.tsx`
- `src/components/video/VideoGenerationStream.tsx`
- `src/components/video/VideoOutputDetailPanel.tsx`
- `src/components/video/VideoHowItWorks.tsx`
- `src/hooks/useVideoGeneration.ts`
- `src/hooks/useTaskPolling.ts`
- `src/hooks/useCredits.ts`
- `src/hooks/useAuthSession.ts`
- `src/lib/video-api.ts`
- `src/lib/video/videoModelRules.ts`
- `src/lib/video/videoReferenceRules.ts`
- `src/lib/video/modelLogoMap.ts`
- `src/lib/video-mentions.ts`
- `src/lib/media-assets.ts`
- `src/i18n/dictionary.ts`
- `docs/video-migration-context.md`
- `docs/video-ui-design-system.md`

Current UI structure:

- TopBar / Sidebar with localized nav, credits, user menu, and language switch.
- Left Create Form for upload, prompt, references, model, params, and generate.
- Main Preview / History / How it works canvas tabs.
- History stream where each generation item is a large video/black-card canvas plus its own detail card.
- No fixed right-side full Saved History list.
- Model logos are loaded from `public/model-icons/`.
- Premium dark/gray/orange visual style guided by `docs/video-ui-design-system.md`.

## 3. Video Workspace Migration Phases

### F1: UI Bug Fixes

Objective:

- Stabilize the core Video Workspace controls after the Next.js migration.

Core files:

- `src/components/video/VideoWorkspace.tsx`
- `src/components/video/VideoParamsPanel.tsx`
- `src/components/video/UploadBox.tsx`
- `src/components/video/ReferenceMediaTray.tsx`

Completed abilities:

- Reference media card fixes.
- Duration slider restored.
- Ratio / Quality popovers restored.
- Parameter popover offset fixed later by `0258a2f fix: stabilize video params popovers`.

Risks:

- Do not modify popover positioning logic casually.
- Do not regress slider/dark popover behavior.

### F2: Model Rules

Objective:

- Move old model rules into a typed rule layer and bind UI to real backend-supported parameters.

Core files:

- `src/lib/video/videoModelRules.ts`
- `src/lib/video/videoReferenceRules.ts`
- `src/components/video/ModelSelector.tsx`
- `src/components/video/VideoParamsPanel.tsx`
- Old reference: `C:\Users\WEll\Documents\shadowedge-workspace\js\se-models.js`
- Backend reference: `C:\Users\WILL\Documents\shadowedge-api\config\video-provider-map.js`

Completed abilities:

- Duration, ratio, quality, audio, reference slots, and generated-reference support are rule-driven.
- UI no longer shows arbitrary parameters without model checks.

Risks:

- Backend provider support is the source of truth.
- Do not invent model params if old/frontend/backend references do not support them.

### F3: Asset Drawer / Draft Restore / Reusable Assets

Related commits:

- `5891b35 feat: improve video asset drawer sources`
- `d0027d3 feat: restore video workspace draft`
- `4934330 feat: support reusable video assets`

Objective:

- Bring old reusable media and draft restore behavior into Next.js.

Core files:

- `src/components/video/MediaPickerDrawer.tsx`
- `src/components/video/UploadBox.tsx`
- `src/components/video/ReferenceMediaTray.tsx`
- `src/lib/media-assets.ts`
- Old reference: `js/se-upload.js`, `js/se-asset-drawer.js`

Completed abilities:

- Upload and existing assets can be selected.
- Draft state can restore references.
- Reusable assets are available to prompt/reference flows.

Risks:

- Do not add Remake source videos to Create Video references.
- Do not let keyframes enter `mediaList` or generate payload references automatically.

### F4: @ Token Binding

Related commits:

- `808c582 feat: add video mention binding helpers`
- `3a1fafb feat: bind video mention tokens to media`
- `c4c1dcd feat: persist video mention bindings`

Objective:

- Preserve `@图1`, `@视频1`, `@音频1` references as real media bindings instead of fragile plain text.

Core files:

- `src/components/video/PromptBox.tsx`
- `src/lib/video-mentions.ts`
- `src/components/video/ReferenceMediaTray.tsx`

Completed abilities:

- Token references are bound to media ids.
- Removing/reordering media does not silently corrupt prompt references.
- Missing reference warnings are supported.

Risks:

- Do not change PromptBox / `@` parser during Remake work.
- Do not translate token labels themselves.

### F5: History / Latest Output

Related commits:

- `d0a4790 fix: stabilize video history merge`
- `e944528 fix: stabilize video polling and latest output`
- `64b78a4 feat: add video history reuse actions`
- `8cd3c3f feat: add video history status shortcuts`
- `9ed77bb fix: harden video history restore and stale jobs`

Objective:

- Stabilize polling, latest output, history merge, reuse, retry, and long-running/failed states.

Core files:

- `src/hooks/useVideoGeneration.ts`
- `src/hooks/useTaskPolling.ts`
- `src/components/video/ResultViewer.tsx`
- `src/components/video/HistoryPanel.tsx`
- `src/components/video/VideoGenerationStream.tsx`
- `src/lib/video/historyUtils.ts`

Completed abilities:

- Server/local merge is safer.
- Latest output updates on success.
- Failed and processing shortcuts can move the user to the relevant history filter.
- Retry and fill/reuse actions are preserved.

Risks:

- Polling/retry/history merge is shared infrastructure. Avoid large rewrites.

### F6: Video i18n

Related commits:

- `1e10fb5 feat: add video i18n dictionary keys`
- `2595a97 fix: repair i18n dictionary encoding`
- `004618d feat: localize video workspace history UI`
- `c5ba9d0 feat: localize video upload and prompt UI`
- `ccab82c feat: localize video params and errors`
- `9b4d8f8 fix: complete video i18n coverage`
- `501c636 feat: localize workspace navigation`

Objective:

- Localize Video Workspace, TopBar, navigation, credits, user menu, upload, params, prompt, status, history, and errors.

Core files:

- `src/i18n/dictionary.ts`
- `src/i18n/useI18n.ts`
- `src/components/LanguageSwitch.tsx`
- `src/components/layout/TopBar.tsx`
- `src/components/layout/Sidebar.tsx`

Current language strategy:

- If `se_lang` exists, use the persisted language.
- If no `se_lang`, default to English.
- `se_lang=zh` causing Chinese display is expected persistence, not a bug.

Risks:

- Keep EN/ZH flat dictionary keys aligned.
- Do not translate model names, enum values, API fields, or `@图/@视频/@音频` tokens.

### UI Polish / Model Logos / Premium Typography

Related commits:

- `c794632 feat: add video model logo assets`
- `664119d style: polish video workspace visual system`
- `7d42b9d fix: polish brand and model logo display`
- `2bca9c0 style: refine premium video workspace typography`
- `a53cc08 fix: inline video output details with generation cards`
- `88a615c feat: replace video history rail with output detail`
- `8e9c253 fix: align video history canvas layout`

Objective:

- Make the workspace feel like a mature AI video model workspace.
- Keep ShadowEdge black/gray/orange brand.
- Preserve large central canvas hierarchy.

Completed abilities:

- Model PNG logos under `public/model-icons/`.
- Model logo helper: `src/lib/video/modelLogoMap.ts`.
- Main generation stream uses large canvas plus per-item detail cards.
- Hide action is removed from main generation stream.
- History / How it works lives in the main canvas area.
- The UI follows the dark premium design tokens in `docs/video-ui-design-system.md`.

Risks:

- Do not restore a right-side full Saved History rail.
- Do not make detail cards steal canvas width.
- Do not introduce pink hover/active states.
- Do not switch primary actions to green.

## 4. Video Remake Phase

### Remake-A: Frontend UI Shell

Commit:

- `e9be63b feat: add video remake workspace shell`

Objective:

- Add Remake / 短剧反推 tab without touching Create Video generation.

Core files:

- `src/components/video/remake/VideoRemakeWorkspace.tsx`
- `src/components/video/remake/RemakeSourceUpload.tsx`
- `src/components/video/remake/RemakeSettingsPanel.tsx`
- `src/components/video/remake/RemakeStoryboardPanel.tsx`
- `src/components/video/remake/remakeTypes.ts`
- `src/components/video/remake/remakeMockData.ts`
- `src/components/video/VideoWorkspace.tsx`

Completed abilities:

- Remake left form with source video, mode, target region, character rules, scene style, translate dialogue, compliance notice, and Analyze button.
- Mock storyboard display.
- Use prompt can fill Create Video prompt and switch back to Create.

### Remake-B: Reverse Analyze API Shell

Frontend commit:

- `6e65d89 feat: connect video remake analyze api`

Backend commit:

- `20b9ca4 feat: add video remake reverse analyze route`

Objective:

- Add `POST /api/internal/video/reverse-analyze`.
- Make frontend call the backend through the Next proxy route.

Completed abilities:

- Backend returns structured mock storyboard.
- Frontend handles loading, success, error, and local mock fallback.
- No real VLM, no credits deduction.

### Remake-C1: Source Video Upload + ffprobe Metadata

Frontend commit:

- `db9de44 feat: upload remake source video`
- `2e44bd2 fix: require source video for remake analysis`

Backend commit:

- `cfcda69 feat: add remake video metadata analysis`

Objective:

- Upload Remake source video.
- Pass a real `sourceVideoUrl` to reverse-analyze.
- Backend reads metadata using `ffprobe`.
- Create fixed segments.

Completed abilities:

- Source video upload is required before Analyze.
- Source video does not enter Create Video references/mediaList/generate payload.
- Backend validates source URL and rejects unsafe external/local/private paths.
- Single clip and full film duration limits are enforced.

### Remake-C2-A: Keyframe Extraction

Frontend commit:

- `a1e1a49 feat: show remake keyframes`

Backend commit:

- `3fbc03a feat: extract remake keyframes`

Objective:

- Extract keyframes from each segment using `ffmpeg`.
- Display keyframes in storyboard cards.

Completed abilities:

- Keyframes are saved under `uploads/remake-frames/<analysisId>/...`.
- Public URL shape: `/uploads/remake-frames/<analysisId>/...`.
- Keyframes are returned in both `meta.segments[].keyframes` and `storyboard.shots[].keyframes`.
- Frontend shows thumbnails and handles no-keyframe fallback.

Risks:

- Local public `image_url` is not reachable by B.AI when the backend is not public. Base64 fallback is expected locally.

### Remake-C2-A.1: Keyframe Cleanup

Backend commit:

- `d328811 fix: cleanup remake keyframe files`

Objective:

- Add safe cleanup for old `uploads/remake-frames` directories.

Completed abilities:

- Deletes analysis directories older than 24 hours.
- Throttled to at most once per hour in process.
- Only deletes inside the resolved `uploads/remake-frames` path.
- Cleanup failures do not fail reverse-analyze.

### Remake-C2-B: VLM Storyboard Adapter

Frontend commit:

- `973965f feat: show ai remake storyboard`

Backend commit:

- `e77b8ba feat: add remake storyboard vlm adapter`

Objective:

- Add real storyboard VLM adapter with mock fallback.

Completed abilities:

- OpenAI / Gemini / mock provider paths.
- Frontend provider and fallback status display.
- Storyboard JSON normalization and fallback on bad output.

### B.AI Provider

Frontend commit:

- `246443e feat: show bai remake provider status`

Backend commit:

- `1e0c24f feat: add bai remake vlm provider`

Objective:

- Add B.AI as a Remake VLM provider.

Completed abilities:

- `REMAKE_VLM_PROVIDER=bai`.
- B.AI text probe succeeded.
- B.AI base64 keyframe vision succeeded after account recharge.
- `meta.vlmProvider=bai`.
- `meta.mock=false`.
- No fallback reason in successful real calls.

Important note:

- Public `image_url` failed in local testing because local keyframes were not reachable from the public internet. Base64 data URL succeeded, so B.AI can read keyframe images.

### Remake Real Short-Drama QA

Current verified state:

- Real short-drama/person clip was used, not only test pattern.
- B.AI true call succeeded.
- Base64 keyframe vision succeeded.
- `meta.vlmProvider=bai`.
- `meta.mock=false`.
- Storyboard was not fallback draft.
- Quality score: 8/10.
- Position/camera/motion/action/emotion/dialogue/prompt quality was good enough to enter Remake-D.

### Remake-D1: Single Shot Generate Shot

Frontend commit:

- `77b9f5c feat: generate remake storyboard shots`

Objective:

- Add real `Generate shot` button on each storyboard shot card.
- Generate only one selected shot through the existing video generation pipeline.

Core files:

- `src/components/video/VideoWorkspace.tsx`
- `src/components/video/remake/RemakeStoryboardPanel.tsx`
- `src/components/video/remake/remakeTypes.ts`
- `src/hooks/useVideoGeneration.ts`
- `src/i18n/dictionary.ts`

Completed abilities:

- Each shot card has `Generate shot`.
- Click calls `useVideoGeneration.submit()`.
- It uses the existing `/api/video/generate` route.
- Per-shot UI states:
  - idle
  - generating
  - success
  - failed
- Success actions:
  - Open result
  - Retry shot
  - Use prompt
- Failed action:
  - Retry shot
- Existing latest output, polling, history, retry, and credits refresh paths are reused.

Required history/meta markers:

- `source: "remake"`
- `remake: true`
- `remake_source: "storyboard_shot"`
- `analysisId`
- `shotGroupId`
- `shotNumber`
- `sourceTimeRange`
- `remakeDialogue`
- `audio`
- `referenceHints`
- `generationParams`

Important boundaries:

- Source video must not enter references/mediaList/generate payload.
- Keyframes must not automatically become references.
- Generate shot must not auto-use result as reference.
- No Generate all shots yet.
- No stitching yet.

### Local CORS Fix

Backend commit:

- `c2172a1 fix: allow local dev cors origins`

Objective:

- Let local frontend `http://localhost:3000` log into local backend `http://localhost:4100`.

Completed abilities:

- `server.js` keeps existing production origins.
- `CORS_ALLOWED_ORIGINS` can append comma-separated local origins.
- `Access-Control-Allow-Origin` is not opened to `*`.
- Local preflight from `localhost:3000` to `localhost:4100` passed.

### Higgsfield CLI Readiness

Verified:

- CLI installed: `@higgsfield/cli 0.1.40`.
- CLI logged in.
- `higgsfield account status --json` succeeded.
- `higgsfield workspace status --json` succeeded.
- Seedance 2.0 CLI schema supports:
  - `prompt`
  - `aspect_ratio`
  - `duration`
  - `resolution`
  - `mode`
  - `medias`
- Non-generation cost check:
  - `seedance_2_0 / 5s / 480p / std = 15 credits`.

Current blocker:

- Remake-D1.1 true generation of one shot has not been completed.
- The immediate blocker was authenticated browser state, not D1 code itself.
- Codex-visible browser must have a real ShadowEdge localStorage auth token before calling Generate shot.

## 5. Current Remake Real State

### Completed

- Remake tab exists in Video Workspace.
- Source video upload exists.
- Backend reverse-analyze route exists.
- ffprobe metadata analysis works.
- Fixed segment creation works.
- ffmpeg keyframe extraction works.
- Keyframe cleanup exists.
- B.AI VLM storyboard adapter works.
- B.AI true call succeeded after recharge.
- Base64 keyframe vision succeeded.
- Real short-drama QA quality score was 8/10.
- Higgsfield CLI is installed and authenticated.
- Local CORS for frontend 3000 to backend 4100 is fixed and committed.
- Single storyboard shot generation UI and plumbing is implemented.

### Not Completed

- Remake-D1.1 true generate one Remake shot is not yet completed.
- Reason: Codex-visible browser did not have a valid ShadowEdge localStorage auth token at the time of QA.
- Do not treat URL access to `/workspace/video` as proof of login.

Login success gates:

- LocalStorage has the project's auth token key.
- `GET /api/auth/me` returns 200.
- TopBar shows email / credits / avatar.
- API calls include `Authorization: Bearer <redacted>`.

Only after all gates pass should D1.1 click a Remake storyboard card's `Generate shot`.

## 6. Current Key Technical Links

### Login

- Login route: `POST /api/auth/login`.
- Backend route source: `routes/auth-proxy.js`.
- `server.js` mounts auth under `/api`, so the real path is `/api/auth/login`.
- The login response returns `data.session.access_token`.
- Frontend `saveAuthSession()` writes the access token to localStorage.
- Later API calls use `Authorization: Bearer <token>`.
- This is not cookie login.
- If localStorage has no auth token after login, login persistence is broken or the browser context is not the logged-in context.

### Remake Analyze

Flow:

1. Frontend selects Remake source video.
2. Frontend uploads the source video.
3. Frontend calls `/api/internal/video/reverse-analyze`.
4. Backend validates source video URL.
5. Backend runs `ffprobe` metadata.
6. Backend creates fixed segments.
7. Backend runs `ffmpeg` keyframe extraction.
8. Backend calls B.AI VLM using keyframes.
9. Backend returns structured storyboard JSON.
10. Frontend renders storyboard cards with keyframes.

No credits are deducted for analyze in the current implementation.

### Generate Shot

Flow:

1. Remake storyboard card `Generate shot`.
2. `VideoWorkspace.tsx` `handleGenerateRemakeShot`.
3. `useVideoGeneration.submit()`.
4. `POST /api/video/generate`.
5. Existing polling/status/history/credits/latest output flow.
6. History receives meta markers with `source=remake`.

This must reuse the existing generation system. Remake must not become a separate generation stack.

### Higgsfield Generation

Important backend files:

- `routes/video.js`
- `services/higgsfield-video-service.js`
- `config/video-provider-map.js`

Provider selection:

- `isHiggsfieldVideoModel(requestedModel)` routes `seedance_2_0` into the Higgsfield branch.

CLI calls:

- Create:
  - `higgsfield generate create seedance_2_0 ... --json`
- Status:
  - `higgsfield generate get <job_id> --json`

Current production/local provider preference:

- Prefer the existing Higgsfield/Seedance branch.
- Do not add WaveSpeed or a new provider for Remake-D1.1.
- Do not install or wire a separate CLI path into production unless explicitly requested.

## 7. Current Important Files

### Frontend

- `C:\Users\WEll\Documents\shadowedge-web-next\src\components\video\VideoWorkspace.tsx`
- `C:\Users\WEll\Documents\shadowedge-web-next\src\components\video\remake\VideoRemakeWorkspace.tsx`
- `C:\Users\WEll\Documents\shadowedge-web-next\src\components\video\remake\RemakeStoryboardPanel.tsx`
- `C:\Users\WEll\Documents\shadowedge-web-next\src\components\video\remake\remakeTypes.ts`
- `C:\Users\WEll\Documents\shadowedge-web-next\src\hooks\useVideoGeneration.ts`
- `C:\Users\WEll\Documents\shadowedge-web-next\src\lib\video-api.ts`
- `C:\Users\WEll\Documents\shadowedge-web-next\src\i18n\dictionary.ts`
- `C:\Users\WEll\Documents\shadowedge-web-next\docs\video-migration-context.md`
- `C:\Users\WEll\Documents\shadowedge-web-next\docs\video-ui-design-system.md`

### Backend

- `C:\Users\WILL\Documents\shadowedge-api\server.js`
- `C:\Users\WILL\Documents\shadowedge-api\routes\video.js`
- `C:\Users\WILL\Documents\shadowedge-api\routes\internal-api.js`
- `C:\Users\WILL\Documents\shadowedge-api\routes\auth-proxy.js`
- `C:\Users\WILL\Documents\shadowedge-api\services\video-remake-service.js`
- `C:\Users\WILL\Documents\shadowedge-api\services\video-remake-vlm-service.js`
- `C:\Users\WILL\Documents\shadowedge-api\services\higgsfield-video-service.js`
- `C:\Users\WILL\Documents\shadowedge-api\config\video-provider-map.js`

### Old Frontend

- `C:\Users\WEll\Documents\shadowedge-workspace\video-workspace.html`
- `C:\Users\WEll\Documents\shadowedge-workspace\js\se-models.js`
- `C:\Users\WEll\Documents\shadowedge-workspace\js\se-upload.js`
- `C:\Users\WEll\Documents\shadowedge-workspace\js\se-video-generate.js`
- `C:\Users\WEll\Documents\shadowedge-workspace\js\se-history.js`
- `C:\Users\WEll\Documents\shadowedge-workspace\js\se-asset-drawer.js`
- `C:\Users\WEll\Documents\shadowedge-workspace\js\se-video-api.js`
- `C:\Users\WEll\Documents\shadowedge-workspace\js\se-i18n-video.js`
- `C:\Users\WEll\Documents\shadowedge-workspace\css\se-upload.css`
- `C:\Users\WEll\Documents\shadowedge-workspace\css\se-asset-drawer.css`
- `C:\Users\WEll\Documents\shadowedge-workspace\css\se-history.css`
- `C:\Users\WEll\Documents\shadowedge-workspace\css\se-base.css`
- `C:\Users\WEll\Documents\shadowedge-workspace\css\se-layout.css`
- `C:\Users\WEll\Documents\shadowedge-workspace\css\se-components.css`
- `C:\Users\WEll\Documents\shadowedge-workspace\css\se-mobile.css`
- `C:\Users\WEll\Documents\shadowedge-workspace\wordpress-pages\07_history.html`
- `C:\Users\WEll\Documents\shadowedge-workspace\wordpress-pages\08_image-workspace.html`
- `C:\Users\WEll\Documents\shadowedge-workspace\wordpress-pages\12_workspace.html`

## 8. Current Env Requirements

Do not output real values. Only the field names and intended local shapes are listed here.

### Backend `.env`

Local debug fields:

- `PORT=4100`
- `CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `REMAKE_VLM_PROVIDER=bai`
- `BAI_API_KEY`
- `BAI_BASE_URL=https://api.b.ai/v1`
- `BAI_VLM_MODEL=gpt-5.2`
- `INTERNAL_VIDEO_SITE_KEY`
- `VIDEO_PUBLIC_BASE_URL=https://api.shadowedgeai.com`
- `FFMPEG_PATH`
- `FFPROBE_PATH`

### Frontend `.env.local`

- `NEXT_PUBLIC_API_BASE_URL=http://localhost:4100`
- `INTERNAL_VIDEO_SITE_KEY`

### Production / Vercel

Known required names:

- `NEXT_PUBLIC_API_BASE_URL`
- `INTERNAL_VIDEO_SITE_KEY`

Backend production must have:

- Supabase env.
- B.AI env if Remake storyboard is enabled.
- `VIDEO_PUBLIC_BASE_URL`.
- `FFMPEG_PATH` / `FFPROBE_PATH` if not available on PATH.
- Higgsfield CLI runtime/auth availability for the current provider path.
- CORS allowed origins including the deployed frontend domain.

Never put B.AI, Supabase service role, site key, or Higgsfield session material into frontend code.

## 9. Forbidden / High-Risk Actions

Do not:

- Read `.env.bak`.
- Output key/token/cookie/session values.
- Commit `.env` or `.env.local`.
- Do Remake-D2 batch generation in the D1.1 phase.
- Click Generate all shots.
- Stitch videos.
- Change `/video/generate` protocol.
- Change credits core logic.
- Change PromptBox / `@` parser.
- Change upload API.
- Let Remake source video enter Create Video references/mediaList/generate payload.
- Let Remake keyframes automatically enter references/mediaList/generate payload.
- Put B.AI, Supabase, site key, or Higgsfield secrets on the frontend.
- Treat `No storyboard yet` / mock UI as proof of a successful analyze.
- Treat being on `/workspace/video` as proof of authentication.
- Click Create Video's main Generate button when validating Remake-D1.1.

## 10. Follow-Up Roadmap

### Current Next Step: Remake-D1.1

Goal:

- True-generate exactly one Remake storyboard shot.

Required gates:

1. Codex-visible browser is truly logged in.
2. localStorage auth token exists.
3. `/api/auth/me` returns 200.
4. TopBar shows email / credits / avatar.
5. Higgsfield CLI is installed and logged in.
6. Backend can find the CLI.
7. Remake Analyze succeeds with:
   - `meta.vlmProvider=bai`
   - `meta.mock=false`
8. Only the first storyboard shot's `Generate shot` is clicked.

Validation:

- Request comes from Remake shot card, not Create Video main Generate.
- `POST /api/video/generate` includes Remake meta.
- Source video/keyframes are not in references/mediaList.
- Higgsfield branch is entered.
- CLI create/get works.
- Polling works.
- `outputUrl` is returned.
- Shot card shows success.
- History is written.
- History meta contains Remake markers.
- Latest output / generation stream works.
- Credits are deducted only once.

### After D1.1

1. Remake-D2-Audit:
   - Design serial Generate all shots queue.
   - No code yet.
   - Concurrency should be 1.
   - Include retry, interruption recovery, history/meta, and credits safety.
   - No stitching.
2. Remake-D3:
   - Batch queue implementation.
   - Persisted status.
   - Single-shot retry and failed recovery.
3. Remake-D4:
   - Optional stitch/export.
   - Low priority and should wait until generation workflow is stable.

## 11. Migration Advice

- Do not lose old HTML model/upload rules.
- The new Next frontend should continue using the current backend main video chain.
- Remake should not build a separate generation system.
- History, polling, credits, latest output, and retry must remain unified.
- Provider layer should prefer the existing Higgsfield/Seedance branch for video generation.
- B.AI handles storyboard analysis only; it is not the video generation provider.
- Higgsfield CLI is currently part of the real video generation provider path.
- Keep Remake source-video analysis separate from Create Video references.
- Keep compliance language focused on authorized content, storyboard analysis, localization, and remake workflow.
- Avoid forbidden language such as piracy, 1:1 copy, stealing shows, or unauthorized copying in user-facing text.

## 12. New-Chat Startup Prompt

Use this exact prompt when opening a new Codex thread for the next Remake step:

```text
请先阅读 docs/shadowedge-full-migration-handoff-20260609.md。
我们继续 ShadowEdge Video Remake。
当前下一步是 Remake-D1.1：真实生成 1 个 Remake shot。
不要做 D2，不要批量，不要拼接。
先确认 Codex 当前 browser 登录态：
localStorage auth token + /api/auth/me 200 + email/credits 显示。
然后 Remake Analyze，再只点第一个 shot 的 Generate shot。
```
