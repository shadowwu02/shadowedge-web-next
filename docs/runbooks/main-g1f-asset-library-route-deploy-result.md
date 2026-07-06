# Main-G1-F Asset Library Route Deploy Result

Execution date: 2026-07-06

Scope: main frontend deploy verification and UI smoke. No SQL execution, environment changes, provider calls, generation, upload, billing, auto run, backend changes, or Admin changes were performed.

## Deployment Result

Deployed: yes.

Deployment mechanism: Vercel Git integration had already auto-deployed the pushed `main` commit before manual CLI deployment was needed. No separate manual deploy command was run in this step.

Platform/project/domain:

- Platform: Vercel
- Team: `shadowedge`
- Project: `shadowedge-web-next`
- Production domain: `https://shadowedgeai.com`
- Additional aliases:
  - `https://www.shadowedgeai.com`
  - `https://shadowedge-web-next.vercel.app`
  - `https://shadowedge-web-next-shadowedge.vercel.app`
  - `https://shadowedge-web-next-git-main-shadowedge.vercel.app`

Current deployment:

- Deployment URL: `https://shadowedge-web-next-9088d0bv8-shadowedge.vercel.app`
- Deployment ID: `dpl_8gVrbX8kuqyGZFcRarKt5oEQcdqi`
- Target: production
- Status: Ready
- Deployed hash: `5cc1639fc50bff9abdf4cb7a397a02ab8ab2d36a`
- Vercel build log commit: `5cc1639`
- Created: 2026-07-06T15:24:10Z

Previous deployment/version:

- Vercel deployment list showed the prior production deployment as `https://shadowedge-web-next-aqv44mrtn-shadowedge.vercel.app`.
- Rollback was not needed.

## Pre-Deploy / Build Checks

Repository checks:

- Current directory: `C:\Users\WEll\Documents\shadowedge-web-next`
- Remote: `https://github.com/shadowwu02/shadowedge-web-next.git`
- Local HEAD: `5cc1639fc50bff9abdf4cb7a397a02ab8ab2d36a`
- Remote main: `5cc1639fc50bff9abdf4cb7a397a02ab8ab2d36a`
- Git status before smoke: clean, `main...origin/main`

Backend availability:

- `GET https://api.shadowedgeai.com/api/assets?limit=1` without Authorization returned `401`.
- This confirms the route exists and enforces auth; it was not a missing route.

Local checks:

- `npm run lint` passed.
  - Existing warnings remain in `src/components/prompt-studio/PromptStudioPage.tsx` for pre-existing `<img>` usage.
- `npm run build` passed.
  - Build route table included `/assets`.

Vercel build checks:

- Vercel build completed successfully.
- Vercel route table included `/assets`.
- Deployment completed and aliases were assigned to production.

## Route HTTP Smoke

All checked routes returned HTTP 200:

- `/assets`
- `/workspace/image`
- `/workspace/video`
- `/history`
- `/pricing`
- `/sign-in`

## `/assets` UI Smoke

Browser session state:

- The in-app browser had an existing logged-in user session.
- Logged-in `/assets` smoke used that session and did not read, print, or store any token.

Logged-in result:

- `/assets` loaded at `https://shadowedgeai.com/assets`.
- Header visible: `Your saved media assets`.
- Asset list loaded successfully.
- 13 assets were initially visible.
- Summary showed image/video/audio counts.
- Asset cards rendered.
- Thumbnail/image URLs used `https://api.shadowedgeai.com/uploads/...` or safe external CDN URLs.
- No `/api/uploads/...` broken-image path was observed in asset image sources.

Visible filters:

- All
- Images
- Videos
- Audio
- Uploaded
- Generated
- Prompt Studio
- Imported

Search / refresh:

- Search input was visible.
- A safe search for `png` completed.
- Manual Refresh completed.
- After search/refresh, cards remained visible.
- Manual Refresh only reloaded the asset list.

Actions:

- Open action visible for assets with URLs.
- Copy URL action visible for assets with URLs.
- Copy Job ID action visible where source trace exists.
- Download action visible for assets with URLs.
- Reuse in Image buttons were disabled.
- Reuse in Video buttons were disabled.
- Disabled reuse title: draft-only reuse will be connected after the asset-to-workspace draft contract is approved.

Logged-out behavior:

- The current browser session was not cleared to avoid mutating the user's active login state.
- No-Authorization backend check returned `401` for `GET /api/assets?limit=1`, confirming the asset list API remains auth-required.
- A future logged-out visual browser check can be done in a fresh/private browser session if needed.

## Regression Smoke

Browser/UI regression routes:

- `/workspace/image` loaded and did not show a route crash.
- `/workspace/video` loaded and did not show a route crash.
- `/history` loaded and did not show a route crash.
- `/pricing` loaded and did not show a route crash.
- `/sign-in` loaded and did not show a route crash.

HTTP status regression:

- `/assets`: 200
- `/workspace/image`: 200
- `/workspace/video`: 200
- `/history`: 200
- `/pricing`: 200
- `/sign-in`: 200

## Safety UI Confirmation

Confirmed:

- no delete button
- no rename button
- no tag/favorite/folder action
- no batch action
- no Generate button on `/assets`
- no upload action on `/assets`
- no provider trigger
- no billing/refund action
- no Admin audit exposure
- no Shadow VLM audit exposure
- no raw metadata dump
- no token/secret-looking text visible
- no API key text visible
- no Authorization/Bearer text visible
- no raw provider response text visible
- no provider endpoint text visible

## Production Safety Confirmation

No SQL was executed.

No environment variables were modified.

No backend service was changed.

No provider was called.

No auto run was triggered.

No Generate action was performed.

No upload action was performed.

No billing, credit, or refund action was performed.

No token or secret was printed or saved.

## Rollback

Rollback needed: no.

Rollback plan remains:

- revert main frontend to the previous Vercel deployment if `/assets` or existing routes break,
- no backend rollback expected,
- confirm home/workspaces still load after rollback.

## Next Recommendation

Proceed to Main-G1-G docs push for this deployment result, then Main-G1-H can plan the next safe implementation step. Recommended next product step is History detail normalization or a separately approved draft-only asset reuse bridge.
