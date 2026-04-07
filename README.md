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

**[Click here to duplicate the Content Calendar template](https://distinct-oboe-31d.notion.site/ed952a8b99df837d946401de2a05ca5a?v=18a52a8b99df82ecb07188c6455b804c)**

Click "Duplicate" in the top right to add it to your workspace.

### 2. Create Notion Integration

1. Go to [notion.so/my-integrations](https://notion.so/my-integrations)
2. Click **New Integration** → Name it anything → Submit
3. Copy the **Internal Integration Secret**
4. Go back to your Content Calendar → Click `...` → **Connections** → Add your integration

### 3. Clone and Install

```bash
git clone https://github.com/flfang9/content-dashboard.git
cd content-dashboard
npm install
```

### 4. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
```env
NOTION_API_KEY=secret_xxxxx
NOTION_DATABASE_ID=your-database-id
```

Get your database ID from the Notion URL: `notion.so/DATABASE_ID?v=...`

### 5. Deploy Dashboard to Vercel

```bash
npm i -g vercel
vercel --prod
```

Add these environment variables in your [Vercel dashboard](https://vercel.com):
- `NOTION_API_KEY`
- `NOTION_DATABASE_ID`
- `CRON_SECRET` (any random string)

### 6. Set Up Auto-Sync

```bash
cd sync
npm install
cp .env.example .env
# Edit .env with your Notion credentials and TikTok username
```

Test it:
```bash
node sync.js
```

Set up daily sync (runs at 8am):
```bash
crontab -e
# Add this line:
0 8 * * * cd /path/to/content-dashboard/sync && node sync.js >> /tmp/content-sync.log 2>&1
```

## Usage

1. **Add content to Notion** - Create rows with your post ideas
2. **Post your content** - When you post, add the URL to `TikTok URL` or `Instagram URL`
3. **Set status to Posted** - Metrics will sync automatically
4. **Check your dashboard** - See all your stats at your Vercel URL

## What Gets Tracked

| Metric | TikTok | Instagram |
|--------|--------|-----------|
| Views | ✅ | ✅ |
| Likes | ✅ | ✅ |
| Comments | ✅ | ✅ |
| Shares | ✅ | ✅ |
| Saves/Bookmarks | ✅ | ✅ |
| Followers | ✅ | - |

## How It Works

### TikTok (No API needed)
- Scrapes public metrics directly from TikTok video pages
- Just add your video URLs to Notion
- Also tracks your profile followers, total likes, video count

### Instagram (Optional setup)
- Requires Instagram Business/Creator account connected to a Facebook Page
- Uses official Instagram Graph API
- Add `IG_USER_ID` and `IG_ACCESS_TOKEN` to your `.env`

## Project Structure

```
content-dashboard/
├── app/                 # Next.js dashboard
├── components/          # React components
├── lib/                 # Notion client
├── sync/                # Metrics sync scripts
│   ├── sync.js          # Main sync script
│   └── .env.example     # Environment template
├── scripts/
│   └── setup-notion.js  # Auto-create Notion database
└── vercel.json          # Cron job config
```

## Tech Stack

- **Frontend**: Next.js, React, Tailwind CSS, Recharts
- **Backend**: Vercel serverless functions
- **Database**: Notion API
- **Scraping**: Node.js fetch

## Alternative: Auto-Create Database

If you don't want to use the template, you can auto-create the database:

```bash
cd scripts
NOTION_TOKEN=secret_xxx NOTION_PAGE_ID=xxx node setup-notion.js
```

This creates a database with all the required properties.

## License

MIT
