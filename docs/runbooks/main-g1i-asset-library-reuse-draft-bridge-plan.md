# Main-G1-I Asset Library Reuse Draft Bridge Plan

Audit date: 2026-07-06

Scope: planning and code audit only. No code changes, deployment, SQL execution, environment changes, provider calls, generation, upload, billing, smoke run, or push actions were performed.

## Current Disabled State

Asset Library v1 is production deployed as a read-only route at `/assets`.

Current reuse buttons in `src/components/assets/AssetLibraryPage.tsx` are intentionally disabled:

- `Reuse in Image`
- `Reuse in Video`

The buttons only render disabled UI with a draft-bridge deferral title. They do not write localStorage, do not route to a workspace, do not call an API, do not upload, do not generate, and do not bill.

The `/assets` page currently reads user assets through:

- `src/lib/assets-api.ts`
- `listMediaAssets()`
- `mapMediaAssetsToUserAssets()`

The current `UserAsset` model has the data needed for draft reuse:

- `id`
- `kind`
- `status`
- `publicUrl`
- `previewUrl`
- `displayName`
- `filename`
- `mimeType`
- `sizeBytes`
- `width`
- `height`
- `durationSeconds`
- `source`
- `sourceTrace.jobId`
- `sourceTrace.providerJobId`
- `sourceTrace.model`
- `sourceTrace.promptSummary`

## Image Bridge Inventory

Relevant files:

- `src/components/image/ImageWorkspace.tsx`
- `src/components/image/ImageReferenceTray.tsx`
- `src/hooks/useImageGeneration.ts`
- `src/lib/image/imageWorkspaceDraft.ts`
- `src/lib/image/imageResultDrafts.ts`
- `src/lib/assets-api.ts`
- `src/types/image.ts`

Existing Image workspace draft storage:

- key: `shadowedge_image_workspace_draft_v1`
- module: `src/lib/image/imageWorkspaceDraft.ts`
- reader: `readImageWorkspaceDraft()`
- writer: `saveImageWorkspaceDraft()`
- reference restore: `getImageReferencesFromDraft()`
- TTL: 24 hours

Existing Image workspace behavior:

- `useImageGeneration()` restores the draft after model loading.
- It selects the draft model when available, otherwise the default model.
- It normalizes params for the selected model.
- It restores references only up to `selectedModel.capabilities.maxReferences`.
- It auto-saves prompt, params, selected model, and references after draft readiness.
- It does not generate until the user manually clicks Generate.

Existing Image reference add behavior:

- `ImageReferenceTray` already supports adding image assets from `GET /api/assets?status=ready&type=image`.
- `ImageReferenceTray` uses `mediaAssetToImageReferenceItem()`.
- `useImageGeneration.addReferenceItems()` deduplicates by `id`, `url`, and `assetId`.
- It enforces `selectedModel.capabilities.maxReferences`.
- It returns false if nothing is added.

Important implementation note:

- `mapMediaAssetToUserAsset()` normalizes asset URLs through `normalizeMediaAssetUrl()`.
- `mediaAssetToImageReferenceItem()` currently uses `asset.publicUrl || asset.url` directly. Future bridge work should normalize this path before writing a draft so `/api/uploads/...` can never reappear in Image references.

## Video Bridge Inventory

Relevant files:

- `src/components/video/VideoWorkspace.tsx`
- `src/components/video/ReferenceMediaTray.tsx`
- `src/components/video/MediaPickerDrawer.tsx`
- `src/lib/video/videoDraft.ts`
- `src/lib/video/videoResultDrafts.ts`
- `src/lib/video/videoReferenceRules.ts`
- `src/lib/assets-api.ts`
- `src/lib/media-assets.ts`
- `src/types/video.ts`

Existing Video workspace draft storage:

- key: `shadowedge_video_create_draft_v1`
- module: `src/lib/video/videoDraft.ts`
- reader: `readVideoDraft()`
- writer: `saveVideoDraft()`

Video draft fields:

- `prompt`
- `modelId`
- `providerModel`
- `modelLabel`
- `params`
- `referenceMedia`
- `mentionBindings`
- `updatedAt`

Existing Video workspace behavior:

