
"use client";

import { TonConnectUIProvider } from "@tonconnect/ui-react";
import { ReactNode } from "react";

export function TonConnectProvider({ children }: { children: ReactNode }) {
  const manifestUrl = new URL("/tonconnect-manifest.json", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").toString();

  return (
    <TonConnectUIProvider manifestUrl={manifestUrl}>
      {children}
    </TonConnectUIProvider>
  );
}
