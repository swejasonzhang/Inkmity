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

export async function connectSocket(
  getToken: () => Promise<string | null>,
  userId?: string
) {
  try {
    const token = await getToken();
    socket.auth = { token: token || "", userId: userId || "" };
  } catch {
    socket.auth = {};
  }
  if (!socket.connected) socket.connect();
}

export function disconnectSocket() {
  if (socket.connected) socket.disconnect();
}