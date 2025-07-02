
import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { headers } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // 1. Extract the number of clicks from the request body
    const body = await request.json();
    const { clickCount } = body;

    if (typeof clickCount !== 'number' || clickCount <= 0) {
      return NextResponse.json({ error: 'Invalid click count' }, { status: 400 });
    }

    // 2. Get the user's country from Vercel's injected headers
    // The `headers()` function from `next/headers` is used to access them.
    const countryCode = headers().get('x-vercel-ip-country') || 'dev';

    if (!countryCode) {
      return NextResponse.json({ error: 'Could not determine country' }, { status: 400 });
    }

    // 3. Use Redis to increment the count for that country
    // This is extremely fast and avoids hitting the main database.
    const key = `country:${countryCode}`;
    await redis.incrby(key, clickCount);

    return NextResponse.json({ message: `Clicks recorded for ${countryCode}` });

  } catch (error) {
    console.error('Error in /api/click:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
