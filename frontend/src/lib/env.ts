import { API_URL } from "@/api";

export const env = {
  socketUrl: API_URL,
  socketPath: ((import.meta as any)?.env?.VITE_SOCKET_PATH as string | undefined) || "/socket.io",
  apiUrl: API_URL,
};
