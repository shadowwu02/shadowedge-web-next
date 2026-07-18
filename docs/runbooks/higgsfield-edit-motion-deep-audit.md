# Higgsfield Edit Video / Motion Control Deep Audit and ShadowEdge Character Foundation

Date: 2026-07-18
Scope: public product UI and official public documentation only
ShadowEdge baseline: frontend `28d1c4cd0da55fe9cd29f89c00b512851c20bd43`

## Executive summary

Higgsfield's public product behaves primarily as a task-oriented AI generation surface, not as a browser-native nonlinear editor. Edit Video accepts a short reference video, optional image elements, and a text instruction, then submits an asynchronous model task. Motion Control accepts a motion-reference video plus a character image and exposes scene-source and orientation controls. Camera Controls are surfaced both as a large preset catalog and as natural-language camera direction in supported models.

The public pages do not prove that Edit Video or Motion Control flows into a conventional multi-track timeline. They do show History tabs and official copy about iterating on results, but the exact result action set, project persistence behavior, and cross-tool continuation path require an authenticated product session and a completed result. Those items are marked unconfirmed below.

For ShadowEdge, the immediate product gap is not a full timeline. The missing layer is a reusable character/reference contract plus provider capability mapping. P2-A3 adds that metadata foundation without face analysis, embeddings, training, provider calls, or changes to Workspace generation.

## Evidence levels

| Label | Meaning |
| --- | --- |
| Confirmed in public UI | Visible in the normal unauthenticated product UI during this audit. |
| Confirmed in official content | Stated on an official Higgsfield public page, but not necessarily exercised in the interactive UI. |
| Inference | Product/technical interpretation based on visible behavior; not a claim about private implementation. |
| Unconfirmed | Not visible without an authenticated/completed workflow or absent from public evidence. |

No private API, source bundle, account data, network payload, or restricted interface was inspected. No files were uploaded and Generate was not pressed.

## 1. Edit Video product audit

