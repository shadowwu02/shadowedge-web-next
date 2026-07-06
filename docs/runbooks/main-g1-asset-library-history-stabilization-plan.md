# Main-G1 Asset Library and History Stabilization Plan

Audit date: 2026-07-06

Scope: code audit and planning only. No code changes, deployment, SQL execution, environment changes, provider calls, generation, upload, or billing actions were performed.

## Repositories Checked

| Area | Path | Notes |
| --- | --- | --- |
| Main frontend | `C:\Users\WEll\Documents\shadowedge-web-next` | Asset API client, media normalization, Image/Video workspaces, Global History, media picker, Save to Assets |
| Backend API | `C:\Users\WEll\Documents\New project\shadowedge-api` | `/api/assets`, `/api/assets/from-job/:jobId`, image/video history/status/upload, static `/uploads`, `media_assets` schema |
| Admin frontend | `C:\Users\WEll\Documents\shadowedge-admin-next` | Admin jobs, Prompt Studio asset/project audit, material issue refund, shadow audit panel |

## Current State Summary

ShadowEdge already has the foundation for an asset library:

- A backend `media_assets` table exists.
- Uploaded image/video/audio media can create `media_assets` rows.
- Generated image/video outputs can be saved into `media_assets` through `/api/assets/from-job/:jobId`.
- The main frontend can list user assets through `/api/assets`.
- Image and Video reference pickers can use assets.
- Workspace-level Image and Video history panels support Save to Assets and reuse flows.

The missing piece is a first-class user Asset Library and a stabilized, consistent History surface. The existing pieces are distributed across workspaces and are not yet a single user asset center.

## Frontend Inventory

### Asset API Client

File: `src/lib/assets-api.ts`

Current capabilities:
- `listMediaAssets(options)` calls `GET /api/assets`.
- `saveAssetFromJob(jobId, input)` calls `POST /api/assets/from-job/:jobId`.
- `mediaAssetToUploadMediaItem(asset)` converts a backend asset into a Video workspace media item.
- `mediaAssetToImageReferenceItem(asset)` converts a backend image asset into an Image reference item.

Gaps:
- No frontend API method for delete/remove asset.
- No frontend API method for rename.
- No frontend API method for tags/folders/favorites.
- No frontend API method for update last-used.
- No frontend project-binding method.
- `mediaAssetToImageReferenceItem` uses the public URL directly; rendering components currently normalize again, but the mapper should eventually return normalized URL fields for consistency.

### Media Normalization and Local Assets

File: `src/lib/media-assets.ts`

Current capabilities:
- `normalizeMediaAssetUrl()` fixes `/api/uploads/...` into `/uploads/...`.
- Handles absolute and relative upload URLs.
- Local upload asset cache exists under `shadowedge_local_upload_assets_v1`.
- `normalizeMediaAsset()` maps varied backend/raw fields into `UploadMediaItem`.
- `collectHistoryInputMediaAssets()` extracts reusable input/reference media from history records.
- Local asset remove exists only for local cached assets.

Gaps:
- No single shared `UserAsset` type for all user-facing asset surfaces.
- Local cache and server asset library are still separate concepts.
- No explicit source trace model across uploaded/generated/prompt-studio/saved-from-output.
- No project binding model.

### Save to Assets

File: `src/components/assets/SaveToAssetsButton.tsx`

Current capabilities:
- Saves completed generated image/video output into asset library.
- Handles already-saved, auth, and error states.
- Used in image output/detail/history and video output/detail/history.

Gaps:
- Button is distributed across output panels; no central saved asset view.
- No post-save navigation to a library.
- No update of `lastUsedAt`.
- No bulk save.

### Image Workspace Asset Usage

Files:
- `src/components/image/ImageReferenceTray.tsx`
- `src/components/image/ImageHistoryPanel.tsx`
- `src/components/image/ImageOutputDetailPanel.tsx`
- `src/components/image/ImageOutputStage.tsx`

Current capabilities:
- Image reference tray can open an asset picker.
- Asset picker loads ready image assets from `/api/assets`.
- Image history supports download, Save to Assets, copy prompt, use as image reference, send to video draft, retry failed as draft, and detail view.
- Image output detail supports copy URL, open, Save to Assets, download, and failure/refund copy.

