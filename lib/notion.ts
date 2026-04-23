import { Client } from '@notionhq/client';
import { ContentPost, NotionPage } from '@/types';

const notion = new Client({
  auth: process.env.NOTION_API_KEY?.trim(),
});

const databaseId = process.env.NOTION_DATABASE_ID!.trim();
const growthDatabaseId = process.env.NOTION_GROWTH_DATABASE_ID?.trim();

// Growth snapshot type for tracking follower counts over time
export interface GrowthSnapshot {
  date: string;
  tiktokFollowers: number;
  tiktokTotalLikes: number;
  tiktokVideos: number;
  instagramFollowers: number;
  instagramPosts: number;
  tiktokViews: number;
  tiktokLikes: number;
  instagramViews: number;
  instagramLikes: number;
}

function getDateInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find(part => part.type === 'year')?.value;
  const month = parts.find(part => part.type === 'month')?.value;
  const day = parts.find(part => part.type === 'day')?.value;

  if (!year || !month || !day) {
    throw new Error(`Failed to format date for time zone ${timeZone}`);
  }

  return `${year}-${month}-${day}`;
}

export function getDashboardDateString(date: Date = new Date()): string {
  return getDateInTimeZone(date, 'America/Chicago');
}

function buildGrowthSnapshotProperties(data: GrowthSnapshot): Record<string, any> {
  return {
    Date: {
      title: [{ text: { content: data.date } }],
    },
    'TikTok Followers': { number: data.tiktokFollowers || null },
    'TikTok Total Likes': { number: data.tiktokTotalLikes || null },
    'TikTok Videos': { number: data.tiktokVideos || null },
    'Instagram Followers': { number: data.instagramFollowers || null },
    'Instagram Posts': { number: data.instagramPosts || null },
    'TikTok Views': { number: data.tiktokViews || null },
    'TikTok Likes': { number: data.tiktokLikes || null },
    'Instagram Views': { number: data.instagramViews || null },
    'Instagram Likes': { number: data.instagramLikes || null },
  };
}

// Helper to extract property values from Notion pages
function getPropertyValue(property: any): any {
  if (!property) return null;

  switch (property.type) {
    case 'title':
      return property.title?.[0]?.plain_text || '';
    case 'rich_text':
      return property.rich_text?.[0]?.plain_text || '';
    case 'select':
      return property.select?.name || null;
    case 'multi_select':
      return property.multi_select?.map((s: any) => s.name) || [];
    case 'date':
      return property.date?.start || null;
    case 'url':
      return property.url || null;
    case 'number':
      return property.number;
    case 'formula':
      return property.formula?.number ?? property.formula?.string ?? null;
    case 'checkbox':
      return property.checkbox || false;
    default:
      return null;
  }
}

