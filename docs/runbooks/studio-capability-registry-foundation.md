# Studio Capability Registry and Camera Control Foundation

Date: 2026-07-18
Baseline: `7c194a4e288819e5a0243fdd09f0a85ec5d9d4f1`

## 1. Executive summary

P2-A4 introduces a provider-neutral description layer between Studio product capabilities and execution adapters. UI nodes and generation plans refer to a capability (`video_generate`, `video_edit`, `motion_control`, or `camera_control`); provider support is declarative metadata with an adapter key and availability state.

Only existing Video Generate and local mock adapters are executable. Higgsfield and Kling entries are `metadata_only`; they have no HTTP client, credentials, billing rule, or executable adapter. Camera Control is implemented as a Canvas node, zero-credit Generation Plan item, single-task Queue entry, and deterministic local mock.

## 2. Capability model

```ts
type StudioCapability = {
  id: StudioCapabilityId;
  category: "generation" | "edit" | "control";
  inputs: StudioCapabilityMedia[];
  outputs: StudioCapabilityMedia[];
  modes: string[];
  parameters: StudioCapabilityParameter[];
  providers: StudioCapabilityProvider[];
};
```

Provider support is described without adding provider conditionals to nodes:

```ts
type StudioCapabilityProvider = {
  providerKey: string;
  adapterKey: string;
  availability: "available" | "mock" | "metadata_only";
  supportedModes: string[];
  supportedParameters: string[];
};
```

Lookup functions:

- `getStudioCapability(id)`
- `getStudioCapabilityProvider(capabilityId, providerKey)`
- `providerSupportsCapabilityMode(capabilityId, providerKey, mode)`
- `getCapabilityCostRule(capabilityId, providerKey)`

## 3. Initial registry

| Capability | Modes | Inputs | Output | Executable mapping |
| --- | --- | --- | --- | --- |
| `video_generate` | text-to-video, image-to-video, reference-video | text/image/video | video | Existing ShadowEdge Video API executor |
| `video_edit` | video-to-video, replace-background, extend | video/text/image/character | video | Local mock only |
| `motion_control` | character-motion, motion-transfer, camera-motion | character/image/motion-reference/text | video | Local mock only |
| `camera_control` | preset, prompt | image/character/text | video | Local mock only |

External provider rows are metadata only. `adapterKey: "unavailable"` is intentionally non-executable and prevents the registry from implying that an integration exists.

## 4. Provider mapping

The registry separates three states:

- `available`: an existing production adapter is implemented (currently only the shared Video Generate path).
- `mock`: local deterministic adapter, no HTTP or credits.
- `metadata_only`: future support description; execution is unavailable.

Provider names are data keys, not node types or conditional branches. A future adapter resolver should select by `adapterKey` only after checking availability, rollout flag, model/mode support, media constraints, ownership, and cost confirmation.

## 5. Cost registry

```ts
type CapabilityCostRule = {
  capability: StudioCapabilityId;
  providerKey: string;
  creditsRule: "existing_video_rules" | "free_mock" | "future";
};
```

- Video Generate continues to use existing model rules.
- Video Edit, Motion Control, and Camera Control mocks are zero-credit.
- External Edit/Motion/Camera mappings are `future`; there is no placeholder numeric price and no billing fallback.

## 6. Camera Control design

### Canvas node

```ts
type CameraControlConfig = {
  preset: "dolly" | "crane" | "orbit" | "handheld" | "pan" | "tilt" | "zoom";
  prompt: string;
  duration: number;
  strength?: number;
};
```

`CameraControlNodeData` additionally stores:

- `sourceImage`
- `characterRefs[]`
- generation plan and queue state
- shared job identity
- mock result
- Timeline binding state
- normalized errors

### Input mapping

Supported foundation workflows:

```text
Image Asset + Prompt -> Camera Control
Character + Prompt -> Camera Control
```

The first Character reference image can supply the mock source image. The Prompt node overrides the Camera node prompt when connected. Character ids are preserved on the result Timeline clip.

### Plan and queue

```text
Camera Control Node
  -> Generation Plan (one `camera_control` item, zero credits)
  -> confirmation
  -> single-task Queue
  -> Camera Control executor
  -> local mock adapter
  -> Canvas result / Output / Asset / Timeline
```

Direct execution is blocked by the same `GENERATION_PLAN_REQUIRED` boundary used by Video Edit and Motion Control. Duplicate active plans and batch selection remain blocked.

### Mock output

The mock adapter returns the source image URL as a deterministic result reference and marks it `mock: true`. It does not create a playable video, upload storage, or call a provider. The Camera node displays the mock as an image preview; the shared video-shaped result contract is retained for future adapter compatibility.

## 7. Canvas and persistence

P2-A4 adds the `camera_control` node type and optional project data under the existing Canvas JSON. Canvas version remains 7 because this is additive:

- Old projects have no Camera nodes and load unchanged.
- New Camera nodes serialize through existing project persistence.
- No database column, migration, or API is required.
- Timeline schema remains unchanged.

## 8. Future provider integration

Before changing a provider mapping from `metadata_only` to executable:

1. Implement a provider adapter behind a default-off feature flag.
2. Validate capability, mode, parameters, duration, media type, file size, and ownership against the selected mapping.
3. Add a real cost resolver; never interpret `future` as zero.
4. Reuse shared database/provider/client job identity fields.
5. Add submission persistence verification, polling, normalized failure codes, and no automatic paid retry.
6. Add contract tests with fake transport.
7. Obtain approval for a single controlled smoke.

The node, plan, or queue should never switch on provider names. Provider selection belongs in an adapter resolver that consumes the registry.

## 9. Remaining gaps

| Gap | Risk | Recommended follow-up |
| --- | --- | --- |
| Registry has no server-authoritative provider catalog | Frontend metadata may become stale | Add authenticated capability endpoint only when backend integration begins |
| External cost rules are `future` | Cannot safely confirm a paid task | Add provider/model cost resolver before real execution |
| Camera mock is not media generation | Result is not a playable video | Keep visibly marked mock; replace only with approved adapter |
| No model-specific camera preset translation | Preset names may not map 1:1 | Add provider-specific translation inside adapters |
| `strength` support is unknown | Provider mismatch | Capability-gate and omit when unsupported |
| Character references are project metadata | No consent/provenance contract yet | Add Character Reference Resolver and rights metadata |

## 10. Safety boundaries

- No Higgsfield, Kling, Veo, B.AI, or OpenAI call.
- No provider credentials, HTTP client, paid job, billing change, or credit mutation.
- No changes to `/workspace/image`, `/workspace/video`, or provider configuration.
- No database or API change.
- No deploy or PM2 operation.

## 11. Acceptance checklist

- Capability lookup returns product modes and provider metadata.
- Unsupported provider/mode combinations return false.
- Existing Motion Control still creates a zero-credit mock Plan item.
- Camera Control creates one zero-credit Queue item.
- Camera mock transitions from queued to completed without provider calls.
- Camera result can bind Character ids to Timeline.
- TypeScript, focused lint, Studio regressions, ShadowEdge build, and NewBrand build pass.
