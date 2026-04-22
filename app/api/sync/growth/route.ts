import { NextRequest, NextResponse } from 'next/server';
import { runGrowthSnapshot } from '@/lib/sync-helpers';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

async function handle() {
  const growth = await runGrowthSnapshot();
  const status = growth.success ? 200 : 500;
  return NextResponse.json({ growth, syncedAt: new Date().toISOString() }, { status });
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
