"use client";

import React, { useEffect, useState } from 'react';
import AnimatedNumber from './AnimatedNumber';
import { JSX } from 'react';

interface LeaderboardEntry {
  country_code: string;
  clicks: number;
}

const Leaderboard: React.FC = (): JSX.Element => {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const connectToSSE = () => {
      const eventSource = new EventSource('/api/leaderboard-updates');

      eventSource.onmessage = (event) => {
        try {
          const parsedData = JSON.parse(event.data);
          if (parsedData.event === "leaderboard_updated") {
            setLeaderboardData(parsedData.data);
          }
        } catch (e) {
          console.error("Failed to parse SSE event data:", e);
          setError("Failed to update leaderboard data.");
        }
      };

      eventSource.onerror = (event) => {
        console.error("SSE error:", event);
        setError("Failed to connect to leaderboard updates.");
        eventSource.close();
      };
    };

    connectToSSE();

    return () => {
      // eventSource.close(); // close is already called in onerror
    };
  }, []);

  

  return (
    <div className="mt-8 w-full max-w-md bg-gray-800 rounded-lg p-4">
      <h2 className="text-2xl font-bold mb-4 text-center">Leaderboard</h2>
      {error && <p className="text-red-500">{error}</p>}
      <table className="w-full text-left">
        <thead>
          <tr>
            <th className="p-2">Rank</th>
            <th className="p-2">Country</th>
            <th className="p-2">Clicks</th>
          </tr>
        </thead>
        <tbody>
          {leaderboardData.map((entry, index) => {
            return (
              <tr key={entry.country_code + index} className="border-t border-gray-700">
                <td className="p-2">{index + 1}</td>
                <td className="p-2">{entry.country_code}</td>
                <td className="p-2"><AnimatedNumber value={entry.clicks} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default Leaderboard;
