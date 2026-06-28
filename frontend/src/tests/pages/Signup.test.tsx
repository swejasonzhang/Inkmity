import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import React from "react";
import { render, screen, act, waitFor, fireEvent } from "@/tests/setup/test-utils";

const navigate = jest.fn();
const signOut = jest.fn<() => Promise<any>>().mockResolvedValue(undefined);
const getToken = jest.fn<() => Promise<string | null>>().mockResolvedValue("tok");
const usePageMeta = jest.fn();
let authState: any;

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
  LayoutGroup: ({ children }: any) => <>{children}</>,
}));
jest.unstable_mockModule("@clerk/clerk-react", () => ({
  useClerk: () => ({ signOut }),
  useSignUp: () => ({ isLoaded: true, signUp: {}, setActive: jest.fn() }),
  useAuth: () => authState,
}));
jest.unstable_mockModule("@/hooks/usePageMeta", () => ({ usePageMeta }));
jest.unstable_mockModule("@/hooks/useOnboarded", () => ({
  useOnboarded: () => ({ onboarded: true }),
}));
jest.unstable_mockModule("@/hooks/useInactivityLogout", () => ({
  resetActivityTimer: jest.fn(),
}));
jest.unstable_mockModule("@/lib/animations", () => ({ container: {} }));
jest.unstable_mockModule("@/api", () => ({ API_URL: "http://localhost:3001" }));
jest.unstable_mockModule("react-toastify", () => ({
  ToastContainer: () => <div data-testid="toast" />,
  toast: { error: jest.fn(), success: jest.fn() },
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
jest.unstable_mockModule("@/components/access/CookieConsent", () => ({
  default: () => <div data-testid="cookie" />,
}));
jest.unstable_mockModule("@/components/access/RoleChooser", () => ({
  default: ({ onSelect }: any) => (
    <div data-testid="role-chooser">
      <button onClick={() => onSelect("client")}>pick-client</button>
      <button onClick={() => onSelect("studio")}>pick-studio</button>
    </div>
  ),
}));
jest.unstable_mockModule("@/components/access/SignupFormCard", () => ({
  default: ({ role, step }: any) => (
    <div data-testid="signup-form-card">
      role:{role} step:{step}
    </div>
  ),
}));

const { default: Signup } = await import("@/pages/Signup");

describe("Signup page", () => {
  beforeEach(() => {
    navigate.mockReset();
    usePageMeta.mockReset();
    authState = {
      userId: null,
      isLoaded: true,
      isSignedIn: false,
      signOut,
      getToken,
    };
  });

  test("renders the role chooser first and sets page meta", async () => {
    await act(async () => {
      render(<Signup />);
    });
    expect(screen.getByTestId("role-chooser")).toBeInTheDocument();
    expect(screen.queryByTestId("signup-form-card")).not.toBeInTheDocument();
    expect(usePageMeta).toHaveBeenCalled();
  });

  test("selecting studio navigates to the studio signup", async () => {
    await act(async () => {
      render(<Signup />);
    });
    await act(async () => {
      fireEvent.click(screen.getByText("pick-studio"));
    });
    expect(navigate).toHaveBeenCalledWith("/signup/studio");
  });

  test("selecting client reveals the signup form card", async () => {
    await act(async () => {
      render(<Signup />);
    });
    await act(async () => {
      fireEvent.click(screen.getByText("pick-client"));
    });
    await waitFor(() =>
      expect(screen.getByTestId("signup-form-card")).toBeInTheDocument()
    );
    expect(screen.getByText(/role:client/)).toBeInTheDocument();
  });

  test("shows the already-logged-in success state when a user is signed in", async () => {
    authState = {
      userId: "u1",
      isLoaded: true,
      isSignedIn: true,
      signOut,
      getToken,
    };
    await act(async () => {
      render(<Signup />);
    });
    await waitFor(() =>
      expect(screen.getByText("You're already logged in.")).toBeInTheDocument()
    );
  });
});
