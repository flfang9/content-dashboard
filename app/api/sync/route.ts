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
    const results: Array<{ id: string; title: string; success: boolean; error?: string }> = [];

    console.log(`Syncing metrics for ${posts.length} posts...`);

    for (const post of posts) {
      if (!post.postUrl) continue;

      try {
        const metrics = await scrapeMetrics(post.postUrl);

        if (metrics) {
          await updatePostMetrics(post.id, metrics);
          results.push({
            id: post.id,
            title: post.title,
            success: true,
          });
          console.log(`Synced: ${post.title}`);
        } else {
          results.push({
            id: post.id,
            title: post.title,
            success: false,
            error: 'No metrics returned from scraper',
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({
          id: post.id,
          title: post.title,
          success: false,
          error: errorMessage,
        });
        console.error(`Failed to sync ${post.title}:`, error);
      }

      // Rate limiting - wait 1 second between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
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
