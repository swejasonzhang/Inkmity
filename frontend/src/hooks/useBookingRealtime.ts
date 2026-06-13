import { useEffect, useRef } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { connectSocket, getSocket } from "@/lib/socket";

export function useBookingRealtime(onChange: () => void) {
  const { user, isLoaded, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const cbRef = useRef(onChange);
  cbRef.current = onChange;

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;

    const socket = getSocket();
    const handler = () => cbRef.current();

    let attached = false;
    const attach = () => {
      if (attached) return;
      socket.on("booking:updated", handler);
      socket.on("booking:cancelled", handler);
      socket.on("booking:denied", handler);
      attached = true;
    };

    if (socket.connected) attach();
    socket.on("connect", attach);
    if (!socket.connected) void connectSocket(getToken, user.id);

    return () => {
      socket.off("connect", attach);
      socket.off("booking:updated", handler);
      socket.off("booking:cancelled", handler);
      socket.off("booking:denied", handler);
    };
  }, [isLoaded, isSignedIn, user, getToken]);
}
