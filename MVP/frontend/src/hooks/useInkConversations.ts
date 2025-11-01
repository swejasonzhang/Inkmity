import { useEffect, useMemo, useRef, useState } from "react";

export type Role = "Client" | "Artist";

type Args = {
  role: Role;
  unreadCount?: number;
  unreadMessagesTotal?: number;
  requestExists?: boolean;
  unreadConversationsCount?: number;
  pendingRequestsCount?: number;
  unreadConversationIds?: string[];
  pendingRequestIds?: string[];
};

export function useInkConversations({
  role,
  unreadCount = 0,
  unreadMessagesTotal,
  requestExists,
  unreadConversationsCount,
  pendingRequestsCount,
  unreadConversationIds,
  pendingRequestIds,
}: Args) {
  const [open, setOpen] = useState(false);
  const [clearedConvos, setClearedConvos] = useState<Set<string>>(
    () => new Set()
  );
  const btnRef = useRef<HTMLDivElement | null>(null);

  const toInt = (n: unknown) => {
    const v = typeof n === "number" && Number.isFinite(n) ? Math.trunc(n) : 0;
    return v < 0 ? 0 : v;
  };

  const unreadConvoCount = useMemo(() => {
    if (Array.isArray(unreadConversationIds)) {
      return unreadConversationIds.filter((id) => !clearedConvos.has(id))
        .length;
    }
    return toInt(unreadConversationsCount);
  }, [
    unreadConversationIds?.join("|"),
    clearedConvos,
    unreadConversationsCount,
  ]);

  const requestCount = useMemo(() => {
    if (role !== "Artist") return 0;
    if (typeof requestExists === "boolean") return requestExists ? 1 : 0;
    if (Array.isArray(pendingRequestIds))
      return pendingRequestIds.length > 0 ? 1 : 0;
    return toInt(pendingRequestsCount) > 0 ? 1 : 0;
  }, [role, requestExists, pendingRequestIds?.length, pendingRequestsCount]);

  const totalUnreadMessages = useMemo(
    () =>
      typeof unreadMessagesTotal === "number"
        ? unreadMessagesTotal
        : toInt(unreadCount),
    [unreadMessagesTotal, unreadCount]
  );

  const derivedTotal = useMemo(
    () => totalUnreadMessages + (role === "Artist" ? requestCount : 0),
    [totalUnreadMessages, role, requestCount]
  );

  useEffect(() => {
    const openEvt = () => setOpen(true);
    const closeEvt = () => setOpen(false);
    window.addEventListener("ink:open-messages", openEvt as EventListener);
    window.addEventListener("ink:close-messages", closeEvt as EventListener);
    return () => {
      window.removeEventListener("ink:open-messages", openEvt as EventListener);
      window.removeEventListener(
        "ink:close-messages",
        closeEvt as EventListener
      );
    };
  }, []);

  useEffect(() => {
    const onConvoOpened = (e: Event) => {
      const id = (e as CustomEvent<string | { id: string }>).detail;
      const convoId = typeof id === "string" ? id : id?.id;
      if (!convoId) return;
      setClearedConvos((prev) => {
        const next = new Set(prev);
        next.add(convoId);
        return next;
      });
    };
    const onConvoRead = onConvoOpened;
    window.addEventListener(
      "ink:conversation-opened",
      onConvoOpened as EventListener
    );
    window.addEventListener(
      "ink:conversation-read",
      onConvoRead as EventListener
    );
    return () => {
      window.removeEventListener(
        "ink:conversation-opened",
        onConvoOpened as EventListener
      );
      window.removeEventListener(
        "ink:conversation-read",
        onConvoRead as EventListener
      );
    };
  }, []);

  useEffect(() => {
    if (!unreadConversationIds) return;
    setClearedConvos((prev) => {
      const incoming = new Set(unreadConversationIds);
      const next = new Set<string>();
      prev.forEach((id) => {
        if (incoming.has(id)) next.add(id);
      });
      return next;
    });
  }, [unreadConversationIds?.join("|")]);

  useEffect(() => {
    if (!open) return;
    const modalOpen = () =>
      !!document.querySelector('[role="dialog"], [data-ink-modal]');
    const onDocPointer = (e: Event) => {
      if (modalOpen()) return;
      const root = btnRef.current;
      const target = e.target as Node | null;
      if (root && target && root.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !modalOpen()) setOpen(false);
    };
    document.addEventListener("mousedown", onDocPointer, true);
    document.addEventListener("touchstart", onDocPointer, true);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDocPointer, true);
      document.removeEventListener("touchstart", onDocPointer, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  return {
    btnRef,
    open,
    setOpen,
    unreadConvoCount,
    requestCount,
    derivedTotal,
  };
}