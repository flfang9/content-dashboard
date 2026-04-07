# Adapty Content Calendar — Metrics Auto-Sync

Pulls Instagram + TikTok post metrics daily and upserts them into your Notion Content Calendar.

---

## What it does

- Fetches your last 50 IG posts + 20 TikTok videos
- For each post: views, likes, comments, shares, saves
- Matches to existing Notion rows by URL (updates metrics) or creates a new row
- Runs in ~10 seconds

---

## Setup (one-time, ~30 mins)

### 1. Install

```bash
cd adapty-sync
npm install
cp .env.example .env
```

### 2. Notion Integration Token

1. Go to [notion.so/my-integrations](https://notion.so/my-integrations)
2. Click **New Integration** → name it "Adapty Sync" → Submit
3. Copy the **Internal Integration Token** → paste into `.env` as `NOTION_TOKEN`
4. Open your Content Calendar in Notion → `...` menu → **Connections** → Add "Adapty Sync"

`NOTION_DATABASE_ID` is already pre-filled: `5dd235dfb135452291173be0d94849e7`

---

### 3. Instagram Setup

**Requirements:** Your IG account must be a Business or Creator account connected to a Facebook Page.

#### Get credentials:
1. Go to [developers.facebook.com](https://developers.facebook.com) → **My Apps** → **Create App**
2. Choose **Business** type → Add **Instagram Graph API** product
3. Under Instagram Graph API → **Generate Access Token** for your account
4. Exchange for a long-lived token (valid 60 days):
   ```
   GET https://graph.facebook.com/v19.0/oauth/access_token
     ?grant_type=fb_exchange_token
     &client_id=YOUR_APP_ID
     &client_secret=YOUR_APP_SECRET
     &fb_exchange_token=SHORT_LIVED_TOKEN
   ```
5. Get your IG User ID:
   ```
   GET https://graph.instagram.com/me?access_token=YOUR_LONG_LIVED_TOKEN
   ```
6. Paste both into `.env`

**Note on metrics available:** Like count, comment count, impressions, reach, saves, shares.

---

### 4. TikTok Setup

1. Go to [developers.tiktok.com](https://developers.tiktok.com) → **Manage Apps** → **Create App**
2. Add these scopes: `video.list`, `video.publish` (for metadata)
3. Set redirect URI to `http://localhost:8080/callback`
4. Run the OAuth flow to get your initial tokens:
   ```bash
   # Build the auth URL:
   https://www.tiktok.com/v2/auth/authorize/?
     client_key=YOUR_CLIENT_KEY
     &scope=video.list
     &response_type=code
     &redirect_uri=http://localhost:8080/callback
     &state=random123
   ```
5. After authorizing, exchange the `code` for tokens:
   ```bash
   curl -X POST https://open.tiktokapis.com/v2/oauth/token/ \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "client_key=YOUR_KEY&client_secret=YOUR_SECRET&code=CODE&grant_type=authorization_code&redirect_uri=http://localhost:8080/callback"
   ```
6. Paste `access_token` and `refresh_token` into `.env`

**Note:** TikTok tokens expire every 24 hours. The `refresh-tiktok-token.js` script handles this automatically when run as part of the cron job.

**Note on metrics:** Views (play count), likes, comments, shares. Saves are not exposed by TikTok's API.

---

## Running manually

```bash
node sync.js
```

---

## Setting up daily auto-sync (cron)

### Mac / Linux

```bash
# Open crontab
crontab -e

# Add this line — runs every day at 8am:
0 8 * * * cd /full/path/to/adapty-sync && node refresh-tiktok-token.js && node sync.js >> /tmp/adapty-sync.log 2>&1
```

To find your full path: `cd adapty-sync && pwd`

### Windows (Task Scheduler)

1. Open Task Scheduler → Create Basic Task
2. Trigger: Daily at 8:00 AM
3. Action: Start a program
   - Program: `node`
   - Arguments: `refresh-tiktok-token.js && node sync.js`
   - Start in: `C:\path\to\adapty-sync`

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `Instagram API error: Invalid OAuth access token` | Your token expired. Re-generate at developers.facebook.com |
| `TikTok token refresh failed` | Your refresh token expired (valid 365 days). Re-run OAuth flow |
| `Notion: Could not find database` | Make sure you added the integration to the database in Notion |
| Post not matching (duplicate rows) | Check the TikTok URL / Instagram URL match exactly |

---

## File structure

```
adapty-sync/
├── sync.js                    # Main sync script
├── refresh-tiktok-token.js    # TikTok token refresh
├── package.json
├── .env                       # Your credentials (never commit this)
└── .env.example               # Template
```
