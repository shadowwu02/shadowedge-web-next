# Brand Clone v1-H0 NewBrand Launch Gap Audit

Date: 2026-07-07

Scope: audit and documentation only. No code changes, no environment changes, no backend changes, no Admin changes, no deploy, and no push.

## Executive Summary

Gold-Tide / NewBrand is technically online as a white-label frontend:

- `https://gold-tide.com` is served from the Hong Kong VPS.
- `https://www.gold-tide.com` is served from the same VPS.
- `https://newbrand-web-next.vercel.app` remains available as the Vercel fallback.
- Backend API calls continue to use `https://api.shadowedgeai.com`.
- Backend CORS supports Gold-Tide, www Gold-Tide, NewBrand Vercel, ShadowEdge, and Admin origins.
- Password reset redirect now supports Gold-Tide and www Gold-Tide.
- Image and video model loading works from Gold-Tide.

The remaining gap is not "white-label can run"; it is "white-label is ready for a real partner launch." Current NewBrand still uses placeholder brand values, near-ShadowEdge visual styling, shared user/account infrastructure, and incomplete legal/contact/SEO readiness.

## Current Online Function State

Read-only checks performed on 2026-07-07. No login, Generate, Upload, Checkout, or credit-spending action was triggered.

| Area | URL | Current result | Notes |
| --- | --- | --- | --- |
| Home | `https://gold-tide.com/` | `200 OK` | Title `NewBrand AI`; logo alt `NewBrand AI`; no visible ShadowEdge text in the sampled viewport. |
| Sign in | `https://gold-tide.com/sign-in` | `200 OK` | Shows NewBrand account copy. |
| Sign up | `https://gold-tide.com/sign-up` | `200 OK` | Shows NewBrand account copy. |
| Forgot password | `https://gold-tide.com/forgot-password` | `200 OK` | Shows NewBrand copy; backend redirect now resolves to Gold-Tide reset path. |
| Reset password | `https://gold-tide.com/reset-password` | `200 OK` | Shows NewBrand copy; direct page loads without reset token but is routable. |
| Pricing | `https://gold-tide.com/pricing` | `200 OK` | Visible copy says online checkout is being migrated and contact admin for top-ups. |
| Image workspace | `https://gold-tide.com/workspace/image` | `200 OK` | No `Failed to load image models` text observed. |
| Video workspace | `https://gold-tide.com/workspace/video` | `200 OK` | No `Network request failed. Using local fallback models` text observed. |
| Prompt Studio | `https://gold-tide.com/prompt-studio` | `200 OK` | Loads and indicates no credits used for prompt work. |
| Maintenance | `https://gold-tide.com/maintenance` | `200 OK` | Page has NewBrand shell/status label, but visible body still says `ShadowEdge is under maintenance` and `We are upgrading ShadowEdge`. This is a launch copy gap. |
| Contact | `https://gold-tide.com/contact` | `200 OK` | Loads NewBrand shell, but contact flow is beta/admin oriented and should be finalized. |
| www home | `https://www.gold-tide.com/` | `200 OK` | HTTPS works. |
| HTTP apex | `http://gold-tide.com/` | `301` | Redirects to `https://gold-tide.com/`. |
| HTTP www | `http://www.gold-tide.com/` | `301` | Redirects to `https://www.gold-tide.com/`. |
| Vercel fallback | `https://newbrand-web-next.vercel.app/` | `200 OK` | Title/logo show NewBrand. |
| Vercel image workspace | `https://newbrand-web-next.vercel.app/workspace/image` | `200 OK` | Fallback route is available. |
| Vercel video workspace | `https://newbrand-web-next.vercel.app/workspace/video` | `200 OK` | Fallback route is available. |

API checks:

- `GET https://api.shadowedgeai.com/api/health` with Gold-Tide origin returned `200 OK`.
- `GET https://api.shadowedgeai.com/api/image/models` with Gold-Tide origin returned `200 OK`.
- `GET https://api.shadowedgeai.com/api/video/models` with Gold-Tide origin returned `200 OK`.
- OPTIONS preflight returned `204` with matching `Access-Control-Allow-Origin` for:
  - `https://gold-tide.com`
  - `https://www.gold-tide.com`
  - `https://newbrand-web-next.vercel.app`

