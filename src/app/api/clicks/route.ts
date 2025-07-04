import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export async function POST(req: NextRequest) {
  const country = req.headers.get('x-vercel-ip-country') || 'Unknown';
  const { walletAddress, clickCount } = await req.json();

  if (!walletAddress || !clickCount) {
    return NextResponse.json({ error: 'Missing walletAddress or clickCount' }, { status: 400 });
  }

  try {
    const pipeline = redis.pipeline();
    // Increment the total clicks for the country
    pipeline.zincrby('leaderboard:country', clickCount, country);
    // Increment the total clicks for the user
    pipeline.hincrby(`user:${walletAddress}`, 'clicks', clickCount);
    // Increment the global click count
    pipeline.incrby('global:clicks', clickCount);
    
    await pipeline.exec();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating clicks:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
