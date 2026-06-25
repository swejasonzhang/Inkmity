import ioClient from "socket.io-client";
import { env } from "@/utils/env";

const SOCKET_URL = env.socketUrl;
const SOCKET_PATH = env.socketPath;

type AuthCallback = (data: Record<string, unknown>) => void;
type AuthSocket = ReturnType<typeof ioClient> & {
  auth?: Record<string, unknown> | ((cb: AuthCallback) => void);
};

export const socket: AuthSocket = ioClient(SOCKET_URL.replace(/\/+$/, ""), {
  path: SOCKET_PATH,
  transports: ["polling", "websocket"],
  autoConnect: false,
}) as AuthSocket;

export function getSocket() {
  return socket;
}

let registeredUserId = "";
let tokenGetter: (() => Promise<string | null>) | null = null;

socket.auth = (cb: AuthCallback) => {
  const done = (token: string) => cb({ token, userId: registeredUserId || "" });
  if (tokenGetter) {
    tokenGetter()
      .then((t) => done(t || ""))
      .catch(() => done(""));
  } else {
    done("");
  }
};

socket.on("connect", () => {
  if (registeredUserId) socket.emit("register", registeredUserId);
});

export async function connectSocket(
  getToken: () => Promise<string | null>,
  userId?: string
) {
  if (userId) registeredUserId = userId;
  tokenGetter = getToken;

  if (socket.connected) {
    if (registeredUserId) socket.emit("register", registeredUserId);
    return;
  }

  if (!socket.connected) socket.connect();
}
