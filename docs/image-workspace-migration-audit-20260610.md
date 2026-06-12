# Image Workspace Migration Audit

Date: 2026-06-10

Scope: audit the legacy Image Workspace, the current Next.js image route, and the backend image generation surface. This document is planning-only. It does not change business code, generation payloads, credits, provider logic, or upload APIs.

## 1. Old Image Workspace File List

Primary legacy frontend:

- `C:\Users\WEll\Documents\shadowedge-workspace\wordpress-pages\08_image-workspace.html`

Supporting legacy files found during audit:

- `C:\Users\WEll\Documents\shadowedge-workspace\assets\js\se-image-api.js`
- `C:\Users\WEll\Documents\shadowedge-workspace\assets\js\se-history-common.js`
- `C:\Users\WEll\Documents\shadowedge-workspace\js\se-history.js`
- `C:\Users\WEll\Documents\shadowedge-workspace\js\se-upload.js`
- `C:\Users\WEll\Documents\shadowedge-workspace\js\se-config.js`
- `C:\Users\WEll\Documents\shadowedge-workspace\wordpress-pages\01_model-library.html`
- `C:\Users\WEll\Documents\shadowedge-workspace\wordpress-pages\09_home.html`
- `C:\Users\WEll\Documents\shadowedge-workspace\wordpress-pages\12_workspace.html`
- `C:\Users\WEll\Documents\shadowedge-workspace\wordpress-pages\13_ai-canvas.html`
- `C:\Users\WEll\Documents\shadowedge-workspace\wordpress-pages\14_anime-studio.html`

The old image workspace is mostly a single large WordPress HTML page with embedded CSS and JavaScript. It owns its own prompt, upload references, model selector, ratio/quality/batch controls, local wall/history, modal detail view, credits estimate, direct Supabase job creation, Higgsfield async submit, polling, and local recovery behavior.

## 2. Old Image Feature List

The legacy page already supports a broad image-generation workflow:

- Prompt input.
- Reference image upload and inline reference chips.
- Model selector popup.
- Ratio selector.
- Quality/resolution selector.
- Batch count, usually 1-4 depending on model.
- Dynamic credits estimate based on model, size/quality, and batch count.
- Right rail with credits, active jobs, recent creations, current model, ratio, quality, batch, and tips.
- Image wall grid for generated outputs.
- Loading cards while generation is active.
- Completed image preview cards.
- Detail modal with prompt, model, quality, size, ratio, created time, download, copy, favorite, regenerate, and reference actions.
- Local image history and restoration of pending/completed records.
- Direct loading of completed and pending `generation_jobs` rows from Supabase.
- Polling both local Higgsfield async jobs and Supabase DB job status.
- Add generated image back as reference.
- Clear local image history.

Important old UX patterns worth preserving:

- The output wall is the main stage, not a small secondary panel.
- Generation controls are always close to the prompt.
- References are visible before submission.
- Generated images can immediately become references.
- Detail modal keeps prompt and params inspectable.

Important old implementation patterns that should not be copied directly:

- Frontend directly calls Supabase RPC `create_generation_job_and_consume_credits`.
- Frontend directly queries `generation_jobs`.
- Frontend performs local credits balance mutation after job creation.
- Frontend uses a separate hard-coded image credits table.
- The page has embedded CSS/JS in one large HTML file.
- The old API wrapper calls production URLs directly.

## 3. Old API / Payload / Status / History / Credits

Legacy API wrapper:

- `ShadowEdgeImageApi.generateImage(payload)` posts to `https://api.shadowedgeai.com/api/higgsfield/generate-image-async`.
- `ShadowEdgeImageApi.getImageStatus(jobId)` reads `https://api.shadowedgeai.com/api/higgsfield/status/:jobId`.
- `ShadowEdgeImageApi.uploadImage(file)` posts to `https://api.shadowedgeai.com/api/upload-image`.

Legacy Higgsfield payload shape:

- `model`
- `prompt`
- `aspect_ratio`
- `reference_images`
- `resolution` for some Nano Banana models
- `quality` for GPT Image 2 / Seedream models
- `batch_size` for models that support batch

Legacy DB job flow:

1. Frontend validates prompt and credits.
2. Frontend creates placeholder/loading cards.
3. Frontend calls Supabase RPC `create_generation_job_and_consume_credits` with:
   - `p_type: "image"`
   - `p_model`
   - `p_prompt`
   - `p_input_image_url`
   - `p_output_count`
   - `p_cost`
   - `p_meta` including ratio, size, quality, reference images, unit cost, total cost.
