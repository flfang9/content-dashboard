#!/usr/bin/env node

/**
 * Content Calendar — Social Metrics Auto-Sync
 * - TikTok: Scrapes public metrics from URLs in Notion (no API needed)
 * - Instagram: Uses Graph API (optional, requires setup)
 *
 * Run manually:  node sync.js
 * Daily cron:    0 8 * * * cd /path/to/adapty-sync && node sync.js
 */

require("dotenv").config();
const { Client } = require("@notionhq/client");

// ─── Config ───────────────────────────────────────────────────────────────────
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;
const notion = new Client({ auth: process.env.NOTION_TOKEN });

// ─── TikTok Scraper ───────────────────────────────────────────────────────────

async function scrapeTikTokMetrics(url) {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();

    // TikTok embeds video data in a script tag
    const scriptMatch = html.match(
      /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([^<]+)<\/script>/
    );

    if (!scriptMatch) {
      // Try alternative SIGI_STATE pattern
      const sigiMatch = html.match(/<script id="SIGI_STATE"[^>]*>([^<]+)<\/script>/);
      if (!sigiMatch) return null;

      const data = JSON.parse(sigiMatch[1]);
      const videoId = Object.keys(data.ItemModule || {})[0];
      const video = data.ItemModule?.[videoId];
      if (!video?.stats) return null;

      return {
        views: video.stats.playCount || 0,
        likes: video.stats.diggCount || 0,
        comments: video.stats.commentCount || 0,
        shares: video.stats.shareCount || 0,
        saves: video.stats.collectCount || 0,
      };
    }

    const jsonData = JSON.parse(scriptMatch[1]);
    const videoData =
      jsonData?.["__DEFAULT_SCOPE__"]?.["webapp.video-detail"]?.["itemInfo"]?.["itemStruct"];

    if (!videoData?.stats) return null;

    return {
      views: videoData.stats.playCount || 0,
      likes: videoData.stats.diggCount || 0,
      comments: videoData.stats.commentCount || 0,
      shares: videoData.stats.shareCount || 0,
      saves: videoData.stats.collectCount || 0,
    };
  } catch (err) {
    return null;
  }
}

// ─── Instagram API ────────────────────────────────────────────────────────────

async function fetchInstagramMedia() {
  const userId = process.env.IG_USER_ID;
  const token = process.env.IG_ACCESS_TOKEN;

  if (!userId || !token) {
    console.log("📸 Instagram: No credentials set — skipping\n");
    return [];
  }

  const fields = "id,permalink,timestamp,like_count,comments_count,media_type,caption";

  const res = await fetch(
    `https://graph.instagram.com/${userId}/media?fields=${fields}&access_token=${token}&limit=50`
  );

  if (!res.ok) {
    const err = await res.json();
    console.error("❌ Instagram API error:", err.error?.message);
    return [];
  }

  const data = await res.json();
  const posts = data.data || [];

  const enriched = await Promise.all(
    posts.map(async (post) => {
      try {
        const insightRes = await fetch(
          `https://graph.instagram.com/${post.id}/insights?metric=impressions,reach,saved,shares&access_token=${token}`
        );
        const insights = await insightRes.json();
        const byName = {};
        (insights.data || []).forEach((m) => (byName[m.name] = m.values?.[0]?.value ?? 0));

        return {
          platform: "Instagram",
          url: post.permalink,
          postDate: post.timestamp?.split("T")[0],
          title: post.caption?.split("\n")[0]?.slice(0, 80) || post.id,
          views: byName.impressions || byName.reach || 0,
          likes: post.like_count || 0,
          comments: post.comments_count || 0,
          shares: byName.shares || 0,
          saves: byName.saved || 0,
        };
      } catch {
        return null;
      }
    })
  );

  return enriched.filter(Boolean);
}

// ─── Notion Helpers ───────────────────────────────────────────────────────────

async function getExistingPages() {
  const pages = [];
  let cursor;

  do {
    const res = await notion.databases.query({
      database_id: NOTION_DATABASE_ID,
      start_cursor: cursor,
      page_size: 100,
    });
    pages.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);

  return pages;
}

function getPropertyValue(prop) {
  if (!prop) return null;
  switch (prop.type) {
    case "url":
      return prop.url;
    case "title":
      return prop.title?.[0]?.plain_text || "";
    case "rich_text":
      return prop.rich_text?.[0]?.plain_text || "";
    case "select":
      return prop.select?.name;
    default:
      return null;
  }
}

