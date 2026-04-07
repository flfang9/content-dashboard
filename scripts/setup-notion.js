#!/usr/bin/env node

/**
 * Content Dashboard - Notion Database Setup
 * Creates the Content Calendar database with all required properties
 *
 * Usage:
 *   1. Create a Notion integration at notion.so/my-integrations
 *   2. Share a page with your integration (this is where the database will be created)
 *   3. Run: NOTION_TOKEN=secret_xxx NOTION_PAGE_ID=xxx node setup-notion.js
 */

const { Client } = require("@notionhq/client");

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_PAGE_ID = process.env.NOTION_PAGE_ID;

if (!NOTION_TOKEN || !NOTION_PAGE_ID) {
  console.error(`
Usage:
  NOTION_TOKEN=secret_xxx NOTION_PAGE_ID=xxx node setup-notion.js

Get your token from: notion.so/my-integrations
Get page ID from the URL: notion.so/PAGE_ID?v=...
  `);
  process.exit(1);
}

const notion = new Client({ auth: NOTION_TOKEN });

async function createDatabase() {
  console.log("🔧 Creating Content Calendar database...\n");

  const response = await notion.databases.create({
    parent: { page_id: NOTION_PAGE_ID },
    title: [{ text: { content: "Content Calendar" } }],
    properties: {
      // Title
      Title: { title: {} },

      // Status
      Status: {
        select: {
          options: [
            { name: "Idea", color: "gray" },
            { name: "Drafting", color: "yellow" },
            { name: "Ready", color: "blue" },
            { name: "Scheduled", color: "purple" },
            { name: "Posted", color: "green" },
          ],
        },
      },

      // Content Pillar
      "Content Pillar": {
        select: {
          options: [
            { name: "Educational", color: "blue" },
            { name: "Behind the Scenes", color: "purple" },
            { name: "Entertainment", color: "pink" },
            { name: "Promotional", color: "orange" },
            { name: "User Generated", color: "green" },
            { name: "Trending", color: "red" },
          ],
        },
      },

      // URLs
      "TikTok URL": { url: {} },
      "Instagram URL": { url: {} },

      // TikTok Metrics
      "TikTok Views": { number: { format: "number" } },
      "TikTok Likes": { number: { format: "number" } },
      "TikTok Comments": { number: { format: "number" } },
      "TikTok Shares": { number: { format: "number" } },
      "TikTok Saves": { number: { format: "number" } },

      // Instagram Metrics
      "IG Views": { number: { format: "number" } },
      "IG Likes": { number: { format: "number" } },
      "IG Comments": { number: { format: "number" } },
      "IG Shares": { number: { format: "number" } },
      "IG Saves": { number: { format: "number" } },

      // Dates
      "Post Date": { date: {} },

      // Totals (formulas)
      "Total Views": {
        formula: {
          expression: 'prop("TikTok Views") + prop("IG Views")',
        },
      },
      "Total Likes": {
        formula: {
          expression: 'prop("TikTok Likes") + prop("IG Likes")',
        },
      },
      "Total Comments": {
        formula: {
          expression: 'prop("TikTok Comments") + prop("IG Comments")',
        },
      },
      "Total Shares": {
        formula: {
          expression: 'prop("TikTok Shares") + prop("IG Shares")',
        },
      },
      "Total Engagement": {
        formula: {
          expression:
            'if(prop("Total Views") > 0, round((prop("Total Likes") + prop("Total Comments") + prop("Total Shares")) / prop("Total Views") * 10000) / 100, 0)',
        },
      },
    },
  });

  console.log("✅ Database created successfully!\n");
  console.log("Database ID:", response.id);
  console.log("\nAdd this to your .env file:");
  console.log(`NOTION_DATABASE_ID=${response.id.replace(/-/g, "")}`);
  console.log("\nNext steps:");
  console.log("1. Copy the database ID above to your .env");
  console.log("2. Run: node sync.js");
}

createDatabase().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
