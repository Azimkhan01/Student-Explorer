"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  type ReactNode,
} from "react";

import { io, type Socket } from "socket.io-client";

import type {
  ServerToClientEvents,
  ClientToServerEvents,
} from "@/lib/socket/socket.types";

type SocketInstance = Socket<ServerToClientEvents, ClientToServerEvents>;

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

interface SocketContextType {
  socket: SocketInstance | null;
  status: ConnectionStatus;
  isConnected: boolean;
  reconnect: () => void;
  disconnect: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: ReactNode;
  accessToken: string | null;
}

export function SocketProvider({ children, accessToken }: SocketProviderProps) {
  const [socket, setSocket] = useState<SocketInstance | null>(null);

  const [status, setStatus] = useState<ConnectionStatus>("disconnected");

  useEffect(() => {
    setStatus("connecting");

    const socketInstance: SocketInstance = io(undefined, {
      path: "/server/socket.io",

      // Test using HTTP polling only
      transports: ["polling"],

      autoConnect: false,
      withCredentials: true,

      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5,

      timeout: 10000,
    });

    console.log(socketInstance);

    const handleConnect = () => {
      setStatus("connected");
      console.log("Socket connected:", socketInstance.id);
    };

    const handleDisconnect = (reason: string) => {
      setStatus("disconnected");
      console.log("Socket disconnected:", reason);
    };

    const handleConnectError = (error: Error) => {
      setStatus("error");
      console.error("Socket connection error:", error.message);
    };

    socketInstance.on("connect", handleConnect);
    socketInstance.on("disconnect", handleDisconnect);
    socketInstance.on("connect_error", handleConnectError);

    setSocket(socketInstance);
    socketInstance.connect();

    return () => {
      socketInstance.off("connect", handleConnect);
      socketInstance.off("disconnect", handleDisconnect);
      socketInstance.off("connect_error", handleConnectError);

      socketInstance.disconnect();
      setSocket(null);
    };
  }, [accessToken]);

  const reconnect = useCallback(() => {
    socket?.connect();
  }, [socket]);

  const disconnect = useCallback(() => {
    socket?.disconnect();
  }, [socket]);

  const value = useMemo(
    () => ({
      socket,
      status,
      isConnected: status === "connected",
      reconnect,
      disconnect,
    }),
    [socket, status, reconnect, disconnect],
  );

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);

  if (!context) {
    throw new Error("useSocket must be used inside SocketProvider");
  }

  return context;
}
