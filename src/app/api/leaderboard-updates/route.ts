import { redis } from "@/lib/redis";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

function generateEventStream() {
  let counter = 0;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      async function push() {
        try {
          // 1. Get the leaderboard from Redis cache
          const leaderboard = await redis.zrange('leaderboard', 0, -1, 'REV', 'WITHSCORES');
          
          if (!leaderboard) {
            console.log("[SSE] No leaderboard data found in Redis.");
            // If no data, send an empty update or a "no data" event
            const event = { event: "leaderboard_updated", data: [] };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
            return;
          }

          // 2. Process the leaderboard data into a more usable format
          const formattedLeaderboard = [];
          for (let i = 0; i < leaderboard.length; i += 2) {
            formattedLeaderboard.push({
              country_code: leaderboard[i],
              clicks: parseInt(leaderboard[i + 1], 10),
            });
          }

          // 3. Send the leaderboard update as an SSE event
          const event = { event: "leaderboard_updated", data: formattedLeaderboard };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
          
          counter++;
        } catch (error) {
          console.error("[SSE] Error generating event:", error);
          controller.error(error);
          return;
        }

        // Instead of closing, we will push updates periodically.
        // You might adjust the interval based on your needs.
        await new Promise(resolve => setTimeout(resolve, 5000));  // Update every 5 seconds
        await push(); 
      }

      await push();
    },
    cancel() {
      console.log("[SSE] Client disconnected");
    }
  });

  return stream;
}

export async function GET(req: NextRequest) {
  console.log("[SSE] Client connected");
  return new NextResponse(generateEventStream(), {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" },
  });
}