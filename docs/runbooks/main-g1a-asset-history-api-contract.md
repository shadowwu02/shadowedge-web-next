# Main-G1-A Asset and History API Contract

Audit date: 2026-07-06

Scope: contract design and code audit only. No code changes, deployment, SQL execution, environment changes, provider calls, generation, upload, or billing actions were performed.

## Repositories Checked

| Area | Path | Files audited |
| --- | --- | --- |
| Main frontend | `C:\Users\WEll\Documents\shadowedge-web-next` | `src/lib/assets-api.ts`, `src/lib/media-assets.ts`, `src/types/image.ts`, `src/types/video.ts`, Image/Video pickers, Image/Video/Global History helpers |
| Backend API | `C:\Users\WEll\Documents\New project\shadowedge-api` | `routes/assets.js`, `services/media-assets-service.js`, `sql/20260630_media_assets.sql`, image/video upload and history paths |

## V1 Decision

Asset Library v1 should use the existing `GET /api/assets` endpoint only.

V1 should not require:
- SQL migration,
- new write API,
- delete,
- rename,
- tags/folders/favorites,
- provider calls,
- Generate,
- upload,
- billing,
- Admin-only audit data.

V1 should be a user-facing read-only asset center plus safe draft reuse bridge.

## Existing API Inventory

### `GET /api/assets`

Backend files:
- `routes/assets.js`
- `services/media-assets-service.js`

Auth:
- Requires user Bearer token.
- Uses Supabase auth user.
- Returns only rows owned by the authenticated user.

Supported query params:

| Query | Current behavior |
| --- | --- |
| `type` | Filters `image`, `video`, or `audio`. Invalid values are ignored. |
| `status` | Filters `ready`, `failed`, `unavailable`, or `deleted`. Invalid values are ignored. |
| `source` | Filters `uploaded`, `generated`, `prompt_studio`, or `imported`. Invalid values are ignored. |
| `search` | Sanitized search against `display_name` and `filename`. |
| `limit` | Defaults to 50, min 1, max 100. |
| `cursor` | Offset-style cursor. Parsed as integer offset. |

No other query params are currently supported.

Current backend response shape:

```json
{
  "ok": true,
  "assets": [],
  "nextCursor": "50"
}
```

Current frontend client also tolerates an envelope under `data`, but the backend route returns top-level `assets` and `nextCursor`.

Returned asset fields:

| Backend DB field | Client field | Notes |
| --- | --- | --- |
| `id` | `id` | Returned. |
| `type` | `type` | Returned as image/video/audio. |
| `source` | `source` | Returned as uploaded/generated/prompt_studio/imported. |
| `status` | `status` | Returned. |
| `public_url` | `url`, `publicUrl` | Returned in both normalized client keys. |
| `filename` | `filename` | Returned. |
| `display_name` | `displayName` | Returned; falls back to filename in service normalization. |
| `mime_type` | `mimeType` | Returned. |
| `size_bytes` | `sizeBytes` | Returned. |
| `width` | `width` | Returned. |
| `height` | `height` | Returned. |
| `duration_seconds` | `durationSeconds` | Returned. |
| `created_at` | `createdAt` | Returned. |
| `last_used_at` | `lastUsedAt` | Returned. |
| `metadata` | `metadata` | Returned through a safe allowlist. |

Fields present in DB but hidden from current client response:
- `user_id`
- `storage_provider`
- `storage_key`
- `storage_path`
- `deleted_at`
- `updated_at`

Deleted filtering:
- If no valid `status` filter is supplied, the service applies `status != deleted`.
- If `status=deleted` is explicitly supplied, deleted rows may be returned.
- V1 Asset Library should default to non-deleted assets and should not expose deleted assets unless a later restore/manage flow is approved.

Metadata returned today:

The backend service currently allowlists these metadata keys:

```ts
[
  "originalName",
  "sourceEndpoint",
  "uploadType",
  "provider",
  "jobId",
  "model",
  "outputType",
  "promptSummary",
  "width",
  "height",
  "durationSeconds"
]
```

### `POST /api/assets/from-job/:jobId`

Backend file:
- `routes/assets.js`

Auth:
- Requires user Bearer token.
- Looks up generation job owned by the authenticated user.

Input:

```json
{
  "kind": "image",
  "displayName": "Generated image",
  "outputUrl": "https://api.shadowedgeai.com/uploads/generated/example.png"
}
```