async function updateTikTokMetrics(pageId, metrics) {
  await notion.pages.update({
    page_id: pageId,
    properties: {
      "TikTok Views": { number: metrics.views },
      "TikTok Likes": { number: metrics.likes },
      "TikTok Comments": { number: metrics.comments },
      "TikTok Shares": { number: metrics.shares },
    },
  });
}

async function updateInstagramMetrics(pageId, metrics) {
  await notion.pages.update({
    page_id: pageId,
    properties: {
      "IG Views": { number: metrics.views },
      "IG Likes": { number: metrics.likes },
      "IG Comments": { number: metrics.comments },
      "IG Shares": { number: metrics.shares },
      "IG Saves": { number: metrics.saves },
    },
  });
}

async function createInstagramPage(post) {
  const props = {
    Title: { title: [{ text: { content: post.title } }] },
    Status: { select: { name: "Posted" } },
    "Instagram URL": { url: post.url },
    "IG Views": { number: post.views },
    "IG Likes": { number: post.likes },
    "IG Comments": { number: post.comments },
    "IG Shares": { number: post.shares },
    "IG Saves": { number: post.saves },
  };

  if (post.postDate) {
    props["Post Date"] = { date: { start: post.postDate } };
  }

  await notion.pages.create({
    parent: { database_id: NOTION_DATABASE_ID },
    properties: props,
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🔄 Content Calendar Sync");
  console.log("========================");
  console.log(`Started: ${new Date().toLocaleString()}\n`);

  if (!NOTION_DATABASE_ID || !process.env.NOTION_TOKEN) {
    console.error("❌ Missing NOTION_TOKEN or NOTION_DATABASE_ID in .env");
    process.exit(1);
  }

  // Load existing Notion rows
  console.log("📥 Loading Notion database...");
  const existingPages = await getExistingPages();
  console.log(`   Found ${existingPages.length} rows\n`);

  // Build URL index
  const urlToPage = {};
  for (const page of existingPages) {
    const tiktokUrl = getPropertyValue(page.properties["TikTok URL"]);
    const igUrl = getPropertyValue(page.properties["Instagram URL"]);
    if (tiktokUrl) urlToPage[tiktokUrl] = page;
    if (igUrl) urlToPage[igUrl] = page;
  }

  let updated = 0, created = 0, errors = 0;

  // ─── TikTok: Scrape URLs already in Notion ──────────────────────────────────
  const tiktokPages = existingPages.filter((p) =>
    getPropertyValue(p.properties["TikTok URL"])
  );

  if (tiktokPages.length > 0) {
    console.log(`📱 TikTok: Syncing ${tiktokPages.length} posts...`);

    for (const page of tiktokPages) {
      const url = getPropertyValue(page.properties["TikTok URL"]);
      const title = getPropertyValue(page.properties["Title"]) || "Untitled";

      const metrics = await scrapeTikTokMetrics(url);

      if (metrics) {
        try {
          await updateTikTokMetrics(page.id, metrics);
          updated++;
          console.log(`   ✅ ${title.slice(0, 40)} — ${metrics.views.toLocaleString()} views`);
        } catch (err) {
          errors++;
          console.log(`   ❌ Failed: ${err.message}`);
        }
      } else {
        console.log(`   ⚠️  Could not scrape: ${title.slice(0, 40)}`);
      }

      // Rate limit - 1 second between requests
      await new Promise((r) => setTimeout(r, 1000));
    }
    console.log("");
  } else {
    console.log("📱 TikTok: No URLs in Notion yet\n");
  }

  // ─── Instagram: Fetch from API and upsert ───────────────────────────────────
  const igPosts = await fetchInstagramMedia();

  if (igPosts.length > 0) {
    console.log(`📸 Instagram: Syncing ${igPosts.length} posts...`);

    for (const post of igPosts) {
      const existingPage = urlToPage[post.url];

      try {
        if (existingPage) {
          await updateInstagramMetrics(existingPage.id, post);
          updated++;
          console.log(`   🔁 ${post.title.slice(0, 40)} — ${post.views.toLocaleString()} views`);
        } else {
          await createInstagramPage(post);
          created++;
          console.log(`   ✅ ${post.title.slice(0, 40)}`);
        }
      } catch (err) {
        errors++;
        console.log(`   ❌ Error: ${err.message}`);
      }

      await new Promise((r) => setTimeout(r, 350));
    }
    console.log("");
  }

  console.log(`✨ Done! Updated: ${updated} | Created: ${created} | Errors: ${errors}`);
  console.log(`Finished: ${new Date().toLocaleString()}`);
}

main().catch((err) => {
  console.error("💥 Fatal error:", err);
  process.exit(1);
});
