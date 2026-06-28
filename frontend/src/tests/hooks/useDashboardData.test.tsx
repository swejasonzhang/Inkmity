import { jest, describe, test, expect, beforeEach, beforeAll } from "@jest/globals";
import { renderHook, act, waitFor } from "@testing-library/react";

type Handler = (...args: any[]) => void;

const mockFetchArtists = jest.fn<(params: any, signal?: any) => Promise<any>>();
const mockGetToken = jest.fn<() => Promise<string>>();
const mockUseUser = jest.fn();
const mockConnectSocket = jest.fn<() => Promise<void>>();
const toastDismiss = jest.fn();

const listeners = new Map<string, Set<Handler>>();
const fakeSocket = {
  connected: true,
  on: jest.fn((e: string, cb: Handler) => {
    if (!listeners.has(e)) listeners.set(e, new Set());
    listeners.get(e)!.add(cb);
  }),
  once: jest.fn((e: string, cb: Handler) => {
    if (!listeners.has(e)) listeners.set(e, new Set());
    listeners.get(e)!.add(cb);
  }),
  off: jest.fn((e: string, cb: Handler) => listeners.get(e)?.delete(cb)),
  emit: (e: string, ...args: any[]) => listeners.get(e)?.forEach((cb) => cb(...args)),
};

jest.unstable_mockModule("@/api", () => ({
  fetchArtists: mockFetchArtists,
}));

jest.unstable_mockModule("react-toastify", () => ({
  toast: { dismiss: toastDismiss },
}));

jest.unstable_mockModule("@/lib/socket", () => ({
  getSocket: () => fakeSocket,
  connectSocket: mockConnectSocket,
}));

jest.unstable_mockModule("@clerk/clerk-react", () => ({
  useUser: () => mockUseUser(),
  useAuth: () => ({ getToken: mockGetToken }),
}));

let useDashboardData: typeof import("@/hooks/useDashboardData").useDashboardData;

beforeAll(async () => {
  ({ useDashboardData } = await import("@/hooks/useDashboardData"));
});

function makeItems(n: number) {
  return Array.from({ length: n }, (_, i) => ({ _id: String(i), clerkId: `c${i}` }));
}

beforeEach(() => {
  jest.clearAllMocks();
  listeners.clear();
  fakeSocket.connected = true;
  mockGetToken.mockResolvedValue("token");
  mockConnectSocket.mockResolvedValue(undefined);
  mockUseUser.mockReturnValue({ isLoaded: true, isSignedIn: true, user: { id: "me" } });
});

describe("useDashboardData", () => {
  test("loads the first page on mount", async () => {
    mockFetchArtists.mockResolvedValue({ items: makeItems(3), total: 3 });
    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => expect(result.current.initialized).toBe(true));
    expect(result.current.artists).toHaveLength(3);
    expect(result.current.total).toBe(3);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.error).toBe(null);
  });

  test("returns empty state when signed out", async () => {
    mockUseUser.mockReturnValue({ isLoaded: true, isSignedIn: false, user: null });
    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => expect(result.current.initialized).toBe(true));
    expect(result.current.artists).toEqual([]);
    expect(result.current.hasMore).toBe(false);
    expect(mockFetchArtists).not.toHaveBeenCalled();
  });

  test("surfaces an error message when the fetch fails", async () => {
    mockFetchArtists.mockRejectedValue({ message: "boom" });
    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => expect(result.current.error).toBe("boom"));
    expect(result.current.artists).toEqual([]);
    expect(result.current.initialized).toBe(true);
  });

  test("flags hasMore and appends results via loadMore", async () => {
    mockFetchArtists.mockResolvedValueOnce({ items: makeItems(60), total: 90 });
    const { result } = renderHook(() => useDashboardData());
    await waitFor(() => expect(result.current.initialized).toBe(true));
    expect(result.current.hasMore).toBe(true);

    mockFetchArtists.mockResolvedValueOnce({ items: makeItems(30), total: 90 });
    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.artists).toHaveLength(90);
    expect(result.current.hasMore).toBe(false);
  });

  test("updates artist presence on a user:online socket event", async () => {
    mockFetchArtists.mockResolvedValue({ items: makeItems(2), total: 2 });
    const { result } = renderHook(() => useDashboardData());
    await waitFor(() => expect(result.current.initialized).toBe(true));

    act(() => fakeSocket.emit("user:online", { clerkId: "c1" }));

    await waitFor(() => {
      const updated = result.current.artists.find((a: any) => a.clerkId === "c1");
      expect((updated as any)?.isOnline).toBe(true);
    });
  });

  test("reloads artists when an artist profile is updated", async () => {
    mockFetchArtists.mockResolvedValue({ items: makeItems(1), total: 1 });
    const { result } = renderHook(() => useDashboardData());
    await waitFor(() => expect(result.current.initialized).toBe(true));
    expect(mockFetchArtists).toHaveBeenCalledTimes(1);

    act(() => fakeSocket.emit("artist:profile:updated"));
    await waitFor(() => expect(mockFetchArtists).toHaveBeenCalledTimes(2));
  });
});
