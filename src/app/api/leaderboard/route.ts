
import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { supabase } from '@/lib/supabaseClient';

const CACHE_KEY = 'leaderboard';
const CACHE_EXPIRATION_SECONDS = 10; // Cache for 10 seconds

export async function GET() {
  try {
    // 1. Try to get the leaderboard from Redis cache first
    console.log("[API/LEADERBOARD] Attempting to fetch from cache...");
    const cachedLeaderboard = await redis.get(CACHE_KEY);

    if (cachedLeaderboard) {
      // Cache HIT: Return the cached data immediately
      console.log("[API/LEADERBOARD] Cache HIT. Returning cached data.");
      return NextResponse.json(cachedLeaderboard);
    }

    // 2. Cache MISS: If not in cache, get data from Supabase
    console.log("[API/LEADERBOARD] Cache MISS. Fetching from Supabase...");
    const { data: rawData, error } = await supabase
      .from('countries')
      .select('country_code, clicks')
      .order('clicks', { ascending: false });

    if (error) {
      console.error("[API/LEADERBOARD] Error fetching from Supabase:", error);
      throw error; // Let the outer catch block handle it
    }

    // Aggregate data to handle case-insensitivity (e.g., 'dev' and 'DEV')
    const aggregatedData = rawData.reduce((acc, { country_code, clicks }) => {
      const lowerCaseCountry = country_code.toLowerCase();
      acc[lowerCaseCountry] = (acc[lowerCaseCountry] || 0) + clicks;
      return acc;
    }, {} as Record<string, number>);

    // Format the aggregated data back into the desired array structure and sort it
    const leaderboardData = Object.entries(aggregatedData)
      .map(([country, clicks]) => ({ country, clicks }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 10); // Take the top 10

    console.log("[API/LEADERBOARD] Fetched and aggregated from Supabase:", leaderboardData);

    // 3. Store the fresh data in Redis cache with an expiration time
    console.log("[API/LEADERBOARD] Storing fresh data in cache...");
    const pipe = redis.pipeline();
    pipe.set(CACHE_KEY, JSON.stringify(leaderboardData));
    pipe.expire(CACHE_KEY, CACHE_EXPIRATION_SECONDS);
    await pipe.exec();

    // 4. Return the fresh data
    return NextResponse.json(leaderboardData);

  } catch (error) {
    console.error('Error in /api/leaderboard:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Set revalidation to 0 to ensure this route is always dynamic
export const revalidate = 0;
