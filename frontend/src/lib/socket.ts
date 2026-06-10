import ioClient from "socket.io-client";
import { env } from "@/utils/env";

const SOCKET_URL = env.socketUrl;
const SOCKET_PATH = env.socketPath;

type AuthSocket = ReturnType<typeof ioClient> & {
  auth?: Record<string, unknown>;
};

export const socket: AuthSocket = ioClient(SOCKET_URL.replace(/\/+$/, ""), {
  path: SOCKET_PATH,
  // Start on long-polling (always works through proxies) and auto-upgrade to
  // WebSocket when the upgrade succeeds. websocket-only fails hard behind
  // Render's proxy with no fallback.
  transports: ["polling", "websocket"],
  autoConnect: false,
}) as AuthSocket;

export function getSocket() {
  return socket;
}

let registeredUserId = "";

socket.on("connect", () => {
  if (registeredUserId) socket.emit("register", registeredUserId);
});

export async function connectSocket(
  getToken: () => Promise<string | null>,
  userId?: string
) {
  if (userId) registeredUserId = userId;

  if (socket.connected) {
    if (registeredUserId) socket.emit("register", registeredUserId);
    return;
  }

  try {
    const token = await getToken();
    socket.auth = { token: token || "", userId: userId || "" };
  } catch {
    socket.auth = {};
  }
  if (!socket.connected) socket.connect();
}
