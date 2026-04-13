// Metrics scraping for TikTok and Instagram

interface ScrapedMetrics {
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
}

// Account-level stats for growth tracking
export interface TikTokProfileStats {
  followers: number;
  following: number;
  likes: number;
  videos: number;
}

export interface InstagramAccountStats {
  followers: number;
  postsCount: number;
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

// Scrape TikTok page directly (supports both video and photo posts)
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
    const defaultScope = jsonData?.['__DEFAULT_SCOPE__'];

    // Try video-detail first, then photo-detail for carousel/slideshow posts
    const itemData =
      defaultScope?.['webapp.video-detail']?.['itemInfo']?.['itemStruct'] ||
      defaultScope?.['webapp.photo-detail']?.['itemInfo']?.['itemStruct'] ||
      defaultScope?.['webapp.slideshow-detail']?.['itemInfo']?.['itemStruct'];

    if (!itemData?.stats) {
      console.log('TikTok: No stats found in page data');
      return null;
    }

    return {
      views: itemData.stats.playCount || itemData.stats.viewCount || 0,
      likes: itemData.stats.diggCount || itemData.stats.likeCount || 0,
      comments: itemData.stats.commentCount || 0,
      shares: itemData.stats.shareCount || 0,
      saves: itemData.stats.collectCount || itemData.stats.saveCount || 0,
    };
  } catch (error) {
    console.error('TikTok page scraping error:', error);
    return null;
  }
}

// Cache for Instagram media list (avoid repeated API calls)
let igMediaCache: { data: any[]; fetchedAt: number } | null = null;
const IG_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Clear the Instagram media cache (call before sync to get fresh data)
export function clearInstagramCache(): void {
  igMediaCache = null;
}

// Instagram media item with metrics
export interface InstagramMediaItem {
  id: string;
  shortcode: string;
  permalink: string;
  caption: string | null;
  mediaType: string;
  timestamp: string;
  likes: number;
  comments: number;
  views?: number;
  saves?: number;
  shares?: number;
}

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

// Fetch all Instagram media with full metrics (for auto-import)
export async function fetchAllInstagramMedia(): Promise<InstagramMediaItem[]> {
  const accessToken = process.env.META_ACCESS_TOKEN;
  if (!accessToken) {
    console.log('No META_ACCESS_TOKEN, skipping Instagram fetch');
    return [];
  }

  // Clear cache to get fresh data
  clearInstagramCache();

  const allMedia = await fetchInstagramMedia(accessToken);
  const enrichedMedia: InstagramMediaItem[] = [];

  for (const media of allMedia) {
    const item: InstagramMediaItem = {
      id: media.id,
      shortcode: media.shortcode,
      permalink: media.permalink,
      caption: media.caption || null,
      mediaType: media.media_type,
      timestamp: media.timestamp,
      likes: media.like_count || 0,
      comments: media.comments_count || 0,
    };

    // Fetch insights for this media
    const insights = await fetchInstagramInsights(media.id, media.media_type, accessToken);
    if (insights) {
      item.views = insights.views;
      item.saves = insights.saves;
      item.shares = insights.shares;
    }

    enrichedMedia.push(item);

    // Rate limit
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  return enrichedMedia;
}

// Get insights for a specific media item
async function fetchInstagramInsights(mediaId: string, mediaType: string, accessToken: string): Promise<ScrapedMetrics | null> {
  try {
    // Different metrics for different media types
    // As of v22.0+: plays/impressions are deprecated
    // Use reach for views (unique accounts that saw the content)
    // Reels/Videos: reach, saved, shares
    // Images/Carousels: reach, saved
    const isVideo = mediaType === 'VIDEO' || mediaType === 'REELS';
    const metrics = isVideo
      ? 'reach,saved,shares'
      : 'reach,saved';

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
    const saved = insights.find((i: any) => i.name === 'saved')?.values?.[0]?.value;
    const shares = insights.find((i: any) => i.name === 'shares')?.values?.[0]?.value;

    return {
      // Use reach as views (unique accounts that saw the content)
      views: reach || 0,
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

    console.log(`Instagram metrics for ${shortcode}:`, metrics);
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

// ─── TikTok Profile Scraper (Account-Level Stats) ─────────────────────────────

export async function scrapeTikTokProfile(username: string): Promise<TikTokProfileStats | null> {
  try {
    const url = `https://www.tiktok.com/@${username}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    if (!response.ok) {
      console.error(`TikTok profile fetch failed: ${response.status}`);
      return null;
    }

    const html = await response.text();

    const scriptMatch = html.match(
      /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([^<]+)<\/script>/
    );

    if (!scriptMatch) {
      console.error('TikTok profile: Could not find data script');
      return null;
    }

    const jsonData = JSON.parse(scriptMatch[1]);
    const userInfo =
      jsonData?.['__DEFAULT_SCOPE__']?.['webapp.user-detail']?.['userInfo'];

    if (!userInfo?.stats) {
      console.error('TikTok profile: No stats found in data');
      return null;
    }

    return {
      followers: userInfo.stats.followerCount || 0,
      following: userInfo.stats.followingCount || 0,
      likes: userInfo.stats.heartCount || 0,
      videos: userInfo.stats.videoCount || 0,
    };
  } catch (error) {
    console.error('TikTok profile scraping error:', error);
    return null;
  }
}

// ─── Instagram Account Stats (via Graph API) ─────────────────────────────────

export async function getInstagramAccountStats(): Promise<InstagramAccountStats | null> {
  const accessToken = process.env.META_ACCESS_TOKEN;
  const igUserId = process.env.IG_USER_ID;

  if (!accessToken || !igUserId) {
    console.log('No META_ACCESS_TOKEN or IG_USER_ID, skipping Instagram account stats');
    return null;
  }

  try {
    // Fetch account info with followers_count and media_count
    const url = `https://graph.facebook.com/v19.0/${igUserId}?fields=followers_count,media_count&access_token=${accessToken}`;
    const response = await fetch(url);

    if (!response.ok) {
      const error = await response.text();
      console.error('Instagram account stats error:', error);
      return null;
    }

    const data = await response.json();

    return {
      followers: data.followers_count || 0,
      postsCount: data.media_count || 0,
    };
  } catch (error) {
    console.error('Instagram account stats error:', error);
    return null;
  }
}
