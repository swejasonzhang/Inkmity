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

let subscriberCount = 0;
// The id we should present to the server as "online". Kept across reconnects.
let registeredUserId = "";

// Register on every (re)connect — not just when a component happens to run while
// already connected. Without this, a fresh page load connects the socket but the
// server never learns who we are, so we appear offline (and presence/lastActive
// never update in real time).
socket.on("connect", () => {
  if (registeredUserId) socket.emit("register", registeredUserId);
});

export async function connectSocket(
  getToken: () => Promise<string | null>,
  userId?: string
) {
  subscriberCount++;
  if (userId) registeredUserId = userId;

  if (socket.connected) {
    // Already connected (e.g. navigating between pages) — make sure the server
    // still has us registered as online.
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

export function disconnectSocket() {
  subscriberCount = Math.max(0, subscriberCount - 1);
  if (subscriberCount === 0 && socket.connected) socket.disconnect();
}
