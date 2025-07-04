  "use client";

import { useState, useEffect, useRef } from "react";
import Leaderboard from "@/components/Leaderboard"; // Import the new component
import Image from "next/image";

import { TonConnectButton, useTonWallet, useTonConnectUI } from "@tonconnect/ui-react";
import { beginCell, toNano, Address } from "@ton/core";
import { Buffer } from "buffer";

export default function HomePage() {
  const wallet = useTonWallet();
  const [tonConnectUI] = useTonConnectUI();
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
      if (clickQueue.current > 0 && wallet) {
        // Send the clicks and reset the queue
        fetch('/api/clicks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            clickCount: clickQueue.current,
            walletAddress: wallet.account.address,
          }),
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
  }, [wallet]); // Empty dependency array ensures this runs only once

  const handleClick = () => {
    if (!wallet) {
      setErrorMessage("Please connect your wallet first.");
      return;
    }
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

  const handleClaim = async () => {
    if (!wallet) {
      alert("Please connect your wallet first.");
      return;
    }

    try {
      // 1. Llama a tu backend para obtener los datos autorizados
      const response = await fetch('/api/authorize-reward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress: wallet.account.address })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get authorization from backend.");
      }

      // 2. Construye el cuerpo del mensaje (message body)
      // ¡IMPORTANTE! La firma va dentro de una celda de referencia (storeRef).
      const signatureCell = beginCell()
        .storeBuffer(Buffer.from(data.signature, 'hex'))
        .endCell();

      const claimMessageBody = beginCell()
        .storeUint(0x7072c98b, 32) // OP_CLAIM_REWARDS_INTERNAL
        .storeUint(0, 64) // query_id
        .storeAddress(Address.parse(wallet.account.address))
        .storeCoins(BigInt(data.rewardAmount))
        .storeUint(data.validUntil, 32)
        .storeUint(BigInt(data.nonce), 256)
        .storeRef(signatureCell) // La firma como referencia
        .endCell();

      // 3. Prepara y envía la transacción
      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 360, // Tx válida por 6 minutos
        messages: [
          {
            address: "kQBHI1bGH4ewiHKSJTJj-4J_E7o5SyCL6NAw7R9n3j8OFQsM",
            amount: toNano("0.15").toString(), // Gas para el minter (cubre la acuñación y 3 transferencias de jettons)
            payload: claimMessageBody.toBoc().toString("base64"),
          },
        ],
      };

      await tonConnectUI.sendTransaction(transaction);
      alert("Transaction sent! Please wait for confirmation.");

    } catch (error) {
      console.error(error);
      alert("An error occurred: " + (error as Error).message);
    }
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
      <div className="absolute top-4 right-4">
        <TonConnectButton />
      </div>
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
      <div className="mt-4">
        <button
          onClick={handleClaim}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Claim Rewards
        </button>
      </div>
      
      {/* Add the Leaderboard component here */}
      <Leaderboard />
    </main>
  );
}