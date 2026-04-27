import { NextRequest, NextResponse } from 'next/server';
import { runPostSync, runInstagramImport } from '@/lib/sync-helpers';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

async function handle() {
  const importResult = await runInstagramImport();
  const { results, successCount } = await runPostSync();

  return NextResponse.json({
    message: `Synced ${successCount}/${results.length} posts` +
      (importResult.imported > 0 ? `, imported ${importResult.imported} new Instagram posts` : ''),
    imported: importResult.imported,
    importErrors: importResult.errors.length > 0 ? importResult.errors : undefined,
    results,
    syncedAt: new Date().toISOString(),
  });
}

export async function POST() {
  return handle();
}
