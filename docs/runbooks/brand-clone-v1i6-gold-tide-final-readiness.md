# Brand Clone v1-I6 Gold-Tide Final Launch Readiness

Date: 2026-07-07

Scope: audit and documentation only. No code changes, no environment changes, no backend changes, no Admin changes, no deploy, and no push.

## Executive Summary

Gold-Tide is ready for controlled partner preview and limited trial use.

It is not yet ready to be treated as a fully finished public launch because several P1 launch items are still open: legal pages, final SEO/OpenGraph share metadata, formal support/legal ownership details, reset-email/Supabase URL configuration review, and production monitoring/operations checks.

Current technical state:

- Gold-Tide HK VPS frontend is online.
- Vercel fallback is online.
- Gold-Tide brand config, logo, mark, favicon, slogan, contact copy, maintenance copy, custom-only pricing, public-page visual differentiation, and workspace shell styling are in place.
- Backend CORS supports Gold-Tide and www Gold-Tide.
- Backend password reset redirect logic supports Gold-Tide and www Gold-Tide.
- ShadowEdge regression has remained normal through the latest smoke checks.

## Current Online Entrypoints

Read-only checks performed on 2026-07-07. No login, Generate, Upload, Checkout, or credit-spending action was triggered.

| Entrypoint | Result | Notes |
| --- | --- | --- |
| `https://gold-tide.com/` | `200 OK` | Title is `Gold-Tide AI`; favicon path is present; no visible ShadowEdge or NewBrand AI text in sampled HTML. |
| `https://www.gold-tide.com/` | `200 OK` | Same Gold-Tide title/favicon behavior as apex domain. |
| `https://newbrand-web-next.vercel.app/` | `200 OK` | Fallback is available and serving Gold-Tide branding. |
| `http://gold-tide.com/` | `301` | Redirects to `https://gold-tide.com/`. |
| `http://www.gold-tide.com/` | `301` | Redirects to `https://www.gold-tide.com/`. |

Additional checked routes on `https://gold-tide.com`:

| Route | Result | Notes |
| --- | --- | --- |
| `/sign-in` | `200 OK` | Gold-Tide branded auth page. |
| `/sign-up` | `200 OK` | Gold-Tide branded auth page. |
| `/forgot-password` | `200 OK` | Page is routable and Gold-Tide branded. |
| `/reset-password` | `200 OK` | Page is routable; direct visit has no reset token, which is expected. |
| `/pricing` | `200 OK` | Custom Plan only; support email visible. |
| `/contact` | `200 OK` | `support@gold-tide.com` visible. |
| `/maintenance` | `200 OK` | Gold-Tide copy visible; no sampled ShadowEdge leak. |
| `/workspace/image` | `200 OK` | Gold-Tide workspace shell marker present; no sampled model fallback text. |
| `/workspace/video` | `200 OK` | Gold-Tide workspace shell marker present; no sampled model fallback text. |
| `/prompt-studio` | `200 OK` | Gold-Tide workspace shell marker present. |

Backend API checks:

| Origin | Endpoint | Result |
| --- | --- | --- |
| `https://gold-tide.com` | `GET /api/image/models` | `200 OK`, `Access-Control-Allow-Origin: https://gold-tide.com` |
| `https://gold-tide.com` | `GET /api/video/models` | `200 OK`, `Access-Control-Allow-Origin: https://gold-tide.com` |
| `https://www.gold-tide.com` | `GET /api/image/models` | `200 OK`, `Access-Control-Allow-Origin: https://www.gold-tide.com` |
| `https://www.gold-tide.com` | `GET /api/video/models` | `200 OK`, `Access-Control-Allow-Origin: https://www.gold-tide.com` |
| `https://newbrand-web-next.vercel.app` | `GET /api/image/models` | `200 OK`, matching CORS header |
| `https://newbrand-web-next.vercel.app` | `GET /api/video/models` | `200 OK`, matching CORS header |

## Brand Status

Current Gold-Tide brand config:

- `name`: `Gold-Tide AI`
- `shortName`: `Gold-Tide`
- `slogan`: `Gold-Tide AI Creative Studio`
- `domain`: `gold-tide.com`
- `appUrl`: `https://gold-tide.com`
- `supportEmail`: `support@gold-tide.com`
- `assets.logo`: `/brands/newbrand/gold-tide-logo.png`
- `assets.mark`: `/brands/newbrand/gold-tide-mark.png`
- `assets.favicon`: `/brands/newbrand/gold-tide-favicon.ico`
- `seo.title`: `Gold-Tide AI`
- `seo.description`: `Premium AI creative studio for image, video, and prompt generation.`

