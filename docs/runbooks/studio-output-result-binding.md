# ShadowEdge Studio P2-A25 — Output Node Auto Result Binding

## Executive summary

Studio now binds a completed video result to directly connected Output Nodes without waiting for the Output executor or Timeline. The binding is a pure Canvas-data operation and is used by Generation Queue, graph runtime, retry runtime, project/template restoration, local-storage hydration, and connections created after a video has already completed.

Output and Timeline are intentionally independent branches:

```text
Video result
├── Output binding -> Preview / Create Asset / Download
└── Timeline binding -> Video clip
```

No Video API, Provider, billing, credits, render, or FFmpeg path changed.

## 1. Binding flow

The binding contract is implemented in:

```text
src/features/studio/lib/studioOutputBinding.ts
```

Input:

```ts
{
  nodes,
  edges,
  sourceNodeId,
  status,
  videoUrl,
  thumbnail,
  jobId,
  completedAt,
  errorMessage
}
```

For every direct edge from the source video node to an Output Node, the completed result is normalized to:

```ts
{
  sourceNodeId,
  videoUrl,
  resultPreview: videoUrl,
  thumbnail,
  jobId,
  status: "completed",
  completedAt
}
```

The same binder accepts processing and failed runtime events, so the connected Output reflects the upstream lifecycle rather than remaining idle.

## 2. Runtime integration

`studioStore.ts` invokes the Output binder in these paths:

- controlled Generation Queue progress/result callbacks;
- ordinary Studio graph progress/result callbacks;
- single-node retry progress/result callbacks;
- cloud project load;
- template load;
- local-storage hydration;
- a new Canvas connection created after a video already completed.

This closes the P2-A16 gap where the Video Node and Timeline completed but Output remained idle.

## 3. Output state

Output Node now uses a constrained status contract:

```text
idle
processing
completed
failed
```

New Output data fields:

```ts
sourceNodeId: string;
videoUrl: string;
completedAt: string;
```

Existing `resultPreview` and `createdAt` fields remain for Canvas compatibility. On completion, `createdAt` and `completedAt` contain the same completion timestamp.

### Idempotency

The binder compares all persisted Output fields. Replaying the same completed event:

- does not rewrite the node;
- does not change the completion timestamp;
- does not duplicate an Output Node;
- returns `changed:false`.

## 4. Missing Output design

Selected design: **B — prompt the user to connect an Output Node**.

Studio does not automatically create an Output Node because automatic node creation would alter the user's Canvas topology, placement, undo history, and template structure.

When a terminal video event has no directly connected Output Node:

- Canvas nodes and edges remain unchanged;
- binding returns `OUTPUT_NODE_CONNECTION_REQUIRED`;
- Studio shows a non-blocking message asking the user to connect an Output Node;
- Timeline binding continues independently;
- connecting an Output later immediately backfills the persisted completed video.

## 5. Failure behavior

For a failed video event, directly connected Output Nodes receive:

```ts
{
  status: "failed",
  sourceNodeId,
  videoUrl: "",
  resultPreview: "",
  errorMessage
}
```

A completed event without a result URL is classified as an Output-binding failure with `OUTPUT_RESULT_MISSING`; it does not change the upstream Video Node result or Timeline state.

## 6. Preview, Asset Loop, and Download

Completed Output Nodes provide:

- video/image preview;
- `Create Asset`, reusing the existing P1-A8 Result Asset Loop;
- `Download`, using the completed result URL.

Asset creation remains idempotent through the existing `originNodeId/sourceNodeId` check. No new Asset API was added.

## 7. Timeline relationship

Output binding and Timeline binding are separate pure operations:

- Output binding reads Canvas edges and updates Output Node data.
- Timeline binding reads the video result and updates the video track.
- neither operation depends on the other succeeding;
- missing Output does not block Timeline;
- Timeline failure does not revert Output or the completed Video Node.

## 8. Canvas schema compatibility

Canvas remains version `7`.

No version upgrade is required because this phase adds optional-compatible Output Node data fields and the existing node normalization merges defaults when loading old projects. Existing Canvas v7 projects, templates, and local-storage snapshots remain readable.

## 9. Test and build results

No Provider was called.

### Contract and regression tests

```text
tests/studio-output-result-binding.test.mjs
tests/studio-generated-video-timeline-binding.test.mjs
tests/studio-video-job-identity-contract.test.mjs
```

Result: `9/9 passed`.

Required Output cases:

| Case | Result |
|---|---|
| Completed Video Node updates Output | Passed |
| Repeated completion is idempotent | Passed |
| Missing Output does not create a node | Passed |
| Failed video marks Output failed | Passed |

### Static verification

- TypeScript `--noEmit`: passed
- targeted ESLint: passed
- Next.js production build: passed
- `/studio`, `/workspace/image`, `/workspace/video`, and `/remake`-related routes compiled without a route change

The in-app browser tab did not respond to read-only DOM inspection within the timeout. No UI actions, generation, or data mutations were attempted; browser inspection is therefore not used as acceptance evidence.

## 10. Safety result

- API changes: none
- Database changes: none
- Canvas version change: none
- Video API changes: none
- Workspace changes: none
- Timeline schema changes: none
- Provider calls: none
- Credits/Billing changes: none
- Render/FFmpeg: not used
- Push/deploy/PM2 restart: not performed
