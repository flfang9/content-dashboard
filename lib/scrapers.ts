// Metrics scraping for TikTok and Instagram

interface ScrapedMetrics {
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
}

// Extract TikTok video ID from URL
function extractTikTokVideoId(url: string): string | null {
  // Formats:
  // https://www.tiktok.com/@username/video/1234567890
  // https://vm.tiktok.com/ABC123/
  const videoMatch = url.match(/video\/(\d+)/);
  if (videoMatch) return videoMatch[1];

  // Short URL - we'd need to follow redirect
  return null;
}

// Extract Instagram post ID from URL
function extractInstagramPostId(url: string): string | null {
  // Formats:
  // https://www.instagram.com/p/ABC123/
  // https://www.instagram.com/reel/ABC123/
  const match = url.match(/\/(p|reel|tv)\/([A-Za-z0-9_-]+)/);
  return match ? match[2] : null;
}

// Scrape TikTok metrics using oEmbed API (public, no auth needed)
export async function scrapeTikTok(url: string): Promise<ScrapedMetrics | null> {
  try {
    // TikTok oEmbed endpoint
    const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
    const response = await fetch(oembedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ContentDashboard/1.0)',
      },
    });

    if (!response.ok) {
      console.error(`TikTok oEmbed failed: ${response.status}`);
      return null;
    }

    const data = await response.json();

    // oEmbed doesn't give us metrics directly, but we can try page scraping
    // For now, return null and fall back to manual entry or TikTok API
    // The oEmbed is mainly useful for thumbnails and embeds

    // Alternative: Scrape the actual page for metrics
    return await scrapeTikTokPage(url);
  } catch (error) {
    console.error('TikTok scraping error:', error);
    return null;
  }
}

// Scrape TikTok page directly (less reliable, may need updates)
async function scrapeTikTokPage(url: string): Promise<ScrapedMetrics | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) return null;

    const html = await response.text();

    // TikTok embeds JSON data in script tags
    const scriptMatch = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([^<]+)<\/script>/);
    if (!scriptMatch) return null;

    const jsonData = JSON.parse(scriptMatch[1]);
    const videoData = jsonData?.['__DEFAULT_SCOPE__']?.['webapp.video-detail']?.['itemInfo']?.['itemStruct'];

    if (!videoData?.stats) return null;

    return {
      views: videoData.stats.playCount,
      likes: videoData.stats.diggCount,
      comments: videoData.stats.commentCount,
      shares: videoData.stats.shareCount,
      saves: videoData.stats.collectCount,
    };
  } catch (error) {
    console.error('TikTok page scraping error:', error);
    return null;
  }
}

// Scrape Instagram metrics using Graph API (requires META_ACCESS_TOKEN)
export async function scrapeInstagram(url: string): Promise<ScrapedMetrics | null> {
  const accessToken = process.env.META_ACCESS_TOKEN;

  if (!accessToken) {
    console.log('No META_ACCESS_TOKEN, skipping Instagram sync');
    return null;
  }

  const postId = extractInstagramPostId(url);
  if (!postId) {
    console.error('Could not extract Instagram post ID from:', url);
    return null;
  }

  try {
    // Instagram Graph API - requires Business/Creator account
    // First, we need the media ID from the shortcode
    const mediaResponse = await fetch(
      `https://graph.facebook.com/v19.0/ig_hashtag_search?q=${postId}&access_token=${accessToken}`
    );

    // Actually, for owned media, use the Instagram Insights API
    // This requires the instagram_basic and instagram_manage_insights permissions

    // For a simpler approach with owned media:
    const insightsUrl = `https://graph.facebook.com/v19.0/${postId}?fields=like_count,comments_count,insights.metric(reach,impressions,saved)&access_token=${accessToken}`;

    const response = await fetch(insightsUrl);

    if (!response.ok) {
      const error = await response.text();
      console.error('Instagram API error:', error);
      return null;
    }

    const data = await response.json();

    // Extract insights
    const insights = data.insights?.data || [];
    const reach = insights.find((i: any) => i.name === 'reach')?.values?.[0]?.value;
    const impressions = insights.find((i: any) => i.name === 'impressions')?.values?.[0]?.value;
    const saved = insights.find((i: any) => i.name === 'saved')?.values?.[0]?.value;

    return {
      views: impressions || reach,
      likes: data.like_count,
      comments: data.comments_count,
      saves: saved,
    };
  } catch (error) {
    console.error('Instagram scraping error:', error);
    return null;
  }
}

// Detect platform from URL and scrape accordingly
export async function scrapeMetrics(url: string): Promise<ScrapedMetrics | null> {
  if (url.includes('tiktok.com')) {
    return scrapeTikTok(url);
  }

  if (url.includes('instagram.com')) {
    return scrapeInstagram(url);
  }

  // YouTube, Twitter, etc. can be added here
  console.log('Unsupported platform for URL:', url);
  return null;
}