- `VideoWorkspace` reads the video draft while loading model registry.
- It restores prompt, media, params, selected model, and mention bindings.
- It auto-saves later changes with a short debounce.
- It does not generate until the user manually clicks Generate.

Existing Video asset picker behavior:

- `MediaPickerDrawer` already loads ready assets through `GET /api/assets?limit=100&status=ready`.
- It maps records with `mediaAssetToUploadMediaItem()`.
- It supports image, video, and audio assets.
- It validates selected assets against the current `VideoModelRule`.
- It blocks unsupported media type, unsupported slot, duplicate, type limit, and total limit cases.
- It does not allow removing Asset Library rows from the picker because they are not upload-cache rows.

Existing Video reference tray behavior:

- `ReferenceMediaTray` computes model issues with `getReferenceMediaIssues()`.
- It displays unsupported media as "not used".
- It supports roles `reference`, `start_frame`, and `end_frame`.
- Start/end frame roles require image assets and model support.
- Mention tokens are inserted by user action only through the tray.

Existing Video draft sanitization:

- `saveVideoDraft()` keeps only ready remote media.
- It rejects transient `blob:` and non-remote media.
- It preserves `assetId`, `type`, `role`, `source`, `name`, `previewUrl`, `url`, `size`, `mimeType`, `filename`, `originalName`, `duration`, and `uploadStatus`.
- It sanitizes mention bindings against the prompt and final media list.

## Recommended Reuse Behavior

General rules:

- Reuse must be draft-only.
- Reuse must never auto-generate.
- Reuse must never upload/copy the file.
- Reuse must never call provider services.
- Reuse must never bill or refund credits.
- Reuse must never mutate backend DB rows.
- Reuse must never expose Admin-only or Shadow VLM data.

Asset action matrix:

| Asset kind | Use in Image | Use in Video | Reason |
| --- | --- | --- | --- |
| image | Enabled | Enabled | Image workspace supports image references; Video workspace can use images when model rules allow. |
| video | Disabled | Enabled | Image workspace does not support video references; Video workspace can use video references when model rules allow. |
| audio | Disabled | Enabled | Image workspace does not support audio references; Video workspace can use audio references when model rules allow. |
| unknown/unavailable | Disabled | Disabled | Missing or unsafe draft contract. |

Button enablement should additionally require:

- asset status is `ready`
- asset has a normalized renderable URL
- asset kind is supported for the target workspace
- no visible raw metadata is needed

Recommended UX:

- Click `Use in Image` for an image asset:
  - append the asset as an Image workspace reference draft,
  - preserve existing Image draft prompt/model/params when possible,
  - route to `/workspace/image?from=asset-library`,
  - show a notice: "Asset added as a draft reference. Review it, then click Generate manually."
- Click `Use in Video` for image/video/audio:
  - append the asset as a Video workspace reference draft,
  - preserve existing Video draft prompt/model/params/mention bindings when possible,
  - route to `/workspace/video?from=asset-library`,
  - show a notice: "Asset added as draft media. Review model compatibility, then click Generate manually."
- Unsupported buttons should be visible but disabled with explicit reasons:
  - "Image workspace only accepts image assets."
  - "This asset is unavailable."
  - "Missing renderable asset URL."

## Image Draft Data Contract

Future Image bridge should create an `ImageReferenceItem` from `UserAsset`:

```ts
{
  id: `asset-library:${asset.id}`,
  assetId: asset.id,
  type: "image",
  name: asset.displayName || asset.filename || "Image asset",
  url: normalizeMediaAssetUrl(asset.publicUrl),
  previewUrl: normalizeMediaAssetUrl(asset.previewUrl || asset.publicUrl),
  size: asset.sizeBytes,
  mimeType: asset.mimeType,
  width: asset.width,
  height: asset.height,
  uploadStatus: "ready",
  source: "asset-library",
  uploadedAt: asset.createdAt,
}
```

Recommended write behavior:

- read existing draft with `readImageWorkspaceDraft()`
- if draft is valid:
  - preserve prompt
  - preserve modelId
  - preserve params
  - append the new reference
- if draft is missing/expired/invalid:
  - create an empty prompt draft
  - use default-safe Image workspace params
  - append the new reference