Input contract:

| Field | Required | Notes |
| --- | --- | --- |
| `kind` | yes | Only `image` and `video` are currently accepted. |
| `displayName` | no | Trimmed to 180 chars; falls back to generated default. |
| `outputUrl` | no | If supplied, must be one of the job's collected output URLs. If omitted, first output URL is used. |

Supported job types:
- `image`
- `video`

Not supported today:
- `remake` as a separate `kind`.

Ownership validation:
- If `jobId` looks like UUID, backend looks up `generation_jobs.id`.
- Otherwise backend looks up `generation_jobs.provider_job_id`.
- Query is scoped by `user_id` and `type`.

Completed status validation:
- Accepted completed statuses: `completed`, `succeeded`, `success`, `done`.
- Non-completed jobs are rejected.

Duplicate behavior:
- Backend checks generated assets for the same `user_id`, `source=generated`, same `public_url`, and `status != deleted`.
- If found, returns existing asset with `alreadyExists: true`.

Output:

```json
{
  "ok": true,
  "asset": {
    "id": "...",
    "type": "image",
    "source": "generated",
    "status": "ready",
    "url": "...",
    "publicUrl": "...",
    "filename": "...",
    "displayName": "...",
    "mimeType": "image/png",
    "sizeBytes": null,
    "width": null,
    "height": null,
    "durationSeconds": null,
    "createdAt": "...",
    "lastUsedAt": null,
    "metadata": {
      "jobId": "...",
      "providerJobId": "...",
      "model": "...",
      "outputType": "image",
      "promptSummary": "..."
    }
  },
  "alreadyExists": false
}
```

Failure states:

| Error | Status | Meaning |
| --- | --- | --- |
| `INVALID_ASSET_KIND` | 400 | `kind` is not image/video. |
| `JOB_NOT_FOUND` | 404 | Owned generation job was not found. |
| `JOB_NOT_COMPLETED` | 400 | Job is not completed. |
| `INVALID_OUTPUT_URL` | 400 | `outputUrl` is not an HTTP(S) URL. |
| `OUTPUT_URL_NOT_IN_JOB` | 400 | Requested URL is not one of job outputs. |
| `OUTPUT_URL_NOT_FOUND` | 400 | No reusable output URL found. |
| `SAVE_ASSET_FAILED` | 500 | Insert or server error. |

### Upload Paths That Create Assets

Image upload:
- `POST /api/image/upload`
- Creates uploaded image asset when DB insert succeeds.
- Returns `assetId` if available.

Video/media upload:
- `POST /api/upload-media`
- Creates uploaded image/video/audio asset when DB insert succeeds.
- Returns `assetId` if available.

Important caveat:
- Upload may still return a usable file URL if media asset insert fails, so some historical uploads may not appear in `/api/assets`.

### Static Upload URL Contract

Backend static route:
- `/uploads`

Not a route:
- `/api/uploads`

Frontend must normalize any stale `/api/uploads/...` reference to `/uploads/...`.

## Frontend Type Inventory

### Current `MediaAssetRecord`

File: `src/lib/assets-api.ts`

Current shape:

```ts
type MediaAssetRecord = {
  id: string;
  type: "image" | "video" | "audio";
  source?: "uploaded" | "generated" | "prompt_studio" | "imported" | string;
  status?: "ready" | "failed" | "unavailable" | "deleted" | string;
  url?: string | null;
  publicUrl?: string | null;
  filename?: string | null;
  displayName?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  width?: number | null;
  height?: number | null;
  durationSeconds?: number | null;
  createdAt?: string | null;
  lastUsedAt?: string | null;
  metadata?: Record<string, unknown> | null;
};
```

Observation:
- This can be the raw API type.
- A stricter `UserAsset` UI contract should be layered on top rather than replacing this immediately.

### Current `UploadMediaItem`

File: `src/types/video.ts`

Used by:
- Video upload slots.
- Video media picker.
- Video reference tray.
- Reuse generated result as reference.

Observation:
- Good runtime shape for Video workspace references.
- It is not rich enough as a complete asset library card because it lacks source trace, safe metadata, updated time, and action capability flags.

### Current `ImageReferenceItem`

File: `src/types/image.ts`

Used by:
- Image reference tray.
- Image upload.
- Image asset picker.

Observation:
- Good runtime shape for Image reference selection.
- It should be produced from `UserAsset` for Image reuse.

