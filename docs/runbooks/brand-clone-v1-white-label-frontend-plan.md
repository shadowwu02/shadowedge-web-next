# Brand Clone v1-A White-Label Frontend Plan

Date: 2026-07-05

Scope: code audit and planning only. This runbook does not change runtime code, deployment, environment variables, backend production, payment/provider settings, or secrets.

## Recommendation

Use **Option B: white-label configuration** as the primary path.

Start with **`shadowedge-web-next` only** for the first new brand frontend. The user-facing web app contains the public marketing pages, auth pages, pricing copy, and creative workspaces that a new brand needs first. The Admin frontend should be treated as a later, smaller follow-up after the user-facing brand is stable.

Directly copying the repo is only recommended for a disposable demo or emergency launch where long-term maintenance cost is accepted up front.

## Repositories Audited

- User web frontend: `C:\Users\WEll\Documents\shadowedge-web-next`
  - Audited base commit: `977847f1515b9750fbc0ae066ca55bb428f36e2d`
  - Current status before this doc: clean
- Admin frontend: `C:\Users\WEll\Documents\shadowedge-admin-next`
  - Audited base commit: `6e10e2d820fed18aae6c32bc6f1e3259afccad09`
  - Current status before this doc: untracked `outputs/` already present; leave it untouched

## Which Frontend To Clone First

Build the new brand from `shadowedge-web-next` first.

Reasons:

- It is the user-facing product surface: homepage, pricing, auth, account, history, model library, Prompt Studio, Canvas, image workspace, video workspace, and remake flows.
- It already owns the public assets under `public/`, including `public/brand/shadowedge-logo.png`, home media, and model icons.
- It has the brand-heavy copy in `src/i18n/dictionary.ts` and UI brand placement in `TopBar`, `Sidebar`, and auth pages.
- It talks to the existing backend through `NEXT_PUBLIC_API_BASE_URL`, so a new brand can be deployed as a separate frontend project while continuing to use the existing backend when explicitly intended.

Do not clone or white-label Admin in the first implementation pass unless the new brand immediately needs a separate operator dashboard.

Admin should be handled later because:

- It has high-risk actions around users, credits, jobs, maintenance, refunds, and audit views.
- It uses admin auth localStorage keys and `/api/admin/*` routes that should not be renamed casually.
- Its branding is much smaller: metadata, dictionary app name, sidebar title, topbar copy, colors, and API base URL.
- It has no `public/` asset directory today, so Admin logo/favicon work would require introducing new assets there.

## Option Comparison

### Option A: Direct Repo Copy

Implementation:

- Copy `shadowedge-web-next` to `new-brand-web-next`.
- Change logo, favicon, colors, domain, metadata, and copy directly in the copied repo.
- Deploy copied repo as a separate Vercel project.

Pros:

- Fastest path to a visually separate frontend.
- Low initial abstraction work.
- Can be useful for a one-off demo or short-lived market test.

Cons:

- Creates two codebases that drift quickly.
- Bug fixes, API contract updates, model rules, auth fixes, pricing changes, and workspace changes must be duplicated.
- Easy to accidentally copy local env values or production assumptions.
- Makes future multi-brand work harder.

Recommendation:

- Not recommended as the default.
- Acceptable only for a temporary demo with an explicit sunset plan.

### Option B: White-Label Configuration

Implementation:

- Keep one codebase.
- Add brand config files and resolve the active brand through `NEXT_PUBLIC_BRAND`.
- Move brand-specific names, assets, SEO, contact details, theme tokens, and selected copy into brand config.
- Deploy each brand as a separate Vercel project with a different `NEXT_PUBLIC_BRAND`.

Pros:

- Best long-term maintenance path.
- Shared fixes and feature work stay in one frontend.
- Easier to add brand 3, brand 4, etc.
- Reduces accidental divergence in business logic, generation flows, credits, auth, and API contracts.

Cons:

- First pass requires careful extraction.
- Some current styles and copy are hardcoded and need cleanup.
- Requires smoke testing both `shadowedge` and `newbrand` modes before deployment.

Recommendation:

- Recommended path for Brand Clone v1-B and later.

## Suggested Brand Config Structure

Add:

```text
src/config/brand.ts
src/config/brands/shadowedge.ts
src/config/brands/newbrand.ts
public/brands/shadowedge/
public/brands/newbrand/
```

Use:

```text
NEXT_PUBLIC_BRAND=shadowedge
NEXT_PUBLIC_BRAND=newbrand
```

Suggested config shape:

```ts
export type BrandConfig = {
  id: "shadowedge" | "newbrand";
  name: string;
  shortName: string;
  adminName: string;
  slogan: string;
  domain: string;
  appUrl: string;
  apiBaseUrl: string;
  supportEmail: string;
  contactLinks: Array<{ label: string; href: string }>;
  assets: {
    logo: string;
    mark: string;
    favicon: string;
    ogImage?: string;
  };
  seo: {
    title: string;
    description: string;
    openGraphTitle: string;
    openGraphDescription: string;
  };
  theme: {
    background: string;
    surface: string;
    accent: string;
    accentSoft: string;
    accentDeep: string;
  };
};
```

`src/config/brand.ts` should select the active config using `process.env.NEXT_PUBLIC_BRAND || "shadowedge"`, with a safe fallback to ShadowEdge.

## Brand Content To Extract

### Core Identity

- Brand name:
  - `src/app/layout.tsx`
  - `src/i18n/dictionary.ts`
  - `src/components/layout/TopBar.tsx`
  - `src/components/layout/Sidebar.tsx`
  - `src/components/auth/AuthPageShell.tsx`
  - `src/components/auth/SignInForm.tsx`
  - Admin later: `shadowedge-admin-next/src/app/layout.tsx`, `src/i18n/dictionary.ts`, `src/components/admin/AdminSidebar.tsx`
- Logo:
  - `public/brand/shadowedge-logo.png`
  - `src/components/layout/TopBar.tsx`
  - Suggested move: `public/brands/shadowedge/logo.png`, `public/brands/newbrand/logo.png`
- Favicon:
  - `src/app/favicon.ico`
  - Suggested future asset: `public/brands/{brand}/favicon.ico`
- Domain:
  - `NEXT_PUBLIC_API_BASE_URL` examples currently point to `https://api.shadowedgeai.com`
  - `src/app/api/internal/video/reverse-analyze/route.ts` has fallback origin `https://app.shadowedgeai.com`
  - New brand domain must be configured through deployment env, not hardcoded in shared logic.

### Marketing And Product Copy

- Homepage hero copy:
  - `src/components/home/HomePage.tsx`
  - `src/i18n/dictionary.ts` keys under `home.*`
- Slogan:
  - `src/components/layout/TopBar.tsx` currently displays `AI Studio`
  - `src/components/layout/Sidebar.tsx` currently displays `AI Studio`
  - `src/i18n/dictionary.ts` contains user-facing positioning copy
- Copyright:
  - No obvious footer/copyright component found in this audit.
  - Add to brand config before adding a public footer or legal pages.
- Support email and contact links:
  - `src/components/marketing/MarketingSupportPages.tsx`
  - `src/i18n/dictionary.ts` keys under `contact.*`
  - No hardcoded support email found; current contact page is guided copy and internal CTAs.
- Pricing copy:
  - `src/components/pricing/PricingBillingPage.tsx`
  - `src/components/home/HomePage.tsx` pricing preview
  - `src/i18n/dictionary.ts` keys under `pricing.*`
- Login/register copy:
  - `src/components/auth/AuthPageShell.tsx`
  - `src/components/auth/SignInForm.tsx`
  - `src/components/auth/SignUpForm.tsx`
  - `src/components/auth/ForgotPasswordForm.tsx`
  - `src/components/auth/ResetPasswordForm.tsx`
  - `src/i18n/dictionary.ts` keys under `auth.*`
