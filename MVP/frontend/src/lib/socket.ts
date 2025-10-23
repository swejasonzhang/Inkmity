import * as socketIOClient from "socket.io-client";

const SOCKET_URL =
  (import.meta as any)?.env?.VITE_SOCKET_URL ||
  import.meta.env?.VITE_SOCKET_URL ||
  "http://localhost:5005";

const socket = socketIOClient.connect(SOCKET_URL, { autoConnect: false });
export default socket;