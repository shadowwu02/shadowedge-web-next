# Brand Clone v1-I1 NewBrand Visual Theme Plan

Date: 2026-07-07

Scope: documentation and planning only. No code changes, no environment changes, no backend changes, no Admin changes, no deployment, and no push.

## Context

Gold-Tide / NewBrand is now technically running as a white-label frontend:

- Production frontend: `https://gold-tide.com`
- Production www frontend: `https://www.gold-tide.com`
- Vercel fallback: `https://newbrand-web-next.vercel.app`
- Backend API: `https://api.shadowedgeai.com`
- Current brand mode: `NEXT_PUBLIC_BRAND=newbrand`

The v1-H0 launch gap audit found no current P0 blocker. The remaining launch work is mostly brand, legal, SEO, contact, and visual differentiation.

## Current Visual Problem Summary

The current NewBrand deployment is a working white-label, not yet a finished partner brand.

Current issues:

- The site is branded enough to run, but not enough to feel like an independent Gold-Tide product.
- The color system still closely matches ShadowEdge's orange/gold theme.
- Home, auth, pricing, and workspace shell layouts remain close to ShadowEdge.
- The maintenance page still has visible ShadowEdge body copy.
- Logo, mark, favicon, OpenGraph image, support email, legal pages, and final SEO are not finalized.
- The current public brand name is still `NewBrand AI`, which is a placeholder unless the partner approves it.
- The current config values still include placeholder domain and support email values.

This plan focuses on visual and brand presentation only. It does not change generation, upload, auth token storage, credits, billing, provider, or backend logic.

## Partner Confirmation Needed

Before implementation, confirm these with the partner or decision-maker:

- Final public brand name:
  - `Gold-Tide`
  - `Gold Tide`
  - another legal/product name
  - or keeping `NewBrand AI`
- Final slogan:
  - Example direction: `Premium AI Creative Studio`
  - Example direction: `AI Image and Video Studio`
  - Example direction: partner-provided copy
- Logo files:
  - Horizontal logo
  - Square mark
  - Light/dark variants if needed
  - Minimum sizes and clear-space rules
- Favicon:
  - `.ico` or PNG set
  - Browser tab appearance
- Main color and supporting colors:
  - Primary accent
  - Secondary accent
  - Background
  - Surface/card
  - Text and muted text
  - Warning/error/success if partner wants custom states
- Support email:
  - Replace `support@example.com`
- Contact methods:
  - Email
  - Form
  - WeChat/WhatsApp/Telegram if required
  - Partner admin contact if still beta
- Pricing scheme:
  - Plan names
  - Monthly/annual
  - Currency
  - Credits per plan
  - Top-up policy
  - Refund/cancellation wording
  - Whether online checkout is live or offline
- Legal entity:
  - Company/legal operator name
  - Jurisdiction
  - Contact address if required
- Legal documents:
  - Privacy Policy
  - Terms of Service
  - Acceptable Use or content rules
  - Refund/payment terms if payments are offered
- Product scope:
  - Keep AI image generation
  - Keep AI video generation
  - Keep Prompt Studio
  - Keep Canvas/History/Models pages
  - Hide or soften features not meant for partner launch
- ShadowEdge wording:
  - Whether all visible ShadowEdge references must be removed
  - Whether backend/internal error labels can remain invisible
  - Whether reset emails and support replies must use Gold-Tide language

## Recommended Visual Directions

### Direction A: Gold Luxury / Premium AI Studio

Positioning:

- Premium AI creative studio.
- Strong fit for the `Gold-Tide` name.
- Keeps a dark, polished product feel but makes it more luxurious and partner-facing.

Visual language:

- Deep charcoal or near-black background.
- Champagne gold primary accent.
- Warm pearl highlights.
- Thin borders, soft glows, restrained gradients.
- More editorial hero imagery and premium spacing.
- Buttons use champagne/gold with high contrast.

Strengths:

- Matches Gold-Tide naturally.
- Can reuse part of the current ShadowEdge gold token family, lowering implementation risk.
- Good fit for AI video/image creation and premium creator tooling.
- Distinct enough if combined with new logo, copy, hero, and pricing visuals.

Risks:

- If overused, it can still feel too close to ShadowEdge because ShadowEdge already uses orange/gold.
- Needs careful contrast and restraint to avoid a one-note gold palette.

### Direction B: Clean SaaS / Business AI

Positioning:

- Practical business AI platform for teams and clients.
- Less cinematic, more operational.

Visual language:

- Dark gray and off-white mixed surfaces.
- Blue-gray structure with gold highlights.
- Clear grids, simpler cards, less atmospheric depth.
- Pricing and account pages feel more SaaS-like.

Strengths:

- Better if the partner sells to businesses or agencies.
- Easier to make pricing/contact/legal pages feel credible.
- Creates stronger separation from ShadowEdge's cinematic dark style.

Risks:

- Requires broader page styling changes.
- May feel less aligned with creative video/image generation unless visual assets are strong.