### Current History Types

Files:
- `src/types/image.ts`
- `src/types/video.ts`
- `src/components/history/GlobalHistoryPage.tsx`
- `src/lib/image/imageHistoryUtils.ts`
- `src/lib/video/historyUtils.ts`

Current:
- `ImageHistoryItem` is normalized around image jobs.
- `VideoTaskRecord` / `VideoHistoryItem` are normalized around video jobs.
- `GlobalHistoryPage` creates an internal `GlobalHistoryItem` union for image/video/remake.

Observation:
- Global History already proves a unified history model is possible.
- For v1 stabilization, a formal `HistoryItem` contract should align Global History, Asset Library source trace, and workspace detail panels.

## Proposed Asset Library V1 Contract

### `AssetKind`

```ts
type AssetKind = "image" | "video" | "audio";
```

### `AssetStatus`

```ts
type AssetStatus = "ready" | "failed" | "unavailable" | "deleted";
```

### `AssetSource`

```ts
type AssetSource =
  | "uploaded"
  | "generated"
  | "prompt_studio"
  | "imported";
```

Do not introduce `saved_from_output` in backend v1 because current backend stores saved generated outputs as `source=generated`. If the UI needs copy distinction, derive it from `sourceTrace.origin`.

### `AssetSourceTrace`

```ts
type AssetSourceTrace = {
  jobId?: string;
  providerJobId?: string;
  model?: string;
  promptSummary?: string;
  outputType?: AssetKind;
  origin?: "upload" | "saved_from_output" | "prompt_studio" | "imported" | "unknown";
  projectId?: string; // future
  canvasId?: string; // future
};
```

Mapping rules:
- `metadata.jobId` => `sourceTrace.jobId`
- `metadata.providerJobId` => `sourceTrace.providerJobId`
- `metadata.model` => `sourceTrace.model`
- `metadata.promptSummary` => `sourceTrace.promptSummary`
- `metadata.outputType` => `sourceTrace.outputType`
- `metadata.sourceEndpoint` starts with upload endpoint => `origin=upload`
- `source=generated` and metadata has job ID => `origin=saved_from_output`
- `source=prompt_studio` => `origin=prompt_studio`
- otherwise `origin=unknown`

### `UserAsset`

```ts
type UserAsset = {
  id: string;
  kind: AssetKind;
  source: AssetSource;
  status: AssetStatus;
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
  updatedAt?: string;
  lastUsedAt?: string;
  sourceTrace: AssetSourceTrace;
  safeMetadata: Record<string, string | number | boolean | null>;
};
```

V1 mapping from `MediaAssetRecord`:
- `id` => `id`
- `type` => `kind`
- `source` => `source`
- `status` => `status`
- `publicUrl || url` normalized => `url`
- `thumbnailUrl` is not currently returned; for images use `url`, for video/audio leave undefined unless backend adds a safe thumbnail.
- `displayName` => `displayName`
- `filename` => `filename`
- `mimeType` => `mimeType`
- `sizeBytes` => `sizeBytes`
- `width` => `width`
- `height` => `height`
- `durationSeconds` => `durationSeconds`
- `createdAt` => `createdAt`
- `lastUsedAt` => `lastUsedAt`
- `updatedAt` is not currently returned; leave undefined in v1.
- `metadata` safe allowlist => `safeMetadata` and `sourceTrace`.

### `AssetListQuery`

```ts
type AssetListQuery = {
  kind?: AssetKind; // maps to backend type
  type?: AssetKind; // backend-compatible alias if needed
  source?: AssetSource;
  status?: AssetStatus;
  search?: string;
  limit?: number;
  cursor?: string | null;
};
```

Frontend should prefer `kind` internally and map to backend `type`.

### `AssetListResponse`

```ts
type AssetListResponse = {
  assets: UserAsset[];
  nextCursor: string | null;
  hasMore: boolean;
};
```

Mapping:
- backend `assets` => `UserAsset[]`
- backend `nextCursor` => `nextCursor`
- `hasMore = Boolean(nextCursor)`

## Proposed History V1 Contract

### `HistoryKind`

```ts
type HistoryKind = "image" | "video" | "remake";
```

### `HistoryStatus`

```ts
type HistoryStatus = "completed" | "failed" | "processing" | "unknown";
```

### `HistoryOutput`

