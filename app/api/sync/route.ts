import { NextRequest, NextResponse } from 'next/server';
import { fetchPostedForSync, updatePostMetrics, updateEngagementRate, createGrowthSnapshot, hasSnapshotForToday, getExistingInstagramShortcodes, createInstagramPost } from '@/lib/notion';
import { scrapeMetrics, scrapeTikTokProfile, getInstagramAccountStats, fetchAllInstagramMedia, clearInstagramCache } from '@/lib/scrapers';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60 seconds for sync

async function runSync() {

  try {
    // Clear Instagram cache to get fresh data
    clearInstagramCache();

    // ─── Instagram Auto-Import ─────────────────────────────────────────────────
    // Fetch all Instagram posts and create entries for new ones
    let importedCount = 0;
    const importErrors: string[] = [];

    try {
      const existingShortcodes = await getExistingInstagramShortcodes();
      const igMedia = await fetchAllInstagramMedia();

      console.log(`Found ${igMedia.length} Instagram posts, ${existingShortcodes.size} already in Notion`);

      for (const media of igMedia) {
        // Skip if already exists (compare by shortcode to handle URL variations)
        if (existingShortcodes.has(media.shortcode)) {
          continue;
        }

        try {
          // Extract title from caption (first line, max 80 chars)
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

          importedCount++;
          console.log(`Imported Instagram: ${title}`);
        } catch (err) {
          importErrors.push(`${media.shortcode}: ${err instanceof Error ? err.message : 'Unknown'}`);
        }

        // Rate limit
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    } catch (err) {
      console.error('Instagram import error:', err);
      importErrors.push(`Import failed: ${err instanceof Error ? err.message : 'Unknown'}`);
    }

    // ─── Sync Existing Posts ───────────────────────────────────────────────────
    const posts = await fetchPostedForSync();
    const results: Array<{ id: string; title: string; success: boolean; error?: string; platforms?: string[] }> = [];

    console.log(`Syncing metrics for ${posts.length} posts...`);

    for (const post of posts) {
      const syncedPlatforms: string[] = [];
      const errors: string[] = [];

      // Sync TikTok if URL exists
      if (post.tiktokUrl) {
        try {
          const metrics = await scrapeMetrics(post.tiktokUrl);
          if (metrics) {
            await updatePostMetrics(post.id, 'TikTok', metrics);
            syncedPlatforms.push('TikTok');
            console.log(`Synced TikTok: ${post.title}`);
          } else {
            errors.push('TikTok: No metrics returned');
          }
        } catch (error) {
          errors.push(`TikTok: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Sync Instagram if URL exists
      if (post.igUrl) {
        try {
          const metrics = await scrapeMetrics(post.igUrl);
          if (metrics) {
            await updatePostMetrics(post.id, 'Instagram', metrics);
            syncedPlatforms.push('Instagram');
            console.log(`Synced Instagram: ${post.title}`);
          } else {
            errors.push('Instagram: No metrics returned');
          }
        } catch (error) {
          errors.push(`Instagram: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Update engagement rate after syncing metrics
      if (syncedPlatforms.length > 0) {
        await updateEngagementRate(post.id);
      }

      // Record result
      if (syncedPlatforms.length > 0) {
        results.push({
          id: post.id,
          title: post.title,
          success: true,
          platforms: syncedPlatforms,
        });
      } else if (errors.length > 0) {
        results.push({
          id: post.id,
          title: post.title,
          success: false,
          error: errors.join('; '),
        });
      } else {
        results.push({
          id: post.id,
          title: post.title,
          success: false,
          error: 'No URLs to sync',
        });
      }
    }

    const successCount = results.filter(r => r.success).length;

    // ─── Growth Snapshot Tracking ─────────────────────────────────────────────
    let growthResult = null;

    // Only create one snapshot per day
    const alreadySnapped = await hasSnapshotForToday();
    if (!alreadySnapped) {
      try {
        // Fetch account-level stats
        const tiktokUsername = process.env.TIKTOK_USERNAME;
        const tiktokProfile = tiktokUsername ? await scrapeTikTokProfile(tiktokUsername) : null;
        const igAccount = await getInstagramAccountStats();

        // Sum up all post metrics for totals
        const postedPosts = posts.filter(p => p.status === 'Posted');
        const tiktokViews = postedPosts.reduce((sum, p) => {
          // Get TikTok-specific views if available (stored in notion)
          return sum + (p.views || 0);
        }, 0);
        const tiktokLikes = postedPosts.reduce((sum, p) => sum + (p.likes || 0), 0);

        // For IG, we'd need platform-specific metrics - for now use combined
        const igViews = 0; // Would need to track separately
        const igLikes = 0;

        const today = new Date().toISOString().split('T')[0];

        await createGrowthSnapshot({
          date: today,
          tiktokFollowers: tiktokProfile?.followers || 0,
          tiktokTotalLikes: tiktokProfile?.likes || 0,
          tiktokVideos: tiktokProfile?.videos || 0,
          instagramFollowers: igAccount?.followers || 0,
          instagramPosts: igAccount?.postsCount || 0,
          tiktokViews,
          tiktokLikes,
          instagramViews: igViews,
          instagramLikes: igLikes,
        });

        growthResult = {
          success: true,
          tiktokFollowers: tiktokProfile?.followers,
          instagramFollowers: igAccount?.followers,
        };

        console.log('Growth snapshot created:', growthResult);
      } catch (error) {
        console.error('Growth snapshot error:', error);
        growthResult = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    } else {
      growthResult = { skipped: true, reason: 'Snapshot already exists for today' };
    }

    return NextResponse.json({
      message: `Synced ${successCount}/${posts.length} posts` + (importedCount > 0 ? `, imported ${importedCount} new Instagram posts` : ''),
      imported: importedCount,
      importErrors: importErrors.length > 0 ? importErrors : undefined,
      results,
      growth: growthResult,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: 'Sync failed', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

// GET - for cron jobs (requires CRON_SECRET in production)
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // In production, require the cron secret for GET requests (cron jobs)
  if (process.env.NODE_ENV === 'production' && cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  return runSync();
}

// POST - for manual triggers from dashboard (no auth required)
export async function POST(request: NextRequest) {
  return runSync();
}
