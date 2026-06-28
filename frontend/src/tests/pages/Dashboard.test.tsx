import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import React from "react";
import { render, screen, act, waitFor } from "@/tests/setup/test-utils";

const navigate = jest.fn();
const toastError = jest.fn();
const useSyncOnAuth = jest.fn();
const useRole = jest.fn<() => { role: string; isLoaded: boolean; isSignedIn: boolean }>(
  () => ({ role: "client", isLoaded: true, isSignedIn: true })
);
const useTheme = jest.fn<() => { theme: string }>(() => ({ theme: "dark" }));

jest.unstable_mockModule("react-router-dom", () => ({
  useNavigate: () => navigate,
  BrowserRouter: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.unstable_mockModule("react-toastify", () => ({
  toast: { error: toastError },
}));
jest.unstable_mockModule("@/hooks/useRole", () => ({ useRole }));
jest.unstable_mockModule("@/hooks/useSyncOnAuth", () => ({ useSyncOnAuth }));
jest.unstable_mockModule("@/hooks/useTheme", () => ({ useTheme }));
jest.unstable_mockModule("@/components/dashboard/client/ClientDashboard", () => ({
  default: () => <div data-testid="client-dashboard" />,
}));
jest.unstable_mockModule("@/components/dashboard/artist/ArtistDashboard", () => ({
  default: () => <div data-testid="artist-dashboard" />,
}));

const { default: Dashboard } = await import("@/pages/Dashboard");

describe("Dashboard page", () => {
  beforeEach(() => {
    navigate.mockReset();
    toastError.mockReset();
    useRole.mockReturnValue({ role: "client", isLoaded: true, isSignedIn: true });
  });

  test("renders the client dashboard for a signed-in client", async () => {
    await act(async () => {
      render(<Dashboard />);
    });
    await waitFor(() =>
      expect(screen.getByTestId("client-dashboard")).toBeInTheDocument()
    );
  });

  test("renders the artist dashboard for an artist", async () => {
    useRole.mockReturnValue({ role: "artist", isLoaded: true, isSignedIn: true });
    await act(async () => {
      render(<Dashboard />);
    });
    await waitFor(() =>
      expect(screen.getByTestId("artist-dashboard")).toBeInTheDocument()
    );
  });

  test("redirects to /login when not signed in", async () => {
    useRole.mockReturnValue({ role: "client", isLoaded: true, isSignedIn: false });
    await act(async () => {
      render(<Dashboard />);
    });
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith("/login", { replace: true })
    );
    expect(toastError).toHaveBeenCalled();
  });

  test("redirects studios to /studios and renders neither dashboard", async () => {
    useRole.mockReturnValue({ role: "studio", isLoaded: true, isSignedIn: true });
    await act(async () => {
      render(<Dashboard />);
    });
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith("/studios", { replace: true })
    );
    expect(screen.queryByTestId("client-dashboard")).not.toBeInTheDocument();
    expect(screen.queryByTestId("artist-dashboard")).not.toBeInTheDocument();
  });
});
