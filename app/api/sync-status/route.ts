import { NextResponse } from 'next/server';
import { Client } from '@notionhq/client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const notion = new Client({ auth: process.env.NOTION_API_KEY?.trim() });
const databaseId = process.env.NOTION_DATABASE_ID!.trim();
const growthDatabaseId = process.env.NOTION_GROWTH_DATABASE_ID?.trim();

// Surface the freshness of the daily cron + per-post syncs so silent failures
// (cron 500s, expired tokens, datacenter IP blocks) become visible.
export async function GET() {
  try {
    let growth: {
      lastDate: string | null;
      lastEditedAt: string | null;
      hoursSinceLastEdit: number | null;
    } = { lastDate: null, lastEditedAt: null, hoursSinceLastEdit: null };

    if (growthDatabaseId) {
      const r: any = await notion.databases.query({
        database_id: growthDatabaseId,
        sorts: [{ property: 'Date', direction: 'descending' }],
        page_size: 1,
      });
      const last = r.results[0];
      if (last) {
        const lastDate = last.properties?.['Date']?.title?.[0]?.plain_text || null;
        const lastEditedAt = last.last_edited_time;
        const hours = lastEditedAt
          ? (Date.now() - new Date(lastEditedAt).getTime()) / 36e5
          : null;
        growth = { lastDate, lastEditedAt, hoursSinceLastEdit: hours };
      }
    }

    // Per-post staleness: how many Posted entries with a URL haven't been
    // synced in over 36 hours (= a missed daily cron + buffer).
    const STALE_HOURS = 36;
    const now = Date.now();
    let cursor: string | undefined;
    const platforms = { tiktok: { total: 0, stale: 0 }, instagram: { total: 0, stale: 0 } };

    do {
      const r: any = await notion.databases.query({
        database_id: databaseId,
        start_cursor: cursor,
        filter: { property: 'Status', select: { equals: 'Posted' } },
      });
      for (const p of r.results) {
        const lastSynced = p.properties?.['Last Synced']?.date?.start || null;
        const ageH = lastSynced
          ? (now - new Date(lastSynced).getTime()) / 36e5
          : Infinity;
        const stale = ageH > STALE_HOURS;
        if (p.properties?.['TikTok URL']?.url) {
          platforms.tiktok.total++;
          if (stale) platforms.tiktok.stale++;
        }
        if (p.properties?.['Instagram URL']?.url) {
          platforms.instagram.total++;
          if (stale) platforms.instagram.stale++;
        }
      }
      cursor = r.has_more ? r.next_cursor : undefined;
    } while (cursor);

    return NextResponse.json({
      growth,
      platforms,
      staleThresholdHours: STALE_HOURS,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'sync-status failed', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
