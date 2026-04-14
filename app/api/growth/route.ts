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

    // Get latest snapshot for current stats
    const latest = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;

    const buildComparison = (dayOffset: number) => {
      if (!latest || snapshots.length < 2) return null;

      const latestDate = new Date(`${latest.date}T00:00:00Z`);
      const targetDate = new Date(latestDate);
      targetDate.setUTCDate(targetDate.getUTCDate() - dayOffset);

      let comparisonSnapshot = snapshots[0];
      for (const snapshot of snapshots) {
        const snapshotDate = new Date(`${snapshot.date}T00:00:00Z`);
        if (snapshotDate <= targetDate) {
          comparisonSnapshot = snapshot;
        } else {
          break;
        }
      }

      if (!comparisonSnapshot || comparisonSnapshot.date === latest.date) {
        return null;
      }

      const tiktokFollowerChange = latest.tiktokFollowers - comparisonSnapshot.tiktokFollowers;
      const igFollowerChange = latest.instagramFollowers - comparisonSnapshot.instagramFollowers;

      return {
        tiktokFollowers: {
          current: latest.tiktokFollowers,
          previous: comparisonSnapshot.tiktokFollowers,
          change: tiktokFollowerChange,
          changePercent: comparisonSnapshot.tiktokFollowers > 0
            ? Math.round((tiktokFollowerChange / comparisonSnapshot.tiktokFollowers) * 10000) / 100
            : 0,
        },
        instagramFollowers: {
          current: latest.instagramFollowers,
          previous: comparisonSnapshot.instagramFollowers,
          change: igFollowerChange,
          changePercent: comparisonSnapshot.instagramFollowers > 0
            ? Math.round((igFollowerChange / comparisonSnapshot.instagramFollowers) * 10000) / 100
            : 0,
        },
      };
    };

    const comparisons = {
      days7: buildComparison(7),
      days30: buildComparison(30),
    };

    const weekOverWeek = comparisons.days7;

    return NextResponse.json({
      snapshots,
      latest,
      comparisons,
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
