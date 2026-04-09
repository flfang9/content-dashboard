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
  pillar: ContentPillar;
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
