# Brand Clone v1-G6 Gold-Tide HK VPS Launch Handoff

Date: 2026-07-06

Scope: launch handoff documentation only. No code changes, no deploy, no environment changes, no backend changes, no Admin changes, and no push.

## Final Architecture

```text
Users
  -> https://gold-tide.com
  -> https://www.gold-tide.com
       Cloudflare DNS/proxy
       -> HK VPS 103.164.81.15
          Nginx HTTPS
          -> 127.0.0.1:3001
             PM2 process: newbrand-web
             Next.js app from shadowwu02/shadowedge-web-next
             NEXT_PUBLIC_BRAND=newbrand
             NEXT_PUBLIC_API_BASE_URL=https://api.shadowedgeai.com

Frontend API calls
  -> https://api.shadowedgeai.com
       Existing ShadowEdge backend API
       Existing Supabase
       Existing R2/S3
       Existing payment/provider/billing/credits logic
```

Gold-Tide is a frontend hosting and brand deployment. It does not introduce a new backend, database, storage bucket, payment provider, provider key, or Admin app.

## Current Online Entrypoints

Production:

- `https://gold-tide.com`
- `https://www.gold-tide.com`

Fallback:

- `https://newbrand-web-next.vercel.app`

Backend API:

- `https://api.shadowedgeai.com`

ShadowEdge production/reference frontend:

- `https://shadowedge-web-next.vercel.app`

## GitHub / Vercel / VPS Relationship

- Source repository:
  - `shadowwu02/shadowedge-web-next`
- Gold-Tide HK VPS deployment:
  - Uses the same GitHub repo.
  - Builds with `NEXT_PUBLIC_BRAND=newbrand`.
  - Runs on the HK VPS through PM2 and Nginx.
- NewBrand Vercel fallback:
  - Uses the same GitHub repo.
  - Uses `NEXT_PUBLIC_BRAND=newbrand`.
  - Remains useful as a fallback and comparison target.
- ShadowEdge Vercel:
  - Uses the same GitHub repo.
  - Uses or falls back to `NEXT_PUBLIC_BRAND=shadowedge`.

Do not create a second GitHub repo unless a future partner/code-access requirement makes that necessary.

## VPS Access

VPS:

- Host: `103.164.81.15`
- SSH user: `ubuntu`
- SSH key: `C:\Users\WEll\.ssh\id_ed25519_newbrand_hk`

SSH example:

```powershell
ssh -i "C:\Users\WEll\.ssh\id_ed25519_newbrand_hk" ubuntu@103.164.81.15
```

## VPS Deployment Directory

Application directory:

```bash
/var/www/newbrand-web-next
```

Expected git remote:

```bash
git remote -v
```

Expected repo:

```text
https://github.com/shadowwu02/shadowedge-web-next.git
```

Current deployed frontend commit at launch smoke:

```text
55b3691669f9c951895469e2130fa5dcba691f17
```

## PM2

Process:

```text
newbrand-web
```

Port:

```text
3001
```

Runtime env:

```text
PORT=3001
NEXT_PUBLIC_BRAND=newbrand
NEXT_PUBLIC_API_BASE_URL=https://api.shadowedgeai.com
```

Common commands:

```bash
pm2 status newbrand-web
pm2 logs newbrand-web --lines 100
pm2 restart newbrand-web --update-env
pm2 stop newbrand-web
pm2 save
pm2 env 0
```

Port check:

```bash
ss -ltnp | grep -E ':80|:443|:3001'
```

Expected:

- Nginx listens on `80` and `443`.
- Next.js listens on `3001`.
- `newbrand-web` is `online`.

## Nginx

Config paths:

```text
/etc/nginx/sites-available/newbrand-web
/etc/nginx/sites-enabled/newbrand-web
```

Nginx common commands:

```bash
sudo nginx -t
sudo systemctl status nginx --no-pager
sudo systemctl reload nginx
sudo systemctl restart nginx
sudo sed -n '1,180p' /etc/nginx/sites-available/newbrand-web
ls -la /etc/nginx/sites-enabled
```

Expected routing:

```text
gold-tide.com / www.gold-tide.com
  -> Nginx
  -> http://127.0.0.1:3001
```

The default Nginx site symlink was disabled during launch so the domain serves the Next.js app rather than the default Nginx page.

## SSL / Certbot

Certificate:

```text
/etc/letsencrypt/live/gold-tide.com/fullchain.pem
```

Private key path:

```text
/etc/letsencrypt/live/gold-tide.com/privkey.pem
```

Certificate domains:

- `gold-tide.com`
- `www.gold-tide.com`

Current expiry:

```text
2026-10-04
```

Check certificate:

```bash
sudo certbot certificates
```

