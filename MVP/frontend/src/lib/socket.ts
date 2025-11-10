import ioClient from "socket.io-client";

const SOCKET_URL =
  (import.meta as any)?.env?.VITE_SOCKET_URL ||
  import.meta.env?.VITE_SOCKET_URL ||
  "http://localhost:5005";

const SOCKET_PATH =
  (import.meta as any)?.env?.VITE_SOCKET_PATH ||
  import.meta.env?.VITE_SOCKET_PATH ||
  "/socket.io";

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