- Privacy/terms brand name:
  - No privacy or terms pages were found in `src/app` during this audit.
  - If legal pages are added, make brand name, legal entity, contact, and domain config-driven.

### SEO And Metadata

- Current metadata:
  - `src/app/layout.tsx` has title `ShadowEdge` and description `AI creative workspace for image and video generation.`
  - Admin `src/app/layout.tsx` has title `ShadowEdge Admin` and description `ShadowEdge Admin dashboard`.
- OpenGraph:
  - No explicit `openGraph` metadata found in the user web frontend.
  - Add OpenGraph/Twitter metadata during v1-B or v1-C so each brand has correct share cards.

### Theme And Visual Tokens

- Main CSS variables:
  - `src/app/globals.css`
  - Current accent is ShadowEdge orange/gold: `--se-orange`, `--se-orange-soft`, `--se-orange-deep`, plus many direct `#ffb44d`, `#f6a935`, `#ffc35a`, `#ffd08a`, and related rgba values.
- Components with direct brand color usage:
  - `src/components/home/HomePage.tsx`
  - `src/components/pricing/PricingBillingPage.tsx`
  - `src/components/layout/TopBar.tsx`
  - `src/components/layout/Sidebar.tsx`
  - Auth components
  - Workspace components likely contain additional hardcoded accent values.
- Admin CSS:
  - `shadowedge-admin-next/src/app/globals.css`
  - Uses `--admin-gold` and direct gold values.

Theme extraction should start with CSS variables first, then gradually remove direct hex usage from high-visibility shell/marketing/auth areas.

### Workspace, Sidebar, Topbar

- Main shell:
  - `src/components/layout/AppShell.tsx`
  - `src/components/layout/TopBar.tsx`
  - `src/components/layout/Sidebar.tsx`
- Brand title and logo:
  - `TopBar` uses `/brand/shadowedge-logo.png` and `alt="ShadowEdge"`.
  - `Sidebar` hardcodes `S`, `ShadowEdge`, `AI Studio`, and a backend note mentioning ShadowEdge VPS API.
- Recommendation:
  - Pull `brand.name`, `brand.shortName`, `brand.slogan`, `brand.assets.logo`, and `brand.api.copyLabel` from config.

### API Base URL

- User web:
  - `src/lib/api.ts`
  - `.env.example`
  - `src/app/api/internal/video/reverse-analyze/route.ts`
- Admin:
  - `shadowedge-admin-next/src/lib/admin-api.ts`
  - `.env.local.example`
- Keep API base URL separate from visual brand. A new brand frontend may initially call the same backend, but that decision must be explicit per deployment.

### Admin Logo And Title

Admin should be a follow-up after user web.

Likely Admin brand surfaces:

- `shadowedge-admin-next/src/app/layout.tsx`
- `shadowedge-admin-next/src/i18n/dictionary.ts`
- `shadowedge-admin-next/src/components/admin/AdminSidebar.tsx`
- `shadowedge-admin-next/src/components/admin/AdminTopbar.tsx`
- `shadowedge-admin-next/src/app/sign-in/SignInClient.tsx`
- `shadowedge-admin-next/src/app/globals.css`

Do not change Admin routes, auth storage keys, credit actions, refund actions, maintenance actions, or admin API paths as part of visual white-labeling.

## Content Not To Change Casually

Do not copy, rename, rotate, or edit the following during frontend white-label work unless there is a separate backend/security task:

- Supabase key
- API secret
- Payment key
- Provider key
- R2/S3 key
- Admin token
- Billing logic
- User credits logic
- Generate API path
- Auth callback URL
- Production env

Specific code boundaries found:

- `NEXT_PUBLIC_API_BASE_URL` is the only public API env example currently visible in both frontend repos.
- `src/app/api/internal/video/reverse-analyze/route.ts` uses server-only `INTERNAL_VIDEO_SITE_KEY` and `INTERNAL_REQUEST_ORIGIN`; do not expose or duplicate secrets into client config.
- `/api/image/generate`, `/api/video/generate`, `/api/remake/*`, `/api/auth/*`, `/api/admin/*`, `/api/upload-media`, and status/history routes are product contracts, not branding.
- Credits and billing are wired through hooks/components such as `useCredits`, `AccountCreditsPage`, `PricingBillingPage`, generation hooks, and Admin user/job pages. Treat these as business logic.
- Local storage keys and browser events such as `shadowedge_auth_token`, `shadowedge_refresh_token`, `shadowedge_user_profile`, `shadowedge:profile-updated`, and draft keys are internal compatibility keys. Renaming them can sign out users or orphan drafts.
- Download filenames like `shadowedge-image-*` and `shadowedge-video-*` can be branded later, but they are lower priority and should not block v1-B.

## Files Likely Affected In v1-B/v1-C

User web, expected:

- `src/config/brand.ts` new
- `src/config/brands/shadowedge.ts` new
- `src/config/brands/newbrand.ts` new
- `public/brands/shadowedge/*` new/moved assets
- `public/brands/newbrand/*` new assets
- `src/app/layout.tsx`
- `src/app/globals.css`
- `src/components/layout/AppShell.tsx`
- `src/components/layout/TopBar.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/components/home/HomePage.tsx`
- `src/components/auth/AuthPageShell.tsx`
- `src/components/auth/SignInForm.tsx`
- `src/components/auth/SignUpForm.tsx`
- `src/components/auth/ForgotPasswordForm.tsx`
- `src/components/auth/ResetPasswordForm.tsx`
- `src/components/pricing/PricingBillingPage.tsx`
- `src/components/marketing/MarketingSupportPages.tsx`
- `src/i18n/dictionary.ts`
- `src/lib/api.ts`
- `src/lib/maintenance.ts`
- `src/types/api.ts`
- `src/app/api/internal/video/reverse-analyze/route.ts` only if origin/header behavior is intentionally made brand-aware
- `.env.example` only to document `NEXT_PUBLIC_BRAND`; do not add secrets

Admin later, expected:

- `shadowedge-admin-next/src/app/layout.tsx`
- `shadowedge-admin-next/src/app/globals.css`
- `shadowedge-admin-next/src/i18n/dictionary.ts`
- `shadowedge-admin-next/src/components/admin/AdminSidebar.tsx`
- `shadowedge-admin-next/src/components/admin/AdminTopbar.tsx`
- `shadowedge-admin-next/src/app/sign-in/SignInClient.tsx`
- `shadowedge-admin-next/src/lib/admin-api.ts` only for public API base config handling
- `shadowedge-admin-next/.env.local.example` only to document public brand/app name variables; do not add secrets

## Risk Points

- API misrouting: a new brand frontend could accidentally call production ShadowEdge API with the wrong domain/origin/CORS setup.
- Auth callback mismatch: password reset, login redirects, and backend allowed origins must be checked before deployment.
- Server-only internal route: reverse analyze proxy requires `INTERNAL_VIDEO_SITE_KEY`; do not move it into client brand config.
- Credits and generation: brand work must not touch cost estimation, credit charging, job creation, status polling, or refund logic.
- Provider and storage: do not change provider keys, R2/S3 keys, asset domains, signed URL behavior, or upload contracts.
- Local storage/session compatibility: renaming `shadowedge_*` storage keys can force sign-outs or strand saved drafts.
- CSS extraction size: colors are partly variables and partly direct hex/rgba usage, so v1-B should start with high-visibility shell/marketing/auth colors first.
- SEO gap: current web metadata is minimal and lacks explicit OpenGraph config.
- Legal gap: no privacy/terms pages were found; legal pages need brand/legal-entity fields before launch.
- Direct copy drift: Option A would require duplicated fixes across both repos.
- Admin blast radius: Admin includes credits, refunds, maintenance, job sync, and audit views. Keep it out of the first frontend white-label pass.