```ts
type HistoryOutput = {
  url: string;
  kind: AssetKind;
  thumbnailUrl?: string;
  saveable: boolean;
  downloadable: boolean;
  assetId?: string;
  outputIndex: number;
};
```

Rules:
- `saveable=true` only for completed image/video outputs with a stable HTTP(S) URL and known job ID.
- `downloadable=true` only when URL is HTTP(S), blob, or another browser-renderable safe media URL.
- `assetId` is optional future enhancement. Current history responses do not consistently identify whether output is already saved.

### `HistoryError`

```ts
type HistoryError = {
  code?: string;
  message: string;
  publicMessage?: string;
  reasonCode?: string;
  refunded?: boolean;
  refundStatus?: string;
  materialIssue?: boolean;
};
```

### `HistoryItem`

```ts
type HistoryItem = {
  id: string;
  kind: HistoryKind;
  status: HistoryStatus;
  prompt: string;
  model: string;
  jobId: string;
  providerJobId?: string;
  createdAt: string | number;
  cost?: number;
  outputs: HistoryOutput[];
  referenceAssets: UserAsset[];
  error?: HistoryError;
  refund?: {
    refunded: boolean;
    status?: string;
    amount?: number;
  };
  materialIssue?: {
    suspected: boolean;
    displayMessage?: string;
  };
};
```

## History Mapping Rules

### Image History to `HistoryItem`

Sources:
- `ImageHistoryItem`
- `getImageOutputUrls()`
- `getImageUserFacingErrorDisplay()`

Mapping:
- `dbJobId || jobId || id` => `id` and `jobId`
- `kind=image`
- image status helpers => `status`
- `prompt` => `prompt`
- `model || providerModel` => `model`
- `createdAt` => `createdAt`
- `cost || creditsCharged` => `cost`
- `outputUrls` => `outputs[]` with `kind=image`
- `referenceImages` are not fully normalized into `UserAsset` today; v1 can count/display but should not pretend all references are library assets.
- failure display helpers => `error`
- `refunded/refundStatus` => `refund`

### Video History to `HistoryItem`

Sources:
- `VideoTaskRecord`
- `getSafeVideoHistoryView()`
- `collectHistoryInputMediaAssets()`
- `getVideoUserFacingErrorDisplay()`

Mapping:
- `dbJobId || jobId || providerJobId` => `id` and `jobId`
- `kind=video` unless remake metadata indicates remake.
- safe status helpers => `status`
- `view.title` => `prompt`
- `view.modelLabel` => `model`
- `providerJobId` from raw record/meta => `providerJobId`
- `view.createdAt` => `createdAt`
- `cost_credits || meta.cost_credits` => `cost`
- `view.outputUrl` and `record.outputUrls` => `outputs[]` with `kind=video`
- `collectHistoryInputMediaAssets()` => reference assets mapped to lightweight `UserAsset` where URL exists.
- failure display helpers => `error`
- `view.refunded/refundStatus/refundNotice` => `refund`

### Remake History to `HistoryItem`

Current source:
- Remake records are represented in video history by metadata:
  - `meta.source=remake`
  - `meta.remake=true`
  - `meta.remake_source=storyboard_shot`

Mapping:
- Same as video history, but `kind=remake`.
- Include remake analysis ID / shot number in `safeMetadata` or future `remake` subfield if needed.
- Do not include Shadow VLM audit data.
- Do not treat Shadow VLM result as canonical output.

## URL Normalization Contract

All asset and history thumbnail/output URLs rendered in user-facing asset/history UI must pass through one normalization function.

Rules:
- Absolute URL with pathname `/api/uploads/...` becomes same origin `/uploads/...`.
- Relative `/api/uploads/...` becomes `${apiOrigin}/uploads/...`.
- Relative `/uploads/...` becomes `${apiOrigin}/uploads/...`.
- Preserve valid absolute non-upload URLs.
- Do not double-prefix already absolute URLs.
- Do not invent URL when no safe URL exists.
- If no usable URL exists, show placeholder/empty state instead of broken image.

Examples:

```ts
"https://api.shadowedgeai.com/api/uploads/images/a.png"
// => "https://api.shadowedgeai.com/uploads/images/a.png"

"/api/uploads/videos/a.mp4"
// => "https://api.shadowedgeai.com/uploads/videos/a.mp4"

"/uploads/audio/a.wav"
// => "https://api.shadowedgeai.com/uploads/audio/a.wav"
```

