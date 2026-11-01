# Habibi.AI — Production Deployment Guide

A practical, honest walkthrough for taking this platform from sandbox to production. Tailored for Hashim's use case: operator-owned, off-platform billing, cost-conscious, full control.

---

## Three things you MUST know before deploying

### 1. HTTPS is mandatory, not optional

The entire crypto layer (`crypto.subtle.encrypt`, `crypto.subtle.deriveKey`, `crypto.subtle.exportKey`) only works in **secure contexts** — HTTPS or `localhost`. If you deploy over HTTP, every signup attempt will fail with errors like *"Failed to execute 'exportKey' on 'SubtleCrypto': key is not extractable"* and the vault key blob will never be created.

Every deployment path below uses HTTPS by default (Vercel, Railway, Caddy+Let's Encrypt). Do not bypass this.

### 2. The SQLite database must move to Postgres for production

SQLite is great for the sandbox but breaks in production because:

- **Serverless platforms (Vercel, AWS Lambda) have ephemeral filesystems** — the DB file gets wiped on every cold start. Users would lose their accounts between requests.
- **Multiple concurrent writes** — SQLite serializes writes through a single file lock. With 10+ users signing up at once, you'll get "database is locked" errors.
- **No point-in-time backups** — SQLite backups require file-level copying, which can capture a half-written state.

Switch to Postgres. With Prisma it's a one-line schema change:

```prisma
datasource db {
  provider = "postgresql"   // was "sqlite"
  url      = env("DATABASE_URL")
}
```

Then `bun run db:push` against your Postgres connection string.

### 3. The z-ai-web-dev-sdk needs its own config file in production

The Guide AI (`/api/guide/chat`) uses the Z AI SDK. The SDK reads credentials from a JSON file at one of:

- `process.cwd()/.z-ai-config` (recommended — lives in your project)
- `~/.z-ai-config` (home directory)
- `/etc/.z-ai-config` (system-wide)

The sandbox auto-provisioned one for you. In production, you need to create it yourself with your own Z AI API key:

```json
{
  "baseUrl": "https://api.z.ai/v1",
  "apiKey": "your-real-api-key-here"
}
```

**Where to get the key:** Sign up at [z.ai](https://z.ai) developer portal, create an API key, paste it in. If you'd rather use OpenAI, Anthropic, or another provider, swap the SDK call in `src/app/api/guide/chat/route.ts` — the rest of the system doesn't care which LLM powers the Guide.

**Do NOT commit `.z-ai-config` to git.** Add it to `.gitignore`. Place it on the server directly.

---

## Recommended path: VPS + Caddy + Postgres (full control, ~PKR 1,400-3,500/mo)

This matches the "operator handles things personally" ethos. You own the box, you own the data, no platform risk.

### Why this path

- **Persistent filesystem** — database survives reboots
- **No per-request costs** — flat monthly fee regardless of traffic
- **No function timeout** — long-running LLM calls don't get killed
- **Hashim controls everything** — backups, logs, upgrades, security patches
- **Cheap** — Hetzner CX22 (€4.51/mo) or DigitalOcean Droplet ($4-6/mo) is plenty for the first 1000 users

### Step 1: Provision a VPS

Pick one:

| Provider | Smallest instance | Price | Notes |
|---|---|---|---|
| **Hetzner** | CX22 (2 vCPU, 4GB RAM) | €4.51/mo | Best value globally, EU/US regions |
| **DigitalOcean** | Basic Droplet (1 vCPU, 1GB RAM) | $4-6/mo | Easiest UX, Singapore region for Asia |
| **AWS Lightsail** | 1GB instance | $5/mo | AWS ecosystem integration |
| **Contabo** | VPS S (4 vCPU, 8GB RAM) | €4.50/mo | Most specs per dollar, German-only support |

For Pakistan/Karachi users: DigitalOcean Singapore or Hetzner Falkenstein give reasonable latency (~150-200ms).

### Step 2: Set up the server

SSH in as root, then:

```bash
# Update everything
apt update && apt upgrade -y

# Install Node 20+, Bun, Caddy, PostgreSQL, Git
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs postgresql caddy git ufw

# Install Bun
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# Firewall — only allow SSH, HTTP, HTTPS
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

### Step 3: Set up Postgres

```bash
sudo -u postgres psql <<EOF
CREATE USER habibi WITH PASSWORD 'a-strong-random-password';
CREATE DATABASE habibi_prod OWNER habibi;
GRANT ALL PRIVILEGES ON DATABASE habibi_prod TO habibi;
EOF

# Test connection
psql "postgresql://habibi:a-strong-random-password@localhost:5432/habibi_prod" -c "SELECT version();"
```

### Step 4: Clone the code

```bash
mkdir -p /var/www
cd /var/www
git clone https://your-repo-url habibi
cd habibi

# Install dependencies
bun install

# Generate Prisma client
bun run db:generate
```

### Step 5: Configure environment

Create `/var/www/habibi/.env`:

```bash
DATABASE_URL="postgresql://habibi:a-strong-random-password@localhost:5432/habibi_prod"
NODE_ENV=production
```

Create `/var/www/habibi/.z-ai-config`:

```json
{
  "baseUrl": "https://api.z.ai/v1",
  "apiKey": "your-real-z-ai-api-key"
}
```

Lock down both files:

```bash
chmod 600 /var/www/habibi/.env /var/www/habibi/.z-ai-config
chown www-data:www-data /var/www/habibi/.env /var/www/habibi/.z-ai-config
```

### Step 6: Update Prisma schema for Postgres

Edit `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Then push the schema:

```bash
bun run db:push
```

### Step 7: Build and start the app

```bash
# Build for production
bun run build

# Test it manually first
bun run start

# Should serve on port 3000. Ctrl+C once verified.
```

### Step 8: Set up systemd for process management

Create `/etc/systemd/system/habibi.service`:

```ini
[Unit]
Description=Habibi.AI Next.js app
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/habibi
EnvironmentFile=/var/www/habibi/.env
ExecStart=/root/.bun/bin/bun run start
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
systemctl daemon-reload
systemctl enable habibi
systemctl start habibi
systemctl status habibi
```

### Step 9: Set up Caddy for HTTPS + reverse proxy

Caddy gives you automatic HTTPS via Let's Encrypt with zero configuration. Create `/etc/caddy/Caddyfile`:

```caddy
your-domain.com {
    reverse_proxy localhost:3000
    
    # Compression
    encode gzip zstd
    
    # Security headers
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Referrer-Policy "strict-origin-when-cross-origin"
        Permissions-Policy "geolocation=(), microphone=(), camera=()"
    }
    
    # Cache static assets aggressively
    @static path /_next/static/*
    header @static Cache-Control "public, max-age=31536000, immutable"
}
```

Replace `your-domain.com` with your actual domain. Point its DNS A record at your VPS IP first.

Start Caddy:

```bash
systemctl enable caddy
systemctl start caddy
systemctl status caddy
```

Caddy will automatically fetch and renew the TLS certificate. Visit `https://your-domain.com` — it should serve the app with HTTPS.

### Step 10: Verify the deployment

Open your browser to `https://your-domain.com` and:

1. Confirm the landing page renders with Crimson Pro serif font (if it falls back to Times, fonts are loading)
2. Sign up with a real email + strong passphrase (15+ chars recommended)
3. Save the recovery code shown
4. Confirm you land on the dashboard with the Guide AI tab
5. Authorize the vault and ask the Guide a question — it should respond in ~2-3 seconds
6. The first account you create becomes ADMIN automatically

### Step 11: Backups

Set up automated daily Postgres backups via cron:

```bash
# Create backup script
cat > /var/backups/habibi-backup.sh << 'EOF'
#!/bin/bash
set -e
DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR=/var/backups/habibi
mkdir -p $BACKUP_DIR
pg_dump "postgresql://habibi:a-strong-random-password@localhost:5432/habibi_prod" | gzip > $BACKUP_DIR/habibi-$DATE.sql.gz
# Keep last 30 days
find $BACKUP_DIR -name "habibi-*.sql.gz" -mtime +30 -delete
EOF

chmod +x /var/backups/habibi-backup.sh

# Schedule daily at 3 AM
echo "0 3 * * * root /var/backups/habibi-backup.sh" >> /etc/crontab
```

For off-site backups (recommended — don't keep all backups on the same box), sync to S3/Backblaze B2/rclone to a remote bucket:

```bash
# Install rclone, configure remote, then add to backup script:
rclone copy $BACKUP_DIR remote:habibi-backups/
```

---

## Alternative path: Vercel + Neon Postgres (fastest, free tier available)

Use this if you want zero server management. Free tier covers ~100 users.

### Step 1: Push code to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourname/habibi.git
git push -u origin main
```

### Step 2: Provision Neon Postgres

1. Sign up at [neon.tech](https://neon.tech) (free tier: 0.5GB, autoscaling)
2. Create a project, copy the connection string

### Step 3: Update schema for Postgres

Edit `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Commit and push.

### Step 4: Import to Vercel

1. Go to [vercel.com](https://vercel.com), sign in with GitHub
2. "Add New Project" → import your repo
3. Vercel auto-detects Next.js
4. Add environment variables in the Vercel dashboard:
   - `DATABASE_URL` = your Neon connection string
   - `NODE_ENV` = `production`
5. Deploy

### Step 5: Handle the z-ai-config file

Vercel doesn't have a persistent filesystem, so the `.z-ai-config` file approach doesn't work directly. Two options:

**Option A — Patch the SDK loader** (recommended for Vercel):

Edit `src/app/api/guide/chat/route.ts` to construct ZAI with explicit config instead of relying on the file:

```typescript
const zai = new ZAI({
  baseUrl: process.env.ZAI_BASE_URL || 'https://api.z.ai/v1',
  apiKey: process.env.ZAI_API_KEY!,
})
```

Add `ZAI_API_KEY` and `ZAI_BASE_URL` as Vercel env vars.

**Option B — Use a different LLM provider** (OpenAI, Anthropic) that natively reads from env vars.

### Step 6: Vercel limitations to know

- **Function timeout**: 10 seconds on free tier, 60 seconds on Pro. The Guide AI typically takes 2-3 seconds, so you're fine. But if you ever add longer LLM calls (multi-turn reasoning, vision), you'll hit limits.
- **No persistent filesystem**: SQLite will NOT work. Postgres (Neon) is mandatory.
- **Cold starts**: First request after idle takes ~1-2 seconds. Subsequent requests are fast.

### Step 7: Custom domain

In Vercel dashboard → Settings → Domains → add your domain. Vercel handles HTTPS automatically via Let's Encrypt.

---

## Post-deploy checklist (run through this before announcing)

- [ ] **HTTPS enforced** — visiting `http://your-domain.com` redirects to `https://`
- [ ] **Signup works end-to-end** — new user signs up, sees recovery code, lands on dashboard
- [ ] **Vault encryption works** — add a skill entry, log out, log back in, entry is still there and decryptable
- [ ] **First admin is you** — you signed up first, you have ADMIN role, you see the Admin tab
- [ ] **Guide AI responds** — authorize vault, ask a question, get a real LLM response (not an error)
- [ ] **HN leads load** — Leads tab shows 20 real leads from HN Algolia API
- [ ] **Marketplace works** — submit a brief as an anonymous client, load open briefs
- [ ] **Admin panel shows structure not contents** — verify your own user's vault shows labels but not values (use the script in `scripts/test-admin-view.ts` if needed)
- [ ] **Backups running** — check `/var/backups/habibi/` for today's dump (VPS path) or set up Neon's point-in-time recovery (Vercel path)
- [ ] **Rate limiting** — NOT included in v1, you should add it before opening to public signups (see below)
- [ ] **Error monitoring** — at minimum, tail the logs (`journalctl -u habibi -f` on VPS; Vercel dashboard on Vercel)

---

## Security hardening to do BEFORE public launch

The v1 code is honest about its security posture but is NOT production-hardened. Address these in order:

### 1. Add rate limiting (CRITICAL)

Without rate limiting, an attacker can brute-force the auth verifier endpoint. Add Upstash Redis rate limit or simple in-memory:

```bash
bun add @upstash/ratelimit @upstash/redis
```

Then wrap `/api/auth/login/verify` and `/api/auth/signup` with a 5-attempts-per-15-minutes limit per IP.

### 2. Add ADMIN_INVITE_TOKEN

Currently the first signup becomes ADMIN automatically. If someone beats you to it, they get admin. Fix by requiring an env var:

```typescript
// In /api/auth/signup
if (userCount === 0 && body.adminToken !== process.env.ADMIN_INVITE_TOKEN) {
  return NextResponse.json({ error: 'First signup requires admin invite token.' }, { status: 403 })
}
```

Set `ADMIN_INVITE_TOKEN` to a random string in your env, then only YOU can be the first signup.

### 3. Add CSRF protection for cookie-authenticated API routes

Next.js API routes with cookie auth are vulnerable to CSRF. Add Origin header verification:

```typescript
// In each API route handler
const origin = req.headers.get('origin')
const host = req.headers.get('host')
if (origin && !origin.includes(host)) {
  return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
}
```

### 4. Add logging

Replace `console.log`/`console.error` with structured logging via Pino. On VPS, logs go to journald (`journalctl -u habibi`). Consider Sentry for error tracking (free tier covers most small apps).

### 5. Set up monitoring

- **Uptime monitoring**: UptimeRobot (free) or BetterStack — pings your domain every 5 minutes
- **Performance monitoring**: Vercel Analytics (if on Vercel) or Plausible Analytics (self-hosted on VPS)
- **DB monitoring**: Neon dashboard (if using Neon) or `pg_top` on VPS

---

## Cost summary

### VPS path (recommended for Hashim)

| Item | Monthly cost |
|---|---|
| Hetzner CX22 VPS | €4.51 (~PKR 1,400) |
| Domain name (.com) | ~$10/year (~PKR 2,800/year, ~PKR 230/mo) |
| Postgres | $0 (on same VPS) |
| Backups (local) | $0 |
| Backups (off-site, Backblaze B2) | ~$0.50/mo for 5GB |
| Z AI API usage | Pay per token — first ~10K Guide calls ≈ $5 |
| **Total** | **~PKR 1,800-2,500/mo** |

### Vercel path (faster, less control)

| Item | Monthly cost |
|---|---|
| Vercel free tier | $0 (until traffic grows) |
| Neon Postgres free tier | $0 (until 0.5GB) |
| Domain | ~$10/year |
| Z AI API usage | Same as above |
| **Total at launch** | **~PKR 230/mo + API usage** |
| **At 1000 users** | **~$20/mo (Vercel Pro + Neon paid)** |

---

## Maintenance

### Weekly

- SSH in, run `apt update && apt upgrade` (security patches)
- Check `journalctl -u habibi --since "7 days ago"` for errors
- Verify backup ran: `ls -la /var/backups/habibi/`

### Monthly

- Renew domain if expiring
- Check disk space: `df -h`
- Check Postgres size: `psql ... -c "SELECT pg_size_pretty(pg_database_size('habibi_prod'));"`
- Rotate API keys if you suspect any leak

### Quarterly

- Audit admin panel — look for users with open flags, contact them per your off-platform process
- Update dependencies: `bun update` then test
- Review the abuse logs and account terminations
- Verify the recovery code flow still works (sign up a test user, lose passphrase, recover with code)

---

## What's intentionally NOT in this guide

- **Passkey/WebAuthn upgrade** — the v1 uses passphrase auth. Upgrading to passkeys requires `@simplewebauthn/server` and a small refactor to `/api/auth/*`. Document your upgrade path but don't rush it.
- **Email sending** — magic-link emails aren't sent (the UI shows the code on screen in dev). For production magic-link, integrate Resend or Postmark. Currently the recovery code is shown ONCE at signup, so users don't need email to recover — they need their saved code.
- **Mobile app** — the web app is responsive but not a native mobile app. PWA support is the cheapest path if you want install-to-home-screen.
- **Multi-region deployment** — single VPS in one region is fine until you have 500+ users across continents. Then add a CDN (Cloudflare in front of your VPS is free and easy).

---

## If something breaks

1. **"Crypto.subtle failed"** — you're on HTTP, not HTTPS. Fix the TLS config.
2. **"Configuration file not found"** — `.z-ai-config` isn't where the SDK expects. Check `process.cwd()` of the running process.
3. **"Database is locked"** (SQLite) — switch to Postgres. You should have done this already.
4. **Guide AI returns "no response from model"** — check `.z-ai-config` API key is valid, check network egress from your server to `api.z.ai`.
5. **Signup returns "key is not extractable"** — the vault key was derived as non-extractable. The fix is in `src/lib/crypto-client.ts` line 86 — `extractable: true`. Make sure your deployed code matches.
6. **First user is not admin** — someone signed up before you. Wipe the DB and try again, or add the `ADMIN_INVITE_TOKEN` check described above.

---

## Final note

You're deploying a system where users trust you with the MOST sensitive data they have: their skills, their pricing floors, their portfolio, their client API keys. The whole architecture is designed so you CAN'T read it even if you wanted to. Honor that.

If law enforcement or anyone ever asks you to "add a backdoor to read user vaults" — the architecture makes this technically impossible without changing the code in a way that users would immediately notice (their decrypted values would start showing up in network traffic they can inspect). This is a feature, not a bug.

Run it like the operator you are: personal, honest, available. The platform's reputation is your reputation.

— built for Hashim
