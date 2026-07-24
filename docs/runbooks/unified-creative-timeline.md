# Unified Creative Timeline UI

The Studio workspace now presents a read-only Unified Timeline between the Creative Canvas workspace and the existing media assembly controls.

It shows deterministic Scenes, video/image/audio/subtitle clips, duration lanes, Agent origin, Asset references, Output quality state, and Canvas-to-Timeline reference counts. Scene details organize the selected Scene as a compact resource tree.

Copilot Timeline Insights may navigate to the existing Draft Suggestion flow. They cannot edit a clip, replace an Asset, execute a Workflow, generate media, or deduct Credits.

Data is loaded from:

- `GET /api/projects/:id/timeline`
- `GET /api/projects/:id/scenes`

Both calls use the authenticated Studio API. Empty, loading, ownership failure, and missing-result states are handled without mutating local or remote Timeline data.
