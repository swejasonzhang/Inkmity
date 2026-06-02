import ioClient from "socket.io-client";
import { env } from "@/utils/env";

const SOCKET_URL = env.socketUrl;
const SOCKET_PATH = env.socketPath;

type AuthSocket = ReturnType<typeof ioClient> & {
  auth?: Record<string, unknown>;
};

export const socket: AuthSocket = ioClient(SOCKET_URL.replace(/\/+$/, ""), {
  path: SOCKET_PATH,
  transports: ["websocket"],
  autoConnect: false,
}) as AuthSocket;

export function getSocket() {
  return socket;
}

// Reference count: only connect on first subscriber, only disconnect on last.
let subscriberCount = 0;

export async function connectSocket(
  getToken: () => Promise<string | null>,
  userId?: string
) {
  subscriberCount++;

  // If already connected with valid auth, skip re-initialising credentials.
  if (socket.connected) return;

  try {
    const token = await getToken();
    socket.auth = { token: token || "", userId: userId || "" };
  } catch {
    socket.auth = {};
  }
  if (!socket.connected) socket.connect();
}

export function disconnectSocket() {
  subscriberCount = Math.max(0, subscriberCount - 1);
  // Only physically disconnect when no subscribers remain.
  if (subscriberCount === 0 && socket.connected) socket.disconnect();
}