4. Frontend calls Higgsfield async image API.
5. Frontend switches the local loading cards from DB job id to Higgsfield local job id.
6. Frontend polls `/api/higgsfield/status/:jobId`.
7. On provider completion, frontend writes/merges local output state and reloads profile/history.
8. If provider start fails after DB job creation, frontend falls back to polling the DB job.

Legacy credits:

- The old page uses `SE_IMAGE_CREDIT_TABLE`.
- Cost is `unitCost * batchCount`.
- It checks `profile.credits_balance` before submission.
- It deducts through Supabase RPC before provider submit.
- The browser also updates local `credits_balance` optimistically.

This is not the recommended long-term Next.js architecture. For the migrated version, image credits should follow the safer Video pattern: backend route validates auth, calculates cost, creates/charges the DB job, submits provider, records status/error, refunds on provider failure, and returns a normalized task.

## 4. Current Next Image State

Current Next route:

- `C:\Users\WEll\Documents\shadowedge-web-next\src\app\workspace\image\page.tsx`

Current state:

- `/workspace/image` exists in AppShell navigation.
- The page is a placeholder card saying the legacy image workspace remains live.
- There is no migrated Image Workspace UI.
- There is no `useImageGeneration` hook.
- There is no `src/lib/image-api.ts`.
- There are no image-specific Next model rules.
- There are no image-specific history normalization utilities.
- There are no image-specific task/status types.
- `src/i18n/dictionary.ts` has global navigation/image labels, but no full Image Workspace copy.

Reusable current frontend foundations:

- `AppShell`, `TopBar`, credits badge, language switch, and auth shell.
- `globals.css` / design-system cleanup tokens.
- Video UI patterns for premium dark panels, buttons, cards, badges, segmented controls, and output detail.
- `PromptBox` mention UX pattern, but it is currently video/media-oriented and should not be reused blindly.
- `UploadBox`, `MediaPickerDrawer`, `ReferenceMediaTray`, and `media-assets` concepts, but image references need image-specific constraints.
- `useCredits` for balance display.
- `src/lib/api.ts` request/error conventions.
- `src/lib/video/historyUtils.ts` ideas for robust output URL, meta, status, and error normalization.

Not reusable as-is:

- `useVideoGeneration`, because it assumes video task semantics, video status, video output URLs, video params, and `/api/video/*`.
- `src/lib/video-api.ts`, except as a pattern.
- `src/lib/video/videoModelRules.ts`, because image models use different aspect ratios, resolutions, quality, batch, references, and credit rules.
- Video `mediaList` payload mapping.
- Remake storyboard/queue/draft logic.

## 5. Backend Image API Current State

Mounted backend image surfaces:

- `server.js` mounts `routes/image.js` at `/api`.
- `server.js` mounts `routes/higgsfield.js` at `/api/higgsfield`.
- `server.js` also has a mock internal route under `/api/internal/image/generate`.

Relevant backend files:

- `C:\Users\WILL\Documents\shadowedge-api\routes\image.js`
- `C:\Users\WILL\Documents\shadowedge-api\routes\higgsfield.js`
- `C:\Users\WILL\Documents\shadowedge-api\services\zenmux-image-service.js`
- `C:\Users\WILL\Documents\shadowedge-api\services\image-provider.js`
- `C:\Users\WILL\Documents\shadowedge-api\config\image-models.js`
- `C:\Users\WILL\Documents\shadowedge-api\routes\internal-api.js`

`routes/image.js` currently provides:

- `POST /api/upload-image`
- `GET /api/models`
- `POST /api/generate-image`
- `POST /api/generate-image-async`

Important limitation:

- `POST /api/generate-image-async` requires a `dbJobId`.
- This implies the caller must create and charge the DB job first.
- That matches the old WordPress flow, but it does not match the safer migrated Video flow.

`routes/higgsfield.js` currently provides:

- `GET /api/higgsfield/models/raw`
- `GET /api/higgsfield/models/list`
- `GET /api/higgsfield/models`
- `POST /api/higgsfield/generate-image`
- `POST /api/higgsfield/generate-image-async`
- `GET /api/higgsfield/status/:jobId`

Higgsfield image route behavior:

- Auth is required through Bearer token.
- It validates enabled image models through an allowlist.
- It reads Higgsfield model schema JSON from server paths.
- It builds CLI args with `generate create`, `--prompt`, `--aspect_ratio`, optional `--resolution`, optional `--quality`, optional `--batch_size`, and `--image` reference inputs.
- It stores local Higgsfield jobs under `data/higgsfield-jobs`.
- Status is local JSON based, separate from `generation_jobs`.

`services/zenmux-image-service.js` behavior:

- Defines frontend model mapping for Auto, Nano Banana, Nano Banana 2, Nano Banana Pro, Seedream 5.0 Lite, Seedream 4.5, Seedream 4.0, GPT Image 2.
- Uses Replicate client style `createPrediction` / `getPrediction`.
- Normalizes aspect ratios, quality, size/resolution, count, and reference images.
- Caches generated remote images to `/uploads/generated`.

Backend gap:

- Image generation has backend pieces, but not yet a single unified migrated route equivalent to `/api/video/generate`.
- There is no confirmed `/api/image/generate` route that fully owns auth, cost calculation, DB job creation, provider submit, status normalization, history output, and refund safety in one server-side chain.
- The current `/api/higgsfield/generate-image-async` does not create/charge DB jobs.
- The current `/api/generate-image-async` can finish/refund a provided DB job, but requires the client to create that DB job first.

## 6. Best UI Plan For ShadowEdge Image Generation

Recommended direction: build Image Workspace as a first-class premium AI Studio surface, not as a direct clone of the old WordPress wall.

Preferred layout:

- Left: prompt, reference images, model, ratio, quality/resolution, batch count, seed/advanced options if needed, credits estimate, generate button.
- Center: image output stage with latest/current generation, output grid, loading cards, and empty state.
- Right: image history/detail/reference drawer with selected output details, prompt, params, references, actions, and task status.

Core user flow:

1. User writes prompt.
2. User optionally uploads reference images.
3. User chooses model.
4. UI updates ratio / quality / batch options based on model capability.
5. UI shows estimated credits.
6. User generates.
7. Center stage shows pending/loading cards.
8. On completion, image cards appear in the output grid.
9. Detail panel shows prompt, model, ratio, quality, reference count, cost, job id, and actions.
10. User can download, copy URL, reuse prompt, reuse as reference, or retry.

Minimum initial feature set:

- Text-to-image prompt.
- Reference image upload.
- Model selector.
- Ratio selector.
- Quality/resolution selector.
- Batch count where supported.
- Dynamic credits estimate.
- Generate button.
- Latest output grid.
- History list.
- Detail panel.
- Download / open / copy URL / reuse prompt / use as reference / retry.

Do not include in the first migrated release:

- Canvas editor.
- Inpaint/outpaint.
- Upscale/enhance/relight tools.
- Publish/social features.
- Complex collections.
- Advanced multi-stage workflows.

## 7. Reusable Video Workspace Modules

Can reuse directly or lightly adapt:

- App shell, top navigation, auth/credits display.
- Design tokens from UI Phase 1 and layout principles from UI Phase 2/3.
- Button, badge, card, panel, segmented filter styles.
- Generic upload style patterns.
- Generic media asset normalization ideas.
- API error sanitization patterns.
- History/detail visual patterns.
- Status polling concepts.

Should be extracted/shared before reuse:

- Upload API wrapper should become shared instead of importing `uploadMedia` from `video-api.ts`.
- Media picker should support an image-only mode and image-specific limits.
- History utilities should get a generic base layer for output URL, meta, status, and error extraction.
- Credit estimate UI should accept a domain-specific calculator.

Should remain independent:

- Image model rules.
- Image credits rules.
- Image payload builder.
- Image task hook.
- Image polling route.
- Image history normalization.
- Image output cards and image detail view.

## 8. Migration Plan

### Image-M1: Audit And Architecture Lock

Goal: lock the frontend and backend architecture before code migration.

Deliverables:

- This audit.
- Decide the canonical backend route naming.
- Decide whether first image provider is Higgsfield CLI, Replicate/Zenmux, or a provider fallback chain.
- Decide image cost source of truth.

Recommendation:

- Use backend-owned job creation and credits, modeled after Video.
- Do not keep frontend direct Supabase RPC for image generation.

### Image-M2: Backend Unified Image Generate Route

Goal: create a safe server-owned image generation chain.

Recommended route shape:

- `GET /api/image/models`
- `POST /api/image/upload`
- `POST /api/image/generate`
- `GET /api/image/status?jobId=...`
- `GET /api/image/history`

Responsibilities:

- Require user auth.
- Normalize image payload.
- Calculate cost server-side.
- Check credits.
- Create DB job and deduct credits before provider submit.
- Submit provider job.
- Store provider job id or local job id.
- Poll or allow frontend status polling.
- Complete DB job with output URLs.
- Refund on provider failure.
- Return sanitized errors.

Do not alter `/api/video/generate`.

### Image-M3: Frontend Image API And Types

Goal: add image-specific frontend API and task types.

Files to add later:

- `src/types/image.ts`
- `src/lib/image-api.ts`
- `src/lib/image/imageModelRules.ts`
- `src/lib/image/imageHistoryUtils.ts`
- `src/hooks/useImageGeneration.ts`

The hook should mirror Video ergonomics but not share video payload assumptions.

### Image-M4: Image Workspace MVP UI

Goal: replace placeholder route with real image workspace.

Recommended components:

- `src/components/image/ImageWorkspace.tsx`
- `src/components/image/ImagePromptPanel.tsx`
- `src/components/image/ImageReferenceTray.tsx`
- `src/components/image/ImageModelSelector.tsx`
- `src/components/image/ImageGenerateButton.tsx`
- `src/components/image/ImageOutputStage.tsx`
- `src/components/image/ImageHistoryPanel.tsx`
- `src/components/image/ImageOutputDetailPanel.tsx`

Initial UI should use the same premium dark/orange-gold system as Video.

### Image-M5: History And Recovery

Goal: robust completed/failed/processing recovery.

Requirements:

- Restore pending task polling after refresh.
- Show failed provider errors safely.
- Recover completed outputs from DB history.
- Do not duplicate submissions after reload.
- Allow retry from failed jobs.

### Image-M6: Reference Reuse

Goal: make generated images reusable in the same workspace.

Features:

- Use output as reference.
- Reuse prompt.
- Retry with same params.
- Copy image URL.
- Download.

### Image-M7: QA And Beta

Goal: validate without public launch.

QA checklist:

- Text-only image generation.
- One reference image.
- Multiple references up to model max.
- Different ratios.
- Different qualities/resolutions.
- Batch 1 and supported batch > 1.
- Credits estimate matches backend charged cost.
- Failed provider returns readable error and refunds.
- Refresh during processing does not duplicate jobs.
- History restores output URLs.
- Generated image can be used as reference.

### Image-M8: Advanced Tools

Only after MVP is stable:

- Upscale.
- Enhance.
- Inpaint.
- Relight.
- Canvas integration.
- Collections/projects.

## 9. P0 / P1 Risks

P0 risks before public Image Workspace launch:

- Frontend direct Supabase RPC for job creation/credits must not be retained in the migrated Next flow.
- Backend image route must own auth, credits, DB job creation, provider submit, status, completion, and refund.
- Backend and frontend image credits rules must use the same source of truth.
- Image status polling must know whether it is polling DB job id, Higgsfield local job id, or provider job id.
- Provider failures must write `error_message` and refund when appropriate.

P1 risks:

- Current backend has two image provider surfaces (`routes/image.js` and `routes/higgsfield.js`) with different job ownership models.
- Old frontend has its own image credit table that may differ from backend rules.
- Old frontend stores/merges local image history independently from server history.
- Old frontend can reference production API URLs directly, which is not ideal for local/staging environments.
- Upload limits differ by model and must be reflected in both UI and backend validation.
- Batch generation can multiply costs quickly and needs clear UX.
- Higgsfield CLI image routes should eventually get the same readiness/preflight and submit-failure safety standards that Video now has.

## 10. Recommended Next Step

Recommended next work item:

**Image-M2-Audit: unify backend image generation contract.**

Before building the Next UI, decide and implement the backend source of truth:

- Route names.
- Auth requirement.
- Request payload.
- Cost calculation.
- DB job creation.
- Provider submit.
- Status response.
- History response.
- Refund behavior.

After backend contract is safe, implement `src/lib/image-api.ts` and `useImageGeneration`, then build the MVP UI.

## 11. Do Not Do Yet

- Do not migrate the old single-page WordPress HTML directly into Next.
- Do not let the browser call Supabase RPC for credits in the new Image Workspace.
- Do not reuse `/api/video/generate` for images.
- Do not mix image references into video/remake references.
- Do not implement advanced canvas/editor tools before MVP generation is stable.
- Do not launch public image beta before credits/refund/status/history are verified.
- Do not read or expose env backups, API keys, tokens, cookies, or sessions.