## Safe Metadata Allowlist

Asset Library v1 may display only:
- `jobId`
- `providerJobId`
- `model`
- `promptSummary`
- `outputType`
- `width`
- `height`
- `durationSeconds`
- `source`
- `sourceEndpoint`
- `uploadType`
- `originalName`
- `createdAt` if present in a future safe metadata field

Do not display:
- `apiKey`
- `authorization`
- `bearer`
- `token`
- `secret`
- `rawProviderResponse`
- `providerEndpoint`
- cookies
- auth headers
- private prompt fields if unsafe
- signed URLs with embedded secrets
- full provider payloads
- raw backend metadata dumps

If a key name is safe but could be confused with a secret signal, render it in user-safe copy. For example:
- `sourceEndpoint` may be shown as "Source: upload".
- Avoid showing literal endpoint paths unless needed.

## Allowed V1 Actions

Asset Library v1 allowed actions:
- open asset URL,
- copy asset URL,
- copy job ID when present in source trace,
- download,
- reuse image asset in Image workspace as draft/reference,
- reuse image/video/audio asset in Video workspace as draft/reference.

All allowed actions must be read-only or draft-only.

## Forbidden V1 Actions

Asset Library v1 must not include:
- delete,
- rename,
- tags,
- folders,
- favorites,
- hard file deletion,
- provider trigger,
- Generate,
- retry/rerun provider,
- billing/refund,
- Admin audit,
- Shadow VLM audit,
- environment toggles,
- project/canvas binding writes.

## Draft Bridge Contract

Asset reuse should use existing draft/local route-state patterns.

Rules:
- Image asset to Image workspace:
  - add as reference draft,
  - route to `/workspace/image`,
  - no automatic generation.
- Image asset to Video workspace:
  - add as image reference draft,
  - route to `/workspace/video`,
  - no automatic generation.
- Video asset to Video workspace:
  - add as video reference draft,
  - route to `/workspace/video`,
  - no automatic generation.
- Audio asset to Video workspace:
  - add as audio reference draft,
  - route to `/workspace/video`,
  - no automatic generation.
- Respect model reference rules after landing in the workspace.
- If current selected video model does not support the reference kind, show blocked/needs model change state.
- Do not charge credits.
- Do not call provider.
- Do not upload a copy of an already remote asset.

## V1 API Decision

Use for first Asset Library shell:
- `GET /api/assets`

Do not require for first shell:
- `GET /api/assets/:id`
- unified `GET /api/history`
- SQL migration
- write APIs

Implementation note:
- If the route needs detail view, derive it from the list item initially.
- Add detail endpoint later only if list payload proves insufficient.

## Future API Contracts Requiring Separate Approval

Read-only:
- `GET /api/assets/:id`
- `GET /api/history` unified image/video/remake history
- `GET /api/assets/:id/source-trace`

Write:
- `PATCH /api/assets/:id` for rename or safe metadata edits
- `DELETE /api/assets/:id` soft delete
- `POST /api/assets/:id/used` last-used update
- tag/folder/favorite APIs
- project/canvas bind/unbind APIs

Potential SQL:
- tags/folders/favorites tables or JSON contract
- project asset binding table
- canvas asset binding table
- asset usage events table

No future API should hard-delete files or clean object storage without a separate high-risk approval package.

## Acceptance Criteria for Main-G1-B

The first Asset Library route should:
- call only `GET /api/assets`,
- require normal user auth,
- render assets using `UserAsset` mapping,
- show loading/empty/error/auth states,
- filter by kind/source/status/search,
- show safe source trace,
- support open/copy/download,
- support draft-only reuse to Image/Video workspace,
- not call provider,
- not generate,
- not upload,
- not bill,
- not mutate assets/history.

## Next Recommended Phase

Proceed to Main-G1-B: frontend Asset Library route shell, read-only list.

Recommended scope:
- Add `/assets`.
- Use existing `listMediaAssets()`.
- Add a `UserAsset` mapper in frontend code.
- Render cards and filters.
- Include draft reuse bridge only if it reuses existing safe bridge code.
- Keep delete/rename/tags out.

## Safety Confirmation for This Round

This contract audit did not:
- change application code,
- deploy,
- execute SQL,
- modify environment variables,
- call B.AI/OpenAI/VLM/provider,
- run Generate,
- upload files,
- perform billing or credit actions,
- push commits.
