# Brand Clone v1-G0 NewBrand HK VPS Frontend Plan

Date: 2026-07-06

Scope: documentation only. No deploy, no code changes, no environment changes, no backend changes, no Admin changes, and no push.

## Background

- Brand Clone v1-A through v1-E are complete.
- NewBrand Vercel temporary domain has passed smoke:
  - `https://newbrand-web-next.vercel.app`
- NewBrand uses the shared GitHub repository:
  - `shadowwu02/shadowedge-web-next`
- Current NewBrand public frontend env:
  - `NEXT_PUBLIC_BRAND=newbrand`
  - `NEXT_PUBLIC_API_BASE_URL=https://api.shadowedgeai.com`
- Backend CORS already allows the NewBrand Vercel origin.
- The next decision is whether to deploy the NewBrand frontend to a Hong Kong VPS for better access stability from mainland China and nearby regions.

## Recommendation

Deploying the NewBrand frontend to a Hong Kong VPS is recommended if NewBrand's target users are primarily in mainland China, Hong Kong, or nearby Asia regions and if the team is comfortable operating a small Node.js + PM2 + Nginx service.

Keep Vercel as the current working baseline and fallback until the VPS deployment has passed production smoke on the final NewBrand domain.

Do not migrate the backend API in this phase. The recommended v1-G frontend architecture still calls:

```text
https://api.shadowedgeai.com
```

This keeps the deployment small and avoids changing billing, credits, generation, upload, storage, auth, or provider logic.

## Vercel vs HK VPS

| Area | Vercel NewBrand project | Hong Kong VPS frontend |
| --- | --- | --- |
| Setup speed | Fastest; already working | Requires server setup, Nginx, SSL, PM2 |
| Operations | Mostly managed | Team owns patching, logs, restart, SSL renewal |
| Mainland access stability | Can vary by network | Usually better if VPS route is good |
| Rollback | Redeploy previous Vercel build | Stop PM2 / disable Nginx / DNS rollback |
| Build isolation | Vercel project env controls brand | Server env and PM2 process control brand |
| Cost model | Platform billing | VPS billing and maintenance |
| Best use | Temporary domain, preview, low-ops launch | Production domain for China-facing frontend |

Recommended path:

1. Keep NewBrand Vercel online as fallback.
2. Prepare HK VPS frontend on a test domain first.
3. Add the test domain to backend CORS and auth allowlists.
4. Smoke without Generate, Upload, Checkout, or credit spend.
5. Bind the final NewBrand domain after smoke passes.

## Recommended Architecture

```text
Browser
  -> NewBrand frontend on HK VPS
       Nginx HTTPS
       -> localhost:<newbrand_port>
          PM2 process: newbrand-web
          Next.js app from shadowwu02/shadowedge-web-next
          NEXT_PUBLIC_BRAND=newbrand
          NEXT_PUBLIC_API_BASE_URL=https://api.shadowedgeai.com

Frontend API calls
  -> https://api.shadowedgeai.com
       Existing backend API
       Existing billing/credits/generation/upload logic
       Existing CORS allowlist plus NewBrand domain

Data/storage
  -> Existing Supabase
  -> Existing R2/S3
```

This phase changes frontend hosting only. It does not create a new backend, database, storage bucket, payment account, provider key, or admin service.

## Deployment Preconditions

Verify the HK VPS before deployment approval:

- OS access:
  - SSH access for an operator account.
  - Sudo/root path for installing packages and configuring Nginx.
- Node.js:
  - Recommended: Node.js 20 LTS.
  - The repo currently has no `.nvmrc` or `package.json` `engines` field.
  - Confirm with `node -v` before build.
- npm:
  - Use the npm bundled with Node 20 LTS.
  - Confirm with `npm -v`.
- Git:
  - Required for clone/pull from `shadowwu02/shadowedge-web-next`.
- PM2:
  - Required to keep the Next.js server running.
- Nginx:
  - Required for HTTPS reverse proxy.
- SSL/Certbot:
  - Required for final domain HTTPS.
  - Confirm renewal timer is enabled.
- DNS:
  - NewBrand domain or test domain must point to the HK VPS.
  - Plan both apex and `www` if both will be used.