Public UI inspected: [Higgsfield Edit Video](https://higgsfield.ai/ai/video/edit). The current page also resolves through the public [Video Edit landing route](https://higgsfield.ai/video-edit).

### 1.1 Interactive workflow

| Area | Public UI evidence | Confidence |
| --- | --- | --- |
| Entry mode | Top-level mode navigation contains Create Video, Edit Video, and Motion Control. | Confirmed in public UI |
| Primary model | Kling O1 Video Edit is selected and described as “Modify, restyle, change angles, transform.” | Confirmed in public UI |
| Required input | “Upload a video to edit”; accepted duration displayed as 3–10 seconds. | Confirmed in public UI |
| Optional references | “Upload images & elements”; current form shows up to 4 images/elements. | Confirmed in public UI |
| Prompt | Natural-language change request; helper text gives “Make it snow” and supports referring to elements with `@`. | Confirmed in public UI |
| Auto settings | Enabled by default. Disabling it exposes duration and ratio controls. | Confirmed in public UI |
| Manual parameters | Model, duration (5s visible default), ratio (1:1 visible default), resolution (720p visible). | Confirmed in public UI |
| Cost preview | Generate button showed 9 with auto settings and 15 after the visible manual settings state. The UI does not label the unit in the accessible text, so this audit treats it as a displayed cost indicator rather than asserting a billing unit. | Confirmed in public UI |
| History | A History tab is present. | Confirmed in public UI |
| Async task | Generate-style call-to-action plus History strongly suggests an asynchronous generation job. | Inference |
| Result actions | Preview, download, reuse as element, retry, and “continue editing” controls were not visible without producing a result. | Unconfirmed |
| Project/timeline handoff | No conventional timeline or multi-track editor was visible on this page. | Unconfirmed |

### 1.2 Capability matrix

The public product page advertises the following edit classes: Relight & Atmosphere, Precise Object Swap, Re-frame & Composition, Smart Clean Up, Recolor & Restyle, and Extend & Keyframing. These are confirmed public product claims, but this audit did not run each mode.

| Capability | Input contract visible/claimed | ShadowEdge status | Gap |
| --- | --- | --- | --- |
| Video-to-video instruction edit | Video + prompt; optional elements | `video_edit` node, plan, queue, mock adapter | Real provider adapter, capability validation, polling contract |
| Relight / atmosphere | Video + prompt | Architecture only | Provider support and result QA |
| Object swap | Video + element reference + prompt | Architecture only | Element identity mapping, provider support |
| Re-frame / composition | Video + instruction; ratio visible in manual settings | Timeline metadata and edit architecture | Real spatial edit provider and crop-safe preview |
| Smart cleanup | Video + prompt | Not implemented | Mask/selection strategy or prompt-only provider mode |
| Recolor / restyle | Video + prompt/elements | `video_to_video` mode foundation | Real provider mapping |
| Extend / keyframing | Short video input; public capability claim | `extend` mode foundation | Duration boundary, continuation frame, provider mapping |

Official marketing for the broader [AI Video Editor](https://higgsfield.ai/ai-video-editor) additionally describes enhancement, stabilization, reframing, and export. Those claims should not be treated as proof that every control exists inside the Kling O1 Edit form observed above.

## 2. Motion Control product audit

Public UI inspected: [Higgsfield Motion Control](https://higgsfield.ai/ai/video/motion). Supporting workflow guidance: [Kling Motion Control full guide](https://higgsfield.ai/blog/Kling-2.6-Motion-Control-Full-Guide).

### 2.1 Interactive workflow

| Area | Public UI evidence | Confidence |
| --- | --- | --- |
| Motion input | “Add motion to copy”; motion-reference video duration shown as 3–30 seconds. | Confirmed in public UI |
| Character input | “Add your character”; image guidance asks for a visible face and body. | Confirmed in public UI |
| Model | Kling Motion Control. | Confirmed in public UI |
| Quality | 720p visible. | Confirmed in public UI |
| Scene control | Video/Image toggle chooses whether the background comes from the motion video or character image. | Confirmed in public UI |
| Prompt | Advanced settings expose an optional scene/background prompt; helper text says motion remains controlled by the reference video. | Confirmed in public UI |
| Orientation | Advanced settings expose Video/Image orientation choices. The page explains that matching video orientation favors complex motion, while matching image orientation better supports camera movement. | Confirmed in public UI |
| Motion library | “Open Motion Library” action and Motion library tab are visible. | Confirmed in public UI |
| Motion strength | No strength slider was visible in the audited public form. | Unconfirmed |
| Ratio | No ratio control was visible in the audited public form. | Unconfirmed |
| Explicit duration selector | Duration is governed by the uploaded motion-reference range; no separate duration control was visible. | Unconfirmed |
| Cost indicator | Generate showed 5; the accessible UI did not expose the unit label. | Confirmed in public UI |

The official guide describes the conceptual input pair as a character reference image plus a motion reference video, transferring movement, expression, and pacing while attempting to preserve identity. It also recommends visible limbs, uncluttered reference footage, and framing/orientation alignment.

### 2.2 Motion capability matrix

| Capability | Evidence | ShadowEdge status | Gap |
| --- | --- | --- | --- |
| Character motion | Character image + motion video in public UI | `motion_control` node + mock adapter | Real adapter, provider rules, safety/rights review |
| Motion transfer | Official guide describes action/expression/pacing transfer | Mode exists in data model | Real execution and model-specific validation |
| Reference motion video | Required public UI input, 3–30 seconds | Existing video Asset can bind | Media validation, duration/frame constraints |
| Scene-source control | Video/Image background-source toggle | Not modeled separately | Add provider-neutral `sceneSource` parameter |
| Orientation control | Video/Image orientation in Advanced settings | Not modeled | Add `orientationSource` capability-gated parameter |
| Prompted environment | Optional advanced prompt | Motion node prompt exists | Prompt mapping and provider QA |
| Pose/action control | Achieved through reference video rather than a pose editor in observed UI | No pose editor | Keep out of MVP; reference-video workflow is faster |
| Motion strength | Not observed | Not implemented | Do not add until a selected provider exposes it |

## 3. Camera Control audit

The public [Camera Controls catalog](https://higgsfield.ai/camera-controls) presents 50+ named cinematic presets, including Dolly In/Out/Left/Right, Crane Up/Down, Crash Zoom, Pan, Tilt, Handheld, FPV Drone, 360 Orbit, Snorricam, Dutch Angle, Bullet Time, and tracking-oriented moves.

Separately, the official [WAN Camera Control guide](https://higgsfield.ai/academy/how-to-use/turn-your-video-into-cinema-using-wan-camera-control) describes natural-language camera direction such as dolly, crane, orbit, tracking, focal behavior, inertia, and speed curves at generation time.

This indicates two complementary product surfaces:

1. Preset selection for fast, discoverable direction.
2. Prompt-level camera language for model-native control.

It does not prove a browser-side keyframe/path editor. The safer ShadowEdge architecture is a provider-neutral camera instruction object that can resolve either to a preset id or to prompt text, with capability checks per model.

Recommended future contract:

```ts
type CameraControlRef = {
  mode: "preset" | "prompt";
  presetId?: string;
  prompt?: string;
  strength?: number; // only when the selected provider confirms support
};
```

## 4. Character consistency analysis

Higgsfield distinguishes a reusable trained identity product from per-task references. Its public [Soul ID character consistency guide](https://higgsfield.ai/blog/Soul-ID-AI-Character-Consistency) describes training a reusable identity from multiple photos, then selecting that character in later generation surfaces. This is materially different from P2-A3.

P2-A3 deliberately implements only a safe metadata/reference layer:

| Layer | Higgsfield public product | ShadowEdge P2-A3 |
| --- | --- | --- |
| Reusable named character | Yes | Yes, project-scoped Character Node |
| Multiple reference images | Yes | Yes, URL references in project JSON |
| Face/identity training | Soul ID public product claim | Explicitly absent |
| Face embedding | Not audited | Explicitly absent |
| Cross-project trained identity | Public product claim | No; project JSON only |
| Provider-native character token | Public product claim/inference | No |
| Shot continuity metadata | Product workflow claim | `characterRefs[]` on Remake Shot and Video node |
| Timeline traceability | Not confirmed in public UI | `characterIds[]` on Timeline clip |

This separation is intentional. ShadowEdge can gain workflow continuity and provenance before accepting the biometric, consent, storage, deletion, and provider-lock-in risks of identity training.

## 5. Workflow assessment

### Publicly confirmed flow

```text
Input video / character image / motion reference
  -> choose Edit or Motion mode
  -> configure prompt and model-specific controls
  -> Generate
  -> History tab
```

### Publicly claimed but not fully verified in interactive result UI

- Iterating/editing a generated result.
- Reusing shareable elements across projects.
- Organizing images and videos in shared projects/Cinema Studio.

### Not confirmed

- Automatic Edit/Motion result insertion into a multi-track video timeline.
- Non-destructive trim, audio, subtitle, or transition tracks on the audited Edit/Motion pages.
- Node graph execution on these pages.
- Exact result-to-result continuation buttons and persisted job identity fields.

Conclusion: Higgsfield's visible Edit/Motion surfaces are closer to non-destructive AI job configuration plus history than to in-browser frame editing. ShadowEdge's existing Project + Canvas + Generation Plan + Queue + Timeline split remains appropriate.

## 6. ShadowEdge P2-A3 Character foundation

### Data model

```ts
type CharacterNodeData = {
  kind: "character";
  title: string;
  name: string;
  referenceImages: string[];
  description: string;
  style: string;
  attributes: Record<string, string>;
  status: "ready";
};
```

Additive references:

- `RemakeShotNodeData.characterRefs: string[]`
- `VideoGenerateNodeData.characterRefs: string[]`
- `MotionControlNodeData.characterRefs: string[]`
- `StudioVideoTimelineClip.characterIds?: string[]`

### Binding behavior

- Character -> Video Generate stores the Character node id in `characterRefs`.
- Character -> Motion Control stores the binding and allows the mock Motion executor to use the first character reference image as its source image.
- Character -> Remake Shot -> Video Generate inherits the same ids into the planned Video node.
- Removing an edge clears the derived binding.
- Completed Video/Motion results carry `characterIds` into the Timeline clip.
- Binding is deterministic Canvas metadata only. It does not alter current Video API requests.

### Persistence and compatibility

The new node and optional fields are stored in the existing `studio_projects.canvas_json`. No database table, migration, or API was added. Existing Canvas version 7 remains readable; missing arrays normalize to empty arrays, and old Timeline clips remain valid because `characterIds` is optional. No Canvas schema version bump is required for this additive foundation.

## 7. ShadowEdge gap matrix

| Capability | Current state after P2-A3 | Priority |
| --- | --- | --- |
| Text/image/video generation | Real existing executors | Existing |
| AI Video Edit orchestration | Plan + queue + mock adapter | High: real capability registry/adapter |
| Motion Control orchestration | Plan + queue + mock adapter | High: real capability registry/adapter |
| Reusable Character metadata | Implemented | P2-A3 complete |
| Character-to-shot traceability | Implemented | P2-A3 complete |
| Real character consistency | Not implemented | Later; requires rights/privacy design |
| Scene-source/orientation controls | Not implemented | High for Motion provider readiness |
| Camera preset catalog | Not implemented | Medium; provider-neutral first |
| Camera prompt contract | Prompt fields exist, no structured mapping | Medium |
| Provider-specific media validation | Partial generic validation | High before real Edit/Motion smoke |
| Result continuation | Asset loop and Timeline binding exist | Existing foundation; refine UX |
| Edit/Motion traditional timeline tools | Timeline exists separately | Do not merge into provider form |

## 8. Recommended development priority

### P2-A4 — Provider-neutral capability registry (highest priority)

Define each Edit/Motion provider mode by required media inputs, duration limits, resolution/ratio options, scene-source/orientation support, cost resolver, and output contract. Keep the provider disabled by default.

### P2-A5 — Character reference resolver and rights metadata

Resolve a Character Node into normalized image `AssetRef[]`, add ownership/consent/provenance fields, validate signed URLs, and define deletion behavior. Do not add recognition or training.

### P2-A6 — Motion inspector parity

Add capability-gated `sceneSource` and `orientationSource`; expose a motion library/preset picker only after a chosen provider confirms stable identifiers.

### P2-A7 — Camera Control foundation

Add a Camera Control node or shared structured parameter supporting preset and prompt modes. Feed it into Video Generate/Edit/Motion only through model capability mapping.

### P2-A8 — Controlled real adapter

Implement one provider adapter behind an off-by-default feature flag, contract tests, single-task plan confirmation, job identity persistence, polling, refund/error normalization, and a one-job approved smoke. Do not enable batch execution.

## 9. Security and product boundaries

- No third-party account, private API, private source, or restricted endpoint was used.
- No Higgsfield, Kling, B.AI, or OpenAI task was submitted.
- No image/video was uploaded to Higgsfield.
- No provider cost or ShadowEdge credits were consumed.
- Character references are declarative URLs only; there is no biometric processing.
- Existing `/workspace/image`, `/workspace/video`, and `/remake` behavior is unchanged.
- Real character training should be a separate, explicitly approved project with consent, retention, deletion, abuse prevention, and provider portability requirements.

## 10. Acceptance evidence

- TypeScript: `npx tsc --noEmit`
- Focused ESLint: P2-A3 changed Studio files
- Unit/contract tests:
  - Character -> Video/Motion metadata binding
  - Character -> Shot -> Video inheritance
  - binding removal cleanup
  - Timeline `characterIds` persistence
  - existing Timeline, Motion, Video Edit, and Video job identity regressions
- No provider call, paid task, push, or deploy is part of this audit.