// Transform Notion page to ContentPost
function pageToPost(page: any): ContentPost {
  const props = page.properties;

  // Get both URLs
  const tiktokUrl = getPropertyValue(props['TikTok URL']);
  const igUrl = getPropertyValue(props['Instagram URL']);

  // Primary platform (for display) - prefer TikTok if both exist
  const platform = tiktokUrl ? 'TikTok' : igUrl ? 'Instagram' : 'TikTok';

  // Get combined metrics (sum of both platforms)
  const tiktokViews = getPropertyValue(props['TikTok Views']) || 0;
  const igViews = getPropertyValue(props['IG Views']) || 0;
  const tiktokLikes = getPropertyValue(props['TikTok Likes']) || 0;
  const igLikes = getPropertyValue(props['IG Likes']) || 0;
  const tiktokComments = getPropertyValue(props['TikTok Comments']) || 0;
  const igComments = getPropertyValue(props['IG Comments']) || 0;
  const tiktokShares = getPropertyValue(props['TikTok Shares']) || 0;
  const igShares = getPropertyValue(props['IG Shares']) || 0;
  const igSaves = getPropertyValue(props['IG Saves']) || 0;
  const tiktokSaves = getPropertyValue(props['TikTok Saves']) || 0;

  // Sum metrics from both platforms
  const views = tiktokViews + igViews;
  const likes = tiktokLikes + igLikes;
  const comments = tiktokComments + igComments;
  const shares = tiktokShares + igShares;
  const saves = igSaves + tiktokSaves;

  return {
    id: page.id,
    title: getPropertyValue(props['Title']) || getPropertyValue(props['Name']) || 'Untitled',
    status: getPropertyValue(props['Status']) || 'Idea',
    pillar: getPropertyValue(props['Content Pillar']) || 'Educational',
    platform,
    hook: getPropertyValue(props['Hook']) || '',
    caption: getPropertyValue(props['Caption']) || '',
    cta: getPropertyValue(props['CTA']) || '',
    postDate: getPropertyValue(props['Post Date']),
    postUrl: tiktokUrl || igUrl,

    // Store both URLs for sync
    tiktokUrl,
    igUrl,

    // Metrics (combined from both platforms)
    views,
    likes,
    comments,
    shares,
    saves,
    // Use Calculated Engagement (stored as decimal, e.g. 0.0843 for 8.43%)
    // Multiply by 100 to get percentage for display
    engagementRate: (() => {
      const calculated = getPropertyValue(props['Calculated Engagement']);
      if (calculated !== null && calculated !== undefined) {
        return calculated * 100; // Convert 0.0843 to 8.43
      }
      return getPropertyValue(props['Total Engagement']); // Fallback to old formula
    })(),

    // Platform-specific metrics (for filtering)
    tiktokViews,
    tiktokLikes,
    tiktokComments,
    tiktokShares,
    tiktokSaves,
    igViews,
    igLikes,
    igComments,
    igShares,
    igSaves,

    // Metadata
    createdAt: page.created_time,
    lastSynced: getPropertyValue(props['Last Synced']),
  };
}

// Fetch all posts from Notion
export async function fetchAllPosts(): Promise<ContentPost[]> {
  const pages: any[] = [];
  let cursor: string | undefined;

  do {
    const response: any = await notion.databases.query({
      database_id: databaseId,
      start_cursor: cursor,
      sorts: [
        {
          property: 'Post Date',
          direction: 'descending',
        },
      ],
    });

    pages.push(...response.results);
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);

  return pages.map(pageToPost);
}

// Fetch only posted content that needs metric syncing
export async function fetchPostedForSync(): Promise<ContentPost[]> {
  const response = await notion.databases.query({
    database_id: databaseId,
    filter: {
      and: [
        {
          property: 'Status',
          select: {
            equals: 'Posted',
          },
        },
        {
          or: [
            {
              property: 'TikTok URL',
              url: {
                is_not_empty: true,
              },
            },
            {
              property: 'Instagram URL',
              url: {
                is_not_empty: true,
              },
            },
          ],
        },
      ],
    },
  });

  return response.results.map(pageToPost);
}

// Update metrics for a post
export async function updatePostMetrics(
  pageId: string,
  platform: 'TikTok' | 'Instagram',
  metrics: {
    views?: number;
    likes?: number;
    comments?: number;
    shares?: number;
    saves?: number;
  }
): Promise<void> {
  const properties: Record<string, any> = {};

  // Helper to safely convert to number
  const toNum = (val: any): number | null => {
    if (val === undefined || val === null) return null;
    const num = Number(val);
    return isNaN(num) ? null : num;
  };

  // Use platform-specific property names
  const prefix = platform === 'TikTok' ? 'TikTok' : 'IG';

  if (metrics.views !== undefined) {
    properties[`${prefix} Views`] = { number: toNum(metrics.views) };
  }
  if (metrics.likes !== undefined) {
    properties[`${prefix} Likes`] = { number: toNum(metrics.likes) };
  }
  if (metrics.comments !== undefined) {
    properties[`${prefix} Comments`] = { number: toNum(metrics.comments) };
  }
  if (metrics.shares !== undefined) {
    properties[`${prefix} Shares`] = { number: toNum(metrics.shares) };
  }
  if (metrics.saves !== undefined) {
    properties[`${prefix === 'TikTok' ? 'TikTok' : 'IG'} Saves`] = { number: toNum(metrics.saves) };
  }
  properties['Last Synced'] = { date: { start: new Date().toISOString() } };

  console.log(`Updating ${platform} metrics for page ${pageId}:`, properties);

  await notion.pages.update({
    page_id: pageId,
    properties,
  });
}

