import * as socketIOClient from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

const socket = socketIOClient.connect(SOCKET_URL, {
  autoConnect: false,
});

export default socket;
