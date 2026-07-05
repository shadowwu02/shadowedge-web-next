# Brand Clone v1-E GitHub + Vercel Multi-Brand Plan

Date: 2026-07-05

Scope: documentation only. No push, no deploy, no environment changes, no code changes, no backend changes, and no secret inspection.

## Current Repo Facts

- Local repository: `C:\Users\WEll\Documents\shadowedge-web-next`
- GitHub remote: `https://github.com/shadowwu02/shadowedge-web-next.git`
- GitHub repo: `shadowwu02/shadowedge-web-next`
- GitHub default branch: `main`
- Local branch: `main`
- Local status at this audit: `main...origin/main [ahead 3]`
- Current local HEAD at this audit: `696596f62278ed15c1b8d617c252da38b60d1ff9`
- `origin/main` at this audit: `977847f fix: recover completed full episode remake results`
- Repo-local Vercel project link: not present. There is no `.vercel/project.json` in `shadowedge-web-next`.
- GitHub Actions deploy workflow: not present. No `.github` workflow was found in this repo.
- Existing docs reference online frontend: `https://shadowedge-web-next.vercel.app`

## Auto-Deploy Status

This repo alone does not conclusively prove whether pushing `main` will auto-deploy ShadowEdge Vercel, because Vercel Git Integration settings live in the Vercel project, not necessarily in the Git repo.

What is confirmed:

- The local repo pushes to `shadowwu02/shadowedge-web-next`.
- The default branch is `main`.
- There is an existing Vercel-hosted ShadowEdge frontend URL documented as `https://shadowedge-web-next.vercel.app`.
- No local `.vercel` link is present in this checkout.
- No GitHub Actions deployment workflow is present.

Operational assumption:

- If the ShadowEdge Vercel project is connected to `shadowwu02/shadowedge-web-next` with production branch `main`, then pushing `main` will automatically trigger a ShadowEdge production deployment.

Required final confirmation before push:

- Open the ShadowEdge Vercel project settings.
- Check **Git** settings:
  - Connected Git repository: `shadowwu02/shadowedge-web-next`
  - Production branch: `main`
  - Auto-deploy for production branch: enabled
- Check recent deployments for commits from `main` to confirm push-to-deploy behavior.

## Push Gate For ShadowEdge

If the ShadowEdge Vercel project auto-deploys from `main`, then every push to `main` is production-affecting for ShadowEdge.

Before pushing the current Brand Clone work, verify:

```powershell
Remove-Item Env:NEXT_PUBLIC_BRAND -ErrorAction SilentlyContinue
npm run lint
npm run build
```

Also verify explicitly:

```powershell
$env:NEXT_PUBLIC_BRAND = "shadowedge"
npm run build
```

The ShadowEdge project should have:

```text
NEXT_PUBLIC_BRAND=shadowedge
```

If `NEXT_PUBLIC_BRAND` is missing, the frontend currently falls back to `shadowedge`; however, production should still set it explicitly so the deployment intent is visible.

## Recommended Deployment Model

Use **one GitHub repo and multiple Vercel projects**.

Do not create or copy a second GitHub repository for the first new brand deployment. The brand work is now designed to use shared code plus brand-specific Vercel env values.

Recommended projects:

```text
GitHub repo:
  shadowwu02/shadowedge-web-next

Vercel project A:
  ShadowEdge frontend
  Production branch: main
  NEXT_PUBLIC_BRAND=shadowedge
  Domain(s): ShadowEdge domains

Vercel project B:
  NewBrand frontend
  Production branch: main
  NEXT_PUBLIC_BRAND=newbrand
  Domain(s): NewBrand domains
```

Benefits:

- One shared codebase for auth, workspaces, generation UI, model rules, fixes, and safety patches.
- No duplicate PRs for routine frontend work.
- No code drift between ShadowEdge and NewBrand.
- Brand selection is explicit per Vercel project.
- Future brands can be added by config plus Vercel project/env setup.

## Vercel Project A: ShadowEdge

Use the existing ShadowEdge Vercel project if it is already connected to the repo.

Expected settings:

```text
Git repository: shadowwu02/shadowedge-web-next
Production branch: main
NEXT_PUBLIC_BRAND=shadowedge
NEXT_PUBLIC_API_BASE_URL=https://api.shadowedgeai.com
```

Domain:

- Keep current ShadowEdge production domain(s).
- Keep the existing `shadowedge-web-next.vercel.app` preview/project URL if still useful.

Validation:

- Confirm `/`, `/sign-in`, `/sign-up`, `/pricing`, `/workspace/image`, `/workspace/video`, `/prompt-studio`, and `/maintenance`.
- Confirm ShadowEdge logo, title, topbar, and auth copy remain ShadowEdge.
- Confirm no NewBrand text appears in ShadowEdge production.

## Vercel Project B: NewBrand

Create a separate Vercel project that imports the same GitHub repo.

Expected settings:

```text
Git repository: shadowwu02/shadowedge-web-next
Production branch: main
NEXT_PUBLIC_BRAND=newbrand
NEXT_PUBLIC_API_BASE_URL=<reviewed backend URL>
```

Use the same backend only if that is an approved product decision. Do not assume that sharing the frontend repo automatically means the backend/CORS/auth settings are ready.

Domain:

- Bind NewBrand domain(s) only after local smoke and Vercel preview smoke pass.
- Keep ShadowEdge domains attached only to the ShadowEdge Vercel project.
- Keep NewBrand domains attached only to the NewBrand Vercel project.

Validation:

- Confirm `/`, `/sign-in`, `/sign-up`, `/pricing`, `/workspace/image`, `/workspace/video`, `/prompt-studio`, and `/maintenance`.
- Confirm NewBrand title/logo/visible brand text.
- Confirm API calls still point to the reviewed `NEXT_PUBLIC_API_BASE_URL`.
- Do not trigger real generation, uploads, checkout, refunds, or credit changes during brand smoke.

## Backend Review Required

Before binding NewBrand production domains or enabling real user traffic, review backend settings separately.

Required checks:

- CORS allowed origins include the NewBrand domain(s).
- Auth callback/reset-password URLs include the NewBrand domain(s).
- Any backend origin allowlists include the NewBrand Vercel preview/production URLs as appropriate.
- Reverse-analyze proxy settings are reviewed if used:
  - `INTERNAL_REQUEST_ORIGIN`
  - `INTERNAL_VIDEO_SITE_KEY`
- Payment/webhook/provider settings are not copied casually.
- Storage asset domains, signed URL behavior, and R2/S3 references are reviewed.

Do not put server-only secrets in `NEXT_PUBLIC_*` variables or brand config.

## Why Not Copy The GitHub Repo

Do not copy a second GitHub repo as the default launch path.

Problems with a copied repo:

- Bug fixes must be duplicated.
- Security patches may be missed in one repo.
- Model rules, generation UI, auth fixes, and pricing/account changes drift.
- Backend contract updates become harder to coordinate.
- It becomes unclear which repo is authoritative.

Use a copied repo only if:

- A partner explicitly requires independent code ownership.
- Legal/commercial terms require separate repository access.
- The fork is private and there is a named owner for syncing upstream fixes.
- There is an explicit maintenance plan for cherry-picking security and product fixes.

If a partner needs code access, prefer this order:

1. Limited access to the existing private workflow, if acceptable.
2. A private fork with upstream sync rules.
3. A copied repository only when the fork model is not acceptable.

## Recommended Release Sequence

1. Keep all Brand Clone commits local until ShadowEdge push risk is reviewed.
2. Confirm whether ShadowEdge Vercel auto-deploys from `main`.
3. Run the ShadowEdge push gate:
   - default brand build
   - `NEXT_PUBLIC_BRAND=shadowedge` build
   - smoke key pages
4. Push to GitHub only after ShadowEdge production impact is accepted.
5. Let ShadowEdge Vercel deploy if auto-deploy is enabled.
6. Create NewBrand Vercel project from the same GitHub repo.
7. Set `NEXT_PUBLIC_BRAND=newbrand` in the NewBrand Vercel project.
8. Set reviewed backend/API env values.
9. Smoke NewBrand Vercel preview.
10. Review backend CORS/Auth callback/domain allowlists.
11. Bind NewBrand domain(s).

## Current Recommendation

Recommended: **same GitHub repo + two Vercel projects**.

Do not copy `shadowedge-web-next` into a second GitHub repo for the initial NewBrand launch. The current white-label config supports multiple brands from one codebase, and Vercel project-level env values are the right boundary for ShadowEdge vs NewBrand deployment.
