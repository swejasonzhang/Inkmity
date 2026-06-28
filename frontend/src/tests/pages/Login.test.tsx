import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import React from "react";
import { render, screen, act, waitFor, fireEvent } from "@/tests/setup/test-utils";

const navigate = jest.fn();
const signInCreate = jest.fn<() => Promise<any>>();
const setActive = jest.fn<() => Promise<any>>().mockResolvedValue(undefined);
const signOut = jest.fn<() => Promise<any>>().mockResolvedValue(undefined);
const getToken = jest.fn<() => Promise<string | null>>().mockResolvedValue("tok");
const getMe = jest.fn<() => Promise<any>>().mockResolvedValue({ onboardingComplete: true, role: "client" });
const apiPost = jest.fn<() => Promise<any>>();
const usePageMeta = jest.fn();

let authState: any;
let onboardedState: boolean | null;

const MOTION_ONLY = new Set([
  "initial", "animate", "exit", "transition", "variants", "whileHover",
  "whileTap", "whileInView", "whileFocus", "viewport", "layout",
]);
const strip = (props: any) => {
  const clean: Record<string, any> = {};
  for (const k of Object.keys(props)) if (!MOTION_ONLY.has(k)) clean[k] = props[k];
  return React.createElement("div", clean, props.children);
};

jest.unstable_mockModule("react-router-dom", () => ({
  useNavigate: () => navigate,
  BrowserRouter: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.unstable_mockModule("framer-motion", () => ({
  motion: new Proxy({}, { get: () => strip }),
  useReducedMotion: () => true,
}));
jest.unstable_mockModule("@clerk/clerk-react", () => ({
  useSignIn: () => ({ signIn: { create: signInCreate }, setActive, isLoaded: true }),
  useAuth: () => authState,
}));
jest.unstable_mockModule("@/hooks/usePageMeta", () => ({ usePageMeta }));
jest.unstable_mockModule("@/hooks/useOnboarded", () => ({
  useOnboarded: () => ({ onboarded: onboardedState }),
}));
jest.unstable_mockModule("@/hooks/useInactivityLogout", () => ({
  resetActivityTimer: jest.fn(),
}));
jest.unstable_mockModule("@/lib/formNav", () => ({ advanceOnEnterIfEmpty: jest.fn() }));
jest.unstable_mockModule("@/lib/animations", () => ({ container: {} }));
jest.unstable_mockModule("@/api", () => ({ getMe, apiPost }));
jest.unstable_mockModule("react-toastify", () => ({
  ToastContainer: () => <div data-testid="toast" />,
}));
jest.unstable_mockModule("@/components/header/Header", () => ({
  default: () => <header data-testid="header" />,
}));
jest.unstable_mockModule("@/components/VideoBackground", () => ({
  default: () => <div data-testid="video-bg" />,
}));
jest.unstable_mockModule("@/components/access/InfoPanel", () => ({
  default: () => <div data-testid="info-panel" />,
}));
jest.unstable_mockModule("@/components/access/GateNotice", () => ({
  default: () => <div data-testid="gate" />,
}));
jest.unstable_mockModule("@/components/access/LoginFormCard", () => ({
  default: ({ children }: any) => <div data-testid="login-card">{children}</div>,
}));
jest.unstable_mockModule("@/components/access/OAuthButtons", () => ({
  default: () => <div data-testid="oauth" />,
}));

const { default: Login } = await import("@/pages/Login");

const fillCreds = () => {
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "user@test.com" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "secret123" },
  });
};

describe("Login page", () => {
  beforeEach(() => {
    navigate.mockReset();
    signInCreate.mockReset();
    getMe.mockClear();
    usePageMeta.mockReset();
    onboardedState = false;
    authState = {
      userId: null,
      isLoaded: true,
      isSignedIn: false,
      signOut,
      getToken,
    };
  });

  test("renders the sign-in form for signed-out users", async () => {
    await act(async () => {
      render(<Login />);
    });
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
    expect(usePageMeta).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Log in" })
    );
  });

  test("blocks submission and flags invalid fields when empty", async () => {
    await act(async () => {
      render(<Login />);
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Sign In" }));
    });
    expect(signInCreate).not.toHaveBeenCalled();
  });

  test("signs in successfully and resolves a destination", async () => {
    signInCreate.mockResolvedValue({ status: "complete", createdSessionId: "s1" });
    await act(async () => {
      render(<Login />);
    });
    await act(async () => {
      fillCreds();
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Sign In" }));
    });
    await waitFor(() =>
      expect(signInCreate).toHaveBeenCalledWith({
        identifier: "user@test.com",
        password: "secret123",
      })
    );
    await waitFor(() => expect(setActive).toHaveBeenCalled());
    expect(screen.getByText("Welcome back!")).toBeInTheDocument();
  });

  test("shows an error message when credentials are rejected", async () => {
    signInCreate.mockRejectedValue({
      errors: [{ code: "form_password_incorrect", message: "form_password_incorrect" }],
    });
    await act(async () => {
      render(<Login />);
    });
    await act(async () => {
      fillCreds();
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Sign In" }));
    });
    await waitFor(() =>
      expect(screen.getByText(/Invalid email or password/i)).toBeInTheDocument()
    );
  });

  test("shows the already-logged-in notice for onboarded signed-in users", async () => {
    onboardedState = true;
    authState = {
      userId: "u1",
      isLoaded: true,
      isSignedIn: true,
      signOut,
      getToken,
    };
    await act(async () => {
      render(<Login />);
    });
    await waitFor(() =>
      expect(screen.getByText("You're already logged in")).toBeInTheDocument()
    );
  });
});
