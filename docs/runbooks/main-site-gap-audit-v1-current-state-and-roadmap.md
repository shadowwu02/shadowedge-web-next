# ShadowEdge Main Site Gap Audit v1

Audit date: 2026-07-06

Scope: code audit and documentation only. No code changes, no deployment, no SQL, no environment changes, no provider calls, no generation, no upload, and no billing actions were performed for this audit.

## Repositories Checked

| Area | Path | Status at audit time |
| --- | --- | --- |
| Main frontend | `C:\Users\WEll\Documents\shadowedge-web-next` | Main site routes, workspaces, brand config, history, media assets, Prompt Studio, Canvas |
| Backend API | `C:\Users\WEll\Documents\New project\shadowedge-api` | Image/video/prompt/assets/remake/admin API contracts and static uploads route |
| Admin frontend | `C:\Users\WEll\Documents\shadowedge-admin-next` | Jobs, shadow audit panel, maintenance, user/credits, admin audit surfaces |
| Legacy workspace | `C:\Users\WEll\Documents\shadowedge-workspace` | Legacy WordPress/static workspace concepts and old studio shells |

## Executive Summary

The main site has a working generation-oriented core: image generation, video generation, history, credits display, Prompt Studio, media references, and admin-only shadow audit visibility are mostly wired. The largest remaining gaps are not around basic generate/status/history, but around higher-order product surfaces:

1. There is no full user-facing video editing workspace yet. Remake/long-video and Prompt Studio cover storyboard-style planning and shot regeneration, but not trim/cut/timeline/remix/inpaint/sound/music editing.
2. Canvas is a local-only workflow board. It is useful as a planning UI, but it has no server persistence, project data model, asset binding, direct generation execution, R2/S3 binding, layer stack, crop/mask/annotation tools, or collaboration surface.
3. Prompt Studio is feature-rich but still partly a planning/draft bridge. Project Studio and Project Library are not first-class routes.
4. Asset Library functionality exists in pieces, but there is no complete user-facing asset library with server/local merge, delete/manage, source tracing, and reuse workflows across all workspaces.
5. White-label/NewBrand support exists through brand config, but placeholder values and shared `shadowedge_*` localStorage keys create cross-brand risk unless deployment boundaries and env overrides are tightly controlled.
6. Admin has strong operational visibility compared with the main site. The main site still lacks user-facing clarity around some failure/refund/material issue states, while Admin has more diagnostic controls.

## Route Inventory

| Route | Status | Notes |
| --- | --- | --- |
| `/` | Complete / active | Main marketing entry is present. |
| `/features` | Complete / active | Informational route. |
| `/models` | Complete / active | Model marketing/catalog surface. |
| `/pricing` | Mostly complete | Pricing page exists; billing and credit behavior still depends on backend/payment flows. |
| `/faq` | Complete / active | Informational route. |
| `/contact` | Complete / active | Informational route. |
| `/sign-in` | Complete / active | Auth page exists. |
| `/sign-up` | Complete / active | Auth page exists. |
| `/forgot-password` | Complete / active | Auth recovery page exists. |
| `/reset-password` | Complete / active | Auth recovery page exists. |
| `/account` | Half-done | Account credits surface exists. Broader billing/settings/account management is not a complete product area. |
| `/history` | Mostly complete | Global image/video/remake history exists, including detail surfaces. Asset-library-grade management remains incomplete. |
| `/maintenance` | Complete / active | Maintenance display route exists. |
| `/workspace/image` | Mostly complete | Core image generation workflow is present. Remaining gaps are polish, asset library consistency, and advanced reference/project integration. |
| `/workspace/video` | Mostly complete for generation; partial for remake | Core video generation is active. Remake is advanced but still guarded. General video editing is absent. |
| `/workspace/canvas` | Legacy migration incomplete / local-only | Local planning board only; no backend persistence or direct execution. |
| `/prompt-studio` | Half-done to mostly complete | Strong prompt/project planning surface with draft bridge, but not a full Project Studio route or project asset hub. |
| `/project-studio` | Missing | Project mode is inside Prompt Studio, not a first-class page. |
| `/project-library` | Missing | Project history exists inside Prompt Studio, but no standalone library. |
| `/workspace/editor` / `/workspace/video-editor` | Missing | No dedicated video edit/timeline/cut editor route. |

## Main Workspace Feature Matrix

