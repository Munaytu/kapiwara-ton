/**
 * sync-dev.ts
 * 
 * This script is a development tool to manually trigger the leaderboard sync process.
 * In a production environment, this logic would be handled by a scheduled cron job.
 * 
 * Usage:
 * 1. Make sure your local development server is running (`npm run dev`).
 * 2. Execute this script from your terminal: `npx tsx scripts/sync-dev.ts`
 * 
 * What it does:
 * - It sends a GET request to the `/api/sync-db` endpoint of your running application.
 * - It includes the required `CRON_SECRET` authorization header to authenticate the request.
 * - This triggers the same synchronization logic that would run in production, moving
 *   click data from Redis to Supabase and clearing the cache.
 */

// Load environment variables from .env.local
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function runSync() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const cronSecret = process.env.CRON_SECRET;

  if (!siteUrl) {
    console.error('Error: NEXT_PUBLIC_SITE_URL is not defined in your .env.local file.');
    process.exit(1);
  }

  if (!cronSecret) {
    console.error('Error: CRON_SECRET is not defined in your .env.local file.');
    process.exit(1);
  }

  try {
    console.log(`Triggering sync for ${siteUrl}...`);

    const response = await fetch(`${siteUrl}/api/sync-db`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP error! Status: ${response.status}`);
    }

    console.log('Sync successful:', data.message);
  } catch (error) {
    console.error('Failed to run sync:', error);
  }
}

runSync();
