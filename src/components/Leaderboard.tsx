"use client";

import React, { useEffect, useState } from 'react';

interface LeaderboardEntry {
  country: string;
  clicks: number;
}

const Leaderboard: React.FC = () => {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const getLeaderboardData = async () => {
    try {
      const response = await fetch('/api/leaderboard');
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard data');
      }
      const data = await response.json();
      setLeaderboardData(data);
    } catch (error: any) {
      console.error("Failed to fetch leaderboard data:", error);
      setError(error.message);
    }
  };

  useEffect(() => {
    getLeaderboardData();
    const interval = setInterval(getLeaderboardData, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
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
          {leaderboardData.map((entry, index) => (
            <tr key={entry.country} className="border-t border-gray-700">
              <td className="p-2">{index + 1}</td>
              <td className="p-2">{entry.country}</td>
              <td className="p-2">{entry.clicks}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Leaderboard;
