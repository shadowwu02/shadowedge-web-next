# Main-G1-I-B Image Reuse Draft Bridge Implementation

Implementation date: 2026-07-06

Scope: frontend implementation and local checks only. No deployment, SQL execution, environment changes, provider calls, generation, upload, billing, backend changes, Admin changes, Video reuse, asset delete/rename/tag/favorite/batch actions, smoke run against production, or push actions were performed.

## Files Changed

- `src/lib/assets/assetLibraryImageHandoff.ts`
- `src/components/assets/AssetLibraryPage.tsx`
- `src/components/image/ImageWorkspace.tsx`
- `docs/runbooks/main-g1ib-image-reuse-draft-bridge-implementation.md`

## Handoff Key

LocalStorage key:

```text
shadowedge_asset_library_image_handoff_v1
```

The handoff is intentionally small and local-only. It stores only allowlisted fields:

- `assetId`
- `kind=image`
- normalized `publicUrl`
- normalized `previewUrl`
- `displayName`
- `filename`
- `mimeType`
- `sizeBytes`
- `width`
- `height`
- `source=asset-library`
- `sourceJobId`
- `createdAt`
- `updatedAt`
- `version`

It does not store:

- token values
- API keys
- Authorization headers
- Bearer values
- cookies/sessions
- raw metadata
- raw provider response
- provider endpoint values
- unnormalized `/api/uploads/...` URLs

## Asset Library Route Behavior

`/assets` now enables `Use in Image` only when all conditions are true:

- asset kind is `image`
- asset status is `ready`
- asset has a renderable normalized URL

Disabled reasons:

- `Image workspace only accepts image assets.`
- `This asset is unavailable.`
- `Missing renderable asset URL.`

Clicking `Use in Image`:

1. writes the local handoff through `saveAssetLibraryImageHandoff(asset)`
2. routes to `/workspace/image?from=asset-library`
3. does not call the backend
4. does not upload
5. does not generate
6. does not bill
7. does not mutate assets/history

`Reuse in Video` remains disabled/deferred.

## Image Workspace Consumption

`ImageWorkspace` consumes the handoff only after the Image workspace draft/model/reference restore is ready.

Consumption behavior:

1. `consumeAssetLibraryImageHandoff()` reads and removes the pending handoff.
2. `assetLibraryImageHandoffToReference()` converts it to an `ImageReferenceItem`.
3. The workspace validates:
   - normalized URL exists
   - asset is not already in current references
   - selected model accepts image references
   - selected model reference slots are not full
4. The workspace calls existing `image.addReferenceItems([reference])`.

This reuses the existing Image workspace dedupe and `maxReferences` rules.

Success notice:

```text
Asset added as a draft reference. Review it, then click Generate manually.
```

Blocked notices:

- invalid/missing URL
- already in draft
- selected model does not accept references
- selected model reference limit reached
- generic add failure

The handoff is removed after consumption, including blocked/duplicate/full cases. This avoids stale repeated attempts.

## Safety Constraints

Confirmed by implementation design:

- existing prompt is preserved
- existing selected model is preserved
- existing params are preserved
- existing references are preserved
- new asset is append-only
- no automatic Generate
- no provider call
- no upload call
- no billing/credit call
- no backend write
- no history write
- no asset table write
- no delete/rename/tag/favorite/batch action
- no Video reuse behavior added

## URL Normalization

Both handoff save and handoff-to-reference conversion use `normalizeMediaAssetUrl()`.

Safety behavior:

- `/api/uploads/...` is normalized before storage
- `https://api.shadowedgeai.com/api/uploads/...` is normalized before storage
- any value still containing `/api/uploads/` after normalization is rejected
- `blob:`, `data:`, `file:`, and `javascript:` values are rejected

## Local Checks

Required checks for this implementation:

```powershell
npm run lint
npm run build
git diff --check
```

Results are recorded in the final task output.

Actual local check results:

- `npm run lint`: passed with existing PromptStudioPage `<img>` warnings only.
- `npm run build`: passed. Next route table included `/assets` and `/workspace/image`.
- `git diff --check`: passed; PowerShell displayed Windows LF-to-CRLF working-copy warnings only.

Focused grep result:

- No new backend request helper call was added for `Use in Image`.
- No new `POST`, `PATCH`, `PUT`, or `DELETE` call was added.
- No provider, Generate, upload, billing, credit, delete, rename, tag, favorite, or batch action was added.
- Secret-like grep hits in the new helper are the reject-list patterns only, not persisted values.

## No Production Actions

This implementation did not:

- deploy
- execute SQL
- modify env
- call B.AI/OpenAI/VLM/provider
- Generate
- upload
- bill/credit
- run auto/smoke
- push

## Next Step

Proceed to Main-G1-I-C: Image reuse draft bridge default-off/draft-only safety review and push readiness.

The review should verify:

- no backend calls from `Use in Image`
- no Generate path touched
- handoff contains no secrets/raw metadata
- `/api/uploads/...` does not persist into handoff or reference item
- duplicate/full/invalid cases remove the handoff safely
- existing Image workspace draft behavior remains intact
