import { NextRequest, NextResponse } from 'next/server';
import { fetchGrowthHistory } from '@/lib/notion';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get days parameter (default to 30)
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30', 10);

    // Validate days parameter
    if (isNaN(days) || days < 1 || days > 365) {
      return NextResponse.json(
        { error: 'Invalid days parameter. Must be between 1 and 365.' },
        { status: 400 }
      );
    }

    const snapshots = await fetchGrowthHistory(days);

    // Calculate week-over-week changes if we have enough data
    let weekOverWeek = null;
    if (snapshots.length >= 2) {
      const latest = snapshots[snapshots.length - 1];

      // Find snapshot from ~7 days ago
      const weekAgoIndex = Math.max(0, snapshots.length - 8);
      const weekAgo = snapshots[weekAgoIndex];

      if (latest && weekAgo) {
        const tiktokFollowerChange = latest.tiktokFollowers - weekAgo.tiktokFollowers;
        const igFollowerChange = latest.instagramFollowers - weekAgo.instagramFollowers;

        weekOverWeek = {
          tiktokFollowers: {
            current: latest.tiktokFollowers,
            previous: weekAgo.tiktokFollowers,
            change: tiktokFollowerChange,
            changePercent: weekAgo.tiktokFollowers > 0
              ? Math.round((tiktokFollowerChange / weekAgo.tiktokFollowers) * 10000) / 100
              : 0,
          },
          instagramFollowers: {
            current: latest.instagramFollowers,
            previous: weekAgo.instagramFollowers,
            change: igFollowerChange,
            changePercent: weekAgo.instagramFollowers > 0
              ? Math.round((igFollowerChange / weekAgo.instagramFollowers) * 10000) / 100
              : 0,
          },
        };
      }
    }

    // Get latest snapshot for current stats
    const latest = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;

    return NextResponse.json({
      snapshots,
      latest,
      weekOverWeek,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Growth API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch growth data', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
