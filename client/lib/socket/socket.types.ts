export interface ClientToServerEvents {
  [event: string]: (...args: any[]) => void;
}

export interface ServerToClientEvents {
  [event: string]: (...args: any[]) => void;
}