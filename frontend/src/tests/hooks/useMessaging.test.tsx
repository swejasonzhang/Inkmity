import { jest, describe, test, expect, beforeEach, beforeAll } from "@jest/globals";
import { renderHook, act, waitFor } from "@testing-library/react";

type Handler = (...args: any[]) => void;

const listeners = new Map<string, Set<Handler>>();
const fakeSocket: any = {
  connected: false,
  on: jest.fn((event: string, cb: Handler) => {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event)!.add(cb);
  }),
  off: jest.fn((event: string, cb: Handler) => {
    listeners.get(event)?.delete(cb);
  }),
  emit: jest.fn(),
  connect: jest.fn(() => {
    fakeSocket.connected = true;
  }),
};

function fire(event: string, ...args: any[]) {
  listeners.get(event)?.forEach((cb) => cb(...args));
}

jest.unstable_mockModule("@/lib/socket", () => ({
  socket: fakeSocket,
  getSocket: () => fakeSocket,
  connectSocket: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
}));

jest.unstable_mockModule("@/api", () => ({
  API_URL: "http://api.test",
}));

let useMessaging: typeof import("@/hooks/useMessaging").useMessaging;

beforeAll(async () => {
  ({ useMessaging } = await import("@/hooks/useMessaging"));
});

type Json = any;

function makeAuthFetch(routes: (url: string, init?: RequestInit) => { ok?: boolean; status?: number; json?: Json }) {
  return jest.fn(async (url: string, init?: RequestInit) => {
    const r = routes(url, init);
    return {
      ok: r.ok ?? true,
      status: r.status ?? 200,
      json: async () => r.json ?? {},
    } as Response;
  });
}

const ALLOWED_GATE = { allowed: true, lastStatus: "accepted", declines: 0, blocked: false };

function defaultRoutes(convs: any[] = []) {
  return (url: string) => {
    if (url.includes("/messages/gate/")) return { json: ALLOWED_GATE };
    if (url.includes("/messages/user/")) return { json: convs };
    if (url.includes("/messages/unread")) return { json: { unreadByConversation: {}, unreadMessagesTotal: 0, requestExists: false } };
    if (url.includes("/messages/requests")) return { json: { requests: [] } };
    if (url.endsWith("/messages/read")) return { json: {} };
    return { json: {} };
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  listeners.clear();
  fakeSocket.connected = false;
  localStorage.clear();
});

describe("useMessaging initial load", () => {
  test("fetches conversations, filters blocked, and attaches gate metadata", async () => {
    const convs = [
      { participantId: "a", username: "Alice", messages: [] },
      { participantId: "b", username: "Bob", messages: [] },
    ];
    const authFetch = makeAuthFetch((url) => {
      if (url.includes("/messages/gate/b")) return { json: { allowed: false, lastStatus: null, declines: 0, blocked: true } };
      return defaultRoutes(convs)(url);
    });

    const { result } = renderHook(() => useMessaging("me", authFetch as any));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.conversations.map((c) => c.participantId)).toEqual(["a"]);
    expect(result.current.conversations[0].meta).toEqual(ALLOWED_GATE);
  });

  test("merges locally pending threads that the server does not return", async () => {
    localStorage.setItem("ink_pending_threads_v1", JSON.stringify({ z: { username: "Zed" } }));
    const authFetch = makeAuthFetch((url) => {
      if (url.includes("/messages/gate/z")) return { json: { allowed: false, lastStatus: "pending", declines: 0, blocked: false } };
      return defaultRoutes([])(url);
    });

    const { result } = renderHook(() => useMessaging("me", authFetch as any));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.conversations.find((c) => c.participantId === "z")?.username).toBe("Zed");
  });

  test("normalizes the legacy unread payload shape into counts", async () => {
    const authFetch = makeAuthFetch((url) => {
      if (url.includes("/messages/unread")) {
        return { json: { unreadConversationIds: ["a", "a", "b"], counts: { unreadConversations: 2, pendingRequests: 1 } } };
      }
      return defaultRoutes([{ participantId: "a", username: "A", messages: [] }])(url);
    });

    const { result } = renderHook(() => useMessaging("me", authFetch as any));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() => expect(result.current.unreadState).not.toBeNull());

    expect(result.current.unreadState).toMatchObject({
      unreadMessagesTotal: 2,
      requestExists: true,
      unreadByConversation: { a: 2, b: 1 },
    });
    expect(result.current.unreadMap).toEqual({ a: 2, b: 1 });
  });

  test("populates pending request ids from the requests endpoint", async () => {
    const authFetch = makeAuthFetch((url) => {
      if (url.includes("/messages/requests")) return { json: { requests: [{ _id: "r1" }, { _id: "r2" }] } };
      return defaultRoutes([])(url);
    });
    const { result } = renderHook(() => useMessaging("me", authFetch as any));
    await waitFor(() => expect(result.current.pendingRequestIds).toEqual(["r1", "r2"]));
    expect(result.current.pendingRequestsCount).toBe(2);
  });
});