Auth CORS checks included:

- `/api/auth/forgot-password`
- `/api/auth/login`
- `/api/auth/register`

## Account System State

Gold-Tide currently shares the ShadowEdge backend, Supabase project, profiles table, credits, billing logic, generation logic, history, and auth token model.

Current behavior:

- A user registered on ShadowEdge can already exist from Gold-Tide's perspective.
- `POST /api/auth/register` checks the shared profile email and returns `409` with `This email is already registered. Please sign in instead.` when the email already exists.
- `POST /api/auth/login` calls Supabase `signInWithPassword`.
- A login `invalid` result means Supabase rejected the credentials, not that Gold-Tide CORS/origin is blocked.
- Gold-Tide forgot-password now redirects reset links to:
  - `https://gold-tide.com/reset-password`
  - `https://www.gold-tide.com/reset-password`
- ShadowEdge reset redirect behavior remains intact.
- NewBrand Vercel reset redirect behavior remains intact.

This is acceptable for the current v1 white-label model if the business explicitly wants one shared user pool. It is not account-isolated.

## Future Account Isolation Question

Do not implement account isolation in v1-H. It is a v2 decision.

If the partner requires independent accounts, user privacy separation, separate credits, separate billing ledgers, or a different support/admin view, plan v2 multi-tenant work:

- Add tenant/brand identity to users, profiles, credits, jobs, assets, histories, payments, invoices, audit logs, and admin views.
- Decide whether email uniqueness is global or tenant-scoped.
- Add backend tenant resolution from trusted origin/domain and/or explicit site key.
- Review Supabase auth strategy:
  - One Supabase project with tenant-scoped profiles.
  - Separate Supabase projects per brand.
  - Separate auth providers but shared generation backend.
- Decide whether localStorage keys become brand-scoped.
- Decide whether credits and billing are shared, isolated, or cross-brand transferable.
- Update Admin for tenant filtering, partner-only support, and tenant-safe exports.
- Audit CORS, reset redirects, auth callbacks, webhook callbacks, payment callbacks, and storage URLs per tenant.
- Add migration and backfill plan for existing users.

## Brand Content Gaps

Current `src/config/brands/newbrand.ts` still contains placeholders:

- `name`: `NewBrand AI`
- `shortName`: `NewBrand`
- `slogan`: `AI Creative Studio`
- `domain`: `newbrand.example.com`
- `appUrl`: `https://newbrand.example.com`
- `supportEmail`: `support@example.com`
- `seo.title`: `NewBrand AI`
- `seo.description`: generic AI workspace copy

Required partner confirmations before formal launch:

- Final brand name:
  - Is the public product `Gold-Tide`, `Gold Tide`, another name, or still `NewBrand AI`?
- Logo:
  - Current `/brands/newbrand/logo.png` is a placeholder.
  - Need final logo in desktop and mobile sizes.
- Favicon:
  - Config points to `/brands/newbrand/favicon.ico`, but observed pages still use `/favicon.ico?...`.
  - Need verify Next metadata/favicon wiring for the active brand before formal launch.
- Slogan:
  - Current `AI Creative Studio` is generic.
- Homepage hero:
  - Current hero is generic and closely resembles ShadowEdge positioning.
- Pricing:
  - Current pricing says checkout is being migrated and points users to admin contact.
  - Need partner-approved plans, currencies, credits, top-up policy, refund policy, and payment readiness.
- Login/register:
  - Current copy says customer account, credits, uploads, API, etc.
  - Need partner-approved account and data-sharing wording.
- Forgot/reset:
  - Technical redirect is fixed.
  - Need partner-approved support wording and reset email template/domain review.
- Support email:
  - Still placeholder `support@example.com` in config.
- Contact links:
  - Contact page is beta/admin oriented.
  - Need production support channel, SLA, form destination, and escalation path.
- Copyright:
  - No clear brand/legal entity copyright footer was found in the sampled public pages.
- Privacy/terms:
  - No `privacy` or `terms` route was found under `src/app` during this audit.
  - Sign-up references account rules but does not link to finished legal documents.
- OpenGraph / SEO:
  - Metadata title/description are brand-configured but still placeholder/generic.
  - Need OG image, final description, canonical URL, and brand-specific social preview.
