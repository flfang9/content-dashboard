#!/usr/bin/env node
// Refreshes per-post TikTok metrics by scraping each video URL from a GitHub
// Actions runner (or other non-Vercel host). TikTok blocks Vercel's datacenter
// IPs, so the in-process /api/sync/growth refresh sometimes returns null and
// silently leaves stale values. GH-hosted runner IPs typically aren't blocked.
//
// Standalone — no TypeScript, no app imports. Talks directly to Notion.

const fs = require('fs');
const path = require('path');
const envFile = path.join(__dirname, '..', '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY?.trim() });
const databaseId = process.env.NOTION_DATABASE_ID?.trim();

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function scrapeTikTokPost(url) {
  // Photo posts need a real browser to render stats. Skip them here; the
  // /api/sync/posts route handles photo posts via Puppeteer when run locally.
  if (url.includes('/photo/')) return { skipped: 'photo-post' };

  let r;
  try {
    r = await fetch(url, {
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });
  } catch (e) {
    return { error: `fetch: ${e.message}` };
  }
  if (!r.ok) return { error: `status ${r.status}` };

  const html = await r.text();
  const m = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([^<]+)<\/script>/);
  if (!m) return { error: 'data script not found' };

  let parsed;
  try {
    parsed = JSON.parse(m[1]);
  } catch (e) {
    return { error: `JSON.parse: ${e.message}` };
  }

  const scope = parsed?.['__DEFAULT_SCOPE__'];
  const stats =
    scope?.['webapp.video-detail']?.itemInfo?.itemStruct?.stats ||
    scope?.['webapp.photo-detail']?.itemInfo?.itemStruct?.stats ||
    scope?.['webapp.slideshow-detail']?.itemInfo?.itemStruct?.stats;

  if (!stats) return { error: 'stats not in payload' };

  return {
    metrics: {
      views: Number(stats.playCount || stats.viewCount || 0),
      likes: Number(stats.diggCount || stats.likeCount || 0),
      comments: Number(stats.commentCount || 0),
      shares: Number(stats.shareCount || 0),
      saves: Number(stats.collectCount || stats.saveCount || 0),
    },
  };
}

async function fetchTikTokPosts() {
  const out = [];
  let cursor;
  do {
    const r = await notion.databases.query({
      database_id: databaseId,
      start_cursor: cursor,
      filter: {
        and: [
          { property: 'Status', select: { equals: 'Posted' } },
          { property: 'TikTok URL', url: { is_not_empty: true } },
        ],
      },
    });
    for (const p of r.results) {
      out.push({
        id: p.id,
        url: p.properties['TikTok URL']?.url,
        title: p.properties['Title']?.title?.[0]?.plain_text || p.id,
      });
    }
    cursor = r.has_more ? r.next_cursor : undefined;
  } while (cursor);
  return out;
}

async function updateNotion(pageId, metrics) {
  const props = {
    'TikTok Views': { number: metrics.views },
    'TikTok Likes': { number: metrics.likes },
    'TikTok Comments': { number: metrics.comments },
    'TikTok Shares': { number: metrics.shares },
    'TikTok Saves': { number: metrics.saves },
    'Last Synced': { date: { start: new Date().toISOString() } },
  };
  await notion.pages.update({ page_id: pageId, properties: props });

  // Recompute engagement rate from current post values.
  const page = await notion.pages.retrieve({ page_id: pageId });
  const p = page.properties;
  const views = (p['TikTok Views']?.number || 0) + (p['IG Views']?.number || 0);
  const eng =
    (p['TikTok Likes']?.number || 0) +
    (p['IG Likes']?.number || 0) +
    (p['TikTok Comments']?.number || 0) +
    (p['IG Comments']?.number || 0) +
    (p['TikTok Shares']?.number || 0) +
    (p['IG Shares']?.number || 0) +
    (p['TikTok Saves']?.number || 0) +
    (p['IG Saves']?.number || 0);
  const rate = views > 0 ? Math.round((eng / views) * 10000) / 10000 : 0;
  await notion.pages.update({
    page_id: pageId,
    properties: { 'Calculated Engagement': { number: rate } },
  });
}

async function main() {
  if (!databaseId) throw new Error('NOTION_DATABASE_ID missing');

  const posts = await fetchTikTokPosts();
  console.log(`Refreshing ${posts.length} TikTok posts...`);

  let updated = 0;
  let failed = 0;
  let skipped = 0;
  const failures = [];

  // Sequential with small delay — TikTok is more tolerant than parallel bursts.
  for (const post of posts) {
    const result = await scrapeTikTokPost(post.url);
    if (result.skipped) {
      skipped++;
      console.log(`  skip ${post.title.slice(0, 50)} (${result.skipped})`);
    } else if (result.metrics) {
      try {
        await updateNotion(post.id, result.metrics);
        updated++;
        console.log(`  ✓ ${post.title.slice(0, 50)} — ${result.metrics.views} views`);
      } catch (e) {
        failed++;
        failures.push(`${post.title.slice(0, 40)}: notion ${e.message}`);
      }
    } else {
      failed++;
      failures.push(`${post.title.slice(0, 40)}: ${result.error}`);
    }
    await new Promise(r => setTimeout(r, 250));
  }

  console.log(`\nDone: updated=${updated} skipped=${skipped} failed=${failed}`);
  if (failures.length > 0) {
    console.log('Failures:');
    for (const f of failures) console.log(`  - ${f}`);
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