describe("useMessaging send", () => {
  test("optimistically appends the message and posts it to the backend", async () => {
    const authFetch = makeAuthFetch(defaultRoutes([]));
    const { result } = renderHook(() => useMessaging("me", authFetch as any));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.send("peer", "hello http://x.com/a)");
    });

    const convo = result.current.conversations.find((c) => c.participantId === "peer");
    const last = convo?.messages[convo.messages.length - 1];
    expect(last?.text).toBe("hello http://x.com/a)");
    expect(last?.meta?.referenceUrls).toEqual(["http://x.com/a"]);
    const posted = (authFetch as any).mock.calls.find((c: any[]) => c[0].endsWith("/messages") && c[1]?.method === "POST");
    expect(posted).toBeTruthy();
  });

  test("rolls back the optimistic message and throws when the post fails", async () => {
    const authFetch = makeAuthFetch((url, init) => {
      if (url.endsWith("/messages") && init?.method === "POST") return { ok: false, status: 500 };
      return defaultRoutes([])(url);
    });
    const { result } = renderHook(() => useMessaging("me", authFetch as any));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await expect(result.current.send("peer", "boom")).rejects.toThrow("Failed to send");
    });

    const convo = result.current.conversations.find((c) => c.participantId === "peer");
    expect(convo?.messages.some((m) => m.text === "boom")).toBe(false);
  });
});

