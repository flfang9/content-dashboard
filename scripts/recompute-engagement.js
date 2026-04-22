#!/usr/bin/env node
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
const databaseId = process.env.NOTION_DATABASE_ID.trim();

async function main() {
  let cursor = undefined;
  let updated = 0;
  let skipped = 0;

  while (true) {
    const res = await notion.databases.query({
      database_id: databaseId,
      start_cursor: cursor,
      page_size: 100,
    });

    for (const page of res.results) {
      const p = page.properties;
      const tiktokViews = p['TikTok Views']?.number || 0;
      const igViews = p['IG Views']?.number || 0;
      const tiktokLikes = p['TikTok Likes']?.number || 0;
      const igLikes = p['IG Likes']?.number || 0;
      const tiktokComments = p['TikTok Comments']?.number || 0;
      const igComments = p['IG Comments']?.number || 0;
      const tiktokShares = p['TikTok Shares']?.number || 0;
      const igShares = p['IG Shares']?.number || 0;
      const igSaves = p['IG Saves']?.number || 0;

      const totalViews = tiktokViews + igViews;
      const totalEngagements =
        tiktokLikes + igLikes +
        tiktokComments + igComments +
        tiktokShares + igShares +
        igSaves;

      if (totalViews === 0) {
        skipped++;
        continue;
      }

      const rate = Math.round((totalEngagements / totalViews) * 10000) / 10000;
      const title =
        p['Title']?.title?.[0]?.plain_text ||
        p['Name']?.title?.[0]?.plain_text ||
        '(untitled)';

      await notion.pages.update({
        page_id: page.id,
        properties: { 'Calculated Engagement': { number: rate } },
      });
      console.log(`${(rate * 100).toFixed(2)}%  ${title}  (saves=${igSaves})`);
      updated++;
    }

    if (!res.has_more) break;
    cursor = res.next_cursor;
  }

  console.log(`\nDone. Updated ${updated}, skipped ${skipped} (no views).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
