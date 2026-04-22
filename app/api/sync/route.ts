import { NextRequest, NextResponse } from 'next/server';
import { runGrowthSnapshot, runInstagramImport, runPostSync } from '@/lib/sync-helpers';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function runSync() {
  try {
    const importResult = await runInstagramImport();
    const { results, successCount } = await runPostSync();
    const growth = await runGrowthSnapshot();

    return NextResponse.json({
      message: `Synced ${successCount}/${results.length} posts` +
        (importResult.imported > 0 ? `, imported ${importResult.imported} new Instagram posts` : ''),
      imported: importResult.imported,
      importErrors: importResult.errors.length > 0 ? importResult.errors : undefined,
      results,
      growth,
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

  if (process.env.NODE_ENV === 'production' && cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  return runSync();
}

// POST - for manual triggers from dashboard (no auth required)
export async function POST() {
  return runSync();
}