- Footer:
  - No full production footer with legal/support/company links was found.
- Model/library copy:
  - Model and workspace copy is still product-generic and sometimes ShadowEdge-derived through dictionary fallback.
- Workspace/sidebar/topbar:
  - Current title/logo/slogan switch to NewBrand.
  - Workspace layout and terminology remain the same as ShadowEdge.
- Maintenance page:
  - Visible body still says ShadowEdge. This is the clearest current brand-copy leak.

## Visual Differentiation Gaps

Current NewBrand is a working white-label, not a visually distinct partner brand.

| Area | Current state | Gap |
| --- | --- | --- |
| Colors | NewBrand theme reuses ShadowEdge orange/gold tokens. | Needs partner palette and contrast QA. |
| Background | Same dark cinematic product feel as ShadowEdge. | Needs a distinct visual direction if partner expects separate identity. |
| Logo | NewBrand placeholder logo appears. | Needs final logo/mark/favicon assets. |
| Cards | Same card and surface style as ShadowEdge. | Fine for v1, but low brand distinction. |
| Buttons | Same orange/gold button style. | Needs theme token application if visual differentiation is required. |
| Topbar/sidebar | Brand name/logo switch works. | Layout and labels are still ShadowEdge-derived. |
| Homepage hero | Generic NewBrand copy. | Needs final offer, audience, and visuals. |
| Pricing section | Functional but migration/admin contact copy is not partner-polished. | Needs production commercial positioning. |
| Auth page | NewBrand naming works. | Needs final legal/support/account wording. |
| Workspace shell | Functional and brand title switched. | Visual shell remains very similar to ShadowEdge. |
| Mobile responsive | No obvious blocker in prior smoke, but no full visual QA pass was done in this audit. | Needs mobile screenshots and breakpoint QA before public marketing launch. |

Recommendation: yes, do a visual pass before handing to a partner as a finished brand. Do not block technical access on this if the partner accepts a beta/preview label, but do not present the current site as final brand design.

## Technical Operations Gaps

Already documented:

- VPS deployment path: `/var/www/newbrand-web-next`
- PM2 process: `newbrand-web`
- Port: `3001`
- Nginx config:
  - `/etc/nginx/sites-available/newbrand-web`
  - `/etc/nginx/sites-enabled/newbrand-web`
- SSL cert:
  - `/etc/letsencrypt/live/gold-tide.com/fullchain.pem`
- SSL expiry at launch handoff:
  - `2026-10-04`
- Update flow and rollback flow exist in `docs/runbooks/brand-clone-v1g6-gold-tide-hk-vps-launch-handoff.md`.

Still recommended:

- Add uptime monitoring for:
  - `https://gold-tide.com`
  - `https://www.gold-tide.com`
  - `https://api.shadowedgeai.com/api/health`
- Add SSL expiry monitoring or scheduled `certbot renew --dry-run` review.
- Confirm PM2 startup persistence after VPS reboot:
  - `pm2 save`
  - `pm2 startup` status
- Add log rotation review:
  - PM2 logs
  - Nginx access/error logs
  - Disk usage alerts
- Add backup/restore notes:
  - Frontend is rebuildable from GitHub.
  - Backend/database/storage backup strategy remains ShadowEdge-side and should not be invented in the frontend doc.
- Add operational owner:
  - Who can deploy frontend?
  - Who can restart PM2?
  - Who can change Cloudflare?
  - Who can approve backend CORS/auth callback changes?
- Cloudflare:
  - Current intended setup is orange cloud/proxied with SSL/TLS Full.
  - Domestic access may still vary because API calls go to `api.shadowedgeai.com`.
  - If mainland performance is a serious requirement, frontend-on-HK helps HTML/JS delivery, but API latency/reliability still depends on the current API domain and backend region.
- Mainland optimization:
  - Consider a better Hong Kong provider, CDN strategy, or API regionalization only after measuring user traffic and failure rates.
  - Do not move provider/payment/Supabase/R2 configuration casually.

## Security And Business Boundaries

Do not casually change:

- Payment keys.
- Provider keys.
- R2/S3 keys.
- Supabase service role key.
- Admin token.
- Backend production env.
- Database schema or rows.
- Credits logic.
- Billing/refund logic.
- Generate API path.
- Upload/status/history/polling/job logic.
- Auth callback URLs.
- LocalStorage keys.

Gold-Tide v1 is intentionally a frontend white-label over the existing ShadowEdge backend. Treat any backend, billing, credit, auth, or storage change as production-affecting for ShadowEdge unless explicitly scoped and approved.

## Priority Audit

### P0 - Blocking

No current P0 blocker was found in this audit.

Evidence:

- Gold-Tide pages return `200`.
- HTTP redirects to HTTPS.
- Image/video models load from `api.shadowedgeai.com`.
- Auth CORS preflight works for login/register/forgot-password.
- Forgot-password reset redirect now targets Gold-Tide.
- Vercel fallback is still available.

P0 watch items:

- If login still reports invalid for a specific customer, validate the account credential path without exposing passwords or tokens.
- If checkout/payment is expected to be live, current pricing copy indicates checkout is migrated/offline; that would become a P0/P1 business blocker depending on launch requirement.

### P1 - Launch Must-Have

Complete before presenting Gold-Tide as a finished partner launch:

- Replace placeholder brand values:
  - `NewBrand AI`
  - `NewBrand`
  - `newbrand.example.com`
  - `support@example.com`
- Confirm final public brand name and domain mapping.
- Replace final logo, mark, and favicon.
- Fix favicon wiring so the active brand favicon is used.
- Fix maintenance page ShadowEdge copy leak.
- Add or approve legal pages:
  - Privacy Policy
  - Terms of Service
  - Acceptable Use / content policy if needed
- Add production contact/support channel.
- Finalize pricing/top-up/checkout wording.
- Finalize SEO and OpenGraph metadata.
- Decide whether shared ShadowEdge user pool is acceptable and document it for partner support.
- Confirm password reset email template and sender branding if Supabase emails expose ShadowEdge copy.

### P2 - Visual Quality And Differentiation

Recommended for a polished partner experience:

- Design final theme palette beyond reused ShadowEdge orange/gold.
- Apply brand theme tokens beyond config placeholders.
- Differentiate homepage hero, auth pages, pricing page, workspace shell, and marketing/support pages.
- Add partner-specific visual assets and media.
- Run mobile and desktop visual QA.
- Audit all dictionary-driven copy for residual ShadowEdge wording in visible states.
- Review model/library language for partner tone.

### P3 - Long-Term Platform / Operations

Plan after v1 launch:

- Multi-tenant account isolation assessment.
- Tenant-aware Admin/support workflows.
- Tenant-scoped credits/billing/history/assets.
- Uptime, SSL, disk, PM2, Nginx, API health monitoring.
- Formal incident runbooks and rollback drills.
- Traffic/performance monitoring for mainland access.
- Separate repo/fork only if a partner requires code access or contractual isolation.

## Recommended Next Stage Split

- v1-H1:上线缺口文档收口
  - Review this audit with the decision-maker.
  - Confirm which P1 items are required before partner handoff.
- v1-I1:NewBrand 视觉主题设计方案
  - Define brand name, palette, logo usage, typography direction, homepage/auth/pricing visual direction.
- v1-I2:NewBrand theme config 最小接入
  - Use existing brand config/theme fields without refactoring generation logic.
- v1-I3：首页/登录/pricing 视觉差异化
  - Apply distinct visible brand experience on public conversion pages.
- v1-I4:workspace shell 轻量差异化
  - Update sidebar/topbar/workspace surface accents without changing generate/upload/history/polling logic.
- v1-I5:正式品牌素材替换
  - Replace logo, mark, favicon, OG image, and final content assets.
- v2-A:多品牌账号/租户隔离评估
  - Assess shared user pool vs tenant isolation before changing auth/database/billing behavior.

## Current Recommendation

Gold-Tide is ready for controlled internal or partner preview as a functioning white-label deployment.

Gold-Tide is not yet ready to be presented as a fully finished independent partner brand until P1 brand/legal/contact/SEO items are resolved.

Do visual work next if the partner will judge the site as a public product. Do multi-tenant account isolation only if the partner explicitly requires account separation, separate billing/credits, or independent admin/support ownership.