Gaps:
- No standalone Image asset library route.
- Hide/delete action in Image history is currently disabled or draft-only.
- No asset rename/tag/favorite.
- No source trace UI beyond limited metadata.
- Image picker is modal-only and not a full library.

### Video Workspace Asset Usage

Files:
- `src/components/video/MediaPickerDrawer.tsx`
- `src/components/video/HistoryPanel.tsx`
- `src/components/video/VideoOutputDetailPanel.tsx`
- `src/components/video/ReferenceMediaTray.tsx`
- `src/components/video/VideoWorkspace.tsx`

Current capabilities:
- Media picker has tabs for uploads, assets, history, generated, image, video, audio, elements, liked.
- Assets tab loads ready assets from `/api/assets`.
- History and generated tabs reuse local/current/history media.
- Video history supports completed/failed/processing filters.
- Video history supports download/open, Save to Assets, copy prompt, fill prompt, retry failed as draft, reuse generated result as reference, view details, and hide.
- Output detail panel displays references and can add references back to the current draft.

Gaps:
- `elements` and `liked` tabs are empty shells.
- Hide is video history-specific and maps to `historyHidden`, not asset deletion.
- No full asset management.
- No direct Asset Library route.
- No cross-workspace asset source-trace panel.

### Global History

File: `src/components/history/GlobalHistoryPage.tsx`

Current capabilities:
- Merges image and video history.
- Distinguishes image, video, and remake records.
- Filters all/image/video/remake/completed/failed/processing.
- Search by prompt/model/job/kind.
- Shows summary counts.
- Detail side panel shows prompt, type, created time, job ID, cost, outputs.
- Open/download/copy job ID/copy output URL actions exist.
- Uses normalized image/video history helpers.

Gaps:
- No Save to Assets in Global History.
- No reuse as reference in Global History.
- No retry as draft in Global History.
- No hide/delete action in Global History.
- No asset source-trace display.
- No server/local merge explanation.
- No mobile-specific audit found for dense detail panel behavior.

## Backend API Inventory

### Static Upload Route

File: `server.js`

Current:
- `/uploads` is mounted as a static route.
- `/api/uploads` is not a route.

Impact:
- Asset and history URLs should normalize to `/uploads/...`, not `/api/uploads/...`.

### Media Assets Schema

File: `sql/20260630_media_assets.sql`

Existing columns:
- `id`
- `user_id`
- `type`: image / video / audio
- `source`: uploaded / generated / prompt_studio / imported
- `status`: ready / failed / unavailable / deleted
- `storage_provider`
- `storage_key`
- `storage_path`
- `public_url`
- `filename`
- `display_name`
- `mime_type`
- `size_bytes`
- `width`
- `height`
- `duration_seconds`
- `metadata`
- `last_used_at`
- `deleted_at`
- `created_at`
- `updated_at`

Existing RLS:
- select own
- insert own
- update own

Schema observations:
- Basic Asset Library v1 read-only list does not need SQL.
- Soft delete can likely use existing `status=deleted` and `deleted_at` without migration, but still needs API implementation and separate approval.
- Rename can likely update `display_name` without migration, but still needs API implementation and separate approval.
- Tags/folders/favorites should not be rushed. They can use `metadata` initially, but a first-class tag/filter system may need migration later.
- Project/Canvas binding likely needs additional schema or a join table.

### Media Asset Service

File: `services/media-assets-service.js`

Current capabilities:
- `createMediaAssetRecord()`
- `createGeneratedMediaAssetRecord()`
- `findGeneratedMediaAssetByPublicUrl()`
- `listMediaAssets()`
- client metadata allowlist
- type/source/status normalization
- pagination by offset cursor
- filters for type, status, source, search

Gaps:
- No delete/soft-delete service method.
- No rename/update metadata service method.
- No last-used update method.
- No project binding.
- No source trace expansion beyond client-safe metadata.

### Asset Routes

File: `routes/assets.js`

Current endpoints:
- `GET /api/assets`
- `POST /api/assets/from-job/:jobId`

Current behavior:
- Admin/user auth through Supabase bearer token.
- List returns current user's non-deleted assets by default.
- Save-from-job validates ownership, job kind, completed status, and output URL belongs to the job.
- Duplicate generated assets are detected by `public_url`.
- Generated asset metadata includes job ID, provider job ID, model, output type, and prompt summary.