### Direction C: Creator Studio / Cinematic AI

Positioning:

- AI image/video studio for creators, marketers, and visual teams.
- Keeps a cinematic mood but changes the story and art direction.

Visual language:

- Dark film-grade backgrounds.
- Gold plus warm light accents.
- Larger visual previews.
- More creator workflow language.
- Hero emphasizes image, video, prompt, and remake workflows.

Strengths:

- Closely matches current product capabilities.
- Good for image/video/prompt studio.
- Requires less structural change than a pure SaaS pivot.

Risks:

- Could remain too similar to ShadowEdge unless color, logo, hero, and copy are meaningfully changed.
- Needs strong media assets to feel finished.

## Recommended Direction

Recommend Direction A: Gold Luxury / Premium AI Studio.

Reasons:

- The domain and likely brand signal, `gold-tide.com`, already suggest a gold/premium identity.
- The current ShadowEdge token family already uses warm gold/orange, so the first visual pass can reuse parts of the existing system with lower risk.
- A premium dark-and-gold design can still feel different if the hue, typography emphasis, hero composition, favicon, logo, and copy are all Gold-Tide specific.
- It is the safest path for a fast v1 visual upgrade without touching generation, upload, history, polling, credits, billing, provider, or backend logic.

Design guardrail:

- Do not simply keep the current ShadowEdge orange. Shift toward champagne, soft gold, and deep graphite.
- Avoid making the UI one-note gold. Pair gold with charcoal, pearl, slate, and neutral surfaces.
- Keep workspace controls familiar and stable. Visual polish should not move core generation controls around in this phase.

## Proposed Theme Token Direction

These are planning values only, not implementation changes.

Recommended starting palette:

| Token | Direction | Example value |
| --- | --- | --- |
| Background | Deep graphite | `#090A0D` |
| Elevated surface | Charcoal glass | `#111318` |
| Primary accent | Champagne gold | `#D9B56D` |
| Accent soft | Warm pearl gold | `#F2D899` |
| Accent deep | Antique gold | `#9B6B2F` |
| Text primary | Soft white | `#F7F2E8` |
| Text muted | Warm gray | `#B8AEA0` |
| Border | Low-alpha gold/white | `rgba(242,216,153,.16)` |
| Success | Muted green | `#8ECF9A` |
| Warning | Amber | `#E7B75F` |
| Error | Soft red | `#E78C7C` |

Use these only as design guidance until v1-I2/v1-I4. Final values should be reviewed against the final logo and partner preference.

## Redesign Layers

### Layer 1: Brand Config

Primary files and assets:

- `src/config/brands/newbrand.ts`
- `public/brands/newbrand/*`

Fields to finalize:

- `id`
- `name`
- `shortName`
- `slogan`
- `domain`
- `appUrl`
- `supportEmail`
- `assets.logo`
- `assets.mark`
- `assets.favicon`
- `seo.title`
- `seo.description`
- `theme.accent`
- `theme.accentSoft`
- `theme.accentDeep`

Rules:

- Client brand config must contain display-safe data only.
- Do not place secrets, provider keys, payment keys, Supabase service role keys, R2/S3 keys, or admin tokens in brand config.
- Do not change `NEXT_PUBLIC_API_BASE_URL` default behavior in this visual phase.

### Layer 2: Public Marketing Pages

Target pages:

- Home
- Sign in
- Sign up
- Forgot password
- Reset password
- Pricing
- Contact
- Maintenance
- Footer/legal surfaces

Visual and copy priorities:

- Replace `NewBrand AI` placeholder if final brand is Gold-Tide.
- Fix maintenance page ShadowEdge copy leak.
- Add final hero headline and support copy.
- Make auth pages feel partner-branded, not just renamed.
- Make pricing copy match launch reality.
- Add partner contact/support channel.
- Add footer links to legal/support/contact pages.

### Layer 3: Workspace Shell

Target surfaces:

- Topbar
- Sidebar
- Workspace cards and panels
- Button accents
- Empty states
- Model badges and hints
- Prompt Studio surface accents

Rules:

- Keep generation workflows stable.
- Do not touch generate/upload/status/history/polling/job logic.
- Do not change localStorage keys.
- Do not change API paths.
- Do not change model submission payloads.
- Keep layout shifts small so smoke testing remains focused.

### Layer 4: Legal, SEO, And Assets

Target items:

- Favicon
- OpenGraph image
- Privacy page
- Terms page
- Canonical URL
- Metadata title/description
- Support/contact metadata
- Legal entity references

Rules:

- Legal copy must be provided or approved by the business owner.
- Do not invent a legal entity.
- Do not state payment/refund guarantees unless approved.
- Do not publish final partner claims without review.

## Implementation Phases

### v1-I2: NewBrand Brand Config Real Gold-Tide Values

Goal:

- Replace placeholder `newbrand` values with approved Gold-Tide values.

Likely scope:

- `src/config/brands/newbrand.ts`
- `public/brands/newbrand/*`
- metadata and favicon wiring if needed

Do not touch:

- Backend
- Admin
- Generation/upload/history/polling
- Credits/billing/payment/provider

### v1-I3: Maintenance, SEO, Favicon, Support, Contact Placeholder Fixes

Goal:

- Remove high-risk public placeholder and ShadowEdge copy leaks.

Likely scope:

- Maintenance page copy
- Contact page/support channel
- SEO metadata
- Favicon behavior
- Footer/contact/legal placeholders

This is the first partner-readiness pass and should happen before heavier visual restyling.

### v1-I4: Home, Auth, And Pricing Visual Differentiation

Goal:

- Make the public first impression feel like Gold-Tide.

Likely scope:

- Home hero
- Home sections
- Sign in
- Sign up
- Forgot/reset pages
- Pricing

Design direction:

- Gold Luxury / Premium AI Studio.
- Champagne gold plus graphite.
- Clear partner-specific copy.

### v1-I5: Workspace Shell Light Visual Differentiation

Goal:

- Make the logged-in workspace feel Gold-Tide while preserving product behavior.

Likely scope:

- Topbar and sidebar accents
- Workspace shell background and panel treatment
- Button and badge accents
- Empty states
- Prompt Studio shell accents

Strict boundary:

- No generate/upload/status/history/polling/credits/billing changes.

### v1-I6: Final Logo, Favicon, OG, And Legal Asset Replacement

Goal:

- Replace remaining placeholders with approved final launch assets.

Likely scope:

- Final logo
- Final mark
- Final favicon
- Final OG/social preview image
- Privacy page
- Terms page
- Legal entity references

Requires partner input before completion.

### v1-I7: Smoke And Partner Review

Goal:

- Validate the updated brand experience and gather partner sign-off.

Smoke:

- Technical smoke
- Visual screenshot pass
- Mobile and desktop check
- Partner copy review
- No Generate, Upload, Checkout, or credit spend unless explicitly approved for a separate test.

## Explicit No-Touch Boundaries

Do not change in v1-I visual theme work:

- Generate logic
- Upload logic
- Status/history/polling/job logic
- Credits logic
- Billing logic
- Payment provider logic
- Provider keys or provider routing
- Supabase service role key or Supabase project settings
- R2/S3 keys or storage provider config
- Admin token
- Auth localStorage key names
- Backend production env
- Database schema
- SQL data
- Admin frontend
- Production generation chain

Any change to these areas should be scoped as a separate backend/product task and reviewed as production-affecting.

## Smoke Checklist For Visual Phases

Read-only smoke unless a separate test plan explicitly permits more.

Pages:

- `/`
- `/sign-in`
- `/sign-up`
- `/forgot-password`
- `/reset-password`
- `/pricing`
- `/contact`
- `/maintenance`
- `/workspace/image`
- `/workspace/video`
- `/prompt-studio`

Checks:

- Page returns `200`.
- Title/visible brand match the chosen public brand.
- Logo and favicon are correct.
- No visible ShadowEdge copy leaks on Gold-Tide public pages.
- Image workspace does not show model-loading failure.
- Video workspace does not show local fallback model warning.
- Prompt Studio loads.
- Contact/support links point to approved channels.
- Pricing copy matches launch state.
- Legal links exist if included in launch scope.
- Console has no obvious runtime errors.
- No secret-like text appears in page content or logs.

Do not:

- Click Generate.
- Upload files.
- Click Checkout.
- Trigger payment.
- Spend credits.
- Reset customer passwords.
- Modify backend/Admin/env.

## Delivery Readiness

Can show to partner after:

- P0 remains clear.
- Gold-Tide pages load over HTTPS.
- NewBrand/Gold-Tide brand name appears consistently in public pages.
- Maintenance page no longer leaks ShadowEdge copy.
- Contact/support path is at least beta-approved.
- Pricing is either finalized or clearly marked as preview/offline.
- Logo is at least partner-approved draft quality.

Must wait for partner assets or approvals:

- Final logo and mark.
- Final favicon.
- Final slogan.
- Final support email/contact channel.
- Final pricing and commercial language.
- Final legal entity.
- Privacy and terms text.
- OpenGraph/social preview image.

Can use temporary placeholders for controlled preview:

- Draft logo.
- Draft slogan.
- Draft hero copy.
- Offline pricing/admin contact copy.
- Generic support copy.

Do not use temporary placeholders for public launch without explicit approval:

- Legal entity.
- Privacy policy.
- Terms of service.
- Payment/refund policy.
- Claims about data ownership, privacy, refunds, or uptime.

## Recommended Next Step

Start v1-I2 only after confirming the final public brand name and support email.

If those are not ready, start with v1-I3 to fix the maintenance ShadowEdge copy leak, favicon wiring, and contact/support placeholders while keeping all generation, billing, auth storage, and backend logic untouched.
