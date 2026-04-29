export type ContentStatus = 'Idea' | 'Drafting' | 'Ready' | 'Scheduled' | 'Posted';

export type ContentPillar =
  | 'Educational'
  | 'Behind the Scenes'
  | 'Entertainment'
  | 'Promotional'
  | 'User Generated'
  | 'Trending';

export type Platform = 'TikTok' | 'Instagram' | 'YouTube' | 'Twitter' | 'LinkedIn';

export interface ContentPost {
  id: string;
  title: string;
  status: ContentStatus;
  pillars: ContentPillar[];
  platform: Platform;
  hook: string;
  caption: string;
  cta: string;
  postDate: string | null;
  postUrl: string | null;

  // Platform-specific URLs (for multi-platform posts)
  tiktokUrl?: string | null;
  igUrl?: string | null;

  // Metrics (combined from all platforms)
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  engagementRate: number | null;

  // Platform-specific metrics (for filtering)
  tiktokViews?: number;
  tiktokLikes?: number;
  tiktokComments?: number;
  tiktokShares?: number;
  tiktokSaves?: number;
  igViews?: number;
  igLikes?: number;
  igComments?: number;
  igShares?: number;
  igSaves?: number;

  // Metadata
  createdAt: string;
  lastSynced: string | null;
}

export interface DashboardStats {
  totalPosts: number;
  totalViews: number;
  totalLikes: number;
  avgEngagementRate: number;
  postsThisWeek: number;
  topPerformer: ContentPost | null;
}

export interface NotionPage {
  id: string;
  properties: Record<string, any>;
  created_time: string;
}

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

export interface GrowthData {
  snapshots: GrowthSnapshot[];
  latest: GrowthSnapshot | null;
  comparisons: {
    days7: {
      tiktokFollowers: {
        current: number;
        previous: number;
        change: number;
        changePercent: number;
      };
      instagramFollowers: {
        current: number;
        previous: number;
        change: number;
        changePercent: number;
      };
    } | null;
    days30: {
      tiktokFollowers: {
        current: number;
        previous: number;
        change: number;
        changePercent: number;
      };
      instagramFollowers: {
        current: number;
        previous: number;
        change: number;
        changePercent: number;
      };
    } | null;
  };
  weekOverWeek: {
    tiktokFollowers: {
      current: number;
      previous: number;
      change: number;
      changePercent: number;
    };
    instagramFollowers: {
      current: number;
      previous: number;
      change: number;
      changePercent: number;
    };
  } | null;
  fetchedAt: string;
}