describe("useMessaging socket events", () => {
  test("appends an inbound message from message:new", async () => {
    const authFetch = makeAuthFetch(defaultRoutes([]));
    const { result } = renderHook(() => useMessaging("me", authFetch as any));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      fire("message:new", {
        convoId: "c1",
        message: { senderId: "peer", receiverId: "me", text: "hi", timestamp: 1 },
      });
    });

    const convo = result.current.conversations.find((c) => c.participantId === "peer");
    expect(convo?.messages.some((m) => m.text === "hi")).toBe(true);
  });

  test("marks the matching outbound message delivered on echo and de-dupes", async () => {
    const authFetch = makeAuthFetch(defaultRoutes([]));
    const { result } = renderHook(() => useMessaging("me", authFetch as any));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.send("peer", "ping");
    });

    const optimistic = result.current.conversations
      .find((c) => c.participantId === "peer")
      ?.messages.find((m) => m.text === "ping");
    const clientId = optimistic?.meta?.clientId;

    act(() => {
      fire("message:new", {
        convoId: "c1",
        message: { senderId: "me", receiverId: "peer", text: "ping", timestamp: 2, meta: { clientId } },
      });
    });

    const convo = result.current.conversations.find((c) => c.participantId === "peer");
    const pings = convo?.messages.filter((m) => m.text === "ping") ?? [];
    expect(pings.length).toBe(1);
    expect(pings[0].delivered).toBe(true);
  });

  test("conversation:pending prepends a request and refreshes", async () => {
    const authFetch = makeAuthFetch(defaultRoutes([]));
    const { result } = renderHook(() => useMessaging("me", authFetch as any));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      fire("conversation:pending", {
        convoId: "c1",
        from: "peer",
        to: "me",
        message: { senderId: "peer", receiverId: "me", text: "request", timestamp: 5, meta: { kind: "request" } },
      });
    });

    const convo = result.current.conversations.find((c) => c.participantId === "peer");
    expect(convo?.meta?.lastStatus).toBe("pending");
    expect(convo?.messages[0].text).toBe("request");
  });

  test("conversation:accepted flips the gate to allowed", async () => {
    const authFetch = makeAuthFetch(defaultRoutes([{ participantId: "peer", username: "P", messages: [] }]));
    const { result } = renderHook(() => useMessaging("client", authFetch as any));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      fire("conversation:accepted", { convoId: "c1", clientId: "client", artistId: "peer" });
    });

    const convo = result.current.conversations.find((c) => c.participantId === "peer");
    expect(convo?.meta).toMatchObject({ allowed: true, lastStatus: "accepted" });
  });

  test("conversation:ack marks the viewer's outbound messages seen", async () => {
    const authFetch = makeAuthFetch(defaultRoutes([]));
    const { result } = renderHook(() => useMessaging("me", authFetch as any));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.send("peer", "seen-me");
    });

    act(() => {
      fire("conversation:ack", {
        convoId: "c1",
        viewerId: "peer",
        participantId: "me",
        seen: true,
        seenAt: 999,
      });
    });

    const msg = result.current.conversations
      .find((c) => c.participantId === "peer")
      ?.messages.find((m) => m.text === "seen-me");
    expect(msg?.seen).toBe(true);
    expect(msg?.delivered).toBe(true);
  });

  test("auto-marks an inbound message read when its thread is open and active", async () => {
    const reads: string[] = [];
    const authFetch = makeAuthFetch((url, init) => {
      if (url.endsWith("/messages/read")) {
        reads.push(JSON.parse(String(init?.body)).conversationId);
        return { json: {} };
      }
      return defaultRoutes([{ participantId: "peer", username: "P", messages: [] }])(url);
    });
    const { result } = renderHook(() => useMessaging("me", authFetch as any));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setExpandedId("peer"));
    act(() => window.dispatchEvent(new Event("ink:open-messages")));
    await waitFor(() => expect(result.current.expandedId).toBe("peer"));

    act(() => {
      fire("message:new", {
        convoId: "c1",
        message: { senderId: "peer", receiverId: "me", text: "live", timestamp: 7 },
      });
    });

    await waitFor(() => expect(reads).toContain("peer"));
  });

  test("conversation:removed triggers a full refetch", async () => {
    let userCalls = 0;
    const authFetch = makeAuthFetch((url) => {
      if (url.includes("/messages/user/")) userCalls += 1;
      return defaultRoutes([])(url);
    });
    const { result } = renderHook(() => useMessaging("me", authFetch as any));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const before = userCalls;

    act(() => fire("conversation:removed", {}));
    await waitFor(() => expect(userCalls).toBeGreaterThan(before));
  });

  test("conversation:ack marks the participant's inbound messages delivered", async () => {
    const authFetch = makeAuthFetch(defaultRoutes([]));
    const { result } = renderHook(() => useMessaging("me", authFetch as any));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      fire("message:new", {
        convoId: "c1",
        message: { senderId: "peer", receiverId: "me", text: "incoming", timestamp: 3 },
      });
    });

    act(() => {
      fire("conversation:ack", {
        convoId: "c1",
        viewerId: "me",
        participantId: "peer",
        delivered: true,
        deliveredAt: 1234,
      });
    });

    const msg = result.current.conversations
      .find((c) => c.participantId === "peer")
      ?.messages.find((m) => m.text === "incoming");
    expect(msg?.delivered).toBe(true);
    expect(msg?.deliveredAt).toBe(1234);
  });

  test("unread:update re-fetches unread counts", async () => {
    let unreadCalls = 0;
    const authFetch = makeAuthFetch((url) => {
      if (url.includes("/messages/unread")) {
        unreadCalls += 1;
        return { json: { unreadMessagesTotal: unreadCalls, unreadByConversation: {}, requestExists: false } };
      }
      return defaultRoutes([])(url);
    });
    const { result } = renderHook(() => useMessaging("me", authFetch as any));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const before = unreadCalls;

    act(() => fire("unread:update"));
    await waitFor(() => expect(unreadCalls).toBeGreaterThan(before));
  });
});

