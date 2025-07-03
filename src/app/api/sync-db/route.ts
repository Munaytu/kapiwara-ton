import { redis } from "@/lib/redis";
import { supabase } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic'

// This function now performs the sync logic and throws an error on failure.
async function syncLeaderboard() {
  console.log("[API/SYNC-DB] Starting leaderboard sync...");

    // Get all keys matching the pattern "country:*" from Redis.
    const keys = await redis.keys("country:*");
    console.log(`[API/SYNC-DB] Found ${keys.length} country keys in Redis.`);

    // If there are no keys, return early
    if (!keys || keys.length === 0) {
      console.log("[API/SYNC-DB] No country keys found in Redis. Nothing to sync.");
      return;
    }

    // Fetch all the click counts from Redis
    const clickCounts = await redis.mget(keys);
    console.log("[API/SYNC-DB] Fetched click counts from Redis:", clickCounts);

    if (!clickCounts || clickCounts.length === 0) {
      console.log("[API/SYNC-DB] No click counts found in Redis.");
      return;
    }

    // Aggregate counts, normalizing country codes to lowercase
    const aggregatedCounts: { [key: string]: number } = {};
    keys.forEach((key, index) => {
      const countryCode = key.split(":")[1].toUpperCase();
      const clickValue = clickCounts[index];
      const clicks = Number(clickValue) || 0;
      
      if (clicks > 0) {
          aggregatedCounts[countryCode] = (aggregatedCounts[countryCode] || 0) + clicks;
      }
    });

    // Fetch existing click counts from Supabase for the countries we are updating.
    const countryCodes = Object.keys(aggregatedCounts);
    const { data: existingData, error: selectError } = await supabase
      .from("countries")
      .select("country_code, clicks")
      .in("country_code", countryCodes);

    if (selectError) {
      console.error("[API/SYNC-DB] Error fetching existing data from Supabase:", selectError);
      throw new Error("Failed to fetch existing data from Supabase");
    }

    // Create a map of existing clicks for easy lookup.
    const existingClicksMap = new Map(existingData.map(d => [d.country_code, d.clicks]));

    // Add the new clicks to the existing ones.
    const updates = Object.entries(aggregatedCounts).map(([country_code, newClicks]) => {
      const existingClicks = existingClicksMap.get(country_code) || 0;
      return {
        country_code,
        clicks: existingClicks + newClicks,
      };
    });
    console.log("[API/SYNC-DB] Prepared updates for Supabase:", updates);

    // Use a single upsert operation with all updates
    const { error } = await supabase
      .from("countries")
      .upsert(updates, { onConflict: "country_code" });

    if (error) {
      console.error("[API/SYNC-DB] Error updating Supabase:", error);
      throw new Error("Failed to update Supabase");
    }

    // After successful upsert, delete the keys from Redis
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`[API/SYNC-DB] Cleared ${keys.length} keys from Redis.`);
    }

    // Clear the leaderboard cache to force a refresh on the next client request.
    await redis.del("leaderboard");
    console.log("[API/SYNC-DB] Leaderboard cache cleared.");

    // --- New: Update the full leaderboard in Redis ---
    await updateFullLeaderboardInRedis();

    console.log("[API/SYNC-DB] Successfully synced leaderboard from Redis to Supabase.");
}

async function updateFullLeaderboardInRedis() {
  console.log("[API/SYNC-DB] Updating full leaderboard in Redis...");

  try {
    // 1. Fetch all country data from Supabase
    const { data, error } = await supabase
      .from("countries")
      .select("country_code, clicks")
      .order("clicks", { ascending: false }); // Order by clicks descending

    if (error) {
      throw new Error(`Failed to fetch country data from Supabase: ${error.message}`);
    }

    if (!data || data.length === 0) {
      console.log("[API/SYNC-DB] No country data found in Supabase.");
      return;
    }

    // 2. Store the leaderboard in Redis as a sorted set (key: 'leaderboard')
    const pipeline = redis.pipeline();
    for (const country of data) {
      pipeline.zadd('leaderboard', country.clicks, country.country_code);
    }
    await pipeline.exec();

    console.log("[API/SYNC-DB] Full leaderboard updated in Redis.");
  } catch (error) {
    console.error("[API/SYNC-DB] Error updating full leaderboard in Redis:", error);
  }
}

export async function GET(req: NextRequest) {
    // Secure this endpoint with a secret key
    const secret = req.headers.get('authorization')?.split(' ')[1]

    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
      await syncLeaderboard()
      return NextResponse.json({ message: 'Leaderboard synced successfully' }, { status: 200 })
    } catch (error) {
      console.error("[API/SYNC-DB] GET handler caught error:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during sync.";
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}