- dedupe by `assetId`, normalized URL, and id
- cap references conservatively
- never replace existing references silently
- if cap is full, do not write; show a "reference limit reached" notice

Open question for implementation:

- `saveImageWorkspaceDraft()` requires `modelId` and params. From `/assets`, the current selected Image model is not loaded. Main-G1-I-B should either:
  - reuse valid draft model/params when present and otherwise use a known default model/params helper, or
  - write a pending asset handoff key consumed by Image workspace after models load.

Safer recommendation:

- Use a pending asset handoff key for the first implementation if default model availability is uncertain.
- Let `ImageWorkspace` consume the pending asset after `image.draftReady`, then call `image.addReferenceItems()`.
- This reuses existing model-specific `maxReferences` enforcement and avoids guessing model params from `/assets`.

## Video Draft Data Contract

Future Video bridge should create an `UploadMediaItem` from `UserAsset`:

```ts
{
  id: `asset-library:${asset.id}`,
  assetId: asset.id,
  type: asset.kind,
  role: "reference",
  source: "asset-library",
  name: asset.displayName || asset.filename || `${asset.kind} asset`,
  previewUrl: normalizeMediaAssetUrl(asset.previewUrl || asset.publicUrl),
  url: normalizeMediaAssetUrl(asset.publicUrl),
  size: asset.sizeBytes,
  mimeType: asset.mimeType,
  filename: asset.filename,
  originalName: asset.sourceTrace.originalName || asset.filename,
  duration: asset.durationSeconds,
  uploadStatus: "ready",
}
```

Recommended write behavior:

- read existing video draft with `readVideoDraft()`
- preserve prompt, modelId, providerModel, modelLabel, params, and mention bindings
- append new media by `mergeMediaAssets()`
- set `source: "asset-library"`
- set default `role: "reference"`
- do not add mention tokens automatically
- route to `/workspace/video?from=asset-library`
- show an explicit "review before Generate" notice

Safer recommendation:

- Prefer a pending asset handoff key consumed by `VideoWorkspace` after model registry and `selectedModelRule` are ready.
- The consumer should validate with `validateReferenceSelectionForRule(selectedModelRule, currentMedia, [asset])`.
- If unsupported, do not append; show the localized model-rule issue.
- This avoids blind `/assets` writes that might create a draft with media unsupported by the current selected model.

## Collision and Safety Behavior

Existing draft:

- Append by default.
- Preserve prompt, model, params, and current references/media.
- Never silently replace an existing draft.

Duplicate asset:

- Treat same `assetId`, same normalized URL, or same generated handoff id as duplicate.
- Route to the workspace and show "already in draft" rather than adding another copy.

Reference slots full:

- Image: use selected model `maxReferences` after workspace loads.
- Video: use `validateReferenceSelectionForRule()` after selected model rule is known.
- If full, do not write/append and show a blocked notice.

Unsupported model:

- Image: non-image assets remain disabled in `/assets`.
- Video: image/video/audio buttons can be enabled, but final append should be guarded by current model rules.
- If the active Video model does not support the asset type, do not append or mark it as unsupported; prefer not appending with a clear notice.

Unavailable asset:

- If `status !== ready`, disable reuse.
- If URL is missing after normalization, disable reuse.
- If URL later fails to render, workspace preview can show the existing unavailable placeholder; Generate must still require ready media.

URL safety:

- Always normalize with `normalizeMediaAssetUrl()`.
- Never write `/api/uploads/...` directly to draft.
- Never store data/blob/base64 URLs from Asset Library handoff.
- Never store or display raw signed URL query secrets.

Prompt and @token behavior:

- Do not modify prompt text from `/assets`.
- Do not insert video mention tokens automatically.
- Let the user insert @ references inside Video workspace if desired.
- Existing `saveVideoDraft()` should continue sanitizing mention bindings against the prompt and reference media.

User confirmation:

- Append does not require confirmation if there is room and no duplicate.
- Replacement should require explicit confirmation, but replacement is not recommended for Main-G1-I-B/C.
- If the bridge would need to replace or clear a draft, block instead and ask the user to clear the workspace manually.

## Implementation Phases

### Main-G1-I-A - Docs and Contract Only

- Finalize this bridge plan.
- Do not change code.
- Do not deploy.

