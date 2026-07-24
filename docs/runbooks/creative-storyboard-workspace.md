# Creative Storyboard Workspace UI

Studio now displays an AI Scene Planning workspace after the Unified Timeline.

Each Scene has a Storyboard, Shot cards, Shot Type, Camera, Duration, bound references, Prompt Draft text, and a reference-only Timeline Placeholder. Agent Canvas also projects Storyboard Nodes between Strategy and Agent Team, with Scene, Shot count, Agent source, and evidence details.

`SHOT_DRAFT` follows an explicit two-step boundary:

1. Preview the proposed Shot description, Camera, Duration, references, and Prompt.
2. Confirm creation of append-only Draft metadata.

Confirmation does not modify the live Timeline, run an Agent, start Execution, call a Provider, generate media, or deduct Credits.

The UI uses:

- `GET /api/projects/:id/storyboards`
- `GET /api/scenes/:id/shots`
- the governed Shot Draft Preview and Confirm endpoints

Authentication and Scene ownership are enforced by the API.
