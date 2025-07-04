

import { NextRequest } from 'next/server';
import { redis } from '@/lib/redis';

export const revalidate = 0;

export async function GET(req: NextRequest) {
  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  interface LeaderboardEntry {
    country_code: string;
    clicks: string;
  }

  const sendEvent = (data: LeaderboardEntry[]) => {
    writer.write(encoder.encode(`data: ${JSON.stringify(data)}

`));
  };

  const fetchAndSendLeaderboard = async () => {
    try {
      const leaderboard = await redis.zrevrange('leaderboard:country', 0, 9, 'WITHSCORES');
      const leaderboardData = [];
      for (let i = 0; i < leaderboard.length; i += 2) {
        leaderboardData.push({ country_code: leaderboard[i], clicks: leaderboard[i + 1] });
      }
      sendEvent(leaderboardData);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
  };

  // Fetch and send the leaderboard immediately
  fetchAndSendLeaderboard();

  // Then fetch and send it every 2 seconds
  const intervalId = setInterval(fetchAndSendLeaderboard, 2000);

  req.signal.onabort = () => {
    clearInterval(intervalId);
    writer.close();
  };

  return new Response(responseStream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

