import { jest, describe, test, expect, beforeEach, beforeAll } from "@jest/globals";

type Handler = (...args: any[]) => void;

const listeners = new Map<string, Set<Handler>>();
const fakeSocket: any = {
  connected: false,
  on: jest.fn((event: string, cb: Handler) => {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event)!.add(cb);
  }),
  emit: jest.fn(),
  connect: jest.fn(() => {
    fakeSocket.connected = true;
  }),
};

const ioClient = jest.fn(() => fakeSocket);

jest.unstable_mockModule("socket.io-client", () => ({
  __esModule: true,
  default: ioClient,
}));

let mod: typeof import("@/lib/socket");
let importTimeCalls: any[][] = [];

beforeAll(async () => {
  mod = await import("@/lib/socket");
  importTimeCalls = ioClient.mock.calls.slice();
});

beforeEach(() => {
  jest.clearAllMocks();
  fakeSocket.connected = false;
});

describe("socket module setup", () => {
  test("creates the socket once with autoConnect disabled and a trimmed url", () => {
    expect(importTimeCalls.length).toBe(1);
    const [url, opts] = importTimeCalls[0] as [string, any];
    expect(url).not.toMatch(/\/$/);
    expect(opts.autoConnect).toBe(false);
    expect(opts.transports).toEqual(["polling", "websocket"]);
  });

  test("getSocket returns the singleton socket", () => {
    expect(mod.getSocket()).toBe(mod.socket);
  });

  test("auth yields an empty token before a token getter is registered", () => {
    const cb = jest.fn();
    (mod.socket.auth as (cb: (d: any) => void) => void)(cb);
    expect(cb).toHaveBeenCalledWith({ token: "", userId: "" });
  });
});

describe("connectSocket", () => {
  test("connects when disconnected and supplies the resolved auth token", async () => {
    const getToken = jest.fn<() => Promise<string>>().mockResolvedValue("tok-1");
    await mod.connectSocket(getToken, "user-1");
    expect(fakeSocket.connect).toHaveBeenCalledTimes(1);

    const cb = jest.fn();
    (mod.socket.auth as (cb: (d: any) => void) => void)(cb);
    await Promise.resolve();
    await Promise.resolve();
    expect(getToken).toHaveBeenCalled();
    expect(cb).toHaveBeenCalledWith({ token: "tok-1", userId: "user-1" });
  });

  test("registers without reconnecting when already connected", async () => {
    fakeSocket.connected = true;
    const getToken = jest.fn<() => Promise<string>>().mockResolvedValue("tok");
    await mod.connectSocket(getToken, "user-2");
    expect(fakeSocket.connect).not.toHaveBeenCalled();
    expect(fakeSocket.emit).toHaveBeenCalledWith("register", "user-2");
  });

  test("auth resolves to an empty token when the getter rejects", async () => {
    const getToken = jest.fn<() => Promise<string>>().mockRejectedValue(new Error("nope"));
    await mod.connectSocket(getToken, "user-3");
    const cb = jest.fn();
    (mod.socket.auth as (cb: (d: any) => void) => void)(cb);
    await Promise.resolve();
    await Promise.resolve();
    expect(cb).toHaveBeenCalledWith({ token: "", userId: "user-3" });
  });

  test("registers on the connect event once a user id is known", () => {
    const handlers = listeners.get("connect");
    expect(handlers && handlers.size).toBeGreaterThan(0);
    fakeSocket.emit.mockClear();
    handlers!.forEach((h) => h());
    expect(fakeSocket.emit).toHaveBeenCalledWith("register", "user-3");
  });
});
