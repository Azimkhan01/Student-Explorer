
"use client";

import { useCallback } from "react";
import { useSocket } from "@/context/SocketContext";

import type { ClientToServerEvents } from "@/lib/socket/socket.types";

export function useSocketEmit() {
  const { socket, isConnected } = useSocket();

  const emit = useCallback(
    <EventName extends keyof ClientToServerEvents>(
      event: EventName,
      ...args: Parameters<ClientToServerEvents[EventName]>
    ) => {
      if (!socket || !isConnected) {
        console.warn("Socket is not connected");
        return false;
      }

      socket.emit(event, ...args);
      return true;
    },
    [socket, isConnected]
  );

  return { emit, isConnected };
}
