import { NextRequest, NextResponse } from 'next/server';
import { runGrowthSnapshot, runInstagramImport, runTikTokRefresh } from '@/lib/sync-helpers';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function handle() {
  // Refresh per-post metrics on both platforms before snapshotting, otherwise
  // runGrowthSnapshot just sums whatever stale view counts are sitting in Notion.
  // IG and TT are independent — run them in parallel to fit in the cron budget.
  const [igRefresh, ttRefresh] = await Promise.all([
    runInstagramImport(),
    runTikTokRefresh(),
  ]);
  const growth = await runGrowthSnapshot();
  const status = growth.success ? 200 : 500;
  return NextResponse.json(
    { growth, igRefresh, ttRefresh, syncedAt: new Date().toISOString() },
    { status }
  );
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (process.env.NODE_ENV === 'production' && cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  return handle();
}

export async function POST() {
  return handle();
}
