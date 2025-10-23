import ioClient from "socket.io-client";

const SOCKET_URL =
  (import.meta as any)?.env?.VITE_SOCKET_URL ||
  import.meta.env?.VITE_SOCKET_URL ||
  "http://localhost:5005";

export type ServerToClient = {
  "message:new": (m: {
    senderId: string;
    receiverId: string;
    text: string;
    timestamp: number;
  }) => void;
  "messages:sync": (
    list: {
      senderId: string;
      receiverId: string;
      text: string;
      timestamp: number;
    }[]
  ) => void;
  "conversation:deleted": (p: { participantId: string }) => void;
};

export type ClientToServer = {
  "user:join": (p: { userId: string }) => void;
};

type AuthSocket = ReturnType<typeof ioClient> & {
  auth?: Record<string, unknown>;
};

export const socket = ioClient(SOCKET_URL, {
  autoConnect: false,
}) as AuthSocket;
