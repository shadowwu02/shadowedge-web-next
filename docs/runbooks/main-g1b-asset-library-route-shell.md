# Main-G1-B Asset Library Route Shell

Implementation date: 2026-07-06

Scope: frontend implementation only. No deployment, SQL execution, environment changes, provider calls, generation, upload, billing, backend changes, Admin changes, or push actions were performed.

## Files Changed

- `src/app/assets/page.tsx`
- `src/components/assets/AssetLibraryPage.tsx`
- `src/lib/assets-api.ts`
- `docs/runbooks/main-g1b-asset-library-route-shell.md`

## Route Added

`/assets`

The route uses the existing app shell and renders a standalone user-facing Asset Library page. No main navigation link was added in this phase; direct route access is supported first to keep the shell isolated.

## API Used

Only existing read API:

- `GET /api/assets`

The page passes existing supported query params only:

- `limit=100`
- `type=image|video|audio`
- `source=uploaded|generated|prompt_studio|imported`
- `search=<query>`

No write API is called. `POST /api/assets/from-job/:jobId` remains unchanged and is not used by `/assets`.

## Mapper

`src/lib/assets-api.ts` now exposes a user-facing mapper:

- `mapMediaAssetToUserAsset(asset)`
- `mapMediaAssetsToUserAssets(assets)`

The mapper converts existing backend `MediaAssetRecord` rows into a read-only `UserAsset` UI model:

- `id`
- `kind`
- `source`
- `status`
- `displayName`
- `publicUrl`
- `previewUrl`
- `thumbnailUrl`
- `createdAt`
- `filename`
- `mimeType`
- `sizeBytes`
- `width`
- `height`
- `durationSeconds`
- `sourceTrace`

## URL Normalization

The mapper reuses `normalizeMediaAssetUrl()` before rendering asset URLs.

Rules covered:

- `https://api.shadowedgeai.com/api/uploads/...` becomes `https://api.shadowedgeai.com/uploads/...`
- `https://<any-host>/api/uploads/...` becomes `https://<same-host>/uploads/...`
- `/api/uploads/...` becomes `<NEXT_PUBLIC_API_BASE_URL origin>/uploads/...`
- `/uploads/...` becomes `<NEXT_PUBLIC_API_BASE_URL origin>/uploads/...`
- Absolute non-upload URLs are preserved.

If an asset has no usable URL, the card remains visible with a placeholder preview and Open/Copy/Download disabled.

## Filters Implemented

Asset Library v1 includes:

- All
- Images
- Videos
- Audio
- Uploaded
- Generated
- Prompt Studio
- Imported
- Search input mapped to `GET /api/assets?search=...`

The page does not auto-refresh or poll. A manual Refresh list button performs only the same read-only GET request.

## Card Fields

Each card displays safe user-facing fields:

- thumbnail or placeholder
- kind/type
- source
- status
- display name / filename
- created time
- dimensions
- duration
- file size
- source trace:
  - job ID
  - provider job ID
  - model
  - output type
  - upload type
  - truncated prompt summary

No raw metadata dump is rendered.

## Actions Implemented

Read-only/local actions only:

- Open URL
- Copy URL
- Copy Job ID when present
- Download
- Manual refresh list

These actions do not call provider services, do not generate, do not upload, do not bill, and do not mutate DB state.

## Actions Deferred

Draft-only reuse is shown as disabled in this shell:

- Reuse in Image
- Reuse in Video

Reason: existing Image/Video draft bridges are currently oriented around history result records, not the generic `UserAsset` model. Connecting the bridge safely should be a separate Main-G1-D implementation with explicit tests for draft-only behavior and no automatic Generate.

## Safe Metadata Allowlist

The page only displays:

- `jobId`
- `providerJobId`
- `model`
- `promptSummary`
- `outputType`
- `width`
- `height`
- `durationSeconds`
- `source`
- `uploadType`
- `originalName`

The page does not display:

- API keys
- Authorization headers
- Bearer tokens
- cookies
- session values
- secrets
- raw provider responses
- provider endpoints
- signed URL internals
- raw metadata JSON

## Forbidden Actions Confirmed

Not implemented:

- Delete
- Rename
- Tags
- Folders
- Favorites
- Hard file delete
- Provider trigger
- Generate
- Retry/rerun provider
- Upload
- Billing/refund
- Admin audit
- Shadow VLM audit
- Environment toggle
- Batch action
- Auto refresh/polling

## Local Checks

Completed:

- `npm run lint` passed. Existing warnings remain in `src/components/prompt-studio/PromptStudioPage.tsx` for pre-existing `<img>` usage; no new lint errors.
- `npm run build` passed. The Next route table includes `/assets`.
- `git diff --check` passed with only the existing Windows line-ending notice for `src/lib/assets-api.ts`.

## Next Recommendation

Proceed to Main-G1-C for push readiness and route safety review, then separately approve any deployment. Keep draft reuse disabled until Main-G1-D defines a safe asset-to-workspace draft bridge.