### Main-G1-I-B - Image Reuse Bridge

Recommended implementation:

- Add a small `asset-library -> image workspace` handoff helper.
- Enable `Use in Image` only for ready image assets with normalized URLs.
- On click, write a pending handoff or append safely to a valid Image draft.
- Route to `/workspace/image?from=asset-library`.
- Consume the handoff in `ImageWorkspace` after draft readiness.
- Append with `image.addReferenceItems()` to reuse existing max-reference and dedupe rules.
- Show a draft-only notice.
- Do not call Generate.

Required local tests:

- ready image asset appends to Image references
- duplicate image asset does not add twice
- full reference slots block safely
- missing URL blocks
- failed/unavailable/deleted asset blocks
- existing prompt/model/params remain intact
- no Generate/provider/upload/billing call

### Main-G1-I-C - Video Reuse Bridge

Recommended implementation:

- Add a small `asset-library -> video workspace` handoff helper.
- Enable `Use in Video` for ready image/video/audio assets with normalized URLs.
- Route to `/workspace/video?from=asset-library`.
- Consume the handoff after model registry and selected model rule are ready.
- Map to `UploadMediaItem` using a normalized `UserAsset` mapper.
- Validate with `validateReferenceSelectionForRule()`.
- Append through `mergeMediaAssets()` only when supported.
- Preserve prompt, model, params, and mention bindings.
- Show a draft-only notice.
- Do not auto-insert @ tokens.
- Do not call Generate.

Required local tests:

- ready image/video/audio asset can be handed to Video workspace when current model supports it
- unsupported type is blocked with a clear notice
- duplicate asset does not add twice
- total/type limit blocks safely
- missing URL blocks
- failed/unavailable/deleted asset blocks
- existing prompt/model/params/mention bindings remain intact
- no Generate/provider/upload/billing call

### Main-G1-I-D - Local Smoke

Run local smoke only:

- `/assets` page still loads
- `Use in Image` changes only local draft/handoff state
- `Use in Video` changes only local draft/handoff state
- Image workspace shows draft reference but does not generate
- Video workspace shows draft media but does not generate
- unsupported Video model case blocks or shows not-used state
- existing Image and Video asset pickers still work
- no backend write calls

### Main-G1-I-E - Deploy Approval

Prepare a separate deployment approval package after implementation and safety review.

Post-deploy smoke should remain UI-only:

- no provider call
- no Generate
- no upload
- no billing
- no SQL
- no env changes

## Biggest Blockers

1. Image draft from `/assets` lacks selected model context.

The Image draft writer requires modelId and params. The safest path is a pending handoff consumed inside Image workspace so the existing model-aware `addReferenceItems()` path enforces reference caps.

2. Video model rules are only reliable inside Video workspace.

The Asset Library page does not know the active selected Video model rule. The safest path is a pending handoff consumed inside Video workspace after model registry loads.

3. Avoiding silent draft overwrite.

Existing history result helpers write complete drafts. Asset Library reuse should append only, preserve current drafts, and block if append is impossible.

4. URL normalization must remain centralized.

Future bridge mappers must normalize URLs before writing drafts. `mediaAssetToImageReferenceItem()` should be adjusted or wrapped so it does not write raw `/api/uploads/...` values.

5. Notice/toast contract is not centralized for Asset Library handoff yet.

Future implementation should add explicit draft-only notices for both workspaces and avoid using any wording that implies generation has started.

## Recommended Next Step

Proceed to Main-G1-I-B: implement Image reuse bridge first.

Reason:

- image asset to image reference is the smallest surface area
- existing Image workspace already has dedupe and max-reference logic
- non-image assets can stay disabled
- no model rule matrix is needed beyond `maxReferences`

Then implement Main-G1-I-C for Video reuse after the handoff pattern is proven.

Do not start delete/rename/tags/favorites, hard delete, provider rerun, Generate actions, upload-copy behavior, billing/refund actions, or batch operations in this phase.

## This Round Prohibited Actions

For Main-G1-I:

- do not change code
- do not deploy
- do not execute SQL
- do not modify env
- do not call provider
- do not Generate
- do not upload
- do not bill/credit
- do not push unless explicitly instructed