Gaps:
- No `GET /api/assets/:id`.
- No `PATCH /api/assets/:id` for rename/tag/status.
- No `DELETE /api/assets/:id` or soft-delete route.
- No `POST /api/assets/:id/used` to update last-used.
- No project/canvas binding route.

### Upload APIs

Files:
- `routes/image-v2.js`
- `routes/video.js`

Current:
- `POST /api/image/upload` inserts uploaded image assets.
- `POST /api/upload-media` inserts uploaded image/video/audio assets.
- Both return `assetId` when insert succeeds.

Gaps:
- Prompt Studio asset upload is a separate path and not obviously merged into `media_assets`.
- Upload insert failure is logged but upload can still return a usable URL without asset library row, so asset list can miss some historical uploads.

### History APIs

Files:
- `routes/image-v2.js`
- `routes/video.js`

Current:
- `GET /api/image/history`
- `GET /api/image/status`
- `GET /api/video/history`
- `POST /api/video/history`
- `DELETE /api/video/history`
- `GET /api/video/status`

Observations:
- Image history is read-only from main user perspective.
- Video history has a hide/clear path that sets `historyHidden` / `hidden` and archives rows.
- History records come from `generation_jobs`.
- Image and Video history normalize provider/job metadata independently.

Gaps:
- No unified history API for image + video + remake.
- No single shared history item contract.
- No single endpoint for history source trace.
- Video delete/hide exists, but image equivalent is not exposed.
- History delete/hide is not the same as asset delete.

### Remake / Long Video Asset Binding

Current:
- `remake_analysis_jobs.source_asset_id` references `media_assets`.
- Remake analysis audit logs also reference `source_asset_id`.

Gaps:
- This is a strong signal for future project/asset binding, but it is not yet exposed as a general user asset library relationship model.

## Admin Inventory

Admin has operational asset-adjacent visibility but not a user-facing Asset Library manager.

Relevant Admin surfaces:
- Jobs list.
- Material issue refund.
- Prompt Studio asset summary/orphans/cleanup dry-run.
- Prompt Studio project audit.
- Shadow VLM audit panel.
- Users and credit adjustments.
- Maintenance settings.

Gaps:
- No Admin user asset library list/detail surface.
- No Admin media asset delete/restore surface.
- Prompt Studio asset audit is specific to prompt-studio assets, not all `media_assets`.
- Main user Asset Library should not expose Admin-only audit or shadow VLM data.

## Current Asset / History Status

| Area | Status | Notes |
| --- | --- | --- |
| Backend asset table | Present | `media_assets` supports the basic rows needed for Asset Library v1. |
| Backend list assets | Present | `GET /api/assets` supports type/status/source/search/limit/cursor. |
| Backend save generated output | Present | `POST /api/assets/from-job/:jobId`. |
| Backend upload asset insert | Present | Image upload and video upload-media create asset rows when insert succeeds. |
| Backend asset delete | Missing | Soft-delete fields exist but no route. |
| Backend rename/tag | Missing | Fields/metadata could support some updates, but no route. |
| Backend project binding | Missing | Remake has source asset binding; generic project binding is absent. |
| Image asset picker | Present | Modal inside Image reference tray. |
| Video media picker | Present | Drawer with assets/history/generated/upload tabs. |
| Global history | Present | Aggregated browser/detail surface, but not an action-complete asset center. |
| Workspace histories | Stronger than global | Image/Video workspace histories support save/reuse/retry. |
| Full Asset Library route | Missing | No `/assets` or `/library/assets`. |

## Recommended Asset Library v1 Scope

Route:
- `/assets` or `/library/assets`

Recommended first choice:
- `/assets`

Minimum read-only features:
- List current user's assets.
- Filter all / image / video / audio.
- Filter uploaded / generated / prompt_studio / imported.
- Filter ready / failed / unavailable if useful.
- Search display name / filename.
- Show thumbnail or video preview.
- Show source trace:
  - uploaded
  - generated from job
  - saved from output
  - prompt studio
- Show metadata summary:
  - filename
  - display name
  - created time
  - duration/dimensions/size if present
  - model/job ID if present in safe metadata
