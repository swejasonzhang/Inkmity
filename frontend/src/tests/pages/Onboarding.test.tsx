import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import React from "react";
import { render, screen, act, waitFor, fireEvent } from "@/tests/setup/test-utils";

const navigate = jest.fn();
const getToken = jest.fn<() => Promise<string | null>>().mockResolvedValue("tok");
const getMe = jest.fn<() => Promise<any>>();
const syncUser = jest.fn<() => Promise<any>>().mockResolvedValue({});
const setCachedUsername = jest.fn();
const markOnboarded = jest.fn();
let userValue: any;
let userLoaded = true;
let signedIn = true;

jest.unstable_mockModule("react-router-dom", () => ({
  useNavigate: () => navigate,
  BrowserRouter: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.unstable_mockModule("@clerk/clerk-react", () => ({
  useUser: () => ({ isLoaded: userLoaded, isSignedIn: signedIn, user: userValue }),
  useAuth: () => ({ getToken }),
}));
jest.unstable_mockModule("@/api", () => ({ getMe, syncUser }));
jest.unstable_mockModule("@/lib/roleCache", () => ({ setCachedUsername }));
jest.unstable_mockModule("@/hooks/useOnboarded", () => ({ markOnboarded }));
jest.unstable_mockModule("@/lib/formNav", () => ({ advanceOnEnterIfEmpty: jest.fn() }));
jest.unstable_mockModule("@/components/header/Header", () => ({
  default: () => <header data-testid="header" />,
}));
jest.unstable_mockModule("@/components/VideoBackground", () => ({
  default: () => <div data-testid="video-bg" />,
}));
jest.unstable_mockModule("@/components/ui/spinner", () => ({
  Spinner: () => <span data-testid="spinner" />,
}));
jest.unstable_mockModule("@/components/access/ClientDetailsStep", () => ({
  default: () => <div data-testid="client-step" />,
}));
jest.unstable_mockModule("@/components/access/ArtistDetailsStep", () => ({
  default: () => <div data-testid="artist-step" />,
}));

const { default: Onboarding } = await import("@/pages/Onboarding");

describe("Onboarding page", () => {
  beforeEach(() => {
    navigate.mockReset();
    getMe.mockReset();
    syncUser.mockClear();
    setCachedUsername.mockReset();
    markOnboarded.mockReset();
    userLoaded = true;
    signedIn = true;
    userValue = {
      id: "u1",
      primaryEmailAddress: { emailAddress: "u@u.com" },
      emailAddresses: [{ emailAddress: "u@u.com" }],
      firstName: "Jo",
      lastName: "Doe",
      unsafeMetadata: {},
    };
  });

  test("redirects to /login when signed out", async () => {
    signedIn = false;
    await act(async () => {
      render(<Onboarding />);
    });
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith("/login", { replace: true })
    );
  });

  test("shows the account-found redirect for already-onboarded users", async () => {
    getMe.mockResolvedValue({ onboardingComplete: true, role: "client" });
    await act(async () => {
      render(<Onboarding />);
    });
    await waitFor(() =>
      expect(screen.getByText("Account found")).toBeInTheDocument()
    );
  });

  test("renders the onboarding form with a client step for new users", async () => {
    getMe.mockResolvedValue({ onboardingComplete: false });
    await act(async () => {
      render(<Onboarding />);
    });
    await waitFor(() =>
      expect(
        screen.getByPlaceholderText("Enter a username to continue")
      ).toBeInTheDocument()
    );
    expect(screen.getByTestId("client-step")).toBeInTheDocument();
  });

  test("switching role to artist shows the artist step", async () => {
    getMe.mockResolvedValue({ onboardingComplete: false });
    await act(async () => {
      render(<Onboarding />);
    });
    await waitFor(() =>
      expect(screen.getByTestId("client-step")).toBeInTheDocument()
    );
    await act(async () => {
      fireEvent.click(screen.getByText("Artist"));
    });
    expect(screen.getByTestId("artist-step")).toBeInTheDocument();
  });

  test("Skip now requires a username and agreement, then syncs the user", async () => {
    getMe.mockResolvedValue({ onboardingComplete: false });
    await act(async () => {
      render(<Onboarding />);
    });
    await waitFor(() =>
      expect(
        screen.getByPlaceholderText("Enter a username to continue")
      ).toBeInTheDocument()
    );

    const skip = screen.getByText("Skip now").closest("button")!;
    expect(skip).toBeDisabled();

    await act(async () => {
      fireEvent.change(
        screen.getByPlaceholderText("Enter a username to continue"),
        { target: { value: "newbie" } }
      );
      fireEvent.click(screen.getByRole("checkbox"));
    });
    expect(skip).not.toBeDisabled();

    await act(async () => {
      fireEvent.click(skip);
    });
    await waitFor(() =>
      expect(syncUser).toHaveBeenCalledWith(
        "tok",
        expect.objectContaining({ role: "client", username: "newbie" })
      )
    );
    expect(markOnboarded).toHaveBeenCalledWith("u1");
  });
});