| Feature area | Current status | Gaps |
| --- | --- | --- |
| Image model selector | Working | Needs continued model/rules sync with backend. |
| Image prompt + references | Working | Reference flow is usable; deeper asset-library binding is incomplete. |
| Image upload | Working through `/api/image/upload` | Needs consistent asset lifecycle management. |
| Image generation/status/history | Working | Failed/retry and latest output exist; UX polish remains. |
| Image download/open/copy/save asset | Working | Save-to-assets exists; full library management missing. |
| Image credits/errors | Working | Error clarity can improve for provider/material/policy distinctions. |
| Video model rules | Working | Model matrix is complex and needs ongoing backend parity. |
| Video duration/ratio/quality | Working | Provider-specific unsupported combinations still need clearer UX. |
| Video references | Mostly working | Image/video/audio refs, upload slots, media picker, and mentions exist. Some provider-specific refs remain constrained. |
| Video @ tokens / binding | Working | Video workspace supports mention bindings and media picker. |
| Video generation/status/history | Working | Long-running status and local/server merge exist. |
| Video failed/retry/reuse | Mostly working | Retry-as-draft and reuse generated result exist. Failure taxonomy can improve. |
| Video material issue/refund display | Partial | Main can display material issue/refund states, but Admin owns the strongest operational controls. |
| Remake/long-video | Advanced but guarded | Analysis/storyboard/shot queues exist. Real VLM shadow path is admin-controlled and not user-facing. |
| Canvas | Local-only shell | No server project persistence, generation execution, asset binding, layer tools, crop/mask, or timeline editor. |
| Prompt Studio | Strong planning tool | Project Studio/Library are not first-class. Some flows are draft bridge rather than production execution. |
| Global history | Mostly working | No complete user asset library and limited bulk/manage/delete flows. |

## Image Workspace Status

The Image Workspace has the strongest end-to-end completeness among main workspace surfaces.

Present:
- Model catalog and model selector.
- Prompt panel with generation controls and credit estimate.
- Reference image upload and local reference handling.
- Backend generate/status/history integration.
- Polling/status refresh for active jobs.
- Failed job retry-as-draft flow.
- Latest output and history detail panels.
- Download/open/copy/save-to-assets flows.
- Prompt Studio draft restore/import path.
- Maintenance/auth/credit error handling.

Gaps:
- No full user-facing asset library page to manage all generated/uploaded image assets.
- Reference asset binding is not yet a project-level contract.
- Advanced edits such as crop, mask, inpaint, and layer-level image manipulation are not present in the main site.
- Error taxonomy can still be more user-friendly for material issue, policy, provider temporary failure, and parameter mismatch cases.

## Video Workspace Status

The Video Workspace supports the main create flow well and has a substantial amount of model-specific rules.

Present:
- Model rules for duration, ratio, quality, credits, and reference support.
- Image/video/audio reference handling through upload slots and media picker.
- `@` media mention binding in prompt flow.
- Generate/status/history and active task polling.
- Latest output, detail drawer, failed job retry-as-draft, copy metadata/job ID, output download/open/save-to-assets.
- Reuse generated result as reference.
- Remake mode with long-video analysis/storyboard/shot generation concepts.
- Material issue/refund status display.

Gaps:
- No general-purpose video editor.
- No trim/cut/split/timeline UI.
- No inpaint/remix/extend user-facing editor, despite backend/model naming that suggests some provider extend support exists.
- No shot-level visual editor with timeline, replacement, motion controls, sound/music controls, or prompt layer editing.
- No separate video editing route or project timeline route.
- Remake/long-video is powerful but still a guarded workflow, not broad user-facing video editing.

Recommended video editing stage: EV1. The product should first define the editing UX and backend contracts before building provider execution. Current implementation is not yet EV2 because there is no dedicated editing shell.

## Canvas / Design Editor Status

Canvas currently behaves as a local planning board rather than a production design editor.

Present:
- `/workspace/canvas` route.
- Local workflow state in `localStorage` under `shadowedge_next_canvas_workflow_v1`.
- Node/card style board with prompt, image, video, and history nodes.
- Template panel.
- Send prompt/params to Image or Video workspaces.
- Reset/save local workflow.

Missing:
- Server-side project persistence.
- Shareable project IDs.
- R2/S3 or backend asset binding.
- Asset board connected to user assets.
- Layer stack.
- Drag/drop media composition beyond local cards.
- Crop/mask/annotation tools.
- Timeline/storyboard canvas.
- Direct generation from canvas.
- Collaboration/versioning.
- Admin/project audit.

Canvas status: local-only migration shell. It should not be described as a full editor yet.

## Prompt Studio / Project Studio Status

Prompt Studio is more complete than Canvas and has several useful planning tools.

