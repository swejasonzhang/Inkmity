import { useEffect, useState } from "react";

export function useGate(
  artistId: string,
  authFetch: (url: string, opts?: RequestInit) => Promise<Response>
) {
  const [state, setState] = useState<{
    allowed: boolean;
    lastStatus: "pending" | "accepted" | "declined" | null;
    declines: number;
    blocked: boolean;
  } | null>(null);
  useEffect(() => {
    let on = true;
    (async () => {
      const r = await authFetch(`/api/messages/gate/${artistId}`);
      const data = await r.json();
      if (on) setState(data);
    })();
    return () => {
      on = false;
    };
  }, [artistId, authFetch]);
  return state;
}