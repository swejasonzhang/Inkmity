import { jest, describe, test, expect, beforeEach, beforeAll } from "@jest/globals";
import { renderHook, act } from "@testing-library/react";

type Handler = (...args: any[]) => void;

const mockGetToken = jest.fn<() => Promise<string>>();
const mockUseUser = jest.fn();
const mockConnectSocket = jest.fn<() => Promise<void>>();

const listeners = new Map<string, Set<Handler>>();
const fakeSocket = {
  connected: false,
  on: jest.fn((event: string, cb: Handler) => {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event)!.add(cb);
  }),
  off: jest.fn((event: string, cb: Handler) => {
    listeners.get(event)?.delete(cb);
  }),
  emit: (event: string, ...args: any[]) => {
    listeners.get(event)?.forEach((cb) => cb(...args));
  },
};

jest.unstable_mockModule("@/lib/socket", () => ({
  getSocket: () => fakeSocket,
  connectSocket: mockConnectSocket,
}));

jest.unstable_mockModule("@clerk/clerk-react", () => ({
  useUser: () => mockUseUser(),
  useAuth: () => ({ getToken: mockGetToken }),
}));

let useBookingRealtime: typeof import("@/hooks/useBookingRealtime").useBookingRealtime;

beforeAll(async () => {
  ({ useBookingRealtime } = await import("@/hooks/useBookingRealtime"));
});

beforeEach(() => {
  jest.clearAllMocks();
  listeners.clear();
  fakeSocket.connected = false;
  mockGetToken.mockResolvedValue("token");
  mockConnectSocket.mockResolvedValue(undefined);
});

describe("useBookingRealtime", () => {
  test("does nothing when not signed in", () => {
    mockUseUser.mockReturnValue({ user: null, isLoaded: true, isSignedIn: false });
    renderHook(() => useBookingRealtime(() => {}));
    expect(mockConnectSocket).not.toHaveBeenCalled();
  });

  test("connects the socket when disconnected", () => {
    mockUseUser.mockReturnValue({ user: { id: "u1" }, isLoaded: true, isSignedIn: true });
    renderHook(() => useBookingRealtime(() => {}));
    expect(mockConnectSocket).toHaveBeenCalledWith(mockGetToken, "u1");
  });

  test("attaches booking listeners immediately when already connected", () => {
    fakeSocket.connected = true;
    mockUseUser.mockReturnValue({ user: { id: "u2" }, isLoaded: true, isSignedIn: true });
    const cb = jest.fn();
    renderHook(() => useBookingRealtime(cb));

    act(() => fakeSocket.emit("booking:updated"));
    act(() => fakeSocket.emit("booking:cancelled"));
    act(() => fakeSocket.emit("booking:denied"));
    expect(cb).toHaveBeenCalledTimes(3);
    expect(mockConnectSocket).not.toHaveBeenCalled();
  });

  test("attaches listeners after a deferred connect event fires", () => {
    fakeSocket.connected = false;
    mockUseUser.mockReturnValue({ user: { id: "u3" }, isLoaded: true, isSignedIn: true });
    const cb = jest.fn();
    renderHook(() => useBookingRealtime(cb));

    act(() => fakeSocket.emit("connect"));
    act(() => fakeSocket.emit("booking:updated"));
    expect(cb).toHaveBeenCalledTimes(1);
  });

  test("always invokes the latest callback without re-subscribing", () => {
    fakeSocket.connected = true;
    mockUseUser.mockReturnValue({ user: { id: "u4" }, isLoaded: true, isSignedIn: true });
    const first = jest.fn();
    const second = jest.fn();
    const { rerender } = renderHook(({ cb }) => useBookingRealtime(cb), {
      initialProps: { cb: first },
    });

    rerender({ cb: second });
    act(() => fakeSocket.emit("booking:updated"));
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  test("detaches listeners on unmount", () => {
    fakeSocket.connected = true;
    mockUseUser.mockReturnValue({ user: { id: "u5" }, isLoaded: true, isSignedIn: true });
    const cb = jest.fn();
    const { unmount } = renderHook(() => useBookingRealtime(cb));

    unmount();
    act(() => fakeSocket.emit("booking:updated"));
    expect(cb).not.toHaveBeenCalled();
  });
});
