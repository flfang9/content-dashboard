import { Client } from '@notionhq/client';
import { ContentPost, NotionPage } from '@/types';

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const databaseId = process.env.NOTION_DATABASE_ID!;

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

  // Determine platform from which URL is set
  const tiktokUrl = getPropertyValue(props['TikTok URL']);
  const igUrl = getPropertyValue(props['Instagram URL']);
  const platform = tiktokUrl ? 'TikTok' : igUrl ? 'Instagram' : 'TikTok';

  // Get metrics based on platform, with Total as fallback
  const views = getPropertyValue(props['Total Views'])
    || getPropertyValue(props['TikTok Views'])
    || getPropertyValue(props['IG Views'])
    || 0;
  const likes = getPropertyValue(props['Total Likes'])
    || getPropertyValue(props['TikTok Likes'])
    || getPropertyValue(props['IG Likes'])
    || 0;
  const comments = getPropertyValue(props['Total Comments'])
    || getPropertyValue(props['TikTok Comments'])
    || getPropertyValue(props['IG Comments'])
    || 0;
  const shares = getPropertyValue(props['Total Shares'])
    || getPropertyValue(props['TikTok Shares'])
    || getPropertyValue(props['IG Shares'])
    || 0;
  const saves = getPropertyValue(props['IG Saves']) || 0;

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

    // Metrics
    views,
    likes,
    comments,
    shares,
    saves,
    engagementRate: getPropertyValue(props['Total Engagement']),

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
          property: 'Post URL',
          url: {
            is_not_empty: true,
          },
        },
      ],
    },
  });

  return response.results.map(pageToPost);
}

// Update metrics for a post
export async function updatePostMetrics(
  pageId: string,
  metrics: {
    views?: number;
    likes?: number;
    comments?: number;
    shares?: number;
    saves?: number;
  }
): Promise<void> {
  const properties: Record<string, any> = {
    'Last Synced': {
      date: {
        start: new Date().toISOString(),
      },
    },
  };

  if (metrics.views !== undefined) {
    properties['Views'] = { number: metrics.views };
  }
  if (metrics.likes !== undefined) {
    properties['Likes'] = { number: metrics.likes };
  }
  if (metrics.comments !== undefined) {
    properties['Comments'] = { number: metrics.comments };
  }
  if (metrics.shares !== undefined) {
    properties['Shares'] = { number: metrics.shares };
  }
  if (metrics.saves !== undefined) {
    properties['Saves'] = { number: metrics.saves };
  }

  await notion.pages.update({
    page_id: pageId,
    properties,
  });
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