Current page-level status:

| Area | Status |
| --- | --- |
| Title | Uses `Gold-Tide AI` through brand config. |
| Logo / mark | Gold-Tide asset paths are configured and assets return `200 OK`. |
| Favicon | Configured as `/brands/newbrand/gold-tide-favicon.ico`; online HTML includes the Gold-Tide favicon path and the asset returns `200 OK`. |
| Slogan | `Gold-Tide AI Creative Studio` is configured and visible in the shell. |
| Pricing | Custom Plan only for Gold-Tide; ShadowEdge pricing remains separate. |
| Contact | `support@gold-tide.com` is visible on `/contact` and `/pricing`. |
| Maintenance | Gold-Tide maintenance title/message are visible; sampled page text has no ShadowEdge copy leak. |
| Workspace shell | `/workspace/image`, `/workspace/video`, and `/prompt-studio` include the Gold-Tide workspace shell marker. |
| Prompt Studio | Loads under the Gold-Tide shell and remains available for preview. |

Remaining brand polish:

- Confirm whether public display should use `Gold-Tide AI`, `Gold Tide AI`, `Gold-Tide`, or another final spelling.
- Confirm final logo lockup rules for desktop, mobile, favicon, and social preview.
- Confirm whether `support@gold-tide.com` is live, monitored, and acceptable for partner-facing use.
- Add final OG/social image if the partner wants polished link previews.

## Auth Status

Checked routes:

- `https://gold-tide.com/sign-in`: `200 OK`
- `https://gold-tide.com/sign-up`: `200 OK`
- `https://gold-tide.com/forgot-password`: `200 OK`
- `https://gold-tide.com/reset-password`: `200 OK`

Auth CORS preflight checks:

| Origin | Endpoint | Result |
| --- | --- | --- |
| `https://gold-tide.com` | `OPTIONS /api/auth/forgot-password` | `204`, matching CORS header |
| `https://gold-tide.com` | `OPTIONS /api/auth/reset-password` | `204`, matching CORS header |
| `https://www.gold-tide.com` | `OPTIONS /api/auth/forgot-password` | `204`, matching CORS header |
| `https://www.gold-tide.com` | `OPTIONS /api/auth/reset-password` | `204`, matching CORS header |
| `https://newbrand-web-next.vercel.app` | `OPTIONS /api/auth/forgot-password` | `204`, matching CORS header |
| `https://newbrand-web-next.vercel.app` | `OPTIONS /api/auth/reset-password` | `204`, matching CORS header |

Password reset redirect logic:

- `routes/auth-proxy.js` allows:
  - `https://gold-tide.com`
  - `https://www.gold-tide.com`
  - `https://newbrand-web-next.vercel.app`
  - `https://newbrand-web-next-*.vercel.app`
  - ShadowEdge origins
- For allowed frontend origins, `getPasswordResetRedirectUrl(req)` returns `${origin}/reset-password`.
- If a configured backend reset URL env exists, that configured URL takes precedence.
- If the origin is unknown, the fallback remains `https://shadowedgeai.com/reset-password`.

Important test note:

- Do not validate the current reset behavior with old reset emails. Existing emails keep whatever link Supabase generated at the time they were sent.
- Use only newly requested reset emails after confirming Supabase Auth URL configuration and email template settings.
- Do not send real customer reset emails during audit work unless explicitly approved.

Shared account model:

- Gold-Tide currently shares the ShadowEdge backend, Supabase auth project, profile records, credits, billing logic, generation history, and auth token model.
- An email already registered on ShadowEdge can show as already registered on Gold-Tide.
- Login `invalid_credentials` means Supabase rejected the email/password pair; it is not a Gold-Tide CORS failure by itself.
- Tenant/account isolation is a v2 platform decision, not a v1 launch-readiness task.

## Pricing Status

Gold-Tide pricing is currently launch-safe for a custom-sales model:

- `/pricing` returns `200 OK`.
- Visible text includes `Custom Plan`.
- Visible text includes `support@gold-tide.com`.
- Visible text does not include fixed dollar prices.
- Visible text does not include `USD`, `monthly`, `yearly`, `checkout`, `subscribe`, or `pay now`.
- Gold-Tide does not expose online checkout promises in the checked pricing page.

ShadowEdge pricing remains separate and still includes its own multi-plan pricing behavior.

Open business questions:

- Confirm whether support-led pricing is enough for partner preview.
- Confirm whether invoices, manual top-ups, or partner account credits will be handled through existing ShadowEdge operations.
- Do not change billing, credits, checkout, payment providers, or refund logic without a separate scoped backend/business task.

## SEO / OG / Favicon

Current state:

- `src/app/layout.tsx` uses `activeBrand.seo.title`.
- `src/app/layout.tsx` uses `activeBrand.seo.description`.
- `src/app/layout.tsx` uses `activeBrand.assets.favicon`.
- Online Gold-Tide pages include the Gold-Tide favicon path.
- The Gold-Tide favicon, logo, and mark assets return `200 OK`.

Gaps:

- No explicit `openGraph` metadata was found in `src/app` or `src/config`.
- No Twitter card metadata was found.
- No canonical URL metadata was found.
- No `metadataBase` was found.
- No `og:image` was found.
- No final social preview image is wired.

Recommendation before formal public launch:

- Add brand-aware canonical URL for Gold-Tide.
- Add brand-aware OpenGraph and Twitter metadata.
- Add a final `og:image` under `public/brands/newbrand/`.
- Confirm favicon rendering in Chrome/Safari/mobile after cache clears.
- Verify link previews in common channels after OG metadata is added.

## Legal Gaps

Do not invent a legal entity or legal commitments for Gold-Tide.

Current route audit:

| Page | Current result |
| --- | --- |
| `/privacy` | `404` |
| `/terms` | `404` |
| `/acceptable-use` | `404` |
| `/refund-policy` | `404` |

Legal items needed before formal public launch:

- Privacy Policy
- Terms of Service
- Acceptable Use Policy
- Refund/payment policy, even if Gold-Tide is custom/manual pricing only
- Legal entity name
- Business address or jurisdiction, if required
- Data processing / AI-content handling language
- Contact address for privacy and account requests

These should be supplied or approved by the business/legal owner before implementation.

## Domestic Access And Infrastructure

Current architecture:

- Gold-Tide frontend: HK VPS at `103.164.81.15`
- Backend API: `https://api.shadowedgeai.com`
- Database: existing Supabase
- Storage: existing R2/S3
- Vercel fallback: `https://newbrand-web-next.vercel.app`

Observed during this audit:

- Apex and www HTTPS pages return `200 OK`.
- HTTP apex and www redirect to HTTPS with `301`.
- Model endpoints work with Gold-Tide CORS.
- HTTP response headers observed from this machine include Nginx. Reconfirm Cloudflare proxy/orange-cloud status in the Cloudflare dashboard before a public traffic push.

Risks:

- HK VPS improves access versus Vercel for some users, but it does not guarantee stable mainland China access.
- API calls still go to `api.shadowedgeai.com`; frontend hosting alone does not move the API path closer to mainland users.
- Cloudflare routing, ISP peering, DNS mode, and TLS mode can materially affect performance from mainland networks.

Infrastructure follow-ups:

- Add uptime monitoring for `https://gold-tide.com`, `https://www.gold-tide.com`, and core API model endpoints.
- Add SSL expiry monitoring.
- Consider a mainland-optimized HK provider or route such as CN2, CMI, or high-quality BGP if mainland stability becomes a requirement.
- If API latency becomes the bottleneck, evaluate API-side regionalization separately.

## Operations

Current VPS process:

- Host: `103.164.81.15`
- User: `ubuntu`
- SSH key: `C:\Users\WEll\.ssh\id_ed25519_newbrand_hk`
- Deployment path: `/var/www/newbrand-web-next`
- PM2 process: `newbrand-web`
- Port: `3001`
- Nginx config:
  - `/etc/nginx/sites-available/newbrand-web`
  - `/etc/nginx/sites-enabled/newbrand-web`
- SSL certificate path:
  - `/etc/letsencrypt/live/gold-tide.com/fullchain.pem`
- SSL expiry observed:
  - `2026-10-04 07:12:22+00:00`

Current operational checks:

- `pm2 status newbrand-web`: online
- `sudo nginx -t`: successful
- Latest frontend commit after v1-I5b: `08e98db65711ec124aaf9a807e3f2b7ac9e27326`

Standard update flow:

```bash
cd /var/www/newbrand-web-next
git fetch origin main
git pull --ff-only origin main
NEXT_PUBLIC_BRAND=newbrand NEXT_PUBLIC_API_BASE_URL=https://api.shadowedgeai.com npm run build
PORT=3001 NEXT_PUBLIC_BRAND=newbrand NEXT_PUBLIC_API_BASE_URL=https://api.shadowedgeai.com pm2 restart newbrand-web --update-env
sudo nginx -t
```

