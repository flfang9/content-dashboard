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

### Option 1: Use the Notion Template (Recommended)

1. **Duplicate the template**: [Content Calendar Template](TEMPLATE_LINK_HERE)
2. Click "Duplicate" in the top right
3. Continue to step 3 below

### Option 2: Auto-create Database

```bash
# Clone and install
git clone https://github.com/flfang9/content-dashboard.git
cd content-dashboard
npm install

# Create Notion integration at notion.so/my-integrations
# Share a page with your integration, then:
cd scripts
NOTION_TOKEN=secret_xxx NOTION_PAGE_ID=your-page-id node setup-notion.js
```

### 3. Create Notion Integration

1. Go to [notion.so/my-integrations](https://notion.so/my-integrations)
2. Create new integration → Copy the API key
3. Open your database → `...` → Connections → Add your integration

### 4. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
```env
NOTION_API_KEY=secret_xxxxx
NOTION_DATABASE_ID=your-database-id
TIKTOK_USERNAME=your-tiktok-username
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

### 6. Set Up Daily Sync

```bash
cd adapty-sync
npm install
cp .env.example .env
# Edit .env with your credentials
```

Run manually:
```bash
node sync.js
```

Set up daily cron (8am):
```bash
crontab -e
# Add: 0 8 * * * cd /path/to/content-dashboard/adapty-sync && node sync.js
```

## What Gets Tracked

| Metric | TikTok | Instagram |
|--------|--------|-----------|
| Views | ✅ | ✅ |
| Likes | ✅ | ✅ |
| Comments | ✅ | ✅ |
| Shares | ✅ | ✅ |
| Saves/Bookmarks | ✅ | ✅ |
| Followers | ✅ | ❌ |

## Database Schema

The Notion database includes:

| Property | Type | Description |
|----------|------|-------------|
| Title | Title | Post title/description |
| Status | Select | Idea, Drafting, Ready, Scheduled, Posted |
| Content Pillar | Select | Educational, BTS, Entertainment, etc. |
| TikTok URL | URL | Link to TikTok video |
| Instagram URL | URL | Link to Instagram post |
| TikTok Views/Likes/Comments/Shares/Saves | Number | TikTok metrics |
| IG Views/Likes/Comments/Shares/Saves | Number | Instagram metrics |
| Post Date | Date | When it was posted |
| Total Views/Likes/etc. | Formula | Combined metrics |
| Total Engagement | Formula | Engagement rate % |

## How It Works

### TikTok
- Add video URLs to your Notion database
- The sync script scrapes public metrics from TikTok pages
- No API key needed - just works
- Also tracks profile followers, total likes, video count

### Instagram (Optional)
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

MIT - Built by [@buildwithfreddy](https://tiktok.com/@buildwithfreddy)