describe("useMessaging local actions", () => {
  test("toggleCollapse flips collapsed state and expandedId", async () => {
    const authFetch = makeAuthFetch(defaultRoutes([{ participantId: "a", username: "A", messages: [] }]));
    const { result } = renderHook(() => useMessaging("me", authFetch as any));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.toggleCollapse("a"));
    expect(result.current.collapsedMap.a).toBe(true);
    expect(result.current.expandedId).toBe("a");

    act(() => result.current.toggleCollapse("a"));
    expect(result.current.collapsedMap.a).toBe(false);
    expect(result.current.expandedId).toBe(null);
  });

  test("removeConversation drops the conversation and its unread entry", async () => {
    const authFetch = makeAuthFetch((url) => {
      if (url.includes("/messages/unread")) return { json: { unreadByConversation: { a: 3 }, unreadMessagesTotal: 3, requestExists: false } };
      return defaultRoutes([{ participantId: "a", username: "A", messages: [] }])(url);
    });
    const { result } = renderHook(() => useMessaging("me", authFetch as any));
    await waitFor(() => expect(result.current.unreadMap).toEqual({ a: 3 }));

    act(() => result.current.removeConversation("a"));
    expect(result.current.conversations.find((c) => c.participantId === "a")).toBeUndefined();
    expect(result.current.unreadMap.a).toBeUndefined();
  });

  test("markAsRead clears unread locally and notifies the backend", async () => {
    const reads: string[] = [];
    const authFetch = makeAuthFetch((url, init) => {
      if (url.endsWith("/messages/read")) {
        reads.push(JSON.parse(String(init?.body)).conversationId);
        return { json: {} };
      }
      if (url.includes("/messages/unread")) return { json: { unreadByConversation: { a: 2 }, unreadMessagesTotal: 2, requestExists: false } };
      return defaultRoutes([{ participantId: "a", username: "A", messages: [] }])(url);
    });
    const { result } = renderHook(() => useMessaging("me", authFetch as any));
    await waitFor(() => expect(result.current.unreadMap).toEqual({ a: 2 }));

    await act(async () => {
      result.current.markAsRead("a");
    });
    await waitFor(() => expect(reads).toContain("a"));
    expect(result.current.unreadMap.a).toBe(0);
  });

  test("destroy deletes the conversation and removes it locally", async () => {
    let deleteCalled = false;
    const authFetch = makeAuthFetch((url, init) => {
      if (url.endsWith("/messages/conversations") && init?.method === "DELETE") {
        deleteCalled = true;
        return { json: {} };
      }
      return defaultRoutes([{ participantId: "a", username: "A", messages: [] }])(url);
    });
    const { result } = renderHook(() => useMessaging("me", authFetch as any));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.destroy("a");
    });
    expect(deleteCalled).toBe(true);
    expect(result.current.conversations.find((c) => c.participantId === "a")).toBeUndefined();
  });

  test("refresh re-runs the full fetch", async () => {
    let userCalls = 0;
    const authFetch = makeAuthFetch((url) => {
      if (url.includes("/messages/user/")) userCalls += 1;
      return defaultRoutes([])(url);
    });
    const { result } = renderHook(() => useMessaging("me", authFetch as any));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const before = userCalls;

    await act(async () => {
      await result.current.refresh();
    });
    expect(userCalls).toBeGreaterThan(before);
  });

  test("reacts to ink:open-messages / ink:close-messages events", async () => {
    const authFetch = makeAuthFetch(defaultRoutes([]));
    const { result } = renderHook(() => useMessaging("me", authFetch as any));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => window.dispatchEvent(new Event("ink:open-messages")));
    act(() => result.current.setExpandedId("a"));
    await waitFor(() => expect(result.current.expandedId).toBe("a"));

    act(() => window.dispatchEvent(new Event("ink:close-messages")));
  });
});
