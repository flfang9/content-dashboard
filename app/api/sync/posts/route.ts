import { NextRequest, NextResponse } from 'next/server';
import { runPostSync, runInstagramImport } from '@/lib/sync-helpers';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

async function handle() {
  const importResult = await runInstagramImport();
  const { results, successCount } = await runPostSync();

  const igParts: string[] = [];
  if (importResult.updated > 0) igParts.push(`refreshed ${importResult.updated} Instagram posts`);
  if (importResult.imported > 0) igParts.push(`imported ${importResult.imported} new Instagram posts`);

  return NextResponse.json({
    message: `Synced ${successCount}/${results.length} posts` +
      (igParts.length > 0 ? `, ${igParts.join(', ')}` : ''),
    imported: importResult.imported,
    updated: importResult.updated,
    importErrors: importResult.errors.length > 0 ? importResult.errors : undefined,
    results,
    syncedAt: new Date().toISOString(),
  });
}

export async function POST() {
  return handle();
}
