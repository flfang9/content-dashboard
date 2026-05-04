import { NextRequest, NextResponse } from 'next/server';
import { runGrowthSnapshot, runInstagramImport, runTikTokRefresh } from '@/lib/sync-helpers';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function handle() {
  // Refresh per-post IG metrics before snapshotting so the snapshot sums fresh
  // values. Skip the TikTok refresh on Vercel: TT blocks datacenter IPs, so
  // every scrape hangs until the function times out. The GH Actions workflow
  // (.github/workflows/daily-growth-snapshot.yml) handles TikTok separately.
  const onVercel = process.env.VERCEL === '1';

  const [igRefresh, ttRefresh] = await Promise.all([
    runInstagramImport(),
    onVercel ? Promise.resolve({ updated: 0, failed: 0, errors: ['skipped on Vercel'] }) : runTikTokRefresh(),
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
