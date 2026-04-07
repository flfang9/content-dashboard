# Content Dashboard

A self-hosted dashboard that syncs your TikTok and Instagram metrics to Notion and displays them in a clean web UI.

![Dashboard Preview](https://content-dashboard-gold.vercel.app)

## Features

- **TikTok Metrics** - Scrapes views, likes, comments, shares from your video URLs (no API key needed)
- **Instagram Metrics** - Pulls metrics via Instagram Graph API (optional)
- **Notion Integration** - Stores everything in your Notion Content Calendar
- **Auto-sync** - Daily cron job keeps metrics updated
- **Dashboard** - Clean web UI with charts and stats

## Setup

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/content-dashboard.git
cd content-dashboard
npm install
```

### 2. Create Notion database

Create a Notion database with these properties:

| Property | Type |
|----------|------|
| Title | Title |
| Status | Select (Idea, Drafting, Ready, Scheduled, Posted) |
| Content Pillar | Select |
| TikTok URL | URL |
| Instagram URL | URL |
| TikTok Views | Number |
| TikTok Likes | Number |
| TikTok Comments | Number |
| TikTok Shares | Number |
| IG Views | Number |
| IG Likes | Number |
| IG Comments | Number |
| IG Shares | Number |
| IG Saves | Number |
| Post Date | Date |

### 3. Create Notion integration

1. Go to [notion.so/my-integrations](https://notion.so/my-integrations)
2. Create new integration
3. Copy the API key
4. Connect the integration to your database (Database → ... → Connections)

### 4. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:
```
NOTION_API_KEY=secret_xxxxx
NOTION_DATABASE_ID=your-database-id
```

### 5. Deploy to Vercel

```bash
npm i -g vercel
vercel --prod
```

Add environment variables in Vercel dashboard:
- `NOTION_API_KEY`
- `NOTION_DATABASE_ID`
- `CRON_SECRET` (any random string)

### 6. Set up local sync (optional)

For TikTok scraping, set up the local sync script:

```bash
cd adapty-sync
npm install
cp .env.example .env
# Edit .env with your Notion credentials
```

Run manually:
```bash
node sync.js
```

Or set up a daily cron job:
```bash
crontab -e
# Add: 0 8 * * * cd /path/to/content-dashboard/adapty-sync && node sync.js
```

## How it works

### TikTok
- Add video URLs to your Notion database
- The sync script scrapes public metrics from TikTok pages
- No API key needed - just works

### Instagram (optional)
- Requires Instagram Business/Creator account
- Connect to a Facebook Page
- Set up Meta Developer App with Instagram Graph API
- Add `IG_USER_ID` and `IG_ACCESS_TOKEN` to `.env`

## Tech Stack

- **Frontend**: Next.js 16, React, Tailwind CSS, Recharts
- **Backend**: Vercel serverless functions
- **Database**: Notion API
- **Scraping**: Node.js fetch

## License

MIT
