#!/usr/bin/env node
// Refreshes today's growth snapshot.
// - IG followers/posts: live via Graph API (fast)
// - Post view/like sums: live from Notion content DB
// - TikTok followers/likes/videos: carries forward from last snapshot
//   (TikTok needs Puppeteer; run full /api/sync for an authoritative update)

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
const notion = new Client({ auth: process.env.NOTION_API_KEY });
const growthDbId = process.env.NOTION_GROWTH_DATABASE_ID?.trim();
const contentDbId = process.env.NOTION_DATABASE_ID?.trim();

async function getIG() {
  const token = process.env.META_ACCESS_TOKEN;
  const userId = process.env.IG_USER_ID;
  if (!token || !userId) {
    console.log('  IG: META_ACCESS_TOKEN or IG_USER_ID missing');
    return null;
  }
  const url = `https://graph.facebook.com/v19.0/${userId}?fields=followers_count,media_count&access_token=${token}`;
  const r = await fetch(url);
  if (!r.ok) {
    console.error('  IG error:', await r.text());
    return null;
  }
  const d = await r.json();
  return { followers: d.followers_count || 0, postsCount: d.media_count || 0 };
}

async function getTikTok() {
  const username = process.env.TIKTOK_USERNAME;
  if (!username) {
    console.log('  TikTok: TIKTOK_USERNAME missing');
    return null;
  }
  const r = await fetch(`https://www.tiktok.com/@${username}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    },
  });
  if (!r.ok) {
    console.error(`  TikTok profile fetch failed: ${r.status}`);
    return null;
  }
  const html = await r.text();
  const m = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([^<]+)<\/script>/);
  if (!m) {
    console.error('  TikTok profile: data script not found');
    return null;
  }
  const stats = JSON.parse(m[1])?.['__DEFAULT_SCOPE__']?.['webapp.user-detail']?.['userInfo']?.stats;
  if (!stats) return null;
  return {
    followers: stats.followerCount || 0,
    likes: stats.heartCount || 0,
    videos: stats.videoCount || 0,
  };
}

async function sumPostMetrics() {
  let cursor, sums = { tv: 0, tl: 0, iv: 0, il: 0 };
  while (true) {
    const r = await notion.databases.query({
      database_id: contentDbId,
      filter: { property: 'Status', select: { equals: 'Posted' } },
      start_cursor: cursor,
      page_size: 100,
    });
    for (const page of r.results) {
      const p = page.properties;
      sums.tv += p['TikTok Views']?.number || 0;
      sums.tl += p['TikTok Likes']?.number || 0;
      sums.iv += p['IG Views']?.number || 0;
      sums.il += p['IG Likes']?.number || 0;
    }
    if (!r.has_more) break;
    cursor = r.next_cursor;
  }
  return sums;
}

async function lastSnapshot() {
  const r = await notion.databases.query({
    database_id: growthDbId,
    page_size: 100,
  });
  const rows = r.results
    .map(p => ({
      id: p.id,
      date: p.properties['Date']?.title?.[0]?.plain_text || '',
      tiktokFollowers: p.properties['TikTok Followers']?.number || 0,
      tiktokTotalLikes: p.properties['TikTok Total Likes']?.number || 0,
      tiktokVideos: p.properties['TikTok Videos']?.number || 0,
    }))
    .filter(r => r.date)
    .sort((a, b) => b.date.localeCompare(a.date));
  return rows[0] || null;
}

function buildProps(data) {
  return {
    'Date': { title: [{ text: { content: data.date } }] },
    'TikTok Followers': { number: data.tiktokFollowers },
    'TikTok Total Likes': { number: data.tiktokTotalLikes },
    'TikTok Videos': { number: data.tiktokVideos },
    'Instagram Followers': { number: data.instagramFollowers },
    'Instagram Posts': { number: data.instagramPosts },
    'TikTok Views': { number: data.tiktokViews },
    'TikTok Likes': { number: data.tiktokLikes },
    'Instagram Views': { number: data.instagramViews },
    'Instagram Likes': { number: data.instagramLikes },
  };
}

async function upsert(data) {
  const existing = await notion.databases.query({
    database_id: growthDbId,
    filter: { property: 'Date', title: { equals: data.date } },
    page_size: 1,
  });
  if (existing.results[0]) {
    await notion.pages.update({ page_id: existing.results[0].id, properties: buildProps(data) });
    return 'updated';
  }
  await notion.pages.create({ parent: { database_id: growthDbId }, properties: buildProps(data) });
  return 'created';
}

function todayLA() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
}

async function main() {
  if (!growthDbId) throw new Error('NOTION_GROWTH_DATABASE_ID missing');

  console.log('Fetching IG account stats (live)...');
  const ig = await getIG();
  console.log(`  IG: ${ig?.followers ?? 'n/a'} followers, ${ig?.postsCount ?? 'n/a'} posts`);

  console.log('Scraping TikTok profile (live)...');
  const tt = await getTikTok();
  console.log(`  TikTok: ${tt?.followers ?? 'n/a'} followers, ${tt?.videos ?? 'n/a'} videos`);

  // If TikTok scrape failed (datacenter IP block, UI change, etc.) don't
  // clobber yesterday's good number with 0 — carry forward.
  let prev = null;
  if (!tt) {
    console.log('  TikTok scrape failed — carrying forward previous snapshot');
    prev = await lastSnapshot();
    console.log(`  Previous (${prev?.date}): TikTok ${prev?.tiktokFollowers} followers`);
  }

  console.log('Summing post metrics from Notion...');
  const s = await sumPostMetrics();

  const data = {
    date: todayLA(),
    tiktokFollowers: tt?.followers ?? prev?.tiktokFollowers ?? 0,
    tiktokTotalLikes: tt?.likes ?? prev?.tiktokTotalLikes ?? 0,
    tiktokVideos: tt?.videos ?? prev?.tiktokVideos ?? 0,
    instagramFollowers: ig?.followers || 0,
    instagramPosts: ig?.postsCount || 0,
    tiktokViews: s.tv,
    tiktokLikes: s.tl,
    instagramViews: s.iv,
    instagramLikes: s.il,
  };

  const action = await upsert(data);
  console.log(`\nSnapshot ${action} for ${data.date}:`);
  console.log(`  IG: ${data.instagramFollowers} followers`);
  console.log(`  TikTok: ${data.tiktokFollowers} followers`);
}

main().catch((e) => { console.error(e); process.exit(1); });
