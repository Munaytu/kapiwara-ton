
import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export async function POST(request: NextRequest) {
    console.log("NEXT_PUBLIC_SITE_URL:", process.env.NEXT_PUBLIC_SITE_URL);
  try {
    // 1. Extract the number of clicks from the request body
    const body = await request.json();
    const { clickCount } = body;

    if (typeof clickCount !== 'number' || clickCount <= 0) {
      return NextResponse.json({ error: 'Invalid click count' }, { status: 400 });
    }

    console.log(`[API/CLICK] Received ${clickCount} clicks.`);

    // 2. Get the user's country, normalize to lowercase to prevent duplicates (e.g., 'dev' vs 'DEV')
    const countryCode = (request.headers.get('x-vercel-ip-country') || 'dev').toLowerCase();
    console.log(`[API/CLICK] Determined country: ${countryCode}`);

    // 3. Use Redis to increment the count for that country
    // This is extremely fast and avoids hitting the main database.
    const key = `country:${countryCode}`;
    await redis.incrby(key, clickCount);
    await redis.zincrby('leaderboard', clickCount, countryCode);
    await redis.publish('leaderboard-updates', 'updated');
    console.log(`[API/CLICK] Incremented ${key} by ${clickCount}`);
    
    // 4. The sync with Supabase is now decoupled.
    // It should be handled by a periodic cron job calling /api/sync-db.
    // The slow, blocking `fetch` call has been removed.

    return NextResponse.json({ message: `Clicks recorded for ${countryCode}` });

  } catch (error) {
    console.error('Error in /api/click:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
