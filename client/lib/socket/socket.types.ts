export interface ServerToClientEvents {
  connect: () => void;

  disconnect: (reason: string) => void;

  "message:received": (message: {
    id: string;
    content: string;
    senderId: string;
  }) => void;

  "notification:new": (notification: {
    id: string;
    title: string;
    body: string;
  }) => void;
}

export interface ClientToServerEvents {
  "message:send": (
    data: { content: string },
    callback: (response: {
      success: boolean;
      messageId?: string;
      error?: string;
    }) => void
  ) => void;

  "user:typing": (data: { conversationId: string }) => void;
}