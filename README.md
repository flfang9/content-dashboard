# Content Dashboard

A self-hosted dashboard that syncs your TikTok and Instagram metrics to Notion and displays them in a clean web UI.

## Features

- **TikTok Metrics** - Scrapes views, likes, comments, shares, saves (no API key needed)
- **Instagram Metrics** - Pulls metrics via Instagram Graph API (optional)
- **Follower Tracking** - Track follower growth over time
- **Notion Integration** - Stores everything in your Notion Content Calendar
- **Auto-sync** - Daily cron job keeps metrics updated
- **Dashboard** - Clean web UI with charts and stats

---

## Setup (3 Steps)

### Step 1: Get Your Notion Template

**[→ Click here to duplicate the Content Calendar template](https://distinct-oboe-31d.notion.site/56652a8b99df82fe9c97014d45d406ab?v=96e52a8b99df83c982f608f8c11c6fc7)**

Click "Duplicate" in the top right corner to add it to your Notion workspace.

### Step 2: Create a Notion Integration

1. Go to **[notion.so/my-integrations](https://notion.so/my-integrations)**
2. Click **"New Integration"**
3. Name it anything (e.g., "Content Dashboard")
4. Click **Submit**
5. Copy the **"Internal Integration Secret"** (starts with `secret_`)
6. Go back to your Content Calendar in Notion
7. Click the `•••` menu in the top right → **"Connections"** → Add your integration

### Step 3: Deploy to Vercel

Click the button below to deploy your dashboard:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fflfang9%2Fcontent-dashboard&env=NOTION_API_KEY,NOTION_DATABASE_ID,CRON_SECRET&envDescription=Required%20environment%20variables&envLink=https%3A%2F%2Fgithub.com%2Fflfang9%2Fcontent-dashboard%23environment-variables)

You'll be asked to fill in these values:

| Variable | What to enter |
|----------|---------------|
| `NOTION_API_KEY` | The integration secret you copied (starts with `secret_`) |
| `NOTION_DATABASE_ID` | From your Notion URL: `notion.so/`**`THIS-PART`**`?v=...` |
| `CRON_SECRET` | Make up any random string (e.g., `my-secret-123`) |

**That's it!** Your dashboard will be live at your Vercel URL.

---

## Environment Variables

### Required

| Variable | Description |
|----------|-------------|
| `NOTION_API_KEY` | Your Notion integration secret |
| `NOTION_DATABASE_ID` | Your content calendar database ID |
| `CRON_SECRET` | Protects your sync endpoint from unauthorized access |

### Optional - TikTok Follower Tracking

| Variable | Description |
|----------|-------------|
| `TIKTOK_USERNAME` | Your TikTok username (without the @) |

### Optional - Instagram Metrics

| Variable | Description |
|----------|-------------|
| `META_ACCESS_TOKEN` | Facebook Graph API token (requires Business/Creator Instagram account) |
| `IG_USER_ID` | Your Instagram Business account ID |

### Optional - Growth Tracking

| Variable | Description |
|----------|-------------|
| `NOTION_GROWTH_DATABASE_ID` | Tracks follower growth over time. See [Growth Tracking Setup](#growth-tracking-setup) |

To add these later: Vercel Dashboard → Your Project → Settings → Environment Variables

---

## Usage

1. **Add content to Notion** - Create rows with your post ideas
2. **Post your content** - Add the URL to `TikTok URL` or `Instagram URL` column
3. **Set status to "Posted"** - Metrics will sync automatically
4. **Check your dashboard** - Visit your Vercel URL to see stats

**Auto-sync** runs daily at 9am UTC. You can also click "Sync Now" in the dashboard.

---

## What Gets Tracked

| Metric | TikTok | Instagram |
|--------|--------|-----------|
| Views | ✅ | ✅ |
| Likes | ✅ | ✅ |
| Comments | ✅ | ✅ |
| Shares | ✅ | ✅ |
| Saves/Bookmarks | ✅ | ✅ |
| Followers | ✅ | ✅ |

---

## Growth Tracking Setup

To track follower growth over time:

1. Open your Notion Content Calendar
2. Copy the page ID from the URL
3. Run this in terminal (or ask ChatGPT to help):
   ```bash
   NOTION_API_KEY=secret_xxx NOTION_PAGE_ID=xxx node scripts/setup-growth-db.js
   ```
4. Add the new database ID to Vercel as `NOTION_GROWTH_DATABASE_ID`

---

## For Developers

### Manual Setup (Alternative to Deploy Button)

```bash
git clone https://github.com/flfang9/content-dashboard.git
cd content-dashboard
npm install
cp .env.example .env
# Edit .env with your credentials
npm run dev        # Local development
vercel --prod      # Deploy to Vercel
```

### Local Sync Script

Run sync locally instead of using Vercel cron:

```bash
cd sync
npm install
cp .env.example .env
# Edit .env
node sync.js
```

### Project Structure

```
content-dashboard/
├── app/                 # Next.js dashboard
├── components/          # React components
├── lib/                 # Notion client + scrapers
├── scripts/             # Setup scripts
└── vercel.json          # Cron job config (daily sync)
```

### Tech Stack

- Next.js, React, Tailwind CSS, Recharts
- Vercel serverless functions
- Notion API
- Puppeteer (TikTok scraping)

---

## License

MIT
