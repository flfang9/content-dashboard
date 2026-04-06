import { NextResponse } from 'next/server';
import { fetchAllPosts, calculateStats } from '@/lib/notion';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const posts = await fetchAllPosts();
    const stats = calculateStats(posts);

    return NextResponse.json({
      posts,
      stats,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts from Notion' },
      { status: 500 }
    );
  }
}
