# Customer Feedback v1-D Remake Ratio and Shot Generation Deploy Result

## Status

Customer Feedback v1-D is deployed.

Deploy result scope:
- Hide Remake / reverse-analyze shot-generation actions.
- Preserve the normal `/workspace/video` Create Video Generate flow.
- Propagate the selected remake ratio through frontend requests and backend results.
- Keep the release read-only for smoke checks: no provider submit, no Generate, no upload, no checkout, and no billing/credits action.

Deployment evidence was recorded on July 9, 2026. Backend health was verified at approximately 2026-07-09 13:07 UTC.

## Backend Deployment

Repository:
- `C:\Users\WILL\Documents\shadowedge-api`

Commit:
- Pushed commit: `0c77a55 fix: propagate remake target ratio`
- Remote latest hash: `0c77a5516962b45f147e7a990c61ba0bd70bd69e`
- Production deployed hash: `0c77a5516962b45f147e7a990c61ba0bd70bd69e`

Production:
- Host: `root@2.24.209.120`
- Path: `/var/www/shadowedge-api-git`
- PM2 process: `shadowedge-api`
- PM2 status: `online`

Checks:
- `node --check routes/internal-api.js` passed.
- `node --check routes/remake-analysis.js` passed.
- `node --check services/remake-analysis-worker.js` passed.
- `node --check services/video-remake-service.js` passed.
- `node --check services/video-remake-vlm-service.js` passed.
- `npm run lint --if-present` ran.
- Health endpoint returned HTTP 200:
  - `{"ok":true,"message":"ShadowEdge API is running"}`

Known unrelated logs:
- Recent PM2 logs still include unrelated Supabase auth refresh/login errors such as reused refresh tokens and invalid login credentials.
- No startup crash was observed after this deployment.

## Frontend Deployment

Repository:
- `C:\Users\WEll\Documents\shadowedge-web-next`

Commit:
- Pushed commit: `7a3fd6a fix: align remake ratio and hide shot generation`
- Remote latest hash: `7a3fd6a0eabfd15c4e005d32d98a844cadb35b34`

## Gold-Tide VPS Deployment

Production:
- Host: `ubuntu@103.164.81.15`
- Path: `/var/www/newbrand-web-next`
- PM2 process: `newbrand-web`

Result:
- Deployed hash: `7a3fd6a0eabfd15c4e005d32d98a844cadb35b34`
- `npm ci` was skipped because `package.json` and `package-lock.json` did not change.
- Build passed with:
  - `NEXT_PUBLIC_BRAND=newbrand`
  - `NEXT_PUBLIC_API_BASE_URL=https://api.shadowedgeai.com`
- PM2 `newbrand-web` status: `online`
- `nginx -t` passed.

## Changed Behavior

Remake / reverse-analyze result UI no longer exposes direct shot-generation actions.

Hidden Remake actions:
- `Generate shot`
- `Generate all shots`
- `Retry all failed`
- `Retry shot`
- Single-shot generate and retry buttons
- Remake shot-generation credit notice
- Continue queue entry
- Skip failed shot entry

Preserved behavior:
- The normal Create Video Generate button remains available in `/workspace/video`.
- Remake analysis remains a read-only storyboard/prompt analysis workflow.
- Existing copy/reuse/draft review flows remain available where they do not trigger provider generation.

## Ratio Contract

Frontend request behavior:
- Long-video remake requests send the current selected ratio as:
  - `targetRatio`
  - `aspectRatio`
- Full-episode remake requests send the current selected ratio as:
  - `targetRatio`
  - `aspectRatio`
- Cost estimate requests also include the selected ratio.

Backend behavior:
- Backend accepts and normalizes:
  - `targetRatio`
  - `aspectRatio`
  - `aspect_ratio`
  - `ratio`
- Backend result metadata, storyboard fields, and shot `generationParams` use the requested ratio when present.
- Mock/fallback storyboard generation no longer hardcodes `16:9` when a request ratio is present.
- No-ratio fallback remains `16:9`.

## Smoke Results

ShadowEdge:
- URL: `https://shadowedge-web-next.vercel.app/workspace/video`
- Page opened successfully.
- Create Video prompt, Expand, and reference media area were present.
- Main Generate/sign-in-generate path was still present and was not clicked.
- Remake tab opened successfully.
- Forbidden Remake actions were absent.

Gold-Tide:
- URL: `https://gold-tide.com/workspace/video`
- Page opened successfully.
- Remake tab opened successfully.
- Forbidden Remake actions were absent.

Vercel fallback:
- URL: `https://newbrand-web-next.vercel.app/workspace/video`
- Page opened successfully.
- Remake tab opened successfully.
- Forbidden Remake actions were absent.

Ratio dry-run:
- Local implementation dry-run from v1-D reapply was reused.
- `9:16` request/result was preserved.
- No-ratio fallback remained `16:9`.
- No provider or production remake analysis POST was called for the dry-run.

## Safety Confirmations

Confirmed during deploy:
- No env change.
- No database or schema change.
- No SQL execution.
- No Admin change.
- No payment/provider/R2/Supabase/admin token change.
- No VLM/B.AI/OpenAI/Higgsfield provider submit.
- No Generate.
- No upload.
- No checkout.
- No billing or credits action.
- No `backups/` or `outputs/` submission.

## Git Sanity Notes

Frontend local repository after deploy:
- Branch: `feature/video-reference-prompt-builder-v1-a`
- HEAD equals `origin/main`.
- HEAD hash: `7a3fd6a0eabfd15c4e005d32d98a844cadb35b34`
- This branch name is still a feature branch, but its HEAD is aligned with `origin/main`.

Backend local repository after deploy:
- Branch: `main`
- HEAD equals `origin/main`.
- HEAD hash: `0c77a5516962b45f147e7a990c61ba0bd70bd69e`
- Existing untracked `backups/` and `outputs/` remain untracked and must not be submitted.

## Rollback Notes

Backend rollback:
- Roll back the API deployment to the previous known-good backend commit if remake API behavior regresses.
- Restart `shadowedge-api` after rollback.
- Verify `/api/health` returns HTTP 200.

Frontend rollback:
- Roll back `shadowedge-web-next` production deployment to the previous known-good frontend commit if `/workspace/video` or Remake UI regresses.

Gold-Tide rollback:
- Roll back `/var/www/newbrand-web-next` to the previous known-good commit.
- Rebuild with `NEXT_PUBLIC_BRAND=newbrand`.
- Restart `newbrand-web`.
- Re-run `nginx -t`.

## Next Recommendation

Keep this deployment as-is unless product reports a Remake regression.

Recommended next steps:
- Do a targeted Remake regression pass with authenticated test data before enabling any future direct shot-generation action.
- Keep Remake generation actions disabled until a separate billing/provider safety review is approved.
- If local frontend branch hygiene matters, switch local work back to `main` or create a fresh feature branch from `origin/main`; do not reset or switch branches as part of this documentation-only round.
