#!/usr/bin/env node

/**
 * Content Dashboard - Growth Tracking Database Setup
 * Creates a Growth History database to track daily follower counts and metrics
 *
 * Usage:
 *   1. Make sure your Notion integration has access to the parent page
 *   2. Run: NOTION_TOKEN=secret_xxx NOTION_PAGE_ID=xxx node setup-growth-db.js
 *
 * The script will output the database ID to add to your .env file.
 */

const { Client } = require("@notionhq/client");

const NOTION_TOKEN = process.env.NOTION_TOKEN || process.env.NOTION_API_KEY;
const NOTION_PAGE_ID = process.env.NOTION_PAGE_ID;

if (!NOTION_TOKEN || !NOTION_PAGE_ID) {
  console.error(`
Usage:
  NOTION_TOKEN=secret_xxx NOTION_PAGE_ID=xxx node scripts/setup-growth-db.js

Or if using NOTION_API_KEY:
  NOTION_API_KEY=secret_xxx NOTION_PAGE_ID=xxx node scripts/setup-growth-db.js

Get your token from: notion.so/my-integrations
Get page ID from the URL: notion.so/PAGE_ID?v=...
  `);
  process.exit(1);
}

const notion = new Client({ auth: NOTION_TOKEN });

async function createGrowthDatabase() {
  console.log("📊 Creating Growth History database...\n");

  const response = await notion.databases.create({
    parent: { page_id: NOTION_PAGE_ID },
    title: [{ text: { content: "Growth History" } }],
    properties: {
      // Date - primary identifier for each snapshot
      Date: {
        title: {}
      },

      // TikTok Account-Level Stats
      "TikTok Followers": {
        number: { format: "number" }
      },
      "TikTok Total Likes": {
        number: { format: "number" }
      },
      "TikTok Videos": {
        number: { format: "number" }
      },

      // Instagram Account-Level Stats
      "Instagram Followers": {
        number: { format: "number" }
      },
      "Instagram Posts": {
        number: { format: "number" }
      },

      // Aggregated Post Metrics (sum of all posts at snapshot time)
      "TikTok Views": {
        number: { format: "number" }
      },
      "TikTok Likes": {
        number: { format: "number" }
      },
      "Instagram Views": {
        number: { format: "number" }
      },
      "Instagram Likes": {
        number: { format: "number" }
      },

      // Computed totals
      "Total Followers": {
        formula: {
          expression: 'prop("TikTok Followers") + prop("Instagram Followers")',
        },
      },
      "Total Views": {
        formula: {
          expression: 'prop("TikTok Views") + prop("Instagram Views")',
        },
      },
      "Total Likes": {
        formula: {
          expression: 'prop("TikTok Likes") + prop("Instagram Likes")',
        },
      },
    },
  });

  console.log("✅ Growth History database created successfully!\n");
  console.log("Database ID:", response.id);
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\nAdd this to your .env file:");
  console.log(`NOTION_GROWTH_DATABASE_ID=${response.id.replace(/-/g, "")}`);
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\nAlso ensure these are set:");
  console.log("TIKTOK_USERNAME=your-tiktok-username");
  console.log("IG_USER_ID=your-instagram-user-id  (from Instagram Graph API)");
  console.log("\nNext steps:");
  console.log("1. Copy the database ID above to your .env");
  console.log("2. Run sync to start tracking: npm run sync OR node sync/sync.js");
}

createGrowthDatabase().catch((err) => {
  console.error("❌ Error:", err.message);
  if (err.code === "object_not_found") {
    console.error("\nMake sure:");
    console.error("1. The NOTION_PAGE_ID is correct");
    console.error("2. Your integration has access to that page");
    console.error("   (Share the page with your integration in Notion)");
  }
  process.exit(1);
});
