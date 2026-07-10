# Remake P6-C1 Long Video UX Product Plan

Date: 2026-07-10

Scope: docs-only product and UX plan. This document does not change frontend or backend code, deploy, restart PM2, execute SQL, modify env, call a provider, upload media, generate video, or perform billing, credits, or refund actions.

## 1. Product Goal

P6-C1 turns the sealed P6-B3E long-video real analysis capability into a user-facing Remake feature.

The product outcome is not merely an analysis response. A user should be able to upload one eligible long video, understand that analysis continues in the background, review a structured storyboard across the full timeline, refine or reuse one shot, and deliberately hand that shot into the existing Video Workspace generation flow.

P6-C1 must preserve these existing boundaries:

- P6-B3E proved one 135-second real long-video analysis with real local frames, 3 segments, 9 keyframes, 9 shots, full `0-135s` coverage, and no fallback.
- P6-B2 already provides a draft-only `Use in Video Workspace` handoff.
- The normal `/workspace/video` Generate action remains the generation entry point.
- Shadow VLM, provider identity, raw audit data, and internal diagnostics remain non-user-facing.
- Direct Remake generation controls and Generate All remain disabled.

## 2. User Flow

```text
Upload long video
        |
        v
Analysis progress
        |
        v
Storyboard generation
        |
        v
Shot review
        |
        v
Use prompt / handoff
        |
        v
Optional selected-shot generation
```

Detailed flow:

1. The user selects Long Video Remake and chooses one eligible video.
2. The UI validates type, size, duration, ready state, and account eligibility before analysis.
3. The UI shows the analysis credit estimate and requires explicit confirmation before creating a job.
4. Upload and analysis run as distinct states. The UI stores the returned asset and analysis job identifiers so progress can resume after navigation or refresh.
5. The progress view translates backend stages into simple product language.
6. Completion opens a full-timeline storyboard, ordered by timestamp.
7. The user reviews shots, keyframes, prompt text, and reference assets without starting generation.
8. The user may copy/use the prompt or choose `Use in Video Workspace` for one shot.
9. The existing one-time draft handoff populates the normal Video Workspace, preserving the user's existing draft where possible.
10. Generation remains optional and begins only after the user reviews the draft, sees the generation cost, and manually confirms the normal Generate action.

Navigation away from the page must not cancel or duplicate the analysis job. Returning users should resume the current job by `analysisJobId`, not create a replacement automatically.

## 3. Analysis UI

### Entry And Eligibility

The Long Video mode should use the backend-supported eligibility contract rather than a UI-only duration increase:

- video asset only.
- ready, owned asset.
- duration greater than 120 seconds and no more than 600 seconds for the first rollout.
- file size and MIME limits must match the existing upload API contract.
- one active long-video analysis per eligible user during the controlled rollout.

Before submission, show:

- filename and duration.
- selected remake ratio.
- estimated analysis credits.
- a short explanation that analysis extracts key moments and may take about a minute or longer.
- an explicit `Analyze video` confirmation action.

### User-Facing States

| UI state | Meaning | Backend or client mapping | Primary UI behavior |
| --- | --- | --- | --- |
| `uploading` | Source media is being transferred | existing upload progress | Show determinate upload progress and allow cancel while the upload contract permits it. |
| `preparing` | The uploaded video is queued and metadata is being read | `queued`, `reading_metadata` | Show a durable job state and allow the user to leave the page. |
| `extracting frames` | Key moments are being prepared | `extracting_keyframes` | Show stage progress without displaying local frame paths or internal frame references. |
| `AI analyzing` | Story and shots are being analyzed and assembled | `analyzing_segments`, `merging_storyboard` | Show overall progress and analyzed timeline range when available. |
| `storyboard ready` | A validated result is available | `completed` | Open the storyboard and retain a compact completion summary. |
| `failed` | No usable storyboard was produced | `failed`, invalid result, blocked job | Show a safe user message, billing disposition, and a manual next action. Do not retry automatically. |

Progress should be stable and honest. Do not simulate precision that the backend does not provide. If only stage information is available, use stage progress rather than an artificial percentage.

### Information That Must Not Be Exposed

The user-facing analysis UI must not display:

- B.AI or any provider name.
- VLM, Shadow VLM, adapter, model endpoint, or request format.
- provider HTTP status, fallback internals, audit event names, or raw error payloads.
- API keys, tokens, signed URLs, local paths, frame binaries, or `real_local_frame_ref` values.
- Admin Guard state, allowlists, environment keys, or operator controls.

User errors should use product categories such as `Video could not be analyzed`, `Video is not eligible`, or `Analysis took too long`, with a support reference id when available.