// Calculate and update engagement rate for a post
export async function updateEngagementRate(pageId: string): Promise<void> {
  try {
    // First, fetch current metrics from the page
    const page = await notion.pages.retrieve({ page_id: pageId }) as any;
    const props = page.properties;

    const tiktokViews = props['TikTok Views']?.number || 0;
    const igViews = props['IG Views']?.number || 0;
    const tiktokLikes = props['TikTok Likes']?.number || 0;
    const igLikes = props['IG Likes']?.number || 0;
    const tiktokComments = props['TikTok Comments']?.number || 0;
    const igComments = props['IG Comments']?.number || 0;
    const tiktokShares = props['TikTok Shares']?.number || 0;
    const igShares = props['IG Shares']?.number || 0;

    const igSaves = props['IG Saves']?.number || 0;
    const tiktokSaves = props['TikTok Saves']?.number || 0;

    const totalViews = tiktokViews + igViews;
    const totalEngagements = tiktokLikes + igLikes + tiktokComments + igComments + tiktokShares + igShares + igSaves + tiktokSaves;

    // Calculate engagement rate as decimal (Notion percent format expects 0.0843 for 8.43%)
    const engagementRate = totalViews > 0 ? totalEngagements / totalViews : 0;

    // Round to 4 decimal places
    const roundedRate = Math.round(engagementRate * 10000) / 10000;

    console.log(`Updating engagement rate for ${pageId}: ${(roundedRate * 100).toFixed(2)}% (${totalEngagements} engagements / ${totalViews} views)`);

    // Update the Calculated Engagement field (create if using number field)
    await notion.pages.update({
      page_id: pageId,
      properties: {
        'Calculated Engagement': { number: roundedRate },
      },
    });
  } catch (error) {
    console.error('Error updating engagement rate:', error);
    // Don't throw - engagement calculation is not critical
  }
}

// Calculate dashboard stats
export function calculateStats(posts: ContentPost[]) {
  const postedPosts = posts.filter(p => p.status === 'Posted');

  const totalViews = postedPosts.reduce((sum, p) => sum + (p.views || 0), 0);
  const totalLikes = postedPosts.reduce((sum, p) => sum + (p.likes || 0), 0);

  const engagementRates = postedPosts
    .filter(p => p.engagementRate !== null)
    .map(p => p.engagementRate!);

  const avgEngagementRate = engagementRates.length > 0
    ? engagementRates.reduce((a, b) => a + b, 0) / engagementRates.length
    : 0;

  // Posts this week
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const postsThisWeek = postedPosts.filter(p =>
    p.postDate && new Date(p.postDate) >= weekAgo
  ).length;

  // Top performer by engagement rate
  const topPerformer = postedPosts
    .filter(p => p.engagementRate !== null)
    .sort((a, b) => (b.engagementRate || 0) - (a.engagementRate || 0))[0] || null;

  return {
    totalPosts: postedPosts.length,
    totalViews,
    totalLikes,
    avgEngagementRate,
    postsThisWeek,
    topPerformer,
  };
}

// ─── Instagram Auto-Import Functions ───────────────────────────────────────────

// Extract Instagram shortcode from URL for deduplication
function extractIgShortcode(url: string): string | null {
  const match = url.match(/\/(p|reel|tv)\/([A-Za-z0-9_-]+)/);
  return match ? match[2] : null;
}

// Get all existing Instagram shortcodes in the database (for deduplication)
export async function getExistingInstagramShortcodes(): Promise<Set<string>> {
  const shortcodes = new Set<string>();
  let cursor: string | undefined;

  do {
    const response: any = await notion.databases.query({
      database_id: databaseId,
      start_cursor: cursor,
      filter: {
        property: 'Instagram URL',
        url: {
          is_not_empty: true,
        },
      },
    });

    for (const page of response.results) {
      const url = getPropertyValue(page.properties['Instagram URL']);
      if (url) {
        const shortcode = extractIgShortcode(url);
        if (shortcode) shortcodes.add(shortcode);
      }
    }

    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);

  return shortcodes;
}