Dry-run renewal check:

```bash
sudo certbot renew --dry-run
```

HTTPS checks:

```bash
curl -I https://gold-tide.com
curl -I https://www.gold-tide.com
curl -I http://gold-tide.com
curl -I http://www.gold-tide.com
```

Expected:

- HTTPS returns `200`.
- HTTP redirects to HTTPS with `301`.

## Cloudflare Settings

Current intended setup:

- `gold-tide.com`: proxied/orange cloud.
- `www.gold-tide.com`: proxied/orange cloud.
- SSL/TLS mode: Full.

Operational notes:

- If origin certificate or Nginx SSL is broken, Cloudflare Full mode will surface HTTPS errors.
- If debugging origin behavior, temporarily use DNS-only only with an approved window.
- Keep both apex and `www` domains aligned in Cloudflare, Nginx, Certbot, backend CORS, and auth allowlists.

## Backend CORS

Backend API remains:

```text
https://api.shadowedgeai.com
```

Backend CORS now includes:

- `https://gold-tide.com`
- `https://www.gold-tide.com`
- NewBrand Vercel origins:
  - `https://newbrand-web-next.vercel.app`
  - `https://newbrand-web-next-fl9v9urio-shadowedge.vercel.app`
  - `https://newbrand-web-next-*.vercel.app` preview wildcard
- ShadowEdge origins
- Admin origins

Production backend commit for Gold-Tide domain CORS:

```text
069cdc1 fix: allow newbrand custom domain cors origins
```

Verify CORS:

```bash
curl -sS -D - -o /dev/null \
  -H "Origin: https://gold-tide.com" \
  https://api.shadowedgeai.com/api/image/models

curl -sS -D - -o /dev/null \
  -H "Origin: https://gold-tide.com" \
  https://api.shadowedgeai.com/api/video/models

curl -sS -D - -o /dev/null \
  -H "Origin: https://www.gold-tide.com" \
  https://api.shadowedgeai.com/api/image/models

curl -sS -D - -o /dev/null \
  -H "Origin: https://www.gold-tide.com" \
  https://api.shadowedgeai.com/api/video/models
```

Expected:

```text
HTTP/1.1 200 OK
Access-Control-Allow-Origin: https://gold-tide.com
```

or:

```text
Access-Control-Allow-Origin: https://www.gold-tide.com
```

Preflight:

```bash
curl -sS -D - -o /dev/null -X OPTIONS \
  -H "Origin: https://gold-tide.com" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type, Authorization, X-ShadowEdge-Site-Key" \
  https://api.shadowedgeai.com/api/video/models
```

Expected:

```text
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://gold-tide.com
```

## Update Deployment Flow

Use this flow for future Gold-Tide frontend updates after the shared `main` branch is ready.

```bash
cd /var/www/newbrand-web-next
git fetch origin main
git status --short --branch
git log --oneline HEAD..origin/main
git pull --ff-only origin main
npm ci
NEXT_PUBLIC_BRAND=newbrand NEXT_PUBLIC_API_BASE_URL=https://api.shadowedgeai.com npm run build
PORT=3001 NEXT_PUBLIC_BRAND=newbrand NEXT_PUBLIC_API_BASE_URL=https://api.shadowedgeai.com pm2 restart newbrand-web --update-env
pm2 status newbrand-web
sudo nginx -t
sudo systemctl reload nginx
```

Post-update checks:

```bash
curl -I http://127.0.0.1:3001
curl -I https://gold-tide.com
curl -I https://www.gold-tide.com
pm2 logs newbrand-web --lines 100 --nostream
```

Do not update the frontend from a dirty production worktree. Stop and inspect if:

- `git status --short --branch` shows modified tracked files.
- `git pull --ff-only` fails.
- `npm ci` or build fails.
- `pm2 restart` fails.
- `nginx -t` fails.

## Smoke Checklist

Read-only smoke only. Do not click Generate, Upload, Checkout, payment, refund, or Admin actions.

Gold-Tide pages:

- `https://gold-tide.com/`
- `https://gold-tide.com/sign-in`
- `https://gold-tide.com/sign-up`
- `https://gold-tide.com/pricing`
- `https://gold-tide.com/workspace/image`
- `https://gold-tide.com/workspace/video`
- `https://gold-tide.com/prompt-studio`
- `https://www.gold-tide.com/`

Checks:

- HTTPS pages return `200`.
- HTTP redirects to HTTPS.
- Browser title is `NewBrand AI`.
- Logo uses `/brands/newbrand/logo.png`.
- No incorrect visible `ShadowEdge` brand text.
- `/workspace/image` does not show `Failed to load image models.`
- `/workspace/video` does not show `Network request failed. Using local fallback models.`
- `GET https://api.shadowedgeai.com/api/image/models` returns `200`.
- `GET https://api.shadowedgeai.com/api/video/models` returns `200`.
- API responses include `Access-Control-Allow-Origin` matching the page origin.
- Console has no obvious runtime errors for Gold-Tide.
- No secret-like text appears in page or console.

Regression checks:

- `https://shadowedge-web-next.vercel.app/workspace/image`
- `https://shadowedge-web-next.vercel.app/workspace/video`
- `https://newbrand-web-next.vercel.app/workspace/image`
- `https://newbrand-web-next.vercel.app/workspace/video`

Expected:

- ShadowEdge remains ShadowEdge.
- NewBrand Vercel fallback remains NewBrand.
- Models load.
- No CORS regression.

## Rollback

If Gold-Tide frontend must be paused or rolled back:

1. Stop the PM2 frontend:

   ```bash
   pm2 stop newbrand-web
   ```

2. Disable the Nginx site:

   ```bash
   sudo rm -f /etc/nginx/sites-enabled/newbrand-web
   sudo nginx -t
   sudo systemctl reload nginx
   ```

3. DNS rollback:
   - Point `gold-tide.com` and `www.gold-tide.com` to the Vercel fallback if that domain is configured there.
   - Or temporarily pause/remove the Cloudflare records while investigating.

4. Keep backend unchanged unless the incident is specifically caused by backend CORS/auth allowlists.

5. Do not roll back ShadowEdge or Admin unless a separate verified regression exists.

Code rollback option on the VPS:

```bash
cd /var/www/newbrand-web-next
git log --oneline -n 10
git checkout <known_good_hash>
NEXT_PUBLIC_BRAND=newbrand NEXT_PUBLIC_API_BASE_URL=https://api.shadowedgeai.com npm run build
PORT=3001 NEXT_PUBLIC_BRAND=newbrand NEXT_PUBLIC_API_BASE_URL=https://api.shadowedgeai.com pm2 restart newbrand-web --update-env
```

Use a detached checkout only as an emergency production rollback and document the exact hash. Prefer restoring `main` after the incident.

## Safety Boundary

Do not copy secrets into the frontend deployment.

Do not place these in frontend env, PM2 env, repo files, shell history snippets, or docs:

- Supabase service role key.
- API secret.
- Payment key.
- Provider key.
- R2/S3 secret.
- Admin token.
- Backend-only internal site key.

Do not change during normal Gold-Tide frontend update:

- Provider/payment/R2/Supabase/admin token.
- Database schema.
- SQL data.
- Generate API path.
- Credits/billing/refund/provider logic.
- Admin frontend.
- ShadowEdge brand config unless the change is intentionally shared.

Smoke and handoff tasks must not:

- Trigger Generate.
- Upload files.
- Click Checkout.
- Spend credits.
- Log in with privileged accounts unless an explicit auth smoke is approved.

## Known Observations

- ShadowEdge Vercel workspace pages have shown a non-blocking React hydration console error:

  ```text
  Minified React error #418
  ```

- This was observed before and after the Gold-Tide launch smoke.
- It did not block page loading, model loading, or CORS validation.
- It was not part of the Gold-Tide launch scope and was not fixed in this phase.

## Current Verification Summary

Gold-Tide launch smoke passed on 2026-07-06:

- `https://gold-tide.com/`: `200 OK`
- `https://www.gold-tide.com/`: `200 OK`
- `http://gold-tide.com`: `301` to HTTPS
- `http://www.gold-tide.com`: `301` to HTTPS
- `/sign-in`: `200 OK`
- `/sign-up`: `200 OK`
- `/pricing`: `200 OK`
- `/workspace/image`: `200 OK`
- `/workspace/video`: `200 OK`
- `/prompt-studio`: `200 OK`
- Title: `NewBrand AI`
- Logo: `/brands/newbrand/logo.png`
- No incorrect ShadowEdge brand text on Gold-Tide pages.
- No Gold-Tide workspace fallback text.
- No Gold-Tide console runtime error observed during smoke.
- No secret-like text observed in page checks.
- API model calls returned `200`.
- CORS returned matching allow-origin for:
  - `https://gold-tide.com`
  - `https://www.gold-tide.com`
- ShadowEdge Vercel regression passed for model loading and CORS.
- NewBrand Vercel fallback regression passed for model loading and CORS.
- No Generate, Upload, Checkout, or credit spend occurred.

Backend production state at CORS launch:

```text
069cdc15003cc0dcb816ea4df93201c9b90b80bf
```

Frontend VPS production state at launch:

```text
55b3691669f9c951895469e2130fa5dcba691f17
```
