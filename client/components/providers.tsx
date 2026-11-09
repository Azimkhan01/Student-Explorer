"use client";

import { SocketProvider } from "@/context/SocketContext";
import type { ReactNode } from "react";

interface ProvidersProps {
  children: ReactNode;
  accessToken: string | null;
}

export default function Providers({
  children,
  accessToken,
}: ProvidersProps) {
  return (
    <SocketProvider accessToken={accessToken}>
      {children}
    </SocketProvider>
  );
}