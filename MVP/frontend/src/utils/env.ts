const API_URL =
  (import.meta as any)?.env?.VITE_API_URL ||
  import.meta.env?.VITE_API_URL ||
  "http://localhost:3001";

const SOCKET_PATH =
  (import.meta as any)?.env?.VITE_SOCKET_PATH ||
  import.meta.env?.VITE_SOCKET_PATH ||
  "/socket.io";

export const env = {
  socketUrl: API_URL,
  socketPath: SOCKET_PATH,
  apiUrl: API_URL,
};