- Actions:
  - open
  - copy URL
  - copy job ID if present
  - download
  - reuse in Image workspace for image assets
  - reuse in Video workspace for image/video/audio assets, respecting model rules later
- States:
  - loading
  - empty
  - auth required
  - error
  - unavailable asset

Explicitly out of v1:
- Delete.
- Rename.
- Tags/folders/favorites.
- Bulk actions.
- Provider or generation triggers.
- Admin audit data.
- Shadow VLM data.

## Recommended History Stabilization v1 Scope

Goals:
- Make Image, Video, Remake, and Global History use a more consistent frontend model.
- Bring the safest workspace actions into Global History, but only actions that do not mutate generation/billing/provider state.

Recommended v1:
- Standardize history item card fields:
  - kind
  - status
  - prompt/title
  - model
  - created time
  - output URL(s)
  - reference count
  - cost
  - failure display
  - refund/material issue display
- Standardize output URL normalization.
- Add Save to Assets to Global History completed outputs.
- Add reuse as reference/draft where existing workspace-safe bridge already exists.
- Keep retry-as-draft only if it is the same draft bridge used in workspace history.
- Keep delete/hide out of v1 unless scoped separately.

Do not add:
- Generate/rerun direct execution.
- Provider trigger.
- Billing/refund action.
- Admin material issue refund.
- Shadow VLM adoption.

## Proposed Unified Frontend Data Model

These are frontend planning types, not a code change in this round.

```ts
type AssetKind = "image" | "video" | "audio";

type AssetSource =
  | "uploaded"
  | "generated"
  | "prompt_studio"
  | "imported"
  | "saved_from_output";

type UserAsset = {
  id: string;
  userId?: string;
  kind: AssetKind;
  source: AssetSource;
  status: "ready" | "failed" | "unavailable" | "deleted";
  url: string;
  thumbnailUrl?: string;
  displayName?: string;
  filename?: string;
  mimeType?: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  durationSeconds?: number;
  createdAt?: string;
  lastUsedAt?: string;
  sourceTrace?: AssetSourceTrace;
  metadata?: Record<string, unknown>;
};

type AssetSourceTrace = {
  jobId?: string;
  providerJobId?: string;
  model?: string;
  promptSummary?: string;
  sourceEndpoint?: string;
  projectId?: string;
  canvasId?: string;
};

type AssetAction =
  | "open"
  | "copy_url"
  | "copy_job_id"
  | "download"
  | "reuse_image"
  | "reuse_video"
  | "save_to_assets"
  | "delete";

type HistoryOutput = {
  url: string;
  kind: AssetKind;
  thumbnailUrl?: string;
  saveable: boolean;
  downloadable: boolean;
};

type HistoryItem = {
  id: string;
  kind: "image" | "video" | "remake";
  status: "completed" | "failed" | "processing" | "unknown";
  prompt: string;
  model: string;
  jobId: string;
  providerJobId?: string;
  createdAt: string | number;
  outputs: HistoryOutput[];
  referenceAssets: UserAsset[];
  cost?: number;
  error?: {
    code?: string;
    message: string;
    publicMessage?: string;
    reasonCode?: string;
    refunded?: boolean;
  };
};
```

Fields already mostly available:
- asset id
- kind/type
- source
- status
- public URL
- filename/display name
- MIME/size/dimensions/duration
- created time
- job ID in generated asset metadata
- prompt summary in generated asset metadata
- output URLs from generation history
- failure/refund metadata in image/video history

Fields that likely need backend additions or normalization:
- source trace as a first-class object.
- source job/provider/model uniformly for uploaded/generated/imported/prompt_studio assets.
- thumbnail URL for video assets when not equal to public URL.
- last-used updates.
- rename/tag/favorite fields or metadata convention.
- project/canvas binding.
- asset delete/restore.

## API Gaps

Can use now:
- `GET /api/assets`
- `POST /api/assets/from-job/:jobId`
- `GET /api/image/history`
- `GET /api/image/status`
- `GET /api/video/history`
- `GET /api/video/status`
- `POST /api/video/history`
- `DELETE /api/video/history`
- `POST /api/image/upload`
- `POST /api/upload-media`
- static `/uploads/...`