## Implementation Phases

### Brand Clone v1-A: White-Label Plan Audit

Status: this document.

Deliverables:

- Decide user web first.
- Compare direct copy vs config-based white-label.
- Identify brand content, unsafe areas, likely files, risks, and phased plan.
- No runtime code changes.
- No deploy.

### Brand Clone v1-B: Extract Brand Config

Goal:

- Add config structure for existing ShadowEdge brand only.
- Replace hardcoded high-visibility brand fields with `brand` config.
- Keep behavior identical when `NEXT_PUBLIC_BRAND` is unset or `shadowedge`.

Recommended scope:

- `src/config/brand.ts`
- `src/config/brands/shadowedge.ts`
- `public/brands/shadowedge/`
- metadata, logo path, brand name, slogan, support/contact fields, theme seed variables
- no new brand yet

Validation:

- `npm run lint`
- local smoke for homepage, sign-in, sign-up, pricing, image workspace, video workspace, account/history

### Brand Clone v1-C: Add New Brand Config

Goal:

- Add `src/config/brands/newbrand.ts`.
- Add `public/brands/newbrand/` assets.
- Set `NEXT_PUBLIC_BRAND=newbrand` locally for smoke testing.
- Keep API base URL explicit and unchanged unless a separate backend/domain decision is approved.

Validation:

- Smoke both `NEXT_PUBLIC_BRAND=shadowedge` and `NEXT_PUBLIC_BRAND=newbrand`.
- Verify logo, favicon, metadata, homepage copy, auth copy, pricing copy, contact copy, topbar/sidebar, and theme colors.

### Brand Clone v1-D: Local Smoke

Goal:

- Run locally only.
- No backend production changes.
- No env secret changes.

Checklist:

- Homepage renders new brand.
- Auth pages render new brand and redirects are safe.
- Workspace pages still load models through the intended API.
- Image/video generation buttons still point to the same product paths.
- Pricing and account pages show intended copy.
- No secrets appear in rendered HTML, console logs, or docs.

### Brand Clone v1-E: Vercel New Project Deployment

Goal:

- Create separate Vercel project for the new brand frontend.
- Configure only approved public env values and required server-only env values.
- Do not copy production secrets manually from local files.

Checklist:

- `NEXT_PUBLIC_BRAND=newbrand`
- `NEXT_PUBLIC_API_BASE_URL` explicitly reviewed
- Backend allowed origins/CORS reviewed
- Auth redirect/callback URLs reviewed
- `INTERNAL_REQUEST_ORIGIN` reviewed if reverse analyze proxy is used
- `INTERNAL_VIDEO_SITE_KEY` provided only through secure Vercel env if required

### Brand Clone v1-F: Domain Binding

Goal:

- Bind the new brand domain after smoke passes.

Checklist:

- DNS configured.
- Vercel domain verified.
- Backend allowed origin updated through the proper backend release process.
- Auth callback/reset links verified against exact domain.
- SEO metadata and OpenGraph URLs verified.

## Direct Copy Recommendation

Do not use direct copy as the default.

Use direct copy only if:

- The new brand is a short-lived demo.
- There is no plan to maintain it beyond the demo.
- The team accepts duplicated fixes and divergence.
- A cleanup or migration back to config-based white-label is already scheduled.

For a real brand launch, use config-based white-label.

## Next Step Recommendation

Proceed with **Brand Clone v1-B: Extract Brand Config** in `shadowedge-web-next` only.

Keep the v1-B scope conservative:

- Add config and ShadowEdge defaults first.
- Make existing ShadowEdge behavior visually identical.
- Do not add new brand behavior until the config layer is stable.
- Do not touch Admin until user web white-label smoke is clean.
- Do not deploy until v1-D smoke passes and v1-E env/domain review is approved.
