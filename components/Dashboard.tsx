'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ComposedChart,
  Legend,
} from 'recharts';
import { ContentPost, GrowthData } from '@/types';

function getTikTokPostMeta(url: string): { id: string | null; type: 'video' | 'photo' | null } {
  const videoMatch = url.match(/video\/(\d+)/);
  if (videoMatch) {
    return { id: videoMatch[1], type: 'video' };
  }

  const photoMatch = url.match(/photo\/(\d+)/);
  if (photoMatch) {
    return { id: photoMatch[1], type: 'photo' };
  }

  return { id: null, type: null };
}

// Video Modal Component
function VideoModal({
  post,
  onClose,
}: {
  post: ContentPost;
  onClose: () => void;
}) {
  const hasBothPlatforms = post.tiktokUrl && post.igUrl;
  const [activePlatform, setActivePlatform] = useState<'TikTok' | 'Instagram'>(
    post.tiktokUrl ? 'TikTok' : 'Instagram'
  );

  const activeUrl = activePlatform === 'TikTok' ? post.tiktokUrl : post.igUrl;
  const tiktokPostMeta = activeUrl && activePlatform === 'TikTok'
    ? getTikTokPostMeta(activeUrl)
    : { id: null, type: null as 'video' | 'photo' | null };

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#141414] border border-[#262626] rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#262626]">
          <div className="flex items-center gap-3">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: PLATFORM_COLORS[activePlatform] || '#666' }}
            />
            <div>
              <p className="text-white font-medium truncate max-w-[250px]">{post.title}</p>
              {hasBothPlatforms ? (
                <div className="flex gap-1 mt-1">
                  <button
                    onClick={() => setActivePlatform('TikTok')}
                    className={`text-[10px] px-2 py-0.5 rounded transition-colors ${
                      activePlatform === 'TikTok'
                        ? 'bg-[#00f2ea] text-black'
                        : 'bg-[#262626] text-gray-400 hover:text-white'
                    }`}
                  >
                    TikTok
                  </button>
                  <button
                    onClick={() => setActivePlatform('Instagram')}
                    className={`text-[10px] px-2 py-0.5 rounded transition-colors ${
                      activePlatform === 'Instagram'
                        ? 'bg-[#e4405f] text-white'
                        : 'bg-[#262626] text-gray-400 hover:text-white'
                    }`}
                  >
                    Instagram
                  </button>
                </div>
              ) : (
                <p className="text-xs text-gray-500">{activePlatform}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Video Embed */}
        <div className="aspect-[9/16] bg-black">
          {activePlatform === 'TikTok' && tiktokPostMeta.type === 'video' && tiktokPostMeta.id ? (
            <iframe
              key={`tiktok-${tiktokPostMeta.id}`}
              src={`https://www.tiktok.com/embed/v2/${tiktokPostMeta.id}`}
              className="w-full h-full"
              allowFullScreen
              allow="encrypted-media"
            />
          ) : activePlatform === 'TikTok' && tiktokPostMeta.type === 'photo' ? (
            <div className="w-full h-full flex items-center justify-center p-6 bg-gradient-to-br from-[#101010] via-[#151515] to-[#0a0a0a]">
              <div className="w-full max-w-sm rounded-2xl border border-[#262626] bg-[#141414] p-6 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#00f2ea]/15">
                  <svg className="h-7 w-7 text-[#00f2ea]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-8h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="mb-2 text-lg font-semibold text-white">TikTok Carousel Post</p>
                <p className="mb-5 text-sm leading-6 text-gray-400">
                  This TikTok post is a photo carousel, not a reel. The dashboard is synced to its live metrics, but TikTok does not provide a clean embedded carousel player here.
                </p>
                <div className="grid grid-cols-2 gap-3 text-left">
                  <div className="rounded-xl border border-[#262626] bg-black/30 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-gray-500">Views</p>
                    <p className="mt-1 text-base font-semibold text-white">{formatNumber(post.tiktokViews || 0)}</p>
                  </div>
                  <div className="rounded-xl border border-[#262626] bg-black/30 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-gray-500">Likes</p>
                    <p className="mt-1 text-base font-semibold text-white">{formatNumber(post.tiktokLikes || 0)}</p>
                  </div>
                  <div className="rounded-xl border border-[#262626] bg-black/30 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-gray-500">Comments</p>
                    <p className="mt-1 text-base font-semibold text-white">{formatNumber(post.tiktokComments || 0)}</p>
                  </div>
                  <div className="rounded-xl border border-[#262626] bg-black/30 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-gray-500">Shares</p>
                    <p className="mt-1 text-base font-semibold text-white">{formatNumber(post.tiktokShares || 0)}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : activePlatform === 'Instagram' && activeUrl ? (
            <iframe
              key={`ig-${activeUrl}`}
              src={`${activeUrl}embed`}
              className="w-full h-full"
              allowFullScreen
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500">
              Embed not available
            </div>
          )}
        </div>

        {/* Footer with link */}
        <div className="p-4 border-t border-[#262626] flex items-center justify-between">
          <div className="text-sm text-gray-400">
            {post.views && <span>{formatNumber(post.views)} views</span>}
            {post.likes && <span className="ml-3">{formatNumber(post.likes)} likes</span>}
          </div>
          {activeUrl && (
            <a
              href={activeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 bg-[#262626] hover:bg-[#333] text-white text-sm rounded-lg transition-colors"
            >
              Open in {activePlatform}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

const PLATFORM_COLORS: Record<string, string> = {
  TikTok: '#00f2ea',
  Instagram: '#e4405f',
  YouTube: '#ff0000',
  Twitter: '#1da1f2',
  LinkedIn: '#0077b5',
};

const PILLAR_COLORS: Record<string, string> = {
  Educational: '#3b82f6',
  'Behind the Scenes': '#8b5cf6',
  Entertainment: '#ec4899',
  Promotional: '#f59e0b',
  'User Generated': '#10b981',
  Trending: '#ef4444',
};

const STATUS_COLORS: Record<string, string> = {
  Idea: '#6b7280',
  Drafting: '#f59e0b',
  Ready: '#3b82f6',
  Scheduled: '#8b5cf6',
  Posted: '#22c55e',
};

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function hasMetricValue(value: number | null | undefined): boolean {
  return value !== null && value !== undefined;
}

function displayMetric(value: number | null | undefined): string {
  return hasMetricValue(value) ? formatNumber(value || 0) : '-';
}

type PlatformFilter = 'all' | 'tiktok' | 'instagram';

function getViewsForFilter(post: ContentPost, filter: PlatformFilter): number {
  if (filter === 'tiktok') return post.tiktokViews || 0;
  if (filter === 'instagram') return post.igViews || 0;
  return post.views || 0;
}

function getLikesForFilter(post: ContentPost, filter: PlatformFilter): number {
  if (filter === 'tiktok') return post.tiktokLikes || 0;
  if (filter === 'instagram') return post.igLikes || 0;
  return post.likes || 0;
}

function getCommentsForFilter(post: ContentPost, filter: PlatformFilter): number {
  if (filter === 'tiktok') return post.tiktokComments || 0;
  if (filter === 'instagram') return post.igComments || 0;
  return post.comments || 0;
}

function getSharesForFilter(post: ContentPost, filter: PlatformFilter): number {
  if (filter === 'tiktok') return post.tiktokShares || 0;
  if (filter === 'instagram') return post.igShares || 0;
  return post.shares || 0;
}

function getSavesForFilter(post: ContentPost, filter: PlatformFilter): number {
  if (filter === 'instagram') return post.igSaves || 0;
  if (filter === 'tiktok') return post.tiktokSaves || 0;
  return (post.igSaves || 0) + (post.tiktokSaves || 0);
}

function getEngagementForFilter(post: ContentPost, filter: PlatformFilter): number {
  if (filter === 'all') return post.engagementRate || 0;

  const views = getViewsForFilter(post, filter);
  const engagements =
    getLikesForFilter(post, filter) +
    getCommentsForFilter(post, filter) +
    getSharesForFilter(post, filter) +
    getSavesForFilter(post, filter);

  if (views <= 0) return 0;
  return Math.round(((engagements / views) * 100) * 100) / 100;
}

function StatCard({
  title,
  value,
  subtitle,
  trend,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
}) {
  return (
    <div className="bg-[#141414] border border-[#262626] rounded-xl p-5">
      <p className="text-sm text-gray-400 mb-1">{title}</p>
      <p className="text-3xl font-semibold text-white">
        {typeof value === 'number' ? formatNumber(value) : value}
      </p>
      {subtitle && (
        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
          {trend === 'up' && <span className="text-green-500">+</span>}
          {trend === 'down' && <span className="text-red-500">-</span>}
          {subtitle}
        </p>
      )}
    </div>
  );
}

function PostRow({
  post,
  onVideoClick,
  platformFilter,
}: {
  post: ContentPost;
  onVideoClick: (post: ContentPost) => void;
  platformFilter: PlatformFilter;
}) {
  const hasVideo = post.status === 'Posted' && post.postUrl;
  const hasBothPlatforms = post.tiktokUrl && post.igUrl;
  const primaryTikTokMeta = post.tiktokUrl ? getTikTokPostMeta(post.tiktokUrl) : { id: null, type: null as 'video' | 'photo' | null };
  const triggerTitle = primaryTikTokMeta.type === 'photo' ? 'Open carousel post' : 'Watch post';
  const views = getViewsForFilter(post, platformFilter);
  const likes = getLikesForFilter(post, platformFilter);
  const engagement = getEngagementForFilter(post, platformFilter);

  return (
    <tr className="border-b border-[#262626] hover:bg-[#1a1a1a] transition-colors">
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          {/* Play button for posted videos */}
          {hasVideo ? (
            <button
              onClick={() => onVideoClick(post)}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00f2ea] to-[#ff0050] flex items-center justify-center hover:scale-110 transition-transform group"
              title={triggerTitle}
            >
              {primaryTikTokMeta.type === 'photo' ? (
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-8h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
          ) : (
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: PLATFORM_COLORS[post.platform] || '#666' }}
            />
          )}
          <div>
            <p className="text-white font-medium truncate max-w-[200px]">{post.title}</p>
            <div className="flex items-center gap-1.5">
              {hasBothPlatforms ? (
                <>
                  <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: `${PLATFORM_COLORS['TikTok']}20`, color: PLATFORM_COLORS['TikTok'] }}>TT</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: `${PLATFORM_COLORS['Instagram']}20`, color: PLATFORM_COLORS['Instagram'] }}>IG</span>
                </>
              ) : (
                <p className="text-xs text-gray-500">{post.platform}</p>
              )}
            </div>
            {post.lastSynced && (
              <p className="text-[10px] text-gray-600 mt-1">
                Synced {new Date(post.lastSynced).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </td>
      <td className="py-3 px-4">
        <span
          className="px-2 py-1 rounded-full text-xs font-medium"
          style={{
            backgroundColor: `${STATUS_COLORS[post.status]}20`,
            color: STATUS_COLORS[post.status],
          }}
        >
          {post.status}
        </span>
      </td>
      <td className="py-3 px-4">
        <span
          className="px-2 py-1 rounded-full text-xs"
          style={{
            backgroundColor: `${PILLAR_COLORS[post.pillar] || '#666'}20`,
            color: PILLAR_COLORS[post.pillar] || '#999',
          }}
        >
          {post.pillar}
        </span>
      </td>
      <td className="py-3 px-4 text-right text-gray-300">
        {displayMetric(views)}
      </td>
      <td className="py-3 px-4 text-right text-gray-300">
        {displayMetric(likes)}
      </td>
      <td className="py-3 px-4 text-right text-gray-300">
        {hasMetricValue(engagement) ? `${engagement.toFixed(2)}%` : '-'}
      </td>
      <td className="py-3 px-4 text-right text-gray-500 text-sm">
        {post.postDate ? new Date(post.postDate).toLocaleDateString() : '-'}
      </td>
    </tr>
  );
}

export default function Dashboard() {
  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [lastFetched, setLastFetched] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<ContentPost | null>(null);
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');
  const [growthData, setGrowthData] = useState<GrowthData | null>(null);
  const [growthError, setGrowthError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<{
    kind: 'success' | 'error';
    message: string;
    syncedAt?: string;
    growthAction?: string;
    importErrors?: string[];
    failedPosts?: string[];
  } | null>(null);

  const handleVideoClick = useCallback((post: ContentPost) => {
    setSelectedVideo(post);
  }, []);

  const handleCloseVideo = useCallback(() => {
    setSelectedVideo(null);
  }, []);

  // Filter posts by platform
  const filteredPosts = posts.filter(post => {
    if (platformFilter === 'all') return true;
    if (platformFilter === 'tiktok') return !!post.tiktokUrl;
    if (platformFilter === 'instagram') return !!post.igUrl;
    return true;
  });

  // Calculate stats for filtered posts
  const filteredStats = (() => {
    const postedPosts = filteredPosts.filter(p => p.status === 'Posted');

    const totalViews = postedPosts.reduce((sum, p) => sum + getViewsForFilter(p, platformFilter), 0);
    const totalLikes = postedPosts.reduce((sum, p) => sum + getLikesForFilter(p, platformFilter), 0);
    const totalComments = postedPosts.reduce((sum, p) => sum + getCommentsForFilter(p, platformFilter), 0);
    const totalShares = postedPosts.reduce((sum, p) => sum + getSharesForFilter(p, platformFilter), 0);
    const totalSaves = postedPosts.reduce((sum, p) => sum + getSavesForFilter(p, platformFilter), 0);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const postsThisWeek = postedPosts.filter(p =>
      p.postDate && new Date(p.postDate) >= weekAgo
    ).length;

    const topPerformer = postedPosts
      .filter(p => getEngagementForFilter(p, platformFilter) > 0)
      .sort((a, b) => getEngagementForFilter(b, platformFilter) - getEngagementForFilter(a, platformFilter))[0] || null;

    return {
      totalPosts: postedPosts.length,
      totalViews,
      totalLikes,
      totalComments,
      totalShares,
      totalSaves,
      postsThisWeek,
      topPerformer,
    };
  })();

  const fetchGrowthData = async () => {
    try {
      const response = await fetch('/api/growth?days=30');
      if (response.ok) {
        const data = await response.json();
        setGrowthData(data);
        setGrowthError(null);
      } else {
        const data = await response.json().catch(() => ({}));
        setGrowthData(null);
        setGrowthError(data.details || data.error || 'Failed to fetch growth data');
      }
    } catch (err) {
      setGrowthData(null);
      setGrowthError(err instanceof Error ? err.message : 'Failed to fetch growth data');
      console.error('Failed to fetch growth data:', err);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/posts');

      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }

      const data = await response.json();
      setPosts(data.posts);
      setLastFetched(data.fetchedAt);
      setError(null);

      // Also fetch growth data
      await fetchGrowthData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const triggerSync = async () => {
    // Non-JSON bodies (Vercel timeout pages, gateway errors) crash response.json().
    // Fall back to text so the real error surfaces instead of "Unexpected token".
    const safeParse = async (res: Response): Promise<any> => {
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch {
        return { error: text.slice(0, 200).trim() || `HTTP ${res.status}` };
      }
    };

    const callSync = async (path: string) => {
      const res = await fetch(path, { method: 'POST' });
      const data = await safeParse(res);
      return { ok: res.ok, data };
    };

    try {
      setSyncing(true);
      setSyncStatus(null);

      const [growthSettled, postsSettled] = await Promise.allSettled([
        callSync('/api/sync/growth'),
        callSync('/api/sync/posts'),
      ]);

      const growth = growthSettled.status === 'fulfilled'
        ? growthSettled.value
        : { ok: false, data: { error: growthSettled.reason?.message || 'Network error' } };
      const posts = postsSettled.status === 'fulfilled'
        ? postsSettled.value
        : { ok: false, data: { error: postsSettled.reason?.message || 'Network error' } };

      const growthOk = growth.ok && growth.data?.growth?.success !== false;
      const postsOk = posts.ok;

      if (growthOk || postsOk) {
        await fetchData();
      }

      const parts: string[] = [];
      if (growthOk) parts.push('Growth updated');
      else parts.push(`Growth failed: ${growth.data?.details || growth.data?.error || 'unknown'}`);
      if (postsOk) parts.push(posts.data?.message || 'Posts updated');
      else parts.push(`Posts failed: ${posts.data?.details || posts.data?.error || 'unknown'}`);

      setSyncStatus({
        kind: growthOk && postsOk ? 'success' : 'error',
        message: parts.join(' · '),
        syncedAt: new Date().toISOString(),
        growthAction: growthOk ? growth.data?.growth?.action : undefined,
        importErrors: postsOk ? posts.data?.importErrors : undefined,
        failedPosts: postsOk
          ? (posts.data?.results || [])
              .filter((r: any) => !r.success)
              .map((r: any) => r.title)
          : [],
      });
    } catch (err) {
      setSyncStatus({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Sync failed',
      });
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Prepare chart data (use all posts for platform comparison, filtered for others)
  const platformData = posts.reduce((acc, post) => {
    if (post.status === 'Posted') {
      // Count TikTok
      if (post.tiktokUrl) {
        const existing = acc.find(p => p.platform === 'TikTok');
        if (existing) {
          existing.posts += 1;
          existing.views += post.tiktokViews || 0;
          existing.likes += post.tiktokLikes || 0;
          existing.comments += post.tiktokComments || 0;
          existing.shares += post.tiktokShares || 0;
          existing.saves += post.tiktokSaves || 0;
        } else {
          acc.push({
            platform: 'TikTok',
            posts: 1,
            views: post.tiktokViews || 0,
            likes: post.tiktokLikes || 0,
            comments: post.tiktokComments || 0,
            shares: post.tiktokShares || 0,
            saves: post.tiktokSaves || 0,
            color: PLATFORM_COLORS['TikTok'],
          });
        }
      }
      // Count Instagram
      if (post.igUrl) {
        const existing = acc.find(p => p.platform === 'Instagram');
        if (existing) {
          existing.posts += 1;
          existing.views += post.igViews || 0;
          existing.likes += post.igLikes || 0;
          existing.comments += post.igComments || 0;
          existing.shares += post.igShares || 0;
          existing.saves += post.igSaves || 0;
        } else {
          acc.push({
            platform: 'Instagram',
            posts: 1,
            views: post.igViews || 0,
            likes: post.igLikes || 0,
            comments: post.igComments || 0,
            shares: post.igShares || 0,
            saves: post.igSaves || 0,
            color: PLATFORM_COLORS['Instagram'],
          });
        }
      }
    }
    return acc;
  }, [] as Array<{ platform: string; posts: number; views: number; likes: number; comments: number; shares: number; saves: number; color: string }>)
  .map((entry) => ({
    ...entry,
    engagement: entry.views > 0
      ? Math.round((((entry.likes + entry.comments + entry.shares + entry.saves) / entry.views) * 100) * 100) / 100
      : 0,
  }));

  const pillarData = filteredPosts.reduce((acc, post) => {
    const existing = acc.find(p => p.pillar === post.pillar);
    if (existing) {
      existing.count += 1;
    } else {
      acc.push({
        pillar: post.pillar,
        count: 1,
        color: PILLAR_COLORS[post.pillar] || '#666',
      });
    }
    return acc;
  }, [] as Array<{ pillar: string; count: number; color: string }>);

  const statusData = filteredPosts.reduce((acc, post) => {
    const existing = acc.find(s => s.status === post.status);
    if (existing) {
      existing.count += 1;
    } else {
      acc.push({
        status: post.status,
        count: 1,
        color: STATUS_COLORS[post.status] || '#666',
      });
    }
    return acc;
  }, [] as Array<{ status: string; count: number; color: string }>);

  const performanceData = Array.from(
    filteredPosts
      .filter(p => p.status === 'Posted' && p.postDate)
      .reduce((acc, post) => {
        const key = post.postDate!;
        const existing = acc.get(key) || {
          rawDate: key,
          date: new Date(key).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          tiktokViews: 0,
          instagramViews: 0,
          totalViews: 0,
          totalEngagements: 0,
          posts: 0,
        };

        const tiktokViews = platformFilter === 'instagram' ? 0 : post.tiktokViews || 0;
        const instagramViews = platformFilter === 'tiktok' ? 0 : post.igViews || 0;
        const views = getViewsForFilter(post, platformFilter);
        const engagements =
          getLikesForFilter(post, platformFilter) +
          getCommentsForFilter(post, platformFilter) +
          getSharesForFilter(post, platformFilter) +
          getSavesForFilter(post, platformFilter);

        existing.tiktokViews += tiktokViews;
        existing.instagramViews += instagramViews;
        existing.totalViews += views;
        existing.totalEngagements += engagements;
        existing.posts += 1;
        acc.set(key, existing);
        return acc;
      }, new Map<string, {
        rawDate: string;
        date: string;
        tiktokViews: number;
        instagramViews: number;
        totalViews: number;
        totalEngagements: number;
        posts: number;
      }>())
      .values()
  )
    .sort((a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime())
    .slice(-12)
    .map((item) => ({
      ...item,
      engagement: item.totalViews > 0
        ? Math.round(((item.totalEngagements / item.totalViews) * 100) * 100) / 100
        : 0,
    }));

  const leaderboardData = filteredPosts
    .filter((p) => p.status === 'Posted' && getViewsForFilter(p, platformFilter) > 0)
    .map((post) => ({
      id: post.id,
      title: post.title.length > 30 ? `${post.title.slice(0, 30)}...` : post.title,
      views: getViewsForFilter(post, platformFilter),
      engagement: getEngagementForFilter(post, platformFilter),
    }))
    .sort((a, b) => b.engagement - a.engagement)
    .slice(0, 5)
    .reverse();

  const insightData = (() => {
    const postedPosts = filteredPosts.filter((p) => p.status === 'Posted');
    const avgViewsPerPost = postedPosts.length > 0
      ? Math.round(postedPosts.reduce((sum, post) => sum + getViewsForFilter(post, platformFilter), 0) / postedPosts.length)
      : 0;

    const pillarMap = new Map<string, { pillar: string; posts: number; views: number; engagementTotal: number }>();
    const dayMap = new Map<string, { day: string; posts: number; views: number }>();

    for (const post of postedPosts) {
      const views = getViewsForFilter(post, platformFilter);
      const engagement = getEngagementForFilter(post, platformFilter);
      const pillarEntry = pillarMap.get(post.pillar) || {
        pillar: post.pillar,
        posts: 0,
        views: 0,
        engagementTotal: 0,
      };
      pillarEntry.posts += 1;
      pillarEntry.views += views;
      pillarEntry.engagementTotal += engagement;
      pillarMap.set(post.pillar, pillarEntry);

      if (post.postDate) {
        const day = new Date(post.postDate).toLocaleDateString('en-US', { weekday: 'short' });
        const dayEntry = dayMap.get(day) || { day, posts: 0, views: 0 };
        dayEntry.posts += 1;
        dayEntry.views += views;
        dayMap.set(day, dayEntry);
      }
    }

    const bestPillar = Array.from(pillarMap.values())
      .sort((a, b) => {
        const aAvg = a.posts > 0 ? a.views / a.posts : 0;
        const bAvg = b.posts > 0 ? b.views / b.posts : 0;
        return bAvg - aAvg;
      })[0] || null;

    const bestDay = Array.from(dayMap.values())
      .sort((a, b) => {
        const aAvg = a.posts > 0 ? a.views / a.posts : 0;
        const bAvg = b.posts > 0 ? b.views / b.posts : 0;
        return bAvg - aAvg;
      })[0] || null;

    return {
      avgViewsPerPost,
      bestPillar,
      bestDay,
    };
  })();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-400">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Content Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">
              {lastFetched && `Last updated: ${new Date(lastFetched).toLocaleString()}`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              className="px-4 py-2 text-sm bg-[#141414] border border-[#262626] text-gray-300 rounded-lg hover:bg-[#1a1a1a] transition-colors"
            >
              Refresh
            </button>
            <button
              onClick={triggerSync}
              disabled={syncing}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {syncing && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {syncing ? 'Syncing...' : 'Sync Metrics'}
            </button>
          </div>
        </div>

        {syncStatus && (
          <div
            className={`rounded-xl border p-4 mb-6 ${
              syncStatus.kind === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20'
                : 'bg-red-500/10 border-red-500/20'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className={`text-sm font-medium ${syncStatus.kind === 'success' ? 'text-emerald-300' : 'text-red-300'}`}>
                  {syncStatus.kind === 'success' ? 'Sync Complete' : 'Sync Failed'}
                </p>
                <p className="text-sm text-white mt-1">{syncStatus.message}</p>
                {syncStatus.syncedAt && (
                  <p className="text-xs text-gray-400 mt-2">
                    Synced at {new Date(syncStatus.syncedAt).toLocaleString()}
                    {syncStatus.growthAction ? ` • Growth snapshot ${syncStatus.growthAction}` : ''}
                  </p>
                )}
                {syncStatus.importErrors && syncStatus.importErrors.length > 0 && (
                  <p className="text-xs text-amber-300 mt-2">
                    Import warnings: {syncStatus.importErrors.join(' | ')}
                  </p>
                )}
                {syncStatus.failedPosts && syncStatus.failedPosts.length > 0 && (
                  <p className="text-xs text-gray-400 mt-2">
                    Not fully synced: {syncStatus.failedPosts.join(', ')}
                  </p>
                )}
              </div>
              <button
                onClick={() => setSyncStatus(null)}
                className="text-gray-500 hover:text-white transition-colors"
                aria-label="Dismiss sync status"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Platform Tabs */}
        <div className="flex items-center gap-2 mb-8">
          <button
            onClick={() => setPlatformFilter('all')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              platformFilter === 'all'
                ? 'bg-white text-black'
                : 'bg-[#141414] border border-[#262626] text-gray-400 hover:text-white'
            }`}
          >
            All Platforms
          </button>
          <button
            onClick={() => setPlatformFilter('tiktok')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
              platformFilter === 'tiktok'
                ? 'bg-[#00f2ea] text-black'
                : 'bg-[#141414] border border-[#262626] text-gray-400 hover:text-[#00f2ea]'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#00f2ea]" />
            TikTok
          </button>
          <button
            onClick={() => setPlatformFilter('instagram')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
              platformFilter === 'instagram'
                ? 'bg-[#e4405f] text-white'
                : 'bg-[#141414] border border-[#262626] text-gray-400 hover:text-[#e4405f]'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#e4405f]" />
            Instagram
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-8">
          <StatCard
            title={platformFilter === 'all' ? 'Posts' : `${platformFilter === 'tiktok' ? 'TikTok' : 'IG'} Posts`}
            value={filteredStats.totalPosts}
          />
          <StatCard title="Views" value={filteredStats.totalViews} />
          <StatCard title="Likes" value={filteredStats.totalLikes} />
          <StatCard title="Comments" value={filteredStats.totalComments} />
          <StatCard title="Shares" value={filteredStats.totalShares} />
          <StatCard title="Saves" value={filteredStats.totalSaves} />
          <StatCard
            title="This Week"
            value={filteredStats.postsThisWeek}
            subtitle="posts"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-5">
            <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Avg Views / Post</p>
            <p className="text-2xl font-semibold text-white">{formatNumber(insightData.avgViewsPerPost)}</p>
            <p className="text-xs text-gray-500 mt-2">
              Based on posted {platformFilter === 'all' ? 'content' : platformFilter === 'tiktok' ? 'TikTok posts' : 'Instagram posts'}
            </p>
          </div>
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-5">
            <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Best Pillar</p>
            <p className="text-2xl font-semibold text-white">
              {insightData.bestPillar ? insightData.bestPillar.pillar : '-'}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              {insightData.bestPillar
                ? `${formatNumber(Math.round(insightData.bestPillar.views / insightData.bestPillar.posts))} avg views/post`
                : 'Need more posted content'}
            </p>
          </div>
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-5">
            <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Best Posting Day</p>
            <p className="text-2xl font-semibold text-white">
              {insightData.bestDay ? insightData.bestDay.day : '-'}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              {insightData.bestDay
                ? `${formatNumber(Math.round(insightData.bestDay.views / insightData.bestDay.posts))} avg views/post`
                : 'Need dated posted content'}
            </p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Platform Performance */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-5">
            <h3 className="text-sm font-medium text-gray-400 mb-4">Platform Performance</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={platformData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis type="number" tick={{ fill: '#666', fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="platform"
                    tick={{ fill: '#999', fontSize: 12 }}
                    width={70}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a1a1a',
                      border: '1px solid #262626',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#fff' }}
                    formatter={(value: number, name: string) => {
                      if (name === 'Views') return [formatNumber(value), name];
                      if (name === 'Posts') return [value, name];
                      if (name === 'Engagement') return [`${value.toFixed(2)}%`, name];
                      return [value, name];
                    }}
                  />
                  <Bar dataKey="views" name="Views" radius={[0, 4, 4, 0]}>
                    {platformData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 space-y-2">
              {platformData.map((item) => (
                <div key={item.platform} className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">{item.platform}</span>
                  <span className="text-gray-500">
                    {item.posts} posts, {item.engagement.toFixed(2)}% engagement
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Content Pillars */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-5">
            <h3 className="text-sm font-medium text-gray-400 mb-4">Content Pillars</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pillarData}
                    dataKey="count"
                    nameKey="pillar"
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                  >
                    {pillarData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a1a1a',
                      border: '1px solid #262626',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {pillarData.map((item, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-1 rounded"
                  style={{ backgroundColor: `${item.color}20`, color: item.color }}
                >
                  {item.pillar} ({item.count})
                </span>
              ))}
            </div>
          </div>

          {/* Status Pipeline */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-5">
            <h3 className="text-sm font-medium text-gray-400 mb-4">Status Pipeline</h3>
            <div className="space-y-3">
              {statusData.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-gray-300 text-sm flex-1">{item.status}</span>
                  <span className="text-gray-500 text-sm">{item.count}</span>
                  <div className="w-24 h-2 bg-[#262626] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(item.count / posts.length) * 100}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Performance Trend */}
        {performanceData.length > 0 && (
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 mb-8">
            <h3 className="text-sm font-medium text-gray-400 mb-4">Performance by Post Date</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis dataKey="date" tick={{ fill: '#666', fontSize: 12 }} />
                  <YAxis yAxisId="views" tick={{ fill: '#666', fontSize: 12 }} />
                  <YAxis
                    yAxisId="engagement"
                    orientation="right"
                    tick={{ fill: '#666', fontSize: 12 }}
                    tickFormatter={(value: number) => `${value}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a1a1a',
                      border: '1px solid #262626',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number, name: string) => {
                      if (name === 'Engagement') return [`${value.toFixed(2)}%`, name];
                      if (name === 'Posts') return [value, name];
                      return [formatNumber(value), name];
                    }}
                  />
                  {platformFilter !== 'instagram' && (
                    <Bar
                      yAxisId="views"
                      dataKey="tiktokViews"
                      stackId="views"
                      fill="#00f2ea"
                      radius={[4, 4, 0, 0]}
                      name="TikTok Views"
                    />
                  )}
                  {platformFilter !== 'tiktok' && (
                    <Bar
                      yAxisId="views"
                      dataKey="instagramViews"
                      stackId="views"
                      fill="#e4405f"
                      radius={[4, 4, 0, 0]}
                      name="Instagram Views"
                    />
                  )}
                  <Line
                    yAxisId="engagement"
                    type="monotone"
                    dataKey="engagement"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={{ fill: '#22c55e' }}
                    name="Engagement"
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-6 mt-2 text-xs text-gray-500">
              {platformFilter !== 'instagram' && (
                <span className="flex items-center gap-2">
                  <span className="w-3 h-2 bg-[#00f2ea] rounded-sm" />
                  TikTok Views
                </span>
              )}
              {platformFilter !== 'tiktok' && (
                <span className="flex items-center gap-2">
                  <span className="w-3 h-2 bg-[#e4405f] rounded-sm" />
                  Instagram Views
                </span>
              )}
              <span className="flex items-center gap-2">
                <span className="w-3 h-0.5 bg-green-500 rounded" />
                Engagement %
              </span>
            </div>
          </div>
        )}

        {leaderboardData.length > 0 && (
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 mb-8">
            <h3 className="text-sm font-medium text-gray-400 mb-4">Engagement Leaderboard</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={leaderboardData} layout="vertical" margin={{ left: 12, right: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis
                    type="number"
                    tick={{ fill: '#666', fontSize: 12 }}
                    tickFormatter={(value: number) => `${value}%`}
                  />
                  <YAxis
                    type="category"
                    dataKey="title"
                    tick={{ fill: '#999', fontSize: 12 }}
                    width={140}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a1a1a',
                      border: '1px solid #262626',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number, name: string, item: any) => {
                      if (name === 'Engagement') return [`${value.toFixed(2)}%`, name];
                      if (name === 'Views') return [formatNumber(item?.payload?.views || 0), name];
                      return [value, name];
                    }}
                  />
                  <Bar dataKey="engagement" name="Engagement" radius={[0, 4, 4, 0]} fill="#22c55e" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {growthError && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5 mb-8">
            <p className="text-sm font-medium text-amber-300 mb-1">Follower Growth Unavailable</p>
            <p className="text-sm text-amber-100/80">
              The dashboard can read post-level metrics from your main Notion content database, but the separate growth database is not shared with the
              `Adapty Content Dashboard` integration yet.
            </p>
          </div>
        )}

        {/* Growth Over Time */}
        {growthData && growthData.snapshots.length > 0 && (
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-400">Growth Over Time</h3>
              {growthData.weekOverWeek && (
                <div className="flex items-center gap-4">
                  {growthData.weekOverWeek.tiktokFollowers.change !== 0 && (
                    <span className="flex items-center gap-1.5 text-xs">
                      <span className="w-2 h-2 rounded-full bg-[#00f2ea]" />
                      <span className={growthData.weekOverWeek.tiktokFollowers.change > 0 ? 'text-green-400' : 'text-red-400'}>
                        {growthData.weekOverWeek.tiktokFollowers.change > 0 ? '+' : ''}
                        {formatNumber(growthData.weekOverWeek.tiktokFollowers.change)}
                        <span className="text-gray-500 ml-1">
                          ({growthData.weekOverWeek.tiktokFollowers.changePercent > 0 ? '+' : ''}
                          {growthData.weekOverWeek.tiktokFollowers.changePercent}%)
                        </span>
                      </span>
                    </span>
                  )}
                  {growthData.weekOverWeek.instagramFollowers.change !== 0 && (
                    <span className="flex items-center gap-1.5 text-xs">
                      <span className="w-2 h-2 rounded-full bg-[#e4405f]" />
                      <span className={growthData.weekOverWeek.instagramFollowers.change > 0 ? 'text-green-400' : 'text-red-400'}>
                        {growthData.weekOverWeek.instagramFollowers.change > 0 ? '+' : ''}
                        {formatNumber(growthData.weekOverWeek.instagramFollowers.change)}
                        <span className="text-gray-500 ml-1">
                          ({growthData.weekOverWeek.instagramFollowers.changePercent > 0 ? '+' : ''}
                          {growthData.weekOverWeek.instagramFollowers.changePercent}%)
                        </span>
                      </span>
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
              <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">TikTok 7D</p>
                <p className="text-xl font-semibold text-white">
                  {growthData.comparisons.days7
                    ? `${growthData.comparisons.days7.tiktokFollowers.change > 0 ? '+' : ''}${formatNumber(growthData.comparisons.days7.tiktokFollowers.change)}`
                    : '-'}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  {growthData.comparisons.days7
                    ? `${growthData.comparisons.days7.tiktokFollowers.changePercent > 0 ? '+' : ''}${growthData.comparisons.days7.tiktokFollowers.changePercent}% vs 7d`
                    : 'Need more daily snapshots'}
                </p>
              </div>
              <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">Instagram 7D</p>
                <p className="text-xl font-semibold text-white">
                  {growthData.comparisons.days7
                    ? `${growthData.comparisons.days7.instagramFollowers.change > 0 ? '+' : ''}${formatNumber(growthData.comparisons.days7.instagramFollowers.change)}`
                    : '-'}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  {growthData.comparisons.days7
                    ? `${growthData.comparisons.days7.instagramFollowers.changePercent > 0 ? '+' : ''}${growthData.comparisons.days7.instagramFollowers.changePercent}% vs 7d`
                    : 'Need more daily snapshots'}
                </p>
              </div>
              <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">TikTok 30D</p>
                <p className="text-xl font-semibold text-white">
                  {growthData.comparisons.days30
                    ? `${growthData.comparisons.days30.tiktokFollowers.change > 0 ? '+' : ''}${formatNumber(growthData.comparisons.days30.tiktokFollowers.change)}`
                    : '-'}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  {growthData.comparisons.days30
                    ? `${growthData.comparisons.days30.tiktokFollowers.changePercent > 0 ? '+' : ''}${growthData.comparisons.days30.tiktokFollowers.changePercent}% vs 30d`
                    : 'Need more daily snapshots'}
                </p>
              </div>
              <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">Instagram 30D</p>
                <p className="text-xl font-semibold text-white">
                  {growthData.comparisons.days30
                    ? `${growthData.comparisons.days30.instagramFollowers.change > 0 ? '+' : ''}${formatNumber(growthData.comparisons.days30.instagramFollowers.change)}`
                    : '-'}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  {growthData.comparisons.days30
                    ? `${growthData.comparisons.days30.instagramFollowers.changePercent > 0 ? '+' : ''}${growthData.comparisons.days30.instagramFollowers.changePercent}% vs 30d`
                    : 'Need more daily snapshots'}
                </p>
              </div>
            </div>

            {/* Follower Stats Cards */}
            {growthData.latest && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-[#00f2ea]" />
                    <span className="text-xs text-gray-500">TikTok Followers</span>
                  </div>
                  <p className="text-2xl font-semibold text-white">
                    {formatNumber(growthData.latest.tiktokFollowers)}
                  </p>
                </div>
                <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-[#e4405f]" />
                    <span className="text-xs text-gray-500">Instagram Followers</span>
                  </div>
                  <p className="text-2xl font-semibold text-white">
                    {formatNumber(growthData.latest.instagramFollowers)}
                  </p>
                </div>
                <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-[#00f2ea]" />
                    <span className="text-xs text-gray-500">TikTok Videos</span>
                  </div>
                  <p className="text-2xl font-semibold text-white">
                    {growthData.latest.tiktokVideos}
                  </p>
                </div>
                <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-[#e4405f]" />
                    <span className="text-xs text-gray-500">Instagram Posts</span>
                  </div>
                  <p className="text-2xl font-semibold text-white">
                    {growthData.latest.instagramPosts}
                  </p>
                </div>
              </div>
            )}

            {/* Growth Chart */}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={growthData.snapshots.map(s => ({
                  date: new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                  tiktok: s.tiktokFollowers,
                  instagram: s.instagramFollowers,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis dataKey="date" tick={{ fill: '#666', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#666', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a1a1a',
                      border: '1px solid #262626',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number, name: string) => [
                      formatNumber(value),
                      name === 'tiktok' ? 'TikTok' : 'Instagram'
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="tiktok"
                    stroke="#00f2ea"
                    strokeWidth={2}
                    dot={{ fill: '#00f2ea', r: 3 }}
                    name="TikTok"
                  />
                  <Line
                    type="monotone"
                    dataKey="instagram"
                    stroke="#e4405f"
                    strokeWidth={2}
                    dot={{ fill: '#e4405f', r: 3 }}
                    name="Instagram"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-6 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-2">
                <span className="w-3 h-0.5 bg-[#00f2ea] rounded" />
                TikTok Followers
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-0.5 bg-[#e4405f] rounded" />
                Instagram Followers
              </span>
            </div>

            {growthData.snapshots.length < 7 && (
              <p className="text-xs text-gray-500 mt-4">
                Historical follower backfill is not being fabricated. This chart will become more useful as daily snapshots accumulate from future syncs.
              </p>
            )}
          </div>
        )}

        {/* Posts Table */}
        <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden">
          <div className="p-5 border-b border-[#262626]">
            <h3 className="text-sm font-medium text-gray-400">All Content</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#262626] bg-[#0a0a0a]">
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Content
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pillar
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Views
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Likes
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Eng. Rate
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredPosts.map(post => (
                  <PostRow
                    key={post.id}
                    post={post}
                    onVideoClick={handleVideoClick}
                    platformFilter={platformFilter}
                  />
                ))}
              </tbody>
            </table>
          </div>
          {filteredPosts.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              {platformFilter === 'all'
                ? 'No content found. Add posts to your Notion database to see them here.'
                : `No ${platformFilter === 'tiktok' ? 'TikTok' : 'Instagram'} posts found.`}
            </div>
          )}
        </div>

        {/* Top Performer */}
        {filteredStats.topPerformer && (
          <div className="mt-8 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-5">
            <p className="text-xs text-blue-400 uppercase tracking-wider mb-2">
              Top Performer {platformFilter !== 'all' && `(${platformFilter === 'tiktok' ? 'TikTok' : 'Instagram'})`}
            </p>
            <p className="text-lg font-semibold text-white mb-1">
              {filteredStats.topPerformer.title}
            </p>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span>{filteredStats.topPerformer.platform}</span>
              <span>|</span>
              <span>{formatNumber(getViewsForFilter(filteredStats.topPerformer, platformFilter))} views</span>
              <span>|</span>
              <span>{getEngagementForFilter(filteredStats.topPerformer, platformFilter).toFixed(2)}% engagement</span>
            </div>
          </div>
        )}
      </div>

      {/* Video Modal */}
      {selectedVideo && (
        <VideoModal post={selectedVideo} onClose={handleCloseVideo} />
      )}
    </div>
  );
}
