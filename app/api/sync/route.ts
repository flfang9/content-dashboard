import { NextRequest, NextResponse } from 'next/server';
import { fetchPostedForSync, updatePostMetrics } from '@/lib/notion';
import { scrapeMetrics } from '@/lib/scrapers';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60 seconds for sync

export async function GET(request: NextRequest) {
  // Verify cron secret for Vercel cron jobs
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // In production, require the cron secret
  if (process.env.NODE_ENV === 'production' && cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
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

    return NextResponse.json({
      message: `Synced ${successCount}/${posts.length} posts`,
      results,
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

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}