- Firewall:
  - Allow 80 and 443 publicly.
  - Keep the internal Next.js port bound to localhost only.

## Server Directory

Recommended application directory:

```bash
/var/www/newbrand-web-next
```

Keep it separate from any existing backend directory, Admin frontend directory, or ShadowEdge frontend directory.

Do not place secrets in this directory. Only public frontend env values should be used for this app.

## PM2 Process

Recommended PM2 process name:

```text
newbrand-web
```

Use a dedicated process name so restarts and logs cannot be confused with the backend API or Admin frontend.

Suggested PM2 checks:

```bash
pm2 status newbrand-web
pm2 logs newbrand-web --lines 100
```

## Environment Variables

Required public frontend env:

```text
NEXT_PUBLIC_BRAND=newbrand
NEXT_PUBLIC_API_BASE_URL=https://api.shadowedgeai.com
```

Optional runtime port example:

```text
PORT=3001
```

Do not copy or create secrets for this frontend deployment:

- No Supabase service role key.
- No API secret.
- No payment key.
- No provider key.
- No R2/S3 secret.
- No admin token.
- No backend-only internal site key.

Only public display/config values and the public API base URL belong in this frontend runtime environment.

## Build and Start Commands

First deployment option:

```bash
cd /var/www
git clone https://github.com/shadowwu02/shadowedge-web-next.git newbrand-web-next
cd /var/www/newbrand-web-next
npm ci
NEXT_PUBLIC_BRAND=newbrand NEXT_PUBLIC_API_BASE_URL=https://api.shadowedgeai.com npm run build
PORT=3001 NEXT_PUBLIC_BRAND=newbrand NEXT_PUBLIC_API_BASE_URL=https://api.shadowedgeai.com pm2 start npm --name newbrand-web -- start
pm2 save
```

Update deployment option:

```bash
cd /var/www/newbrand-web-next
git fetch origin main
git status --short --branch
git log --oneline HEAD..origin/main
git pull --ff-only origin main
npm ci
NEXT_PUBLIC_BRAND=newbrand NEXT_PUBLIC_API_BASE_URL=https://api.shadowedgeai.com npm run build
pm2 restart newbrand-web --update-env
pm2 status newbrand-web
```

If package files did not change, `npm ci` can be skipped only if the operator records that decision. For the first VPS setup, run `npm ci`.

## Port Plan

Recommended initial port:

```text
3001
```

Before choosing the final port, check:

```bash
ss -ltnp | grep -E ':3000|:3001|:3002'
pm2 list
```

Guidance:

- Avoid any port used by the backend API.
- Avoid any port used by Admin frontend.
- Avoid sharing a port with another Next.js app.
- Prefer binding the Next.js app to localhost and exposing only Nginx on 80/443.

## Nginx Reverse Proxy

Example site config shape:

```nginx
server {
    listen 80;
    server_name newbrand.example.com www.newbrand.example.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

After DNS points to the VPS, issue SSL:

```bash
certbot --nginx -d newbrand.example.com -d www.newbrand.example.com
```

Replace `newbrand.example.com` with the reviewed test or production domain. Do not bind a real production domain before CORS and auth callback review.

## Backend CORS Checklist

Before moving traffic from Vercel to the HK VPS domain, update backend CORS allowlist for every frontend origin that will access the API:

- Final apex domain:
  - `https://newbrand.example.com`
- Final `www` domain if used:
  - `https://www.newbrand.example.com`
- Test domain if used:
  - `https://test-newbrand.example.com`
- Keep existing ShadowEdge origins.
- Keep existing Admin origins.
- Keep existing NewBrand Vercel origins until rollback is no longer needed.

Verify after backend CORS deployment:

```bash
curl -sS -D - -o /dev/null \
  -H "Origin: https://newbrand.example.com" \
  https://api.shadowedgeai.com/api/image/models

curl -sS -D - -o /dev/null \
  -H "Origin: https://newbrand.example.com" \
  https://api.shadowedgeai.com/api/video/models
```

Expected:

```text
HTTP/1.1 200 OK
Access-Control-Allow-Origin: https://newbrand.example.com
```

Also verify OPTIONS preflight:

```bash
curl -sS -D - -o /dev/null -X OPTIONS \
  -H "Origin: https://newbrand.example.com" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type, Authorization, X-ShadowEdge-Site-Key" \
  https://api.shadowedgeai.com/api/video/models
```

Expected:

```text
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://newbrand.example.com
```

## Auth Checklist

Review auth settings before public launch:

- Login redirect:
  - Final NewBrand domain must be allowed.
  - Test domain must be allowed if used.
- Reset password callback:
  - Final NewBrand domain must be allowed.
  - Test domain must be allowed if used.
- Allowed origins:
  - Backend CORS must include all NewBrand domains.
  - Any auth provider allowed URL list must include all NewBrand domains.
- localStorage:
  - Do not change localStorage keys in this phase.
  - Brand Clone v1-G frontend hosting should not alter auth/session storage logic.
- Existing ShadowEdge auth:
  - Must remain unchanged.
- Admin auth:
  - Must remain unchanged.

## Smoke Checklist

Use a read-only smoke. Do not click Generate, Upload, Checkout, refund, admin, or any payment action.

Pages:

- `/`
- `/sign-in`
- `/sign-up`
- `/pricing`
- `/workspace/image`
- `/workspace/video`
- `/prompt-studio`

Checks:

- Page opens over HTTPS.
- Browser title is `NewBrand AI`.
- Logo uses `/brands/newbrand/logo.png`.
- Visible brand text is NewBrand/NewBrand AI.
- No accidental ShadowEdge user-facing brand text.
- `/api/image/models` returns 200.
- `/api/video/models` returns 200.
- Responses include the expected `Access-Control-Allow-Origin`.
- No fallback text:
  - `Failed to load image models.`
  - `Network request failed. Using local fallback models`
- Console has no obvious runtime error.
- No secret appears in page text, console, or build output.
- Workspace pages load without triggering generation.
- No upload occurs.
- No checkout occurs.
- No credit spend occurs.

## Rollback

If the HK VPS frontend has a production issue:

1. Stop the frontend PM2 process:

   ```bash
   pm2 stop newbrand-web
   ```

2. Disable the Nginx site:

   ```bash
   rm /etc/nginx/sites-enabled/newbrand-web
   nginx -t
   systemctl reload nginx
   ```

3. DNS rollback:
   - Point the NewBrand domain back to Vercel if Vercel is already configured for that domain.
   - Or pause/remove the DNS record while investigating.

4. Keep backend unchanged unless the issue is specifically CORS/auth allowlist related.

5. Do not roll back ShadowEdge or Admin unless a separate verified regression exists.

## Risks

- Mainland access can improve for frontend HTML/JS assets, but API calls still go to `https://api.shadowedgeai.com`.
- If API access from mainland China remains unstable, a later phase may need to evaluate API Hong Kong deployment or edge/proxy architecture.
- SSL issuance and renewal must be monitored.
- Backend CORS must include the exact final and test domains.
- Auth callbacks must include the exact final and test domains.
- Port conflicts can break unrelated services.
- PM2 restart mistakes can affect the wrong service if process names are unclear.
- CDN/cache behavior differs from Vercel, so headers and asset caching should be checked.
- Next.js server hosting on VPS requires operational ownership for security updates and restarts.

## Explicit Non-Actions In This Round

This v1-G0 plan does not:

- Deploy NewBrand to the HK VPS.
- Change frontend code.
- Change any env file.
- Change backend code.
- Change Admin frontend.
- Change database.
- Execute SQL.
- Touch payment/provider/R2/S3/Supabase/admin tokens.
- Trigger Generate.
- Upload files.
- Run checkout.
- Push commits.

## Next Step Recommendation

Proceed to Brand Clone v1-G1 only after:

1. A specific HK VPS host is selected.
2. A test or final NewBrand domain is selected.
3. The desired port is confirmed against existing services.
4. Backend CORS and auth callback updates are reviewed for the selected domain.
5. The operator approves a deployment window and rollback owner.

The safest next implementation sequence is:

1. Configure NewBrand test domain DNS to the HK VPS.
2. Prepare server dependencies.
3. Clone/build/start the frontend on a non-conflicting localhost port.
4. Configure Nginx and SSL.
5. Add backend CORS/auth allowlist for the test domain.
6. Run read-only smoke.
7. Promote the final domain after smoke passes.
