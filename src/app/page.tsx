  "use client";

import { useState, useEffect, useRef } from "react";
import Leaderboard from "@/components/Leaderboard"; // Import the new component
import Image from "next/image";

export default function HomePage() {
  // Total clicks in the current session, for UI display
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sessionClicks, setSessionClicks] = useState(0);
  
  // Clicks waiting to be sent to the backend. useRef is used to avoid re-renders.
  const clickQueue = useRef(0);

  const [isPopped, setIsPopped] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  // Setup audio on component mount
  useEffect(() => {
    setAudio(new Audio("/audio/pop.mp3"));
  }, []);

  // Setup an interval to send clicks to the backend every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (clickQueue.current > 0) {
        // Send the clicks and reset the queue
        fetch('/api/click', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ clickCount: clickQueue.current }),
        })
        .catch(error => {
          console.error("Failed to send clicks:", error);
          setErrorMessage("Error sending clicks. Please try again.");
        });
        
        // Reset the queue for the next batch
        clickQueue.current = 0;
      }
    }, 2000); // Send data every 2 seconds

    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, []); // Empty dependency array ensures this runs only once

  const handleClick = () => {
    // Update UI immediately
    setSessionClicks((prev) => prev + 1);
    
    // Add to the queue to be sent
    clickQueue.current += 1;

    // Visual and audio feedback
    setIsPopped(true);
    // Reset and play audio
    if (audio) {
      audio.currentTime = 0;
      audio.play();
    }
    setTimeout(() => {
      setIsPopped(false);
    }, 200);
  };

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white p-4 cursor-pointer"
      onMouseDown={handleClick}
      onTouchStart={(e) => {
        e.preventDefault(); // Prevent double-clicks on mobile
        handleClick();
      }}
      style={{ touchAction: 'manipulation' }} // Improve mobile responsiveness
    >
      <h1 className="text-5xl font-bold mb-4">Kapiwara Ton</h1>
      <div className="relative w-64 h-64 md:w-80 md:h-80 lg:w-96 lg:h-96">
        <Image
          src={isPopped ? "/images/kapiwara-open.jpg" : "/images/kapiwara-closed.jpg"}
          alt="Kapiwara"
          fill
          className="object-contain select-none"
          draggable="false"
        />
      {errorMessage && <p className="text-red-500">{errorMessage}</p>}
      </div>
      <p className="text-7xl font-mono font-bold mt-4">{sessionClicks}</p>
      
      {/* Add the Leaderboard component here */}
      <Leaderboard />
    </main>
  );
}