#!/usr/bin/env node

/**
 * TikTok Token Refresh
 * TikTok access tokens expire every 24 hours.
 * This script refreshes them and writes the new token back to .env
 * Run this BEFORE sync.js, or chain them: node refresh-tiktok-token.js && node sync.js
 */

require("dotenv").config();
const fs = require("fs");
const path = require("path");

async function refreshTikTokToken() {
  const { TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET, TIKTOK_REFRESH_TOKEN } = process.env;

  if (!TIKTOK_REFRESH_TOKEN || !TIKTOK_CLIENT_KEY || !TIKTOK_CLIENT_SECRET) {
    console.log("⚠️  TikTok refresh credentials not set — skipping token refresh");
    return;
  }

  console.log("🔄 Refreshing TikTok access token...");

  const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: TIKTOK_CLIENT_KEY,
      client_secret: TIKTOK_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: TIKTOK_REFRESH_TOKEN,
    }),
  });

  const data = await res.json();

  if (!res.ok || data.error) {
    console.error("❌ TikTok token refresh failed:", data.error_description || data);
    process.exit(1);
  }

  const { access_token, refresh_token } = data;

  // Update .env file in place
  const envPath = path.join(__dirname, ".env");
  let envContent = fs.readFileSync(envPath, "utf8");

  envContent = envContent
    .replace(/^TIKTOK_ACCESS_TOKEN=.*/m, `TIKTOK_ACCESS_TOKEN=${access_token}`)
    .replace(/^TIKTOK_REFRESH_TOKEN=.*/m, `TIKTOK_REFRESH_TOKEN=${refresh_token}`);

  fs.writeFileSync(envPath, envContent);
  console.log("✅ TikTok token refreshed and saved to .env");
}

refreshTikTokToken().catch(console.error);
