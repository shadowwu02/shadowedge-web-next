# Higgsfield Motion Control Gap Audit

Audit date: 2026-07-18
Scope: public product pages and official Higgsfield guides only; no login bypass, private API inspection, provider calls, or paid generation.

## Executive summary

Higgsfield exposes two related but distinct motion products:

1. **Reference-driven character motion**: a character image plus a motion-reference video drives a new character performance. The public Motion Control page shows a character input, `Kling Motion Control`, 720p output, and a scene-control choice for taking the background from the image or the motion video.
2. **Camera direction**: a broad preset library and WAN text-directed camera behavior cover dolly, crane, orbit, pan, zoom, tracking, handheld, and other shot movement.

ShadowEdge already has the surrounding production substrate—assets, Canvas projects, Generation Plans, a single-task Queue, normalized Job Identity, video result output, Timeline binding, and generated-asset reuse. Before P2-A2 it had no dedicated motion node or adapter. P2-A2 closes that architecture gap with a fail-closed, zero-credit Mock foundation; it does **not** close the real model/provider or character-consistency gaps.

## Evidence and confidence rules

| Label | Meaning |
|---|---|
| Publicly confirmed | Explicitly described or visible on an official Higgsfield page. |
| Marketing-level confirmation | Listed on an official page, but exact validation rules, parameters, async states, or limits are not public. |
| Inference | Product behavior suggests the capability, but the public source does not fully specify it. |
| Cannot confirm | No reliable public evidence found in the audited sources. |

Primary public sources:

- [Higgsfield Motion Control product page](https://higgsfield.ai/ai/video?model=kling-2-6-motion-control)
- [Higgsfield Kling Motion Control guide](https://higgsfield.ai/blog/Kling-2.6-Motion-Control-Full-Guide)
- [Higgsfield Camera Controls](https://higgsfield.ai/camera-controls)
- [WAN Camera Control Academy guide](https://higgsfield.ai/academy/how-to-use/turn-your-video-into-cinema-using-wan-camera-control)
- [Higgsfield UGC Builder release](https://higgsfield.ai/blog/Higgsfield-UGC-Builder-Gives-You-the-Director-Every-Scene)
- [Higgsfield Edit Video](https://higgsfield.ai/ai/video/edit)
- [Higgsfield AI Video Editor](https://higgsfield.ai/ai-video-editor)
- [Higgsfield Mixed Media guide](https://higgsfield.ai/blog/Mixed-Media-AI-Video-Generator-for-Stylized-Video-Edits)

## Higgsfield Motion Control audit

| Capability | Public status | Publicly visible input/control | Gap or uncertainty |
|---|---|---|---|
| Character Motion | Publicly confirmed | Character/reference image plus a motion-reference video. | Exact file-size, duration, body-visibility validation, and failure taxonomy are not fully exposed on the product page. |
| Motion Transfer | Publicly confirmed | The guide says movement, expression, and pacing from the driving video are applied to the static character. | Identity-quality guarantees and provider-specific consistency metrics cannot be confirmed. |
| Reference Motion Video | Publicly confirmed | Upload/reference-video driven; the motion video acts as the driving performance. | Upload limits and supported codecs cannot be confirmed from the audited public pages. |
| Camera Motion presets | Publicly confirmed | Higgsfield publishes a large preset library including dolly, crane, orbit, pan, zoom, tracking, handheld, FPV, and compound moves. | The exact model compatibility matrix and credit differences per preset are not public on the library page. |
| Text-directed Camera Control | Publicly confirmed | The WAN guide describes plain-language moves such as dolly-in, crane-up, orbit, tracking, and over-shoulder direction at generation time. | It is not clear whether every supported provider normalizes the same camera parameters internally. |
| Character action prompt | Publicly confirmed | The UGC Builder exposes an action prompt alongside character/avatar and camera-motion selection. | This is prompt control, not evidence of a skeletal pose editor. |
| Pose / skeletal control | Cannot confirm | No official audited source clearly exposes keypoints, bones, OpenPose input, or a pose timeline. | Do not represent prompt/action or driving-video motion as a confirmed pose-editor feature. |
| Background source control | Publicly confirmed | Motion Control publicly shows a scene-control mode choosing the image or video as background source. | Segmentation/masking controls and edge-refinement options cannot be confirmed. |
| Character consistency across shots | Publicly confirmed as a separate Higgsfield capability | The WAN guide describes Soul ID carrying a trained identity across models and clips. | This is separate from basic Motion Control and has no ShadowEdge equivalent today. |

## Higgsfield Edit Video audit

| Capability | Public status | Publicly visible workflow | Gap or uncertainty |
|---|---|---|---|
| Video to Video | Publicly confirmed | Upload a video, optionally add image/element references, describe the change, select an edit model, generate. | Exact status polling and edit-job identity contract are not public. |
| Background Replace | Marketing-level confirmation | The AI Video Editor says backgrounds can be removed and rebuilt from a prompt. | Mask controls, temporal-consistency constraints, and provider selection are not specified. |
| Extend | Marketing-level confirmation | The Edit Video page lists “Extend & Keyframing.” | Exact extend duration, frame selection, and whether audio extends cannot be confirmed. |
| Restyle / recolor | Publicly confirmed | Edit Video lists recolor/restyle; Mixed Media uses video upload, presets, prompt, FPS, resolution, and optional color controls. | Provider/model behavior varies; a universal parameter schema cannot be inferred. |
| Object edit | Publicly confirmed | The public edit pages describe object erase, swap, insertion, smart cleanup, and optional image/element references using `@`. | Fine-grained masks and tracked-object UI are not confirmed. |
| Reframe / composition | Publicly confirmed | Edit Video lists re-frame/composition; AI Video Editor lists aspect-ratio reframing and subject tracking. | Output safe-zone and per-shot keyframe controls are not fully documented. |
| Relight / atmosphere | Publicly confirmed | Public examples describe changing lighting, time of day, shadow, and atmosphere. | Physical accuracy and supported clip length are not public. |
| Timeline-native editing | Public sources indicate the opposite for some flows | The AI Video Editor markets transcript/prompt editing without a traditional timeline; Mixed Media is preset/prompt driven. | Higgsfield may have other timeline surfaces, but this audit cannot confirm a universal timeline for these edit tools. |

## ShadowEdge current-state gap matrix

Status is based on the checked-in ShadowEdge code at P2-A2, not product claims.

| Capability | ShadowEdge status | Evidence / interpretation | Gap to a production Higgsfield-class flow |
|---|---|---|---|
| Text to Video | Existing | Workspace and Studio reuse the shared Video Generate API/executor. | Provider/model quality remains external. |
| Image to Video | Existing, model-dependent | Studio Video Generate accepts image assets and shared model rules. | Capability must remain governed by each model rule. |
| Reference Video | Partial | Shared video request normalization and selected model rules support video references. | No dedicated motion semantic, input validation, or motion-strength contract. |
| Remake | Existing | Analysis, shot nodes, production plan, queue, and timeline placeholders exist. | Fully automatic long-form production is still gated and provider-dependent. |
| Video Edit Architecture | Existing foundation | `video_edit` Plan, Queue, adapter interface, Mock executor, Job Identity, Asset loop, and Timeline binding exist. | No real edit adapter is registered. |
| Real Video Edit | Not connected | P2-A1 intentionally uses a local pass-through Mock. | Needs provider capability registry, backend API, pricing, persistence, polling, refund, and controlled smoke. |
| Motion Control Architecture | Existing foundation after P2-A2 | `motion_control` node, Plan task, Queue dispatch, Mock adapter, Job Identity, result/Timeline/Asset loop. | No real Motion provider or upload constraint enforcement. |
| Character Motion | Mock only | Requires one image and one motion-reference video; Mock returns the reference video. | Real body/face motion transfer is absent. |
| Motion Transfer | Mock only | Contract exists; no model execution. | Needs real adapter and provider-specific validation. |
| Camera Control | Data mode only | `camera_motion` is represented as a Motion Node mode. | No camera preset catalog, normalized trajectory parameters, or provider execution. |
| Pose / Action Control | Prompt field only | Motion Node carries a prompt but no pose/keypoint data. | Pose asset type, keypoint schema, editor, and model support are absent. |
| Character Consistency | Not connected | Asset reuse and Remake references are available. | No trained identity/Soul-ID-equivalent entity or cross-shot lock. |
| Timeline result binding | Existing | Completed video-like executor output uses the shared P1-A25 binder. | Fine editing/render support remains separate. |
| Generated result reuse | Existing | Result can be converted to an Asset Node. | Automatic asset creation remains a user action to avoid graph clutter. |

## P2-A2 Motion Control contract

```text
Image Asset ───────────────┐
                           ├─> Motion Control Node
Motion Reference Video ────┘          │
                                      v
                             Generation Plan
                                      │
                                      v
                               Single-task Queue
                                      │
                                      v
                              Mock Provider Adapter
                                      │
                                      v
                         Output / Timeline / Asset loop
```

The node persists in the existing Canvas JSON and introduces no schema-version bump:

```ts
{
  type: "motion_control",
  data: {
    sourceImage,
    motionReferenceVideo,
    mode: "character_motion" | "camera_motion" | "motion_transfer",
    prompt,
    status,
    generationPlanId,
    queueStatus,
    jobIdentity,
    result,
    timelineBound,
    timelineBindError
  }
}
```

The adapter boundary is provider-neutral:

```ts
interface MotionControlProviderAdapter {
  submit(input): Promise<Result>;
  status(identity): Promise<Result>;
  cancel(identity): Promise<Result>;
}
```

P2-A2 registers only a local adapter with no HTTP client. It creates mock `clientJobId`, `databaseJobId`, `providerJobId`, and `statusJobId`; returns the reference-video URL; reports `providerCalled: false`; and estimates zero credits.

## Recommended next production steps

1. Add a provider capability registry before any real adapter: supported modes, required inputs, duration, codec, resolution, background-source mode, price key, and cancellation support.
2. Keep camera presets separate from character motion parameters. A provider may support one without the other.
3. Add backend ownership checks and persistent motion jobs rather than calling providers from the browser.
4. Reuse the established Video Job Identity and submission-persistence verification contract.
5. Add provider-specific upload validation before quote/confirmation.
6. Require cost preview and explicit confirmation; keep concurrency at one and automatic retry disabled for the first real smoke.
7. Run exactly one controlled smoke only after contract tests and deployment approval.

## Safety conclusion

P2-A2 is an architecture-only milestone. It does not create a real motion task, does not call Higgsfield/Kling/B.AI/OpenAI, does not modify Video Generate or Workspace behavior, and does not change credits, billing, backend APIs, database schema, Render, deployment, or PM2 state.
