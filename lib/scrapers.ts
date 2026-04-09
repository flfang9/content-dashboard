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

// Cache for Instagram media list (avoid repeated API calls)
let igMediaCache: { data: any[]; fetchedAt: number } | null = null;
const IG_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Fetch all media from Instagram account
async function fetchInstagramMedia(accessToken: string): Promise<any[]> {
  // Check cache
  if (igMediaCache && Date.now() - igMediaCache.fetchedAt < IG_CACHE_TTL) {
    return igMediaCache.data;
  }

  const igUserId = process.env.IG_USER_ID;
  if (!igUserId) {
    console.error('IG_USER_ID not set - required for Instagram Graph API');
    return [];
  }

  try {
    // Fetch user's media with basic info including media_type for insights
    const url = `https://graph.facebook.com/v19.0/${igUserId}/media?fields=id,shortcode,permalink,caption,media_type,timestamp,like_count,comments_count&limit=50&access_token=${accessToken}`;
    const response = await fetch(url);

    if (!response.ok) {
      const error = await response.text();
      console.error('Instagram media fetch error:', error);
      return [];
    }

    const data = await response.json();
    console.log(`Fetched ${data.data?.length || 0} Instagram media items`);
    igMediaCache = { data: data.data || [], fetchedAt: Date.now() };
    return igMediaCache.data;
  } catch (error) {
    console.error('Instagram media fetch error:', error);
    return [];
  }
}

// Get insights for a specific media item
async function fetchInstagramInsights(mediaId: string, mediaType: string, accessToken: string): Promise<ScrapedMetrics | null> {
  try {
    // Different metrics for different media types
    // Reels: reach, saved, shares, total_interactions
    // Images/Carousels: impressions, reach, saved
    const isReel = mediaType === 'VIDEO' || mediaType === 'REELS';
    const metrics = isReel
      ? 'reach,saved,shares,total_interactions'
      : 'impressions,reach,saved';

    const url = `https://graph.facebook.com/v19.0/${mediaId}/insights?metric=${metrics}&access_token=${accessToken}`;
    const response = await fetch(url);

    if (!response.ok) {
      // Insights might not be available for all media types
      const errorText = await response.text();
      console.log(`No insights available for media ${mediaId}:`, errorText);
      return null;
    }

    const data = await response.json();
    const insights = data.data || [];

    const reach = insights.find((i: any) => i.name === 'reach')?.values?.[0]?.value;
    const impressions = insights.find((i: any) => i.name === 'impressions')?.values?.[0]?.value;
    const saved = insights.find((i: any) => i.name === 'saved')?.values?.[0]?.value;
    const shares = insights.find((i: any) => i.name === 'shares')?.values?.[0]?.value;

    return {
      views: impressions || reach, // Use impressions if available, otherwise reach
      saves: saved,
      shares: shares,
    };
  } catch (error) {
    console.error('Instagram insights error:', error);
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

  const shortcode = extractInstagramPostId(url);
  if (!shortcode) {
    console.error('Could not extract Instagram shortcode from:', url);
    return null;
  }

  try {
    // Fetch all media and find the one matching our shortcode
    const allMedia = await fetchInstagramMedia(accessToken);
    const media = allMedia.find(m =>
      m.shortcode === shortcode || m.permalink?.includes(shortcode)
    );

    if (!media) {
      console.error(`Instagram media not found for shortcode: ${shortcode}`);
      console.log('Available shortcodes:', allMedia.map(m => m.shortcode).join(', '));
      return null;
    }

    // Get basic metrics from media object
    const metrics: ScrapedMetrics = {
      likes: media.like_count || 0,
      comments: media.comments_count || 0,
    };

    // Try to get additional insights (views, saves, shares)
    const insights = await fetchInstagramInsights(media.id, media.media_type, accessToken);
    if (insights) {
      metrics.views = insights.views;
      metrics.saves = insights.saves;
      metrics.shares = insights.shares;
    }

    return metrics;
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
