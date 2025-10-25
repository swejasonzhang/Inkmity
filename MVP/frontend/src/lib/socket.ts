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

export const socket = ioClient(SOCKET_URL.replace(/\/+$/, ""), {
  path: SOCKET_PATH,
  transports: ["websocket"],
  autoConnect: false,
}) as AuthSocket;