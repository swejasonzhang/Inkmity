import { jest, afterEach, expect } from "@jest/globals";
import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";
import { TextEncoder, TextDecoder } from "util";
import React from "react";

global.TextEncoder = TextEncoder as any;
global.TextDecoder = TextDecoder as any;

const importMetaEnv = {
  VITE_STRIPE_PUBLISHABLE_KEY: process.env.VITE_STRIPE_PUBLISHABLE_KEY || "pk_test_MOCK_KEY_FOR_TESTING_ONLY",
  VITE_API_URL: process.env.VITE_API_URL || "http://localhost:3001",
  VITE_CLERK_PUBLISHABLE_KEY: process.env.VITE_CLERK_PUBLISHABLE_KEY || "pk_test_MOCK_KEY_FOR_TESTING_ONLY",
  MODE: "test",
  DEV: false,
  PROD: false,
};

Object.defineProperty(globalThis, "import", {
  value: {
    meta: {
      env: importMetaEnv,
    },
  },
  writable: true,
  configurable: true,
});

global.fetch = jest.fn<typeof fetch>(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    statusText: "OK",
    headers: new Headers(),
    json: async () => ({}),
    text: async () => "",
  } as Response)
) as jest.MockedFunction<typeof fetch>;

jest.unstable_mockModule("@clerk/clerk-react", () => ({
  ClerkProvider: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
  useAuth: jest.fn(() => ({
    getToken: jest.fn<() => Promise<string>>().mockResolvedValue("mock-token"),
    userId: "user-123",
    isLoaded: true,
  })),
  useUser: jest.fn(() => ({
    user: { id: "user-123" },
    isSignedIn: true,
    isLoaded: true,
  })),
  SignedIn: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
  SignedOut: () => null,
  RedirectToSignIn: () => null,
}));

expect.extend(matchers);

afterEach(() => {
  cleanup();
  jest.clearAllMocks();
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;

global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any;

global.URL.createObjectURL = jest.fn(() => "blob:mock-url");
global.URL.revokeObjectURL = jest.fn();
window.scrollTo = jest.fn();