Present:
- Basic/Standard/Enhanced prompt outputs.
- Generate/optimize/convert/layer edit/storyboard/style card/reference style/project modes.
- Reference style analysis and style prompt generation.
- Project mode with shot count, style constitution, asset plan, and shot prompt packs.
- Prompt Studio projects API and local/frontend project history UI.
- Asset reference upload/bind/remove.
- Draft bridge to Image and Video workspaces.
- Workspace return state.
- Copy/send draft actions.

Gaps:
- No standalone `/project-studio` route.
- No standalone `/project-library` route.
- Project Library is not yet a first-class workspace with asset/project lifecycle management.
- Prompt Studio still mostly creates prompts/plans and draft state; it does not own execution.
- Asset Reference Binding exists but is not a universal project data model across Image, Video, Canvas, and History.

## History / Asset Library Status

Present:
- Global history route.
- Image/video/remake history merge.
- Filters for completed/failed/processing categories.
- Detail drawer for outputs and inputs.
- Output download/open/copy job ID.
- Per-workspace history panels.
- Save-to-assets actions in output surfaces.
- Media picker in video workspace.
- Backend `/api/assets` and `/api/assets/from-job/:jobId`.

Gaps:
- No full Asset Library route.
- No robust user-facing asset management page with delete, rename, tags, source trace, generated/uploaded grouping, and project binding.
- Server/local merge migration is incomplete.
- Asset picker is not yet the central hub for all workspaces.
- Some history detail and reference thumbnails required recent URL normalization fixes, indicating data-shape fragmentation.

## Billing / Credits / Safety Status

Present:
- Credits display and refresh hooks.
- Credit-aware generate disable states.
- 402/403 auth/credit error handling in API wrapper.
- Pending/failed active counts in video.
- Material issue/refund status display in main history/detail areas.
- Admin material issue refund controls.
- Maintenance mode route and Admin maintenance settings.
- Provider failure normalization exists more strongly on backend/Admin than in all main user-facing views.

Gaps:
- Main user-facing failure explanations are not yet as complete as Admin diagnostics.
- Refund/material issue action remains Admin-led; main site can display but should not expose refund operations.
- Provider failure taxonomy should be consistently mapped to user-safe copy.
- Credit pending/failed count clarity can improve for long-running video tasks.

## Admin Integration Status

Admin has materially more operational tooling than the main site.

Present in Admin:
- Jobs list.
- Job status sync.
- Material issue refund dialog.
- User email and user/credit views.
- Maintenance settings.
- Prompt Studio asset/project audit.
- Long-video guard and audit surfaces.
- Admin-only Shadow VLM audit endpoint and panel.

Main/Admin gaps:
- Main site does not expose Admin-only shadow audit, correctly.
- Main site lacks a full user-safe mapping for all provider failure/admin diagnostics.
- Project/assets admin audit exists but does not yet map to a full user-facing Project/Asset Library.
- Model settings/provider status are not user-facing and should remain admin/internal until a safe product spec exists.

## Backend / API Dependencies

Confirmed backend support:
- `/uploads` static route exists and is the correct upload asset route.
- `/api/uploads` is not a backend route.
- `/api/image` v2 models/upload/generate/status/history routes exist.
- `/api/video` models/history/generate/status and `/api/upload-media` exist.
- `/api/assets` and `/api/assets/from-job/:jobId` exist.
- `/api/prompt-studio` catalog/generate/analyze/reference/project/assets routes exist.
- `/api/remake` long-video/remake routes exist.
- `/api/admin` operational routes exist, including shadow audit read endpoint.

Missing or not yet productized:
- Full video editing APIs for timeline, trim, cut, inpaint, remix, extend, sound/music controls.
- Canvas project persistence API.
- Project Library first-class API surface for user-facing project lifecycle.
- Unified asset library APIs for management beyond save/read/picker.
- User-safe provider status/failure taxonomy endpoint, if the main app needs richer copy.

## Legacy Workspace Comparison

The legacy `shadowedge-workspace` repo contains useful product ideas but not necessarily production-ready implementation.

Useful legacy concepts:
- Asset drawer UX.
- Specialized studio shells such as AI Canvas, Anime Studio, Movie Studio, Short Drama Studio, and Short Video Studio.
- History archive ideas such as check status, reuse prompt, and local/cloud distinction.
- Prompt-based routing between studio shells and video/canvas pages.

Migration reality:
- Many legacy studios appear to be static or localStorage-driven planning shells.
- They should be treated as UX/reference material, not evidence of complete backend-supported editing.
- The Next main site has a stronger real generation backbone, but fewer specialized studio shells.