Run `npm ci` before build if `package.json` or `package-lock.json` changed.

Rollback options:

```bash
cd /var/www/newbrand-web-next
git log --oneline -5
git checkout <known-good-commit>
NEXT_PUBLIC_BRAND=newbrand NEXT_PUBLIC_API_BASE_URL=https://api.shadowedgeai.com npm run build
PORT=3001 NEXT_PUBLIC_BRAND=newbrand NEXT_PUBLIC_API_BASE_URL=https://api.shadowedgeai.com pm2 restart newbrand-web --update-env
```

Emergency pause:

```bash
pm2 stop newbrand-web
sudo rm -f /etc/nginx/sites-enabled/newbrand-web
sudo nginx -t
sudo systemctl reload nginx
```

Fallback option:

- Point DNS back to `https://newbrand-web-next.vercel.app` or communicate the fallback URL directly while VPS service is restored.

## Security And Business Boundaries

This readiness audit did not modify:

- Frontend code beyond this docs file
- Backend code
- Admin frontend
- Environment files
- Backend production env
- Database
- Supabase secrets
- R2/S3 keys
- Payment/provider keys
- Admin tokens
- Generate API paths
- Upload/status/history/polling/job logic
- Credits/billing/refund/payment/provider logic
- Auth localStorage keys

Do not change these areas as part of final visual polish or partner handoff.

## Recommended Next Steps By Priority

### P0 Blockers

Current result: no known P0 blocker for controlled partner preview.

Continue to treat these as P0 if they appear:

- Gold-Tide pages fail to load.
- Image/video models fail to load because of CORS or API outage.
- Login/register/forgot-password becomes blocked.
- Pricing accidentally exposes checkout/payment actions.
- ShadowEdge regression appears after Gold-Tide changes.
- Any secret appears in frontend output, logs, or page source.

### P1 Before Partner Handoff

Complete before presenting Gold-Tide as a finished launch:

- Confirm final brand spelling and partner-approved logo usage.
- Confirm `support@gold-tide.com` ownership and monitoring.
- Add Privacy Policy.
- Add Terms of Service.
- Add Acceptable Use Policy.
- Add refund/payment policy suitable for custom pricing.
- Add brand-aware OpenGraph/Twitter/canonical metadata.
- Add final `og:image`.
- Review Supabase Auth URL Configuration and Redirect URLs:
  - `https://gold-tide.com/reset-password`
  - `https://www.gold-tide.com/reset-password`
- Review Supabase email templates for any hardcoded ShadowEdge URL or brand text.
- Add uptime and SSL expiry monitoring.
- Confirm Cloudflare proxy/TLS/DNS mode in the dashboard.

### P2 Visual Polish

Recommended after P1:

- Finalize mobile header/logo spacing.
- Add final social preview image.
- Polish prompt-studio and workspace empty states with Gold-Tide copy.
- Add partner-approved screenshots or product visuals to the homepage.
- Review responsive layout at common mobile widths.
- Add a short partner onboarding/support note for custom pricing.

### P3 Long-Term Platform / Tenant Isolation

Plan separately if Gold-Tide becomes a durable partner product:

- Tenant-scoped accounts and email uniqueness rules.
- Tenant-scoped credits, jobs, histories, billing, invoices, assets, and audit logs.
- Brand-scoped Admin views and exports.
- Tenant-aware auth callbacks, reset redirects, CORS, storage URLs, and payment callbacks.
- Brand-scoped localStorage keys only if a future migration plan is approved.
- Dedicated backend/API regionalization if mainland access needs stronger guarantees.

## Launch Readiness Decision

Controlled partner preview:

- Yes. Gold-Tide can be shown to a partner for review and limited trial, with the explicit note that legal/SEO/support operations are still being finalized.

Formal public launch:

- Not yet recommended. Complete P1 legal, SEO/OG, Supabase reset/email-template review, support ownership, and monitoring first.

## Verification

Commands/checks used:

- Frontend git status and latest commit check.
- Backend read-only route/config review.
- Read-only HTTP checks for Gold-Tide, www, and Vercel fallback routes.
- Read-only CORS checks for image/video model endpoints.
- Read-only OPTIONS checks for forgot/reset auth endpoints.
- Read-only favicon/logo/mark asset checks.
- Read-only PM2/Nginx/Certbot status checks on the HK VPS.
- Route presence check for privacy/terms/acceptable-use/refund pages.

No deploy, push, environment change, backend change, Admin change, database change, Generate action, Upload action, Checkout action, or credit-spending action was performed during this audit.