Recommended read-only API additions:
- `GET /api/assets/:id`
- optional `GET /api/history` unified read-only endpoint for image/video/remake if frontend normalization becomes too complex.
- optional `GET /api/assets/:id/source-trace` if source trace should not be embedded in list response.

Recommended write APIs requiring separate approval:
- `PATCH /api/assets/:id` for display name and metadata.
- `DELETE /api/assets/:id` as soft-delete only.
- `POST /api/assets/:id/used` to update last-used.
- project/canvas bind/unbind APIs.
- tag/folder/favorite management.

SQL likely needed:
- Not needed for Asset Library v1 read-only list.
- Not needed for basic soft-delete if using existing `status=deleted` and `deleted_at`, but API implementation still needs separate approval.
- Not needed for simple rename if using existing `display_name`, but API implementation still needs separate approval.
- Likely needed for robust tags/folders/favorites.
- Likely needed for Canvas/Project binding if implemented as durable relationships instead of metadata-only.

Do not do yet:
- Hard delete uploaded files.
- R2/S3 object cleanup from user UI.
- Bulk migration of legacy local assets.
- New billing/refund operations.
- Provider/rerun/generate actions.

## Implementation Phases

### Main-G1-A: Asset / History API Contract Docs

Goal:
- Produce exact contracts for `UserAsset`, `HistoryItem`, and `HistoryOutput`.
- Decide whether v1 uses only existing `/api/assets` and frontend normalization.

No code required unless approved.

### Main-G1-B: Frontend Asset Library Route Shell

Goal:
- Add `/assets` read-only route.
- Use `GET /api/assets`.
- Provide filters, cards, empty/loading/error states, open/copy/download/reuse actions.

Safety:
- No delete.
- No rename.
- No provider/generate.
- No billing.

### Main-G1-C: History Detail Normalization

Goal:
- Make Global History and workspace histories share safer helpers for outputs, references, failure copy, and material issue display.
- Add Save to Assets to Global History if using existing safe `SaveToAssetsButton`.

Safety:
- No direct retry/generate.
- No Admin-only data.

### Main-G1-D: Save / Reuse Actions Consistency

Goal:
- Align image/video/reuse draft bridges.
- Ensure Asset Library reuse routes into Image/Video workspace drafts safely.
- Respect video model reference rules after landing in Video workspace.

Safety:
- Draft only.
- No automatic generation.

### Main-G1-E: Delete / Manage Actions

Goal:
- Add soft-delete, rename, tags/favorites only after separate approval.

Requires:
- API approval.
- Security review.
- Possibly SQL if tags/folders/favorites are first-class.

### Main-G1-F: Project / Canvas Binding Handoff

Goal:
- Define how assets attach to Prompt Studio projects and Canvas workflows.
- Prepare Main-G2 Canvas persistence and Main-G3 Project Studio split.

Requires:
- Project schema decision.
- Likely SQL or a controlled metadata contract.

## Risks

- Asset delete is dangerous because generated/uploaded URLs may be referenced by history, prompt-studio projects, remake analysis, or future canvas/project data.
- Global History can easily become too action-heavy; keep v1 read-heavy and draft-only.
- Video history hide/clear is not asset deletion and should not be presented as deleting files.
- Prompt Studio asset uploads and `media_assets` are not fully unified.
- Local upload cache and server asset records can diverge.
- Direct output URLs must stay normalized away from `/api/uploads/...`.
- Admin-only shadow audit and material refund controls must not leak into user Asset Library.
- Shadow VLM result must not be treated as canonical user-facing output.
- Any file/object cleanup should be separate from UI soft-delete and should require dedicated approval.

## Recommended Next Step

Proceed to Main-G1-A: Asset / History API contract docs.

Recommended decisions for Main-G1-A:
- Use existing `GET /api/assets` for the first read-only Asset Library route.
- Do not add SQL for v1.
- Do not add delete/rename/tags in the first implementation.
- Add source trace display only from already-safe metadata.
- Treat reuse actions as draft bridge only.
- Keep Global History stabilization separate from Asset Library route implementation if the diff grows.

## Safety Confirmation for This Round

This audit did not:
- change application code,
- deploy,
- restart services,
- execute SQL,
- modify environment variables,
- call B.AI/OpenAI/VLM/provider,
- run Generate,
- upload files,
- perform billing/credit actions,
- push commits.
