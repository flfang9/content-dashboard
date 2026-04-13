# Content Dashboard

A self-hosted dashboard that syncs your TikTok and Instagram metrics to Notion and displays them in a clean web UI.

## Features

- **TikTok Metrics** - Scrapes views, likes, comments, shares, saves (no API key needed)
- **Instagram Metrics** - Pulls metrics via Instagram Graph API (optional)
- **Follower Tracking** - Track follower growth over time
- **Notion Integration** - Stores everything in your Notion Content Calendar
- **Auto-sync** - Daily cron job keeps metrics updated
- **Dashboard** - Clean web UI with charts and stats

## Quick Start

### 1. Duplicate the Notion Template

**[Click here to duplicate the Content Calendar template](https://distinct-oboe-31d.notion.site/56652a8b99df82fe9c97014d45d406ab?v=96e52a8b99df83c982f608f8c11c6fc7)**

Click "Duplicate" in the top right to add it to your workspace.

### 2. Create Notion Integration

1. Go to [notion.so/my-integrations](https://notion.so/my-integrations)
2. Click **New Integration** → Name it anything → Submit
3. Copy the **Internal Integration Secret**
4. Go back to your Content Calendar → Click `...` → **Connections** → Add your integration

### 3. Clone and Deploy to Vercel

```bash
git clone https://github.com/flfang9/content-dashboard.git
cd content-dashboard
npm install
npm i -g vercel
vercel --prod
```

### 4. Add Environment Variables in Vercel

Go to your [Vercel dashboard](https://vercel.com) → Project Settings → Environment Variables

**Required:**
| Variable | Where to get it |
|----------|-----------------|
| `NOTION_API_KEY` | Your integration secret from step 2 |
| `NOTION_DATABASE_ID` | From your Notion URL: `notion.so/DATABASE_ID?v=...` |
| `CRON_SECRET` | Any random string (protects your sync endpoint) |

**Optional - TikTok follower tracking:**
| Variable | Where to get it |
|----------|-----------------|
| `TIKTOK_USERNAME` | Your TikTok username without @ |

**Optional - Instagram metrics:**
| Variable | Where to get it |
|----------|-----------------|
| `META_ACCESS_TOKEN` | Facebook Developer App (requires Business/Creator IG account) |
| `IG_USER_ID` | Your Instagram Business account ID |

**Optional - Growth tracking database:**
| Variable | Where to get it |
|----------|-----------------|
| `NOTION_GROWTH_DATABASE_ID` | Run `node scripts/setup-growth-db.js` to create |

### 5. You're Done!

- **Dashboard**: Visit your Vercel URL
- **Auto-sync**: Runs daily at 9am UTC (configured in `vercel.json`)
- **Manual sync**: Click "Sync Now" in the dashboard or hit `/api/sync`

## Usage

1. **Add content to Notion** - Create rows with your post ideas
2. **Post your content** - When you post, add the URL to `TikTok URL` or `Instagram URL` column
3. **Set status to "Posted"** - Metrics will sync automatically
4. **Check your dashboard** - See all your stats at your Vercel URL

## What Gets Tracked

| Metric | TikTok | Instagram |
|--------|--------|-----------|
| Views | ✅ | ✅ |
| Likes | ✅ | ✅ |
| Comments | ✅ | ✅ |
| Shares | ✅ | ✅ |
| Saves/Bookmarks | ✅ | ✅ |
| Followers | ✅ | ✅ |

## How It Works

### TikTok (No API needed)

- **Follower tracking**: Add `TIKTOK_USERNAME` to Vercel env vars
- **Video metrics**: Paste video URLs into the `TikTok URL` column in Notion
- Example URL: `https://www.tiktok.com/@yourusername/video/1234567890`

### Instagram (Optional)

Requires Instagram Business/Creator account connected to a Facebook Page:
1. Create a Facebook Developer App
2. Add Instagram Graph API
3. Generate a long-lived access token
4. Add `META_ACCESS_TOKEN` and `IG_USER_ID` to Vercel

## Project Structure

```
content-dashboard/
├── app/                 # Next.js dashboard
├── components/          # React components
├── lib/                 # Notion client + scrapers
├── scripts/             # Setup scripts
│   ├── setup-notion.js  # Auto-create content database
│   └── setup-growth-db.js # Create growth tracking database
└── vercel.json          # Cron job config
```

## Alternative: Local Sync Script

If you prefer running sync locally instead of Vercel cron:

```bash
cd sync
npm install
cp .env.example .env
# Edit .env with your credentials
node sync.js
```

Set up daily cron:
```bash
crontab -e
# Add: 0 8 * * * cd /path/to/content-dashboard/sync && node sync.js
```

## Tech Stack

- **Frontend**: Next.js, React, Tailwind CSS, Recharts
- **Backend**: Vercel serverless functions
- **Database**: Notion API
- **Scraping**: Puppeteer (TikTok), Meta Graph API (Instagram)

## License

MIT