## 4. Storyboard UI

The storyboard is the primary P6-C1 result, not a generation queue. It should provide a timeline summary followed by scannable shot rows or compact shot cards.

Storyboard-level content:

- source video name and duration.
- analysis completion time.
- overall story summary.
- timeline coverage indicator.
- scene or segment navigation.
- shot count.
- `Use prompt` and shot handoff availability without automatic generation.

Each shot must support:

- timestamp range with start and end time.
- visual description.
- camera language, including framing and movement.
- subject action or narrative beat.
- editable or copyable generation prompt.
- one or more safe keyframe thumbnails when available.
- attached reference assets with type, role, and availability state.

Shot interaction rules:

- Preserve source timeline order.
- Selecting a shot changes the review focus only; it does not create a generation job.
- Keyframes open in an inspectable preview and never reveal local or signed source paths.
- Missing keyframes or references show an unavailable state rather than a broken image.
- Prompt edits are local draft changes until the user explicitly hands the shot off.
- A handoff uses the existing `shadowedge_remake_video_handoff_v1` contract, URL sanitization, one-time consumption, deduplication, and draft-preservation behavior.
- Do not expose raw provider text or raw analysis JSON as the storyboard.

## 5. Generation Strategy

P6-C1 must not propose or expose Generate All.

The approved product direction is selected-shot generation first:

1. The user selects exactly one storyboard shot.
2. The user reviews its prompt, duration, ratio, keyframes, and reference assets.
3. The user chooses `Use in Video Workspace`.
4. The handoff creates or appends a sanitized draft only.
5. The normal Video Workspace validates the selected model and reference-media rules.
6. The workspace shows the normal generation credit cost.
7. The user manually confirms Generate.
8. The existing `/api/video/generate` pipeline owns provider submission, status, history, credit, failure, and refund behavior.

P6-C1-A and P6-C1-B stop before generation. P6-C2 may introduce a clearer selected-shot confirmation experience, but it must continue using the normal video generation pipeline and must not bypass its model rules or financial controls.

Not allowed:

- Generate All.
- automatic generation after analysis.
- automatic queue creation for every shot.
- automatic provider rerun or retry.
- silent replacement of an existing Video Workspace draft.
- generation directly from raw analysis output.

## 6. Credits And Failure Handling

Analysis and generation are separate products and must have separate, visible costs.

### Analysis Cost

- Request an analysis estimate before job creation.
- Display the estimated analysis credits beside the confirmation action.
- Require explicit confirmation before the analysis job is created.
- Store and display the confirmed estimate for the active job so the price does not appear to change mid-run.
- During an internal or free beta, display `Included in beta` or `0 credits` explicitly rather than hiding the cost.
- Do not charge for upload alone, an eligibility rejection, a guard rejection, or a job that was never created.

Before paid analysis is enabled, backend policy must define one idempotent outcome for each terminal state:

- completed with a usable storyboard: charge the confirmed analysis amount.
- failed before an analysis provider attempt: no charge or release any reservation.
- failed after an analysis provider attempt with no usable storyboard: automatic release/refund according to the approved analysis billing policy.
- partially usable result: do not invent partial billing in P6-C1; classify it as completed or failed under an approved policy.

### Generation Cost

- Generation cost is shown only in the normal Video Workspace after handoff and model validation.
- Analysis credits never imply that shot generation is included.
- Every selected-shot generation requires its own user confirmation.
- Existing generation failure, credit, refund, history, and reconciliation rules remain authoritative.

No hidden billing means the UI must show what action consumes credits, the amount or estimate, and the failure disposition before confirmation.

## 7. Safety Boundaries

P6-C1 must preserve all of the following:

- No automatic generation.
- No Generate All.
- No automatic provider rerun.
- No automatic analysis retry after failure or timeout.
- No Shadow VLM, B.AI, VLM, provider, Admin Guard, or raw audit exposure.
- No uncontrolled queue or background creation of additional jobs.
- No second analysis job caused by refresh, navigation, polling, or duplicate clicks.
- No provider call from prompt copy, shot selection, keyframe preview, or draft handoff.
- No upload from storyboard review or draft handoff.
- No billing, credits, or refund action from draft handoff.
- No raw local path, signed URL query, token, frame binary, or provider payload in browser storage or visible UI.
- No customer access based only on a frontend flag; backend eligibility and guard checks remain authoritative.

The initial rollout should remain allowlisted and concurrency-limited. Polling may read one known analysis job but must never create a retry or replacement job.

## 8. Mobile UX Considerations

Mobile should use the same workflow with a single-column layout:

- Keep upload, source summary, and analysis confirmation in one compact flow.
- Keep the active analysis stage visible in a compact sticky status row while the user reviews surrounding content.
- Use a vertical shot list; avoid a wide desktop timeline that requires precision horizontal scrolling.
- Keep timestamp, keyframe, and prompt actions within each shot's stable width.
- Open keyframes in a full-screen media viewer with an obvious close action.
- Use a bottom sheet for shot details or handoff confirmation, not nested cards.
- Keep only one primary action visible at a time: `Analyze video`, `Review storyboard`, or `Use in Video Workspace`.
- Make progress and completed jobs resumable after the browser is backgrounded or the page is reloaded.
- Prevent long prompts, filenames, translated labels, and error text from overflowing their containers.
- Do not use hover-only actions; copy, select, and handoff controls must have touch targets and visible labels.

Selected-shot generation remains a Video Workspace action. On mobile, the handoff should route to the normal workspace with a clear draft-added notice and no automatic Generate.

## 9. Feature Flag And Rollback Plan

Rollout needs two independent controls:

- A frontend discovery flag controls whether Long Video Remake appears to eligible users.
- Backend feature, allowlist, concurrency, cost, and real-analysis guards remain the authoritative execution gate.

Recommended rollout order:

1. Internal test accounts only.
2. Small allowlisted beta with analysis billing disabled or explicitly marked included.
3. Paid analysis only after billing, failure, refund, support, and observability approval.
4. P6-C2 selected-shot generation only after its separate safety review.

Rollback steps:

1. Disable the frontend Long Video entry or return it to a disabled beta state.
2. Disable backend real long-video analysis flags or restore the guard to `mock_only` when runtime rollback is approved.
3. Stop accepting new long-video jobs while allowing existing read-only result pages to remain available.
4. Hide selected-shot handoff or generation entry points independently if the Video Workspace bridge regresses.
5. Preserve completed analysis jobs and audit evidence; do not delete or rewrite database history as rollback.
6. Verify short Remake, normal Video Workspace, Asset Library, and existing drafts still load.

Rollback must not trigger a provider retry, credit action, upload, or generation job.

## 10. Phase Breakdown

### P6-C1-A: Long Video Analysis UX

Goal: expose controlled long-video upload and resumable analysis progress to eligible users.

Scope:

- Long Video mode entry and eligibility copy.
- upload and source-asset readiness flow.
- analysis cost estimate and explicit confirmation.
- one-job create guard and duplicate-click protection.
- status polling and the six user-facing states.
- safe failure messages and billing disposition.
- refresh/navigation resume by `analysisJobId`.
- feature flag and internal allowlist rollout.

Exit criteria:

- one eligible user can create one long-video analysis job.
- progress maps accurately to backend stages.
- completion and failure are resumable.
- no provider/internal terminology is visible.
- no generation, automatic retry, or hidden billing occurs.

### P6-C1-B: Storyboard Review And Draft Handoff

Goal: turn a completed analysis result into a useful, source-ordered storyboard.

Scope:

- overall summary and timeline coverage.
- segment and shot navigation.
- per-shot timestamps, visual description, camera language, action, prompt, keyframes, and references.
- editable/copyable prompt draft.
- selected-shot `Use in Video Workspace` through the sealed P6-B2 handoff.
- desktop and mobile review states.
- inaccessible/missing-reference handling.

Exit criteria:

- storyboard preserves full timeline order.
- shot selection has no provider or billing side effect.
- safe keyframes and references render without internal URL/path exposure.
- handoff is one-time, sanitized, deduplicated, and draft-only.
- hidden Remake generation controls remain hidden.

### P6-C2: Selected Shot Generate

Goal: validate one user-confirmed shot generation through the normal Video Workspace pipeline.

Scope requires a separate approval and safety review:

- exactly one selected shot at a time.
- explicit prompt/reference/model/cost confirmation.
- existing `/api/video/generate` pipeline only.
- existing status, history, credit, refund, and reconciliation behavior.
- feature flag and allowlisted rollout before broader availability.

P6-C2 explicitly excludes Generate All, automatic queues, automatic retries, and generation of every storyboard shot.

## Decision

P6-C1 should proceed as a staged user experience: analysis UX first, storyboard review and draft handoff second, and selected-shot generation only in P6-C2 after separate approval.

The safest useful product is one where long-video analysis produces an understandable storyboard and the user remains in control of every generation and credit-consuming action.

## Documentation Safety Confirmation

This round is docs-only. No frontend or backend code was changed, no deployment or PM2 action was performed, no SQL or env change was made, no provider was called, no media was uploaded, and no Generate, billing, credits, or refund action was performed.