## NewBrand / White-Label Impact

Current brand system:
- `NEXT_PUBLIC_BRAND` selects brand config.
- ShadowEdge config is the default.
- NewBrand config exists but has placeholder values such as `newbrand.example.com` and `support@example.com`.
- API base defaults to `https://api.shadowedgeai.com`.
- Many localStorage keys still use `shadowedge_*` naming.

Risks:
- NewBrand deployments can inherit ShadowEdge domains, support copy, API base, or localStorage naming unless env/config is explicitly controlled.
- Shared `shadowedge_*` localStorage keys are acceptable if domains are separate, but risky if white-label apps share an origin or if users switch brands in the same browser context.
- Brand cleanup should not be mixed with generation/editor work; it needs its own safety plan.

## Biggest Missing Features

1. Full video editing workspace: timeline, trim/cut, remix, inpaint, extend, shot replacement, prompt layer editing, motion controls, sound/music controls.
2. Production Canvas editor: server project save, asset binding, layers, crop/mask/annotation, timeline/storyboard, direct generation.
3. First-class Project Studio and Project Library routes.
4. Full user-facing Asset Library.
5. Unified project/asset data model across Image, Video, Canvas, Prompt Studio, and History.
6. User-safe failure taxonomy and status clarity for all provider/material/policy/credit cases.
7. White-label config/localStorage hardening.

## Priority Roadmap

### P0 - Safety and Correctness

- Keep provider execution, shadow VLM, and auto flows default-off unless separately approved.
- Do not expose Admin-only shadow audit to users.
- Do not add generation, refund, provider, or env controls to user-facing UI.
- Fix broken media URL and display issues as narrowly as possible.
- Keep NewBrand/ShadowEdge config changes isolated and reviewed.

### P1 - Complete Existing User Workflows

- Harden Image and Video reference asset normalization everywhere.
- Improve failed job user-safe explanations.
- Finish Asset Library basics: route, list, reuse, delete/manage, source trace.
- Improve Global History detail consistency.
- Add a clear Project Library entry point if using Prompt Studio projects.

### P2 - Canvas and Project Foundations

- Define Canvas server project schema.
- Add read/write project persistence only after separate approval.
- Bind Canvas nodes to saved assets and generated outputs.
- Move Project Studio from Prompt Studio submode toward first-class route.
- Keep Canvas generation execution disabled until project save and asset binding are stable.

### P3 - Video Editing Productization

- Draft EV1 video editor requirements and backend API contract.
- Build EV2 UI shell only after the contract is agreed.
- Add timeline/shot model, trim/cut concepts, and output safety model.
- Integrate provider extend/remix/inpaint only after offline contract tests.

## Recommended Next Five Phases

1. Main-G1: Asset Library and History stabilization plan.
   - Define the first-class user asset library route.
   - Normalize generated/uploaded/local/server asset shapes.
   - Add safe delete/manage/reuse requirements.

2. Main-G2: Canvas persistence and project model design.
   - Design server project schema, asset bindings, and draft migration.
   - No generation execution yet.

3. Main-G3: Project Studio / Project Library product split.
   - Decide what remains in Prompt Studio and what becomes a standalone Project Studio route.
   - Define library list/detail/edit flows.

4. Main-G4: Video editing EV1 requirements and API audit.
   - Inventory backend/provider capabilities for extend, remix, inpaint, trim/cut, timeline, and audio.
   - Produce an approval package before implementation.

5. Main-G5: White-label/NewBrand config hardening.
   - Audit brand URLs, support copy, localStorage keys, API base, favicon/assets, and deployment envs.
   - Keep separate from provider/generation work.

## Do Not Do Yet

- Do not enable broad user-facing real VLM or shadow result adoption.
- Do not add provider rerun/trigger buttons in Admin or main UI.
- Do not raise provider daily caps without explicit approval.
- Do not add billing/refund actions to main user-facing pages.
- Do not build video editor provider calls before EV1 requirements and backend contract review.
- Do not turn Canvas into a generator before server project persistence and asset binding exist.
- Do not mix NewBrand/white-label cleanup with generation or editor changes.
- Do not run migrations, provider smoke, Generate, upload, or billing actions as part of gap audit work.

## Final Audit Conclusion

ShadowEdge main site is strong for basic image/video generation and increasingly strong for admin visibility. The product gap is now mostly in higher-order creative workflow: full asset library, project/canvas persistence, and real video editing. The safest next product step is to stabilize the main user-facing asset/history/project foundation before starting provider-connected editing or broad automated VLM adoption.
