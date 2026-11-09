
"use client";

import { useEffect, useRef } from "react";
import { useSocket } from "@/context/SocketContext";
import type { ServerToClientEvents } from "@/lib/socket/socket.types";

export function useSocketEvent<
  EventName extends keyof ServerToClientEvents
>(
  event: EventName,
  callback: ServerToClientEvents[EventName]
) {
  const { socket } = useSocket();

  // Store the latest callback
  const callbackRef = useRef(callback);

  // Keep the ref updated whenever callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Register socket listener
  useEffect(() => {
    if (!socket) return;

    const handler = (...args: Parameters<ServerToClientEvents[EventName]>) => {
      Reflect.apply(callbackRef.current, undefined, args);
    };

    socket.on(event, handler as never);

    return () => {
      socket.off(event, handler as never);
    };
  }, [socket, event]);
}
