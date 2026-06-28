import { describe, test, expect } from "@jest/globals";
import { env } from "@/lib/env";

describe("env", () => {
  test("exposes the API url for socket and api", () => {
    expect(typeof env.apiUrl).toBe("string");
    expect(env.socketUrl).toBe(env.apiUrl);
  });

  test("defaults the socket path", () => {
    expect(env.socketPath).toBe("/socket.io");
  });
});
