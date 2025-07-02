import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { supabase } from '@/lib/supabaseClient';

// IMPORTANT: Protect this route with a secret token
const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(request: NextRequest) {
  // 1. Check for the secret token in the authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 2. Get all country keys from Redis
    const countryKeys = await redis.keys('country:*');

    if (countryKeys.length === 0) {
      return NextResponse.json({ message: 'No new clicks to sync.' });
    }

    // 3. Get the click counts for all keys
    const clickCounts = await redis.mget(...countryKeys);

    // 4. Prepare the data for Supabase upsert
    const updates = countryKeys.map((key, index) => ({
      country_code: key.split(':')[1],
      clicks: clickCounts[index] as number,
    }));

    // 5. Upsert the data into Supabase
    // `upsert` will update existing rows or insert new ones if they don't exist.
    // The `onConflict` option specifies that `country_code` is the unique key.
    const { error: upsertError } = await supabase.from('countries').upsert(updates, {
      onConflict: 'country_code',
    });

    if (upsertError) {
      throw upsertError;
    }

    // 6. Clear the keys from Redis after successful sync
    // This prevents double-counting in the next run.
    await redis.del(...countryKeys);

    return NextResponse.json({ message: `Synced ${updates.length} countries.` });

  } catch (error) {
    console.error('Error in /api/sync-db:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}