// Create a new Instagram post entry
export async function createInstagramPost(post: {
  title: string;
  url: string;
  postDate?: string;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
}): Promise<string> {
  const properties: Record<string, any> = {
    Title: { title: [{ text: { content: post.title } }] },
    Status: { select: { name: 'Posted' } },
    'Instagram URL': { url: post.url },
  };

  if (post.postDate) {
    properties['Post Date'] = { date: { start: post.postDate } };
  }
  if (post.views !== undefined) {
    properties['IG Views'] = { number: post.views };
  }
  if (post.likes !== undefined) {
    properties['IG Likes'] = { number: post.likes };
  }
  if (post.comments !== undefined) {
    properties['IG Comments'] = { number: post.comments };
  }
  if (post.shares !== undefined) {
    properties['IG Shares'] = { number: post.shares };
  }
  if (post.saves !== undefined) {
    properties['IG Saves'] = { number: post.saves };
  }

  const response = await notion.pages.create({
    parent: { database_id: databaseId },
    properties,
  });

  return response.id;
}

// ─── Growth Tracking Functions ─────────────────────────────────────────────────

// Create a daily growth snapshot
export async function createGrowthSnapshot(data: GrowthSnapshot): Promise<void> {
  if (!growthDatabaseId) {
    console.log('NOTION_GROWTH_DATABASE_ID not set, skipping growth snapshot');
    return;
  }

  try {
    await notion.pages.create({
      parent: { database_id: growthDatabaseId },
      properties: buildGrowthSnapshotProperties(data),
    });

    console.log(`Growth snapshot created for ${data.date}`);
  } catch (error) {
    console.error('Error creating growth snapshot:', error);
    throw error;
  }
}

export async function upsertGrowthSnapshot(data: GrowthSnapshot): Promise<'created' | 'updated'> {
  if (!growthDatabaseId) {
    console.log('NOTION_GROWTH_DATABASE_ID not set, skipping growth snapshot upsert');
    return 'created';
  }

  const response = await notion.databases.query({
    database_id: growthDatabaseId,
    filter: {
      property: 'Date',
      title: {
        equals: data.date,
      },
    },
    page_size: 1,
  });

  const existingPage = response.results[0] as any;
  if (existingPage) {
    await notion.pages.update({
      page_id: existingPage.id,
      properties: buildGrowthSnapshotProperties(data),
    });
    console.log(`Growth snapshot updated for ${data.date}`);
    return 'updated';
  }

  await createGrowthSnapshot(data);
  return 'created';
}

// Fetch growth history for the last N days
export async function fetchGrowthHistory(days: number = 30): Promise<GrowthSnapshot[]> {
  if (!growthDatabaseId) {
    console.log('NOTION_GROWTH_DATABASE_ID not set, returning empty growth history');
    return [];
  }

  try {
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const response = await notion.databases.query({
      database_id: growthDatabaseId,
      sorts: [
        {
          property: 'Date',
          direction: 'ascending',
        },
      ],
      page_size: Math.min(days + 1, 100), // Notion max is 100
    });

    return response.results.map((page: any) => {
      const props = page.properties;
      return {
        date: getPropertyValue(props['Date']) || '',
        tiktokFollowers: getPropertyValue(props['TikTok Followers']) || 0,
        tiktokTotalLikes: getPropertyValue(props['TikTok Total Likes']) || 0,
        tiktokVideos: getPropertyValue(props['TikTok Videos']) || 0,
        instagramFollowers: getPropertyValue(props['Instagram Followers']) || 0,
        instagramPosts: getPropertyValue(props['Instagram Posts']) || 0,
        tiktokViews: getPropertyValue(props['TikTok Views']) || 0,
        tiktokLikes: getPropertyValue(props['TikTok Likes']) || 0,
        instagramViews: getPropertyValue(props['Instagram Views']) || 0,
        instagramLikes: getPropertyValue(props['Instagram Likes']) || 0,
      };
    });
  } catch (error) {
    console.error('Error fetching growth history:', error);
    return [];
  }
}

// Check if a snapshot already exists for today (avoid duplicates)
export async function hasSnapshotForToday(): Promise<boolean> {
  if (!growthDatabaseId) return false;

  const today = getDashboardDateString();

  try {
    const response = await notion.databases.query({
      database_id: growthDatabaseId,
      filter: {
        property: 'Date',
        title: {
          equals: today,
        },
      },
      page_size: 1,
    });

    return response.results.length > 0;
  } catch (error) {
    console.error('Error checking for existing snapshot:', error);
    return false;
  }
}
