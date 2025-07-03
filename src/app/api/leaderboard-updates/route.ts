import { redis, RedisClientType } from "@/lib/redis";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

async function getLeaderboardData() {
  const leaderboard = await redis.zrange('leaderboard', 0, -1, { rev: true, withScores: true });
  if (!leaderboard) {
    return [];
  }
  const formattedLeaderboard = [];
  for (let i = 0; i < leaderboard.length; i += 2) {
    formattedLeaderboard.push({
      country_code: leaderboard[i],
      clicks: parseInt(String(leaderboard[i + 1]), 10),
    });
  }
  return formattedLeaderboard;
}

function generateEventStream() {
  const encoder = new TextEncoder();
  let redisSubscriber: RedisClientType;

  const stream = new ReadableStream({
    async start(controller) {
      redisSubscriber = redis.duplicate();
      await redisSubscriber.connect();
      console.log("[SSE] Redis subscriber connected");

      const pushLeaderboard = async () => {
        try {
          const formattedLeaderboard = await getLeaderboardData();
          const event = { event: "leaderboard_updated", data: formattedLeaderboard };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}

`));
        } catch (error) {
          console.error("[SSE] Error pushing leaderboard:", error);
          controller.error(error);
        }
      };

      // Immediately push the current state of the leaderboard
      await pushLeaderboard();

      // Subscribe to the 'leaderboard-updates' channel
      await redisSubscriber.subscribe('leaderboard-updates', async (message: string) => {
        console.log("[SSE] Received message from Redis:", message);
        await pushLeaderboard();
      });
    },
    async cancel() {
      console.log("[SSE] Client disconnected, unsubscribing and quitting Redis.");
      if (redisSubscriber) {
        await redisSubscriber.unsubscribe('leaderboard-updates');
        await redisSubscriber.quit();
      }
    }
  });

  return stream;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_req: NextRequest) {
  console.log("[SSE] Client connected");
  return new NextResponse(generateEventStream(), {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" },
  });
}
