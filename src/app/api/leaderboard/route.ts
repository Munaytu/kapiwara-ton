
import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { supabase } from '@/lib/supabaseClient';

const CACHE_KEY = 'leaderboard';
const CACHE_EXPIRATION_SECONDS = 10; // Cache for 10 seconds

export async function GET() {
  try {
    // 1. Try to get the leaderboard from Redis cache first
    const cachedLeaderboard = await redis.get(CACHE_KEY);

    if (cachedLeaderboard) {
      // Cache HIT: Return the cached data immediately
      return NextResponse.json(JSON.parse(cachedLeaderboard as string));
    }

    // 2. Cache MISS: If not in cache, get data from Supabase
    const { data, error } = await supabase
      .from('countries')
      .select('country_code, clicks')
      .order('clicks', { ascending: false })
      .limit(10);

    if (error) {
      throw error; // Let the outer catch block handle it
    }

    // 3. Store the fresh data in Redis cache with an expiration time
    // The `pipeline` command is used to send multiple commands at once for efficiency.
    const pipe = redis.pipeline();
    pipe.set(CACHE_KEY, JSON.stringify(data));
    pipe.expire(CACHE_KEY, CACHE_EXPIRATION_SECONDS);
    await pipe.exec();

    // 4. Return the fresh data
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error in /api/leaderboard:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Set revalidation to 0 to ensure this route is always dynamic
export const revalidate = 0;
