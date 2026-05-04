import {
  fetchPostedForSync,
  updatePostMetrics,
  updateEngagementRate,
  upsertGrowthSnapshot,
  getInstagramPostsByShortcode,
  createInstagramPost,
  getDashboardDateString,
  fetchGrowthHistory,
} from '@/lib/notion';
import {
  scrapeMetrics,
  scrapeTikTokProfile,
  getInstagramAccountStats,
  fetchAllInstagramMedia,
  clearInstagramCache,
} from '@/lib/scrapers';

export type GrowthResult =
  | {
      success: true;
      action: 'created' | 'updated';
      tiktokFollowers?: number;
      instagramFollowers?: number;
      carriedForward?: string[];
    }
  | { success: false; error: string };

export type PostSyncResult = {
  id: string;
  title: string;
  success: boolean;
  error?: string;
  platforms?: string[];
};

// Fast: IG Graph API + TikTok HTML scrape + sum of stored post metrics.
// Safe to run on Vercel cron (typically completes in < 5s).
export async function runGrowthSnapshot(): Promise<GrowthResult> {
  try {
    const tiktokUsername = process.env.TIKTOK_USERNAME;
    const tiktokProfile = tiktokUsername ? await scrapeTikTokProfile(tiktokUsername) : null;
    const igAccount = await getInstagramAccountStats();

    const posts = await fetchPostedForSync();
    const postedPosts = posts.filter(p => p.status === 'Posted');
    const tiktokViews = postedPosts.reduce((s, p) => s + (p.tiktokViews || 0), 0);
    const tiktokLikes = postedPosts.reduce((s, p) => s + (p.tiktokLikes || 0), 0);
    const igViews = postedPosts.reduce((s, p) => s + (p.igViews || 0), 0);
    const igLikes = postedPosts.reduce((s, p) => s + (p.igLikes || 0), 0);

    // TikTok blocks datacenter IPs. When the scrape fails (null), carry
    // forward the previous snapshot's values rather than writing 0 and
    // clobbering yesterday's good data.
    let carriedForward: string[] = [];
    let tiktokFollowers = tiktokProfile?.followers ?? 0;
    let tiktokTotalLikes = tiktokProfile?.likes ?? 0;
    let tiktokVideos = tiktokProfile?.videos ?? 0;
    if (!tiktokProfile) {
      const history = await fetchGrowthHistory(7);
      const prev = history[history.length - 1];
      if (prev) {
        tiktokFollowers = prev.tiktokFollowers || 0;
        tiktokTotalLikes = prev.tiktokTotalLikes || 0;
        tiktokVideos = prev.tiktokVideos || 0;
        carriedForward.push('tiktok');
        console.log(`TikTok scrape failed, carrying forward from ${prev.date}: ${tiktokFollowers} followers`);
      }
    }

    const action = await upsertGrowthSnapshot({
      date: getDashboardDateString(),
      tiktokFollowers,
      tiktokTotalLikes,
      tiktokVideos,
      instagramFollowers: igAccount?.followers || 0,
      instagramPosts: igAccount?.postsCount || 0,
      tiktokViews,
      tiktokLikes,
      instagramViews: igViews,
      instagramLikes: igLikes,
    });

    return {
      success: true,
      action,
      tiktokFollowers,
      instagramFollowers: igAccount?.followers,
      carriedForward: carriedForward.length > 0 ? carriedForward : undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Refresh TikTok per-post metrics by scraping each post URL in parallel batches.
// HTML scrape only (no Puppeteer) so it's safe on Vercel. When TikTok blocks the
// request and scrape returns null, we leave the existing value alone rather than
// clobber it with zeros.
export async function runTikTokRefresh(): Promise<{ updated: number; failed: number; errors: string[] }> {
  const errors: string[] = [];
  let updated = 0;
  let failed = 0;

  const posts = await fetchPostedForSync();
  const ttPosts = posts.filter(p => p.tiktokUrl);
  const BATCH_SIZE = 5;

  for (let i = 0; i < ttPosts.length; i += BATCH_SIZE) {
    const batch = ttPosts.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async post => {
        try {
          const metrics = await scrapeMetrics(post.tiktokUrl!);
          if (metrics) {
            await updatePostMetrics(post.id, 'TikTok', metrics);
            await updateEngagementRate(post.id);
            updated++;
          } else {
            failed++;
          }
        } catch (err) {
          failed++;
          errors.push(`${post.title.slice(0, 40)}: ${err instanceof Error ? err.message : 'Unknown'}`);
        }
      })
    );
  }

  return { updated, failed, errors };
}

// Medium: refresh IG metrics for existing posts and import any new ones.
// Uses the Graph API for everything (fast, reliable — safe in a cron path).
export async function runInstagramImport(): Promise<{ imported: number; updated: number; errors: string[] }> {
  clearInstagramCache();
  const errors: string[] = [];
  let imported = 0;
  let updated = 0;

  try {
    const existingByShortcode = await getInstagramPostsByShortcode();
    const igMedia = await fetchAllInstagramMedia();

    for (const media of igMedia) {
      const existingPageId = existingByShortcode.get(media.shortcode);

      if (existingPageId) {
        try {
          await updatePostMetrics(existingPageId, 'Instagram', {
            views: media.views,
            likes: media.likes,
            comments: media.comments,
            shares: media.shares,
            saves: media.saves,
          });
          await updateEngagementRate(existingPageId);
          updated++;
        } catch (err) {
          errors.push(`update ${media.shortcode}: ${err instanceof Error ? err.message : 'Unknown'}`);
        }
      } else {
        try {
          const title = media.caption
            ? media.caption.split('\n')[0].slice(0, 80)
            : `Instagram ${media.shortcode}`;

          await createInstagramPost({
            title,
            url: media.permalink,
            postDate: media.timestamp?.split('T')[0],
            views: media.views,
            likes: media.likes,
            comments: media.comments,
            shares: media.shares,
            saves: media.saves,
          });

          imported++;
        } catch (err) {
          errors.push(`${media.shortcode}: ${err instanceof Error ? err.message : 'Unknown'}`);
        }
      }

      await new Promise(r => setTimeout(r, 100));
    }
  } catch (err) {
    errors.push(`Import failed: ${err instanceof Error ? err.message : 'Unknown'}`);
  }

  return { imported, updated, errors };
}

// Slow: per-post Puppeteer scrape. Can take many minutes; will exceed
// Vercel's hobby-tier 60s limit. Intended for local/CLI execution.
export async function runPostSync(): Promise<{ results: PostSyncResult[]; successCount: number }> {
  const posts = await fetchPostedForSync();
  const results: PostSyncResult[] = [];
  const SKIP_IF_SYNCED_WITHIN_MS = 6 * 60 * 60 * 1000;
  const now = Date.now();

  for (const post of posts) {
    if (post.lastSynced) {
      const lastSyncedAt = new Date(post.lastSynced).getTime();
      if (Number.isFinite(lastSyncedAt) && now - lastSyncedAt < SKIP_IF_SYNCED_WITHIN_MS) {
        results.push({ id: post.id, title: post.title, success: true, platforms: ['skipped'] });
        continue;
      }
    }

    const syncedPlatforms: string[] = [];
    const errors: string[] = [];

    if (post.tiktokUrl) {
      try {
        const metrics = await scrapeMetrics(post.tiktokUrl);
        if (metrics) {
          await updatePostMetrics(post.id, 'TikTok', metrics);
          syncedPlatforms.push('TikTok');
        } else {
          errors.push('TikTok: No metrics returned');
        }
      } catch (error) {
        errors.push(`TikTok: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      await new Promise(r => setTimeout(r, 200));
    }

    if (post.igUrl) {
      try {
        const metrics = await scrapeMetrics(post.igUrl);
        if (metrics) {
          await updatePostMetrics(post.id, 'Instagram', metrics);
          syncedPlatforms.push('Instagram');
        } else {
          errors.push('Instagram: No metrics returned');
        }
      } catch (error) {
        errors.push(`Instagram: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      await new Promise(r => setTimeout(r, 200));
    }

    if (syncedPlatforms.length > 0) {
      await updateEngagementRate(post.id);
      results.push({ id: post.id, title: post.title, success: true, platforms: syncedPlatforms });
    } else if (errors.length > 0) {
      results.push({ id: post.id, title: post.title, success: false, error: errors.join('; ') });
    } else {
      results.push({ id: post.id, title: post.title, success: false, error: 'No URLs to sync' });
    }
  }

  return { results, successCount: results.filter(r => r.success).length